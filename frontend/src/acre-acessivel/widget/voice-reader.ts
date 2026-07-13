/**
 * Acre Acessível - Leitor de Voz v6
 * Correções:
 * - isSequentialReading flag: bloqueia click/hover/selection durante leitura sequencial
 * - scrollIntoView removido da leitura automática (só rola ao next/prev manual)
 * - SpeechSynthesis como primário, servidor como fallback
 * - v4: TextNormalizer expande números/siglas/datas antes de falar; leitura por frases
 *   (chunking) com pausas reais entre elas; pitch/rate adaptativo por tipo de elemento
 *   (título x parágrafo x item de lista) para reduzir a monotonia da voz nativa.
 * - v5: buffering de 1 chunk adiante no modo servidor — o próximo chunk é pré-buscado
 *   assim que o atual começa a tocar, eliminando o gap de rede entre frases (edge-tts
 *   primário tem latência de rede que o Piper local não tinha). Earcon curto (Web
 *   Audio, sem arquivo extra) avisa esperas residuais >700ms sem competir com a fala.
 * - v6: Media Session API — botão físico de fone Bluetooth, tela de bloqueio e central
 *   de notificações passam a controlar play/pause/next/previous, sem precisar abrir o
 *   painel. Metadata mostra um trecho do texto atual + "Trecho X de Y" como progresso.
 */

import { TextNormalizer, type SentenceChunk } from './text-normalizer';

export interface VoiceReaderConfig {
  rate?: number;
  volume?: number;
  pitch?: number;
  lang?: string;
  onStateChange?: (state: 'idle' | 'speaking' | 'paused') => void;
  onElementHighlight?: (element: HTMLElement | null) => void;
}

export class VoiceReader {
  private synth: SpeechSynthesis;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private config: Required<VoiceReaderConfig>;
  private textElements: HTMLElement[] = [];
  private currentIndex: number = -1;
  private currentState: 'idle' | 'speaking' | 'paused' = 'idle';
  private highlightClassName = 'acre-reading-highlight';

  // Flag de modo sequencial — bloqueia triggers ad-hoc (click, hover, selection)
  private _isSequentialReading: boolean = false;

  // Fallback do servidor
  private useServerTts = true;
  private audioPlayer: HTMLAudioElement | null = null;

  constructor(config: VoiceReaderConfig = {}) {
    console.log('🦫 VoiceReader v6: Inicializando...');

    this.synth = typeof window !== 'undefined' ? window.speechSynthesis : (null as any);

    this.config = {
      rate: config.rate ?? 1.0,
      volume: config.volume ?? 1.0,
      pitch: config.pitch ?? 1.0,
      lang: config.lang ?? 'pt-BR',
      onStateChange: config.onStateChange ?? (() => {}),
      onElementHighlight: config.onElementHighlight ?? (() => {}),
    };

    if (this.synth) {
      try {
        this.synth.cancel();
      } catch (e) {}
    }

    this.injectHighlightStyles();
    this.detectVoiceSupport();
    this.setupMediaSession();
  }

  /** Expõe se está em modo sequencial para o painel bloquear triggers externos */
  public get isSequentialReading(): boolean {
    return this._isSequentialReading;
  }

  /**
   * URL do backend de TTS (fallback neural quando não há voz pt-BR local).
   *
   * Quando o widget roda no MESMO domínio do backend (ex: ambiente de dev), o palpite
   * de porta 8001 no mesmo hostname funciona. Mas quando o widget é embutido em um
   * domínio de TERCEIROS (script embed em qualquer site, ou extensão de navegador),
   * o backend está em outro servidor — então a URL precisa ser configurada
   * explicitamente via window.AcreAcessivelConfig.backendUrl (setado pelo loader
   * a partir do atributo data-acre-backend da tag <script>, ou pela extensão).
   */
  private getBackendUrl(): string {
    if (typeof window !== 'undefined') {
      // @ts-ignore
      const configured = window.AcreAcessivelConfig?.backendUrl;
      if (configured) return configured.replace(/\/$/, '');
      return `${window.location.protocol}//${window.location.hostname}:8001`;
    }
    return 'http://localhost:8001';
  }

  private injectHighlightStyles() {
    if (document.getElementById('acre-highlight-styles')) return;
    const style = document.createElement('style');
    style.id = 'acre-highlight-styles';
    style.innerHTML = `
    .${this.highlightClassName} {
      background-color: rgba(27, 67, 50, 0.12) !important;
      border-bottom: 2px solid #1b4332 !important;
      border-radius: 2px !important;
      transition: background-color 0.2s ease;
    }
    .acre-high-contrast-mode .${this.highlightClassName} {
      background-color: #FFFF00 !important;
      color: #000 !important;
      border-bottom: 2px solid #000 !important;
    }
    `;
    document.head.appendChild(style);
  }

  private detectVoiceSupport() {
    // Restaurado: O Portal FEM vai rodar o backend Python localmente ou em produção.
    this.useServerTts = true; // assume servidor por padrão para segurança

    if (!this.synth) {
      console.warn('🦫 SpeechSynthesis indisponível. Usando servidor.');
      return;
    }
    
    const checkVoices = () => {
      const voices = this.synth.getVoices();
      console.log(`🦫 detectVoiceSupport: ${voices.length} vozes disponíveis no navegador.`);
      if (voices.length === 0) {
        // Se ainda não carregou nenhuma voz, mantém useServerTts = true por segurança
        return;
      }
      const hasPt = voices.some(v => v.lang.toLowerCase().startsWith('pt'));
      this.useServerTts = !hasPt;
      if (!hasPt) {
        console.warn('🦫 Sem voz pt-BR local. Fallback para servidor.');
      } else {
        console.log('🦫 Voz pt local encontrada. Usando SpeechSynthesis local.');
      }
    };

    this.synth.addEventListener('voiceschanged', checkVoices);
    Promise.resolve().then(checkVoices);
    checkVoices();
  }

  public setRate(rate: number) {
    this.config.rate = rate;
    if (this.currentState === 'speaking') {
      if (this.useServerTts && this.audioPlayer) {
        this.audioPlayer.playbackRate = rate;
      } else {
        const idx = this.currentIndex;
        this.stop();
        this._isSequentialReading = true;
        this.readElementAtIndex(idx, false);
      }
    }
  }

  public setVolume(volume: number) {
    this.config.volume = volume;
    if (this.useServerTts && this.audioPlayer) {
      this.audioPlayer.volume = volume;
    } else if (this.currentUtterance) {
      this.currentUtterance.volume = volume;
    }
  }

  /** Tom base da voz (1.0 = neutro). Combinado com o perfil por tipo de elemento (ver TextNormalizer). */
  public setPitch(pitch: number) {
    this.config.pitch = pitch;
  }

  private getReadableText(element: HTMLElement): string {
    const tag = element.tagName.toLowerCase();

    if (tag === 'img') {
      return element.getAttribute('alt') || element.getAttribute('title') || '';
    }

    const ariaLabel = element.getAttribute('aria-label');
    if (ariaLabel) return ariaLabel.trim();

    // Remove text from elements that shouldn't be read out loud (icons, aria-hidden)
    const clone = element.cloneNode(true) as HTMLElement;
    const hideSelectors = '[aria-hidden="true"], .material-symbols-outlined, .material-icons, i, svg';
    clone.querySelectorAll(hideSelectors).forEach(el => el.remove());

    const title = element.getAttribute('title');
    if (title && !(clone.textContent || '').trim()) return title.trim();

    // textContent colapsa whitespace melhor que innerText para leitura
    const raw = (clone.textContent || '').replace(/\s+/g, ' ').trim();
    return raw;
  }

  private scanReadableElements() {
    this.textElements = [];
    const selector =
    'h1, h2, h3, h4, h5, h6, p, li, blockquote, figcaption, img[alt]';
    // Separamos elementos interativos para não ler links/botões em sequência automática
    // (eles são lidos ao clicar/focar individualmente)
    const elements = Array.from(document.querySelectorAll<HTMLElement>(selector));

    const filtered: HTMLElement[] = [];

    for (const el of elements) {
      if (
        el.closest('acre-accessibility-panel') ||
        el.closest('capi-mascot') ||
        el.closest('#vlibras-div') ||
        el.closest('.audio-player-wrapper') ||
        el.closest('audio')
      ) continue;

      const style = window.getComputedStyle(el);
      if (
        style.display === 'none' ||
        style.visibility === 'hidden' ||
        style.opacity === '0'
      ) continue;

      const text = this.getReadableText(el).trim();
      if (text.length < 2) continue;

      // Descarta se já tem um ancestral na lista (evita duplicata pai/filho)
      const hasAncestor = filtered.some(existing => existing.contains(el));
      if (hasAncestor) continue;

      // Remove descendentes já adicionados que são mais específicos que este (improvável mas seguro)
      for (let i = filtered.length - 1; i >= 0; i--) {
        if (el.contains(filtered[i])) filtered.splice(i, 1);
      }

      filtered.push(el);
    }

    this.textElements = filtered;
    console.log(`🦫 Varredura: ${this.textElements.length} elementos legíveis.`);
  }

  private updateState(state: 'idle' | 'speaking' | 'paused') {
    this.currentState = state;
    this.config.onStateChange(state);
    this.updateMediaSessionPlaybackState(state);
    try {
      document.dispatchEvent(new CustomEvent('acre:voice:state', { detail: { state } }));
    } catch (e) {}
  }

  public play() {
    if (this.currentState === 'paused') {
      this.resume();
      return;
    }

    this.scanReadableElements();
    if (this.textElements.length === 0) {
      console.warn('🦫 Nenhum elemento legível encontrado.');
      return;
    }

    this._isSequentialReading = true;
    this.currentIndex = 0;
    this.readElementAtIndex(this.currentIndex, false);
  }

  public pause() {
    if (this.currentState !== 'speaking') return;
    if (this.useServerTts && this.audioPlayer) {
      this.audioPlayer.pause();
    } else if (this.synth) {
      this.synth.pause();
    }
    this.updateState('paused');
  }

  public resume() {
    if (this.currentState !== 'paused') return;
    if (this.useServerTts && this.audioPlayer) {
      this.audioPlayer.play().catch(err => console.error('🦫 Erro ao retomar:', err));
    } else if (this.synth) {
      this.synth.resume();
    }
    this.updateState('speaking');
  }

  public stop() {
    this._isSequentialReading = false;
    this.clearWaitingFeedback();

    // Aborta qualquer fetch de TTS em andamento (chunk atual + prefetch)
    if (this._serverAbort) {
      this._serverAbort.abort();
      this._serverAbort = null;
    }
    this._prefetchedChunks.clear();

    if (this.audioPlayer) {
      this.audioPlayer.pause();
      this.audioPlayer = null;
    }
    if (this.synth) {
      try {
        this.synth.cancel();
      } catch (e) {}
    }
    this.removeHighlight();
    this.currentIndex = -1;
    this.updateState('idle');
  }

  public next() {
    if (this.textElements.length === 0) this.scanReadableElements();
    if (this.currentIndex < this.textElements.length - 1) {
      this.stopSpeechOnly();
      this.currentIndex++;
      // next/prev manual: scrolla para o elemento
      this.readElementAtIndex(this.currentIndex, true);
    } else {
      console.log('🦫 Fim dos elementos da página.');
      this.stop();
    }
  }

  public previous() {
    if (this.textElements.length === 0) this.scanReadableElements();
    if (this.currentIndex > 0) {
      this.stopSpeechOnly();
      this.currentIndex--;
      this.readElementAtIndex(this.currentIndex, true);
    }
  }

  private stopSpeechOnly() {
    this.clearWaitingFeedback();
    if (this._serverAbort) {
      this._serverAbort.abort();
      this._serverAbort = null;
    }
    this._prefetchedChunks.clear();
    if (this.audioPlayer) {
      this.audioPlayer.pause();
      this.audioPlayer = null;
    }
    if (this.synth) {
      try {
        this.synth.cancel();
      } catch (e) {}
    }
    this.removeHighlight();
  }

  private removeHighlight() {
    this.textElements.forEach(el => el.classList.remove(this.highlightClassName));
    this.config.onElementHighlight(null);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Media Session API — v6: controle remoto de hardware
  // ──────────────────────────────────────────────────────────────────────────
  //
  // Conecta o leitor a botões físicos de fone Bluetooth, tela de bloqueio e
  // central de notificações do sistema — sem precisar abrir o painel nem usar
  // atalho de teclado. Os handlers só chamam os mesmos métodos públicos
  // (play/pause/next/previous) que os botões do painel já usam.
  //
  // Limitação conhecida: no modo local (Web Speech API, sem <audio> real), o
  // suporte do sistema pra mostrar os controles na tela de bloqueio varia por
  // navegador — confiável no Chrome desktop/Android, inconsistente em
  // Safari/Firefox. No modo servidor (useServerTts), como cada chunk é um
  // <audio> de verdade tocando, a integração é mais sólida em qualquer
  // navegador que implemente a API.

  private setupMediaSession() {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) {
      console.warn(
        '🦫 Media Session API indisponível — controles de hardware (fone/tela de ' +
        'bloqueio) não vão funcionar. Atalhos de teclado e botões do painel continuam normais.'
      );
      return;
    }

    const ms = navigator.mediaSession;
    const safe = (action: MediaSessionAction, handler: MediaSessionActionHandler) => {
      try {
        ms.setActionHandler(action, handler);
      } catch (e) {
        // Ação específica não suportada nesse navegador — ignora só ela, não quebra o resto
      }
    };

    safe('play', () => this.play());
    safe('pause', () => this.pause());
    safe('stop', () => this.stop());
    safe('previoustrack', () => this.previous());
    safe('nexttrack', () => this.next());
    // Alguns fones/firmwares mandam seek em vez de track — mapeia pro mesmo lugar,
    // já que a granularidade de navegação aqui é por elemento, não por segundos.
    safe('seekbackward', () => this.previous());
    safe('seekforward', () => this.next());
  }

  private updateMediaSessionPlaybackState(state: 'idle' | 'speaking' | 'paused') {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    try {
      navigator.mediaSession.playbackState =
        state === 'speaking' ? 'playing' : state === 'paused' ? 'paused' : 'none';
      if (state === 'idle') {
        navigator.mediaSession.metadata = null;
      }
    } catch (e) {}
  }

  /**
   * Atualiza o que aparece na tela de bloqueio / central de notificações: um
   * trecho do texto atual + "Trecho X de Y" como indicação de progresso.
   * Não usa setPositionState (barra de progresso com tempo) porque não
   * conhecemos a duração total do áudio adiantado — só a contagem de elementos.
   */
  private updateMediaSessionMetadata(rawText: string, index: number) {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    if (typeof MediaMetadata === 'undefined') return;

    const snippet = rawText.length > 70 ? `${rawText.slice(0, 70).trim()}…` : rawText.trim();
    const total = this.textElements.length;
    const progress =
      total > 0 && index >= 0 && index < total
        ? `Trecho ${index + 1} de ${total}`
        : 'Acre Acessível';

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: snippet || 'Lendo conteúdo da página',
        artist: progress,
        album: document.title || 'Acre Acessível',
      });
    } catch (e) {
      // MediaMetadata inválido ou indisponível — não é crítico, ignora
    }
  }

  /**
   * shouldScroll = true apenas quando o usuário clicou next/prev manualmente.
   * Durante leitura automática sequencial: false (não move o mouse/viewport).
   */
  private readElementAtIndex(index: number, shouldScroll: boolean) {
    if (index < 0 || index >= this.textElements.length) {
      this.stop();
      return;
    }

    const element = this.textElements[index];
    this.removeHighlight();
    element.classList.add(this.highlightClassName);
    this.config.onElementHighlight(element);

    if (shouldScroll) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    const rawText = this.getReadableText(element);
    if (!rawText.trim()) {
      // Pula elemento vazio
      if (this._isSequentialReading) {
        this.currentIndex++;
        this.readElementAtIndex(this.currentIndex, false);
      }
      return;
    }

    this.updateMediaSessionMetadata(rawText, index);

    const tag = element.tagName.toLowerCase();
    const chunks = TextNormalizer.normalizeToChunks(rawText);
    const profile = TextNormalizer.profileForTag(tag);

    console.log(`🦫 [${index}] (${tag}) "${rawText.substring(0, 60)}${rawText.length > 60 ? '...' : ''}" — ${chunks.length} frase(s)`);

    if (this.useServerTts) {
      // No modo servidor, usa os mesmos chunks normalizados (com pausas entre frases)
      // — cada chunk vira um POST separado, mantendo prosódia equivalente ao modo local.
      this.readChunksViaServer(chunks, 0, index, () => {
        if (this._isSequentialReading && this.currentState === 'speaking' && this.currentIndex === index) {
          this.next();
        }
      });
      return;
    }

    this.speakChunks(chunks, profile, 0, index, () => {
      if (this._isSequentialReading && this.currentState === 'speaking' && this.currentIndex === index) {
        this.next();
      }
    }, (event) => this.handleSpeechError(event, () => this.readElementAtIndex(index, shouldScroll)));
  }

  /**
   * Fala uma lista de frases (chunks) em sequência, cada uma como utterance própria,
   * respeitando a pausa sugerida entre elas. Isso é o que dá à voz nativa uma entonação
   * de início/fim de frase real, em vez de uma leitura corrida e monotônica.
   */
  private speakChunks(
    chunks: SentenceChunk[],
    profile: { rateMultiplier: number; pitch: number },
    chunkIdx: number,
    elementIndex: number,
    onAllDone: () => void,
    onError: (event: any) => void
  ) {
    if (chunkIdx === 0) {
      this.updateState('speaking');
    }

    if (chunkIdx >= chunks.length) {
      onAllDone();
      return;
    }

    // Se o elemento mudou (ex: usuário pulou pra outro) ou parou de ler, aborta a cadeia
    if (this._isSequentialReading && this.currentIndex !== elementIndex) return;

    const chunk = chunks[chunkIdx];
    const utterance = new SpeechSynthesisUtterance(chunk.text);
    utterance.lang = this.config.lang;
    utterance.rate = this.config.rate * profile.rateMultiplier;
    utterance.volume = this.config.volume;
    utterance.pitch = this.clampPitch(this.config.pitch * profile.pitch);
    const voice = this.getBestPtVoice();
    if (voice) utterance.voice = voice;

    this.currentUtterance = utterance;

    utterance.onend = () => {
      if (chunk.pauseAfterMs > 0) {
        setTimeout(() => {
          this.speakChunks(chunks, profile, chunkIdx + 1, elementIndex, onAllDone, onError);
        }, chunk.pauseAfterMs);
      } else {
        this.speakChunks(chunks, profile, chunkIdx + 1, elementIndex, onAllDone, onError);
      }
    };

    utterance.onerror = event => {
      if (event.error === 'interrupted') return;
      onError(event);
    };

    this.synth.speak(utterance);
  }

  private clampPitch(pitch: number): number {
    return Math.min(2.0, Math.max(0.0, pitch));
  }

  /**
   * Lê um elemento específico ad-hoc (click ou hover).
   * Bloqueado se estiver em modo sequencial.
   */
  public readSpecificElement(element: HTMLElement, shouldScroll: boolean = false) {
    if (this._isSequentialReading) return;

    this.scanReadableElements();

    let idx = this.textElements.indexOf(element);
    if (idx === -1) {
      const selector =
      'h1, h2, h3, h4, h5, h6, p, li, blockquote, article span, label, figcaption, a, button, img[alt], [role="button"]';
      const closest = element.closest(selector) as HTMLElement;
      if (closest) {
        idx = this.textElements.indexOf(closest);
        element = closest;
      }
    }

    if (idx !== -1) {
      this.stopSpeechOnly();
      this.currentIndex = idx;
      this.readElementAtIndex(this.currentIndex, shouldScroll);
    } else {
      this.stopSpeechOnly();
      this.readSingleElement(element);
    }
  }

  private readSingleElement(element: HTMLElement) {
    this.removeHighlight();
    element.classList.add(this.highlightClassName);
    this.config.onElementHighlight(element);

    const rawText = this.getReadableText(element);
    if (!rawText.trim()) return;

    this.updateMediaSessionMetadata(rawText, this.currentIndex);

    if (this.useServerTts) {
      const chunks = TextNormalizer.normalizeToChunks(rawText);
      this.readChunksViaServer(chunks, 0, this.currentIndex, () => {
        this.removeHighlight();
        this.updateState('idle');
      });
      return;
    }

    const tag = element.tagName.toLowerCase();
    const chunks = TextNormalizer.normalizeToChunks(rawText);
    const profile = TextNormalizer.profileForTag(tag);

    this.speakChunks(chunks, profile, 0, this.currentIndex, () => {
      this.removeHighlight();
      this.updateState('idle');
    }, (event) => this.handleSpeechError(event, () => this.readSingleElement(element)));
  }

  public readTextDirectly(text: string) {
    if (this._isSequentialReading) return;
    this.stopSpeechOnly();
    this.removeHighlight();
    if (!text.trim()) return;

    this.updateMediaSessionMetadata(text, this.currentIndex);

    if (this.useServerTts) {
      const chunks = TextNormalizer.normalizeToChunks(text);
      this.readChunksViaServer(chunks, 0, this.currentIndex, () => this.updateState('idle'));
      return;
    }

    const chunks = TextNormalizer.normalizeToChunks(text);
    this.speakChunks(
      chunks,
      { rateMultiplier: 1.0, pitch: 1.0 },
      0,
      this.currentIndex,
      () => this.updateState('idle'),
      (event) => this.handleSpeechError(event, () => this.readTextDirectly(text))
    );
  }

  /**
   * Lê chunks via servidor usando POST (sem limite de tamanho de URL).
   * Cada chunk é uma sentença do TextNormalizer — o servidor sintetiza cada um
   * individualmente, a fila respeita pauseAfterMs, e AbortController garante
   * cancelamento limpo ao chamar stop().
   *
   * Fluxo: fetch POST → blob → URL.createObjectURL → Audio → onended → próximo chunk.
   * Isso é equivalente ao speakChunks() para Web Speech API, mas para áudio HTTP.
   *
   * v5 — buffering: assim que o áudio do chunk atual COMEÇA a tocar (onplay), o
   * fetch do PRÓXIMO chunk já é disparado em paralelo e fica em _prefetchedChunks.
   * Quando o atual termina, o próximo já está pronto (ou quase) — elimina o gap de
   * rede entre frases que o edge-tts (motor primário, com latência de rede) introduz
   * e que o Piper local (~200ms) não tinha. Um único AbortController por cadeia de
   * leitura (criado só em chunkIdx === 0) cobre o chunk atual E o prefetch — stop()
   * cancela os dois com uma chamada.
   */
  private _serverAbort: AbortController | null = null;
  private _prefetchedChunks: Map<number, Promise<Blob>> = new Map();

  private fetchChunkAudio(text: string, signal: AbortSignal): Promise<Blob> {
    const backendUrl = this.getBackendUrl();
    return fetch(`${backendUrl}/api/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
      signal,
    }).then(res => {
      if (!res.ok) throw new Error(`TTS HTTP ${res.status}`);
      return res.blob();
    });
  }

  /** Garante que o fetch do chunk já esteja em andamento (ou concluído), sem duplicar. */
  private ensurePrefetched(
    chunks: SentenceChunk[],
    chunkIdx: number,
    signal: AbortSignal,
  ): Promise<Blob> {
    let promise = this._prefetchedChunks.get(chunkIdx);
    if (!promise) {
      promise = this.fetchChunkAudio(chunks[chunkIdx].text, signal);
      this._prefetchedChunks.set(chunkIdx, promise);
    }
    return promise;
  }

  private readChunksViaServer(
    chunks: SentenceChunk[],
    chunkIdx: number,
    elementIndex: number,
    onAllDone: () => void,
  ) {
    if (chunkIdx === 0) {
      this.updateState('speaking');
      this._prefetchedChunks.clear();
      this._serverAbort = new AbortController();
    }

    if (chunkIdx >= chunks.length) {
      onAllDone();
      return;
    }

    if (this._serverAbort?.signal.aborted) return;
    if (this._isSequentialReading && this.currentIndex !== elementIndex) return;

    const chunk = chunks[chunkIdx];
    const signal = this._serverAbort!.signal;

    // Som de espera (earcon) só dispara se a resposta REALMENTE demorar — ver baixo.
    this.startWaitingFeedback();

    this.ensurePrefetched(chunks, chunkIdx, signal)
      .then(blob => {
        this.clearWaitingFeedback();
        if (signal.aborted) return;

        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.preload = 'auto';
        audio.playbackRate = this.config.rate;
        audio.volume = this.config.volume;

        this.audioPlayer = audio;

        // Buffering: ao começar a tocar o chunk atual, já adianta o fetch do próximo.
        audio.onplay = () => {
          if (signal.aborted || chunkIdx + 1 >= chunks.length) return;
          this.ensurePrefetched(chunks, chunkIdx + 1, signal).catch(() => {
            // Falha no prefetch não é fatal: vira um fetch normal (com earcon, se demorar)
            // quando chegar a vez desse chunk.
            this._prefetchedChunks.delete(chunkIdx + 1);
          });
        };

        audio.onended = () => {
          URL.revokeObjectURL(url);
          this.audioPlayer = null;
          this._prefetchedChunks.delete(chunkIdx);
          if (signal.aborted) return;
          const next = () =>
            this.readChunksViaServer(chunks, chunkIdx + 1, elementIndex, onAllDone);
          chunk.pauseAfterMs > 0 ? setTimeout(next, chunk.pauseAfterMs) : next();
        };

        audio.onerror = () => {
          URL.revokeObjectURL(url);
          if (signal.aborted) return;
          console.error('🦫 Erro ao reproduzir áudio do servidor.');
          this.stop();
        };

        audio.play().catch(err => {
          URL.revokeObjectURL(url);
          if (err.name === 'AbortError') return;
          console.error('🦫 Autoplay bloqueado:', err);
          this.stop();
        });
      })
      .catch(err => {
        this.clearWaitingFeedback();
        if (err.name === 'AbortError' || signal.aborted) return;
        console.error('🦫 Erro no fetch TTS:', err);
        this.stop();
      });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Feedback de espera (earcon) — v5
  // ──────────────────────────────────────────────────────────────────────────
  //
  // Pra quem não vê tela de carregamento, silêncio sem contexto é ambíguo:
  // travou? acabou? tá processando? Em vez de avisar por voz a cada frase (o que
  // seria irritante e competiria com a própria leitura), um som curto e neutro
  // soa SÓ se a espera passar de um limiar — a maioria dos chunks, com o buffer
  // de prefetch ativo, nunca chega a disparar isso.

  private _earconTimer: ReturnType<typeof setTimeout> | null = null;
  private _earconInterval: ReturnType<typeof setInterval> | null = null;
  private _earconCtx: AudioContext | null = null;

  /** Agenda o earcon pra disparar só se a espera passar de 700ms; repete a cada 1.6s enquanto durar. */
  private startWaitingFeedback() {
    this.clearWaitingFeedback();
    this._earconTimer = setTimeout(() => {
      this.playEarcon();
      this._earconInterval = setInterval(() => this.playEarcon(), 1600);
    }, 700);
  }

  private clearWaitingFeedback() {
    if (this._earconTimer) {
      clearTimeout(this._earconTimer);
      this._earconTimer = null;
    }
    if (this._earconInterval) {
      clearInterval(this._earconInterval);
      this._earconInterval = null;
    }
  }

  /**
   * Som curto e neutro (não falado) gerado via Web Audio API — sem precisar de
   * nenhum arquivo de áudio extra no projeto. Tom suave, baixo volume relativo
   * ao volume configurado pelo usuário, fade-in/fade-out pra não estalar.
   */
  private playEarcon() {
    try {
      if (!this._earconCtx) {
        const AudioCtxCls: typeof AudioContext =
          window.AudioContext || (window as any).webkitAudioContext;
        this._earconCtx = new AudioCtxCls();
      }
      const ctx = this._earconCtx;
      if (ctx.state === 'suspended') ctx.resume();

      const now = ctx.currentTime;
      const peakGain = 0.05 * this.config.volume;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(peakGain, now + 0.03);
      gain.gain.linearRampToValueAtTime(0, now + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.22);
    } catch (e) {
      // Web Audio indisponível (raro) — não é crítico, ignora silenciosamente.
    }
  }

  private handleSpeechError(event: any, retry: () => void) {
    const errorType = event.error;
    if (errorType === 'interrupted') return;

    this.stop();

    if (
      errorType === 'synthesis-failed' ||
      errorType === 'language-unavailable' ||
      errorType === 'network' ||
      !errorType
    ) {
      console.warn('🦫 Chaveando para servidor TTS.');
      this.useServerTts = true;
      if (this._isSequentialReading) {
        this._isSequentialReading = true; // mantém o modo
      }
      retry();
    }
  }

  private getBestPtVoice(): SpeechSynthesisVoice | null {
    if (!this.synth) return null;
    const voices = this.synth.getVoices();
    const priorities = [
      // Vozes "Natural" ou "Online" (altíssima qualidade de nuvem gratuita oferecida pelos navegadores como Edge/Chrome)
      (v: SpeechSynthesisVoice) => {
        const lang = v.lang.toLowerCase().replace('_', '-');
        return lang.startsWith('pt-br') && v.name.toLowerCase().includes('natural');
      },
      (v: SpeechSynthesisVoice) => {
        const lang = v.lang.toLowerCase().replace('_', '-');
        return lang.startsWith('pt-br') && v.name.toLowerCase().includes('online');
      },
      (v: SpeechSynthesisVoice) => {
        const lang = v.lang.toLowerCase().replace('_', '-');
        return lang.startsWith('pt-br') && v.name.includes('Google');
      },
      (v: SpeechSynthesisVoice) => {
        const lang = v.lang.toLowerCase().replace('_', '-');
        return lang.startsWith('pt-br') && v.name.includes('Microsoft');
      },
      (v: SpeechSynthesisVoice) => v.lang.toLowerCase().replace('_', '-').startsWith('pt-br'),
      (v: SpeechSynthesisVoice) => v.lang.toLowerCase().startsWith('pt'),
    ];
    for (const fn of priorities) {
      const found = voices.find(fn);
      if (found) return found;
    }
    return null;
  }

  public get state() {
    return this.currentState;
  }
}
