import { VoiceReader } from './voice-reader';
import './capi-mascot';

export class AcreAccessibilityPanel extends HTMLElement {
  private shadow: ShadowRoot;
  public reader: VoiceReader;
  private isOpen: boolean = false;

  private fontScale: number = 1.0;
  private isHighContrast: boolean = false;
  private isGrayscale: boolean = false;
  private lineSpacing: 'normal' | 'medium' | 'large' = 'normal';
  private letterSpacing: 'normal' | 'medium' | 'large' = 'normal';
  private isDyslexicFriendly: boolean = false;
  private showMascot: boolean = true;
  private readOnHover: boolean = false;
  private isLibrasActive: boolean = false;
  private hoverTimeout: any = null;
  private lastHoveredElement: HTMLElement | null = null;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open', delegatesFocus: true });
    this.reader = new VoiceReader({
      onStateChange: state => this.handleVoiceStateChange(state),
                                  onElementHighlight: element => this.handleElementHighlight(element),
    });
    this.injectGlobalStyles();
  }

  connectedCallback() {
    this.render();
    this.setupEvents();
    this.setupKeyboardShortcuts();
    this.loadSettings();
    this.applySettingsToPage();

    // Detectar se é a primeira interação da sessão ou uma navegação subsequente
    const hasInteracted = sessionStorage.getItem('acre_user_interacted');

    if (!hasInteracted) {
      // Primeira visita na sessão: mostra boas-vindas no primeiro input do usuário
      const welcomeHandler = () => {
        document.removeEventListener('click', welcomeHandler, true);
        document.removeEventListener('keydown', welcomeHandler, true);
        sessionStorage.setItem('acre_user_interacted', '1');
        setTimeout(() => {
          this.reader.readTextDirectly(
            'Acre Acessível pronto. Pressione Alt P para ouvir a página, ou Alt A para abrir o menu.'
          );
        }, 400);
      };
      document.addEventListener('click', welcomeHandler, true);
      document.addEventListener('keydown', welcomeHandler, true);
    } else {
      // Navegação subsequente: foco inteligente direto no conteúdo
      this.smartPageFocus();
    }
  }

  /**
   * Foco inteligente ao carregar uma página subsequente.
   * Move o foco direto para o <main> e anuncia o título da página,
   * para que o cego não precise percorrer o header inteiro de novo.
   */
  private smartPageFocus() {
    // Pequeno delay para garantir que o DOM está renderizado
    setTimeout(() => {
      const main = document.getElementById('main-content');
      if (!main) return;

      // Move o foco para o conteúdo principal
      main.focus();

      // Monta o anúncio contextual
      const pageTitle = document.querySelector('h1')?.textContent?.trim()
        || document.title.split('|')[0]?.trim()
        || 'página';

      this.reader.readTextDirectly(
        `Página ${pageTitle}. Use J para navegar o conteúdo, F para voltar, Alt G para o menu.`
      );
    }, 300);
  }

  /** Seta o estado do mascote com segurança, aguardando o custom element estar pronto */
  private setMascotState(state: string) {
    const mascot = this.shadow.getElementById('capiMascot');
    if (!mascot) return;
    // Se o custom element ainda não definiu observedAttributes (não está pronto), tenta de novo
    if (!customElements.get('capi-mascot')) {
      setTimeout(() => this.setMascotState(state), 100);
      return;
    }
    mascot.setAttribute('state', state);
  }

  private injectGlobalStyles() {
    if (document.getElementById('acre-global-styles')) return;
    const style = document.createElement('style');
    style.id = 'acre-global-styles';
    style.innerHTML = `
    :root {
      --acre-font-multiplier: 1.0;
      --acre-line-spacing: normal;
      --acre-letter-spacing: normal;
    }
    html, body {
      font-size: calc(16px * var(--acre-font-multiplier)) !important;
    }
    body {
      line-height: var(--acre-line-spacing) !important;
      letter-spacing: var(--acre-letter-spacing) !important;
      transition: line-height 0.2s ease, letter-spacing 0.2s ease;
    }
    .acre-dyslexic-mode, .acre-dyslexic-mode *:not(.material-symbols-outlined) {
      font-family: 'Comic Sans MS', 'Arial Rounded MT Bold', sans-serif !important;
    }
    .acre-grayscale-mode {
      filter: grayscale(100%) !important;
    }
    .acre-high-contrast-mode {
      background-color: #000000 !important;
      color: #FFFFFF !important;
      filter: none !important;
    }
    .acre-high-contrast-mode body { background-color: #000000 !important; color: #FFFFFF !important; }
    .acre-high-contrast-mode p,
    .acre-high-contrast-mode h1,.acre-high-contrast-mode h2,.acre-high-contrast-mode h3,
    .acre-high-contrast-mode h4,.acre-high-contrast-mode h5,.acre-high-contrast-mode h6,
    .acre-high-contrast-mode li,.acre-high-contrast-mode a,.acre-high-contrast-mode span,
    .acre-high-contrast-mode div:not([class*="acre"]) {
      background-color: #000000 !important;
      color: #FFFFFF !important;
      border-color: #FFFFFF !important;
    }
    .acre-high-contrast-mode a { color: #FFFF00 !important; text-decoration: underline !important; }
    .acre-high-contrast-mode button:not([class*="acre"]) {
      background-color: #000000 !important; color: #FFFFFF !important; border: 2px solid #FFFFFF !important;
    }
    `;
    document.head.appendChild(style);
  }

  private render() {
    this.shadow.innerHTML = `
    <style>
    :host {
      --primary: #1b4332;
      --primary-hover: #2d6a4f;
      --primary-light: #e8f0ec;
      --accent: #A06D3B;
      --bg: #ffffff;
      --bg-subtle: #f8f9fa;
      --text: #111827;
      --text-muted: #6b7280;
      --border: #e5e7eb;
      --border-strong: #d1d5db;
      --shadow-lg: -4px 0 24px rgba(0,0,0,0.10);
      --radius: 6px;
      --font: 'Inter', 'Outfit', system-ui, -apple-system, sans-serif;
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 999999;
      font-family: var(--font);
    }

    /* ── Mascote / Trigger ── */
    .mascot-trigger {
      position: absolute; bottom: 0; right: 0; z-index: 10;
      transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.3s;
    }
    .mascot-trigger.hidden { opacity: 0; pointer-events: none; transform: scale(0.5) translateY(50px); }

    .alt-trigger {
      background: var(--primary); color: white; border: none; border-radius: 50%;
      width: 52px; height: 52px; display: flex; align-items: center; justify-content: center;
      cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.25);
      transition: background-color 0.2s, transform 0.2s;
    }
    .alt-trigger:hover { background-color: var(--primary-hover); transform: scale(1.05); }
    .alt-trigger svg { width: 22px; height: 22px; }

    /* ── Drawer ── */
    .panel-drawer {
      position: fixed; top: 0; right: -390px; width: 360px; height: 100vh;
      background: var(--bg); border-left: 1px solid var(--border);
      box-shadow: var(--shadow-lg);
      transition: right 0.35s cubic-bezier(0.16, 1, 0.3, 1);
      display: flex; flex-direction: column; z-index: 5; color: var(--text);
    }
    .panel-drawer.open { right: 0; }

    /* ── Header ── */
    .panel-header {
      padding: 16px 20px; background: var(--primary); color: white;
      display: flex; justify-content: space-between; align-items: center;
      flex-shrink: 0; border-bottom: 2px solid var(--accent);
    }
    .panel-title {
      margin: 0; font-size: 15px; font-weight: 600; letter-spacing: 0.01em;
      display: flex; align-items: center; gap: 10px;
    }
    .panel-title svg { width: 18px; height: 18px; opacity: 0.9; }
    .close-btn {
      background: transparent; border: none; color: rgba(255,255,255,0.75);
      cursor: pointer; border-radius: var(--radius);
      width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;
      transition: background-color 0.15s, color 0.15s; padding: 0;
    }
    .close-btn:hover { background: rgba(255,255,255,0.12); color: white; }
    .close-btn svg { width: 16px; height: 16px; }

    /* ── Conteúdo ── */
    .panel-content {
      flex: 1; overflow-y: auto; padding: 18px 20px;
      scrollbar-width: thin; scrollbar-color: var(--border-strong) transparent;
    }

    /* ── Seções ── */
    .section-title {
      font-size: 10px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.08em; color: var(--text-muted);
      margin: 22px 0 10px; padding-bottom: 6px; border-bottom: 1px solid var(--border);
    }
    .section-title:first-of-type { margin-top: 0; }

    /* ── Controles de Voz ── */
    .voice-controls {
      background: var(--bg-subtle); border: 1px solid var(--border);
      border-radius: var(--radius); padding: 14px;
    }

    /* Transport — ícones SVG, sem emoji */
    .voice-transport {
      display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 14px;
    }
    .transport-btn {
      background: var(--bg); border: 1px solid var(--border-strong);
      border-radius: var(--radius); width: 36px; height: 36px;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; color: var(--text);
      transition: background 0.15s, border-color 0.15s; padding: 0;
    }
    .transport-btn svg { width: 14px; height: 14px; }
    .transport-btn:hover { background: var(--border); }
    .transport-btn.primary {
      background: var(--primary); border-color: var(--primary); color: white;
      width: 42px; height: 42px;
    }
    .transport-btn.primary svg { width: 16px; height: 16px; }
    .transport-btn.primary:hover { background: var(--primary-hover); border-color: var(--primary-hover); }

    /* ── Sliders ── */
    .slider-group { margin-top: 10px; }
    .slider-label {
      font-size: 11px; font-weight: 600;
      display: flex; justify-content: space-between; margin-bottom: 5px; color: var(--text-muted);
    }
    .panel-slider { width: 100%; accent-color: var(--primary); cursor: pointer; height: 4px; }

    /* Toggle row — hover speak */
    .toggle-row {
      display: flex; align-items: center; justify-content: space-between;
      padding: 9px 12px; border: 1px solid var(--border-strong);
      border-radius: var(--radius); background: var(--bg);
      cursor: pointer; margin-top: 10px;
      font-size: 12px; font-weight: 500; color: var(--text);
      transition: background 0.15s; gap: 8px; font-family: var(--font);
    }
    .toggle-row:hover { background: var(--bg-subtle); }
    .toggle-row-label { display: flex; align-items: center; gap: 7px; }
    .toggle-row-label svg { width: 14px; height: 14px; color: var(--text-muted); flex-shrink: 0; }
    .toggle-badge {
      font-size: 10px; font-weight: 700; padding: 2px 8px;
      border-radius: 10px; background: var(--border); color: var(--text-muted);
      white-space: nowrap; transition: background 0.15s, color 0.15s;
    }
    .toggle-badge.on { background: var(--primary); color: white; }

    /* ── Grid de Botões ── */
    .button-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
    .panel-btn {
      background: var(--bg); border: 1px solid var(--border-strong);
      border-radius: var(--radius); padding: 9px 12px;
      font-size: 12px; font-weight: 500; cursor: pointer;
      display: flex; align-items: center; justify-content: center; gap: 7px;
      color: var(--text); transition: background 0.15s, border-color 0.15s, color 0.15s;
      line-height: 1.3; text-align: center; font-family: var(--font);
    }
    .panel-btn svg { width: 14px; height: 14px; flex-shrink: 0; }
    .panel-btn:hover { background: var(--bg-subtle); }
    .panel-btn.active { background: var(--primary); color: white; border-color: var(--primary); }
    .panel-btn.active svg { opacity: 0.9; }
    .panel-btn.full-width { grid-column: span 2; }

    /* ── Rodapé / Atalhos ── */
    .panel-footer {
      padding: 14px 20px; background: var(--bg-subtle);
      border-top: 1px solid var(--border); flex-shrink: 0;
    }
    .shortcuts-title {
      font-size: 10px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.08em; color: var(--text-muted); margin-bottom: 8px;
    }
    .shortcut-item {
      display: flex; justify-content: space-between; align-items: center;
      padding: 3px 0; font-size: 11px; color: var(--text-muted);
    }
    .shortcut-key {
      background: var(--bg); border: 1px solid var(--border-strong);
      padding: 1px 6px; border-radius: 4px; font-weight: 600; font-size: 10px;
      color: var(--text); font-family: 'SF Mono', 'Fira Code', monospace; white-space: nowrap;
    }

    /* ── Bolinha Capi ── */
    .capi-bubble {
      position: absolute; bottom: 115px; right: 0;
      background: var(--primary); color: white;
      border-radius: 10px 10px 0 10px; padding: 9px 13px;
      font-size: 12px; font-weight: 500; box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      opacity: 0; transform: translateY(8px) scale(0.95);
      transition: opacity 0.25s ease, transform 0.25s ease;
      pointer-events: none; max-width: 200px; white-space: normal;
      line-height: 1.5; z-index: 20;
    }
    .capi-bubble.visible { opacity: 1; transform: translateY(0) scale(1); }
    .capi-bubble::after {
      content: ''; position: absolute; bottom: -7px; right: 12px;
      width: 0; height: 0;
      border-left: 7px solid transparent; border-top: 7px solid var(--primary);
    }

    /* ── Alto Contraste ── */
    :host(.high-contrast) {
      --primary: #000000; --primary-hover: #222222; --primary-light: #333;
      --accent: #FFFF00; --bg: #000000; --bg-subtle: #111111;
      --text: #ffffff; --text-muted: #cccccc; --border: #555555; --border-strong: #ffffff;
    }
    :host(.high-contrast) .capi-bubble { background: #FFFF00; color: #000; }
    :host(.high-contrast) .capi-bubble::after { border-top-color: #FFFF00; }
    :host(.high-contrast) .panel-btn.active { background: #FFFF00; color: #000; border-color: #FFFF00; }
    :host(.high-contrast) .transport-btn.primary { background: #FFFF00; color: #000; border-color: #FFFF00; }
    :host(.high-contrast) .toggle-badge.on { background: #FFFF00; color: #000; }
    :host(.high-contrast) .shortcut-key { background: #fff; color: #000; border-color: #fff; }
    </style>

    <!-- Balão de boas-vindas -->
    <div class="capi-bubble" id="capiBubble" aria-hidden="true">
    Pressione <strong>Alt + A</strong> para abrir o menu ou <strong>Alt + P</strong> para ouvir a página.
    </div>

    <!-- Mascote -->
    <div class="mascot-trigger" id="mascotTrigger">
    <capi-mascot id="capiMascot"></capi-mascot>
    </div>

    <!-- Botão alternativo (quando mascote oculto) -->
    <div class="mascot-trigger hidden" id="altTriggerContainer">
    <button class="alt-trigger" title="Abrir menu de acessibilidade" aria-label="Abrir menu de acessibilidade Acre Acessível" aria-expanded="false" id="altTriggerBtn">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
    <circle cx="12" cy="5" r="2"/><path d="M12 9v4M8 21l4-8 4 8M6 13h12"/>
    </svg>
    </button>
    </div>

    <!-- Drawer -->
    <div class="panel-drawer" id="panelDrawer" role="dialog" aria-modal="true"
    aria-label="Painel de Acessibilidade Acre Acessível" aria-describedby="panelDesc">

    <div class="panel-header">
    <h2 class="panel-title">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
    <circle cx="12" cy="5" r="2"/><path d="M12 9v4M8 21l4-8 4 8M6 13h12"/>
    </svg>
    Acre Acessível
    </h2>
    <button class="close-btn" id="closeBtn" aria-label="Fechar painel">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
    </button>
    </div>

    <p id="panelDesc" style="position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden;">
    Painel de configurações de acessibilidade. Use Tab para navegar. Pressione Escape para fechar.
    </p>

    <div class="panel-content">

    <!-- Leitor de Voz -->
    <div class="section-title">Leitor de Voz</div>
    <div class="voice-controls">
    <div class="voice-transport">
    <button class="transport-btn" id="prevBtn" title="Elemento anterior (Alt+B)" aria-label="Elemento anterior">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
    <polygon points="19 20 9 12 19 4 19 20" fill="currentColor" stroke="none"/>
    <line x1="5" y1="4" x2="5" y2="20"/>
    </svg>
    </button>

    <button class="transport-btn primary" id="playPauseBtn" title="Ler página (Alt+P)" aria-label="Iniciar leitura">
    <svg id="iconPlay" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <polygon points="5 3 19 12 5 21 5 3"/>
    </svg>
    </button>

    <button class="transport-btn" id="stopBtn" title="Parar leitura (Alt+S)" aria-label="Parar leitura">
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <rect x="4" y="4" width="16" height="16" rx="2"/>
    </svg>
    </button>

    <button class="transport-btn" id="nextBtn" title="Próximo elemento (Alt+N)" aria-label="Próximo elemento">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
    <polygon points="5 4 15 12 5 20 5 4" fill="currentColor" stroke="none"/>
    <line x1="19" y1="4" x2="19" y2="20"/>
    </svg>
    </button>
    </div>

    <div class="slider-group">
    <div class="slider-label">
    <span>Velocidade</span>
    <span id="rateVal">1.00x</span>
    </div>
    <input type="range" class="panel-slider" id="rateSlider"
    min="0.5" max="2.0" step="0.25" value="1.0" aria-label="Velocidade da voz">
    </div>

    <div class="slider-group">
    <div class="slider-label">
    <span>Tom</span>
    <span id="pitchVal">1.00</span>
    </div>
    <input type="range" class="panel-slider" id="pitchSlider"
    min="0.5" max="1.5" step="0.1" value="1.0" aria-label="Tom da voz">
    </div>

    <div class="slider-group">
    <div class="slider-label">
    <span>Volume</span>
    <span id="volumeVal">100%</span>
    </div>
    <input type="range" class="panel-slider" id="volumeSlider"
    min="0" max="1" step="0.1" value="1" aria-label="Volume da voz">
    </div>

    <div class="toggle-row" id="btnHoverSpeak" role="button" tabindex="0"
    aria-pressed="false" title="Ler texto ao apontar com o mouse">
    <span class="toggle-row-label">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
    Apontar para Ouvir
    </span>
    <span class="toggle-badge" id="hoverSpeakLabel">Off</span>
    </div>
    </div>

    <!-- Acessibilidade Visual -->
    <div class="section-title">Acessibilidade Visual</div>
    <div class="button-grid">
    <button class="panel-btn" id="btnFontInc" aria-label="Aumentar tamanho da fonte">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    <line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
    </svg>
    Aumentar
    </button>
    <button class="panel-btn" id="btnFontDec" aria-label="Diminuir tamanho da fonte">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    <line x1="8" y1="11" x2="14" y2="11"/>
    </svg>
    Diminuir
    </button>
    <button class="panel-btn" id="btnContrast" aria-pressed="false" aria-label="Alternar alto contraste">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
    <circle cx="12" cy="12" r="10"/>
    <path d="M12 2a10 10 0 0 1 0 20z" fill="currentColor" stroke="none"/>
    </svg>
    Contraste
    </button>
    <button class="panel-btn" id="btnGrayscale" aria-pressed="false" aria-label="Alternar preto e branco">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
    <circle cx="12" cy="12" r="10"/>
    <path d="M12 2v20M2 12h20" stroke-dasharray="3 2"/>
    </svg>
    P&amp;B
    </button>
    </div>

    <!-- Layout -->
    <div class="section-title">Layout &amp; Espaçamento</div>
    <div class="button-grid">
    <button class="panel-btn" id="btnLineSpacing" aria-label="Espaçamento entre linhas">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
    <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
    <line x1="8" y1="18" x2="21" y2="18"/>
    <polyline points="3 8 3 3 3 3"/><line x1="3" y1="3" x2="3" y2="21"/>
    </svg>
    Linhas: <b id="lineSpacingLabel">Normal</b>
    </button>
    <button class="panel-btn" id="btnLetterSpacing" aria-label="Espaçamento entre letras">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
    <path d="M4 7l4 10M12 7l-4 10M8 14h8M20 7l-4 10"/>
    </svg>
    Letras: <b id="letterSpacingLabel">Normal</b>
    </button>
    <button class="panel-btn full-width" id="btnDyslexic" aria-pressed="false" aria-label="Ativar fonte para dislexia">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
    <path d="M2 6h20M2 12h14M2 18h20"/>
    </svg>
    Fonte para Dislexia
    </button>
    </div>

    <!-- Auditiva -->
    <div class="section-title">Acessibilidade Auditiva</div>
    <div class="button-grid">
    <button class="panel-btn full-width" id="btnLibras" aria-pressed="false" aria-label="Ativar Tradutor de Libras">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
    <path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/>
    <line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/>
    <line x1="14" y1="1" x2="14" y2="4"/>
    </svg>
    Tradutor de Libras: <b id="librasLabel">Off</b>
    </button>
    </div>

    <!-- Mascote -->
    <div class="section-title">Visual do Mascote</div>
    <div class="button-grid">
    <button class="panel-btn full-width" id="btnToggleMascot" aria-label="Mostrar ou ocultar mascote">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
    </svg>
    <span id="mascotBtnLabel">Ocultar Mascote</span>
    </button>
    </div>

    </div><!-- /panel-content -->

    <!-- Rodapé atalhos -->
    <div class="panel-footer">
    <div class="shortcut-item"><span>Ativar / Desativar Painel</span><span class="shortcut-key">Alt + A</span></div>
    <div class="shortcut-item"><span>Play / Pause na Leitura</span><span class="shortcut-key">Alt + P</span></div>
    <div class="shortcut-item"><span>Parar Leitura</span><span class="shortcut-key">Alt + S</span></div>
    <div class="shortcut-item"><span>Próximo elemento</span><span class="shortcut-key">Alt + N</span></div>
    <div class="shortcut-item"><span>Elemento anterior</span><span class="shortcut-key">Alt + B</span></div>
    <div class="shortcut-item"><span>Alto contraste</span><span class="shortcut-key">Alt + C</span></div>
    <div class="shortcut-item"><span>Navegar abas</span><span class="shortcut-key">← →</span></div>
    <div class="shortcut-item"><span>Fechar painel</span><span class="shortcut-key">Esc</span></div>
    </div>
    </div><!-- /panel-drawer -->
    `;
  }

  private setupEvents() {
    const shadow = this.shadow;
    const drawer = shadow.getElementById('panelDrawer')!;
    const capiBubble = shadow.getElementById('capiBubble')!;
    const altTrigger = shadow.querySelector('.alt-trigger')!;
    const closeBtn = shadow.getElementById('closeBtn')!;

    const togglePanel = () => {
      this.isOpen = !this.isOpen;
      if (this.isOpen) {
        drawer.classList.add('open');
        drawer.setAttribute('aria-hidden', 'false');
        this.reader.stop();
        capiBubble.classList.remove('visible');
        const altBtn = shadow.getElementById('altTriggerBtn');
        if (altBtn) altBtn.setAttribute('aria-expanded', 'true');
        setTimeout(() => {
          const first = drawer.querySelector<HTMLElement>(
            'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
          );
          first?.focus();
        }, 410);
      } else {
        drawer.classList.remove('open');
        drawer.setAttribute('aria-hidden', 'true');
        const altBtn = shadow.getElementById('altTriggerBtn');
        if (altBtn) altBtn.setAttribute('aria-expanded', 'false');
      }
    };

    // Escape fecha
    (shadow as any).addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Escape' && this.isOpen) togglePanel();
    });

      this.addEventListener('close-panel', () => { if (this.isOpen) togglePanel(); });

      // Trap de foco
      drawer.addEventListener('keydown', (e: KeyboardEvent) => {
        if (!this.isOpen || e.key !== 'Tab') return;
        const sel = 'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';
        const els = Array.from(drawer.querySelectorAll<HTMLElement>(sel));
        if (!els.length) return;
        if (e.shiftKey && document.activeElement === els[0]) {
          e.preventDefault(); els[els.length - 1].focus();
        } else if (!e.shiftKey && document.activeElement === els[els.length - 1]) {
          e.preventDefault(); els[0].focus();
        }
      });

      // Boas-vindas visual — balão + animação do mascote
      setTimeout(() => {
        if (!this.isOpen) {
          capiBubble.classList.add('visible');
          setTimeout(() => capiBubble.classList.remove('visible'), 6000);
          // Acena o mascote via referência direta ao custom element
          const mascotEl = this.shadow.getElementById('capiMascot') as any;
          if (mascotEl && typeof mascotEl.greet === 'function') {
            mascotEl.greet();
          }
        }
      }, 2000);

      this.addEventListener('toggle-panel', togglePanel);
      altTrigger.addEventListener('click', togglePanel);
      closeBtn.addEventListener('click', togglePanel);

      // Controles de voz
      const playPauseBtn = shadow.getElementById('playPauseBtn')!;
      const stopBtn = shadow.getElementById('stopBtn')!;
      const prevBtn = shadow.getElementById('prevBtn')!;
      const nextBtn = shadow.getElementById('nextBtn')!;
      const rateSlider = shadow.getElementById('rateSlider') as HTMLInputElement;
      const pitchSlider = shadow.getElementById('pitchSlider') as HTMLInputElement;
      const volumeSlider = shadow.getElementById('volumeSlider') as HTMLInputElement;

      playPauseBtn.addEventListener('click', () => {
        if (this.reader.state === 'speaking') this.reader.pause();
        else if (this.reader.state === 'paused') this.reader.resume();
        else this.reader.play();
      });

        stopBtn.addEventListener('click', () => this.reader.stop());
        prevBtn.addEventListener('click', () => this.reader.previous());
        nextBtn.addEventListener('click', () => this.reader.next());

        rateSlider.addEventListener('input', e => {
          const val = parseFloat((e.target as HTMLInputElement).value);
          const label = shadow.getElementById('rateVal');
          if (label) label.innerText = `${val.toFixed(2)}x`;
          this.reader.setRate(val);
          this.saveSettings();
        });

        pitchSlider.addEventListener('input', e => {
          const val = parseFloat((e.target as HTMLInputElement).value);
          const label = shadow.getElementById('pitchVal');
          if (label) label.innerText = val.toFixed(2);
          this.reader.setPitch(val);
          this.saveSettings();
        });

        volumeSlider.addEventListener('input', e => {
          const val = parseFloat((e.target as HTMLInputElement).value);
          const label = shadow.getElementById('volumeVal');
          if (label) label.innerText = `${Math.round(val * 100)}%`;
          this.reader.setVolume(val);
          this.saveSettings();
        });

        // Visuais
        shadow.getElementById('btnFontInc')?.addEventListener('click', () => {
          this.fontScale = Math.min(this.fontScale + 0.1, 2.0);
          this.applySettingsToPage(); this.saveSettings();
        });
        shadow.getElementById('btnFontDec')?.addEventListener('click', () => {
          this.fontScale = Math.max(this.fontScale - 0.1, 0.8);
          this.applySettingsToPage(); this.saveSettings();
        });
        shadow.getElementById('btnContrast')?.addEventListener('click', () => {
          this.isHighContrast = !this.isHighContrast;
          this.applySettingsToPage(); this.saveSettings();
        });
        shadow.getElementById('btnGrayscale')?.addEventListener('click', () => {
          this.isGrayscale = !this.isGrayscale;
          this.applySettingsToPage(); this.saveSettings();
        });
        shadow.getElementById('btnLineSpacing')?.addEventListener('click', () => {
          this.lineSpacing = this.lineSpacing === 'normal' ? 'medium' : this.lineSpacing === 'medium' ? 'large' : 'normal';
          this.applySettingsToPage(); this.saveSettings();
        });
        shadow.getElementById('btnLetterSpacing')?.addEventListener('click', () => {
          this.letterSpacing = this.letterSpacing === 'normal' ? 'medium' : this.letterSpacing === 'medium' ? 'large' : 'normal';
          this.applySettingsToPage(); this.saveSettings();
        });
        shadow.getElementById('btnDyslexic')?.addEventListener('click', () => {
          this.isDyslexicFriendly = !this.isDyslexicFriendly;
          this.applySettingsToPage(); this.saveSettings();
        });
        shadow.getElementById('btnToggleMascot')?.addEventListener('click', () => {
          this.showMascot = !this.showMascot;
          this.applySettingsToPage(); this.saveSettings();
        });

        // Toggle hover speak — suporta click e Enter/Space
        const hoverBtn = shadow.getElementById('btnHoverSpeak')!;
        const toggleHover = () => {
          this.readOnHover = !this.readOnHover;
          this.applySettingsToPage(); this.saveSettings();
        };
        hoverBtn.addEventListener('click', toggleHover);
        hoverBtn.addEventListener('keydown', (e: KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleHover(); }
        });

        // Libras
        shadow.getElementById('btnLibras')?.addEventListener('click', () => {
          this.isLibrasActive = !this.isLibrasActive;
          this.reader.readTextDirectly(
            this.isLibrasActive ? 'Tradução em Libras ativada' : 'Tradução em Libras desativada'
          );
          document.dispatchEvent(new CustomEvent('acre:libras:state', { detail: { active: this.isLibrasActive } }));
          this.applySettingsToPage(); this.saveSettings();
        });

        // Click direto em elemento da página — bloqueado durante leitura sequencial
        document.addEventListener('click', e => {
          if (this.reader.isSequentialReading) return;
          const target = e.target as HTMLElement;
          if (
            target.closest('acre-accessibility-panel') ||
            target.closest('capi-mascot') ||
            target.closest('.audio-player-wrapper') ||
            target.closest('audio')
          ) return;

          const selector = 'h1,h2,h3,h4,h5,h6,p,li,blockquote,article span,label,figcaption,a,button,img[alt],[role="button"]';
          const readable = target.closest(selector) as HTMLElement;
          if (readable) this.reader.readSpecificElement(readable, false);
        });

          // Seleção de texto — bloqueada durante leitura sequencial
          const handleTextSelection = () => {
            setTimeout(() => {
              if (this.reader.isSequentialReading) return;
              const text = window.getSelection()?.toString().trim();
              if (!text || text.length <= 2) return;
              const sel = window.getSelection();
              if (sel?.anchorNode) {
                const parent = sel.anchorNode.parentElement;
                if (
                  parent?.closest('acre-accessibility-panel') ||
                  parent?.closest('capi-mascot') ||
                  parent?.closest('.vpw-plugin-wrapper') ||
                  parent?.closest('#vlibras-div')
                ) return;
              }
              this.reader.readTextDirectly(text);
            }, 80);
          };
          document.addEventListener('mouseup', handleTextSelection);
          document.addEventListener('touchend', handleTextSelection);

          // Hover — bloqueado durante leitura sequencial
          document.addEventListener('mouseover', e => {
            if (!this.readOnHover || this.reader.isSequentialReading) return;
            const target = e.target as HTMLElement;
            if (
              target.closest('acre-accessibility-panel') ||
              target.closest('capi-mascot') ||
              target.closest('.audio-player-wrapper') ||
              target.closest('audio')
            ) return;
            const selector = 'h1,h2,h3,h4,h5,h6,p,li,blockquote,article span,label,figcaption,a,button,img[alt],[role="button"]';
            const readable = target.closest(selector) as HTMLElement;
            if (readable && readable !== this.lastHoveredElement) {
              this.lastHoveredElement = readable;
              if (this.hoverTimeout) clearTimeout(this.hoverTimeout);
              this.hoverTimeout = setTimeout(() => {
                if (!this.reader.isSequentialReading) {
                  this.reader.readSpecificElement(readable, false);
                }
              }, 300);
            }
          });

          document.addEventListener('mouseout', e => {
            if (!this.readOnHover) return;
            const target = e.target as HTMLElement;
            const related = e.relatedTarget as HTMLElement;
            const selector = 'h1,h2,h3,h4,h5,h6,p,li,blockquote,article span,label,figcaption,a,button,img[alt],[role="button"]';
            const readable = target.closest(selector) as HTMLElement;
            const relatedReadable = related ? related.closest(selector) : null;
            if (readable && readable === this.lastHoveredElement && !relatedReadable) {
              if (this.hoverTimeout) clearTimeout(this.hoverTimeout);
              this.lastHoveredElement = null;
            }
          });

          // Foco por teclado — bloqueado durante leitura sequencial
          document.addEventListener('focusin', e => {
            if (!this.readOnHover || this.reader.isSequentialReading) return;
            const target = e.target as HTMLElement;
            if (target.closest('acre-accessibility-panel') || target.closest('capi-mascot')) return;
            const selector = 'h1,h2,h3,h4,h5,h6,p,li,blockquote,article span,label,figcaption,a,button,img[alt],[role="button"]';
            const readable = target.closest(selector) as HTMLElement;
            if (readable) {
              if (this.hoverTimeout) clearTimeout(this.hoverTimeout);
              this.reader.readSpecificElement(readable, false);
            }
          });
  }

  private setupKeyboardShortcuts() {
    window.addEventListener('keydown', e => {
      if (!e.altKey) return;
      switch (e.key.toLowerCase()) {
        case 'a':
          e.preventDefault();
          this.dispatchEvent(new CustomEvent('toggle-panel', { bubbles: true, composed: true }));
          break;
        case 'p':
          e.preventDefault();
          if (this.reader.state === 'speaking') this.reader.pause();
          else if (this.reader.state === 'paused') this.reader.resume();
          else this.reader.play();
          break;
        case 's':
          e.preventDefault();
          this.reader.stop();
          break;
        case 'n':
          e.preventDefault();
          this.reader.next();
          break;
        case 'b':
          e.preventDefault();
          this.reader.previous();
          break;
        case 'c':
          e.preventDefault();
          this.isHighContrast = !this.isHighContrast;
          this.applySettingsToPage(); this.saveSettings();
          break;
      }
    });
  }

  private handleVoiceStateChange(state: 'idle' | 'speaking' | 'paused') {
    const shadow = this.shadow;
    const playPauseBtn = shadow.getElementById('playPauseBtn');
    const iconPlay = shadow.getElementById('iconPlay');

    if (!playPauseBtn || !iconPlay) return;

    if (state === 'speaking') {
      iconPlay.setAttribute('viewBox', '0 0 24 24');
      iconPlay.setAttribute('fill', 'currentColor');
      iconPlay.innerHTML = '<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>';
      playPauseBtn.setAttribute('aria-label', 'Pausar leitura');
      playPauseBtn.setAttribute('title', 'Pausar leitura (Alt+P)');
      this.setMascotState('speaking');
    } else if (state === 'paused') {
      iconPlay.setAttribute('viewBox', '0 0 24 24');
      iconPlay.setAttribute('fill', 'currentColor');
      iconPlay.innerHTML = '<polygon points="5 3 19 12 5 21 5 3"/>';
      playPauseBtn.setAttribute('aria-label', 'Retomar leitura');
      playPauseBtn.setAttribute('title', 'Retomar leitura (Alt+P)');
      this.setMascotState('idle');
    } else {
      iconPlay.setAttribute('viewBox', '0 0 24 24');
      iconPlay.setAttribute('fill', 'currentColor');
      iconPlay.innerHTML = '<polygon points="5 3 19 12 5 21 5 3"/>';
      playPauseBtn.setAttribute('aria-label', 'Iniciar leitura');
      playPauseBtn.setAttribute('title', 'Ler página (Alt+P)');
      this.setMascotState('idle');
    }
  }

  private handleElementHighlight(element: HTMLElement | null) {
    if (element) {
      this.setMascotState(this.reader.state === 'speaking' ? 'speaking' : 'reading');
    } else {
      this.setMascotState('idle');
    }
  }

  private applySettingsToPage() {
    const shadow = this.shadow;
    const body = document.body;
    const docEl = document.documentElement;

    // Fonte
    docEl.style.setProperty('--acre-font-multiplier', this.fontScale.toString());

    // Alto contraste
    const btnContrast = shadow.getElementById('btnContrast');
    if (this.isHighContrast) {
      docEl.classList.add('acre-high-contrast-mode');
      this.classList.add('high-contrast');
      btnContrast?.classList.add('active');
      btnContrast?.setAttribute('aria-pressed', 'true');
      const mascot = shadow.getElementById('capiMascot') as any;
      if (mascot?.setHighContrast) mascot.setHighContrast(true);
    } else {
      docEl.classList.remove('acre-high-contrast-mode');
      this.classList.remove('high-contrast');
      btnContrast?.classList.remove('active');
      btnContrast?.setAttribute('aria-pressed', 'false');
      const mascot = shadow.getElementById('capiMascot') as any;
      if (mascot?.setHighContrast) mascot.setHighContrast(false);
    }

    // Grayscale
    const btnGray = shadow.getElementById('btnGrayscale');
    if (this.isGrayscale) {
      body.classList.add('acre-grayscale-mode');
      btnGray?.classList.add('active');
      btnGray?.setAttribute('aria-pressed', 'true');
    } else {
      body.classList.remove('acre-grayscale-mode');
      btnGray?.classList.remove('active');
      btnGray?.setAttribute('aria-pressed', 'false');
    }

    // Line spacing
    const lineLabel = shadow.getElementById('lineSpacingLabel');
    const btnLine = shadow.getElementById('btnLineSpacing');
    const lineMap = { normal: ['normal', 'Normal', false], medium: ['1.8', 'Médio', true], large: ['2.3', 'Largo', true] } as const;
    const [lVal, lText, lActive] = lineMap[this.lineSpacing];
    docEl.style.setProperty('--acre-line-spacing', lVal);
    if (lineLabel) lineLabel.innerText = lText;
    btnLine?.classList.toggle('active', lActive);

    // Letter spacing
    const letterLabel = shadow.getElementById('letterSpacingLabel');
    const btnLetter = shadow.getElementById('btnLetterSpacing');
    const letterMap = { normal: ['normal', 'Normal', false], medium: ['0.12em', 'Médio', true], large: ['0.2em', 'Largo', true] } as const;
    const [ltVal, ltText, ltActive] = letterMap[this.letterSpacing];
    docEl.style.setProperty('--acre-letter-spacing', ltVal);
    if (letterLabel) letterLabel.innerText = ltText;
    btnLetter?.classList.toggle('active', ltActive);

    // Dislexia
    const btnDyslexic = shadow.getElementById('btnDyslexic');
    body.classList.toggle('acre-dyslexic-mode', this.isDyslexicFriendly);
    btnDyslexic?.classList.toggle('active', this.isDyslexicFriendly);
    btnDyslexic?.setAttribute('aria-pressed', String(this.isDyslexicFriendly));

    // Mascote
    const mascotTrigger = shadow.getElementById('mascotTrigger');
    const altContainer = shadow.getElementById('altTriggerContainer');
    const mascotLabel = shadow.getElementById('mascotBtnLabel');
    if (this.showMascot) {
      mascotTrigger?.classList.remove('hidden');
      altContainer?.classList.add('hidden');
      if (mascotLabel) mascotLabel.innerText = 'Ocultar Mascote';
      shadow.getElementById('btnToggleMascot')?.classList.remove('active');
    } else {
      mascotTrigger?.classList.add('hidden');
      altContainer?.classList.remove('hidden');
      if (mascotLabel) mascotLabel.innerText = 'Mostrar Mascote';
      shadow.getElementById('btnToggleMascot')?.classList.add('active');
    }

    // Hover speak
    const hoverLabel = shadow.getElementById('hoverSpeakLabel');
    const hoverBtn = shadow.getElementById('btnHoverSpeak');
    if (hoverLabel) hoverLabel.innerText = this.readOnHover ? 'On' : 'Off';
    hoverLabel?.classList.toggle('on', this.readOnHover);
    hoverBtn?.setAttribute('aria-pressed', String(this.readOnHover));

    // Libras
    const librasLabel = shadow.getElementById('librasLabel');
    const btnLibras = shadow.getElementById('btnLibras');
    if (librasLabel) librasLabel.innerText = this.isLibrasActive ? 'On' : 'Off';
    btnLibras?.classList.toggle('active', this.isLibrasActive);
    btnLibras?.setAttribute('aria-pressed', String(this.isLibrasActive));

    if (this.isLibrasActive) {
      if (!document.getElementById('vlibras-div')) this.injectVLibras();
      else document.getElementById('vlibras-div')!.style.display = 'block';
    } else {
      const vd = document.getElementById('vlibras-div');
      if (vd) vd.style.display = 'none';
    }
  }

  private saveSettings() {
    const rateSlider = this.shadow.getElementById('rateSlider') as HTMLInputElement;
    const pitchSlider = this.shadow.getElementById('pitchSlider') as HTMLInputElement;
    const volumeSlider = this.shadow.getElementById('volumeSlider') as HTMLInputElement;
    localStorage.setItem('acre_acessivel_settings', JSON.stringify({
      fontScale: this.fontScale,
      isHighContrast: this.isHighContrast,
      isGrayscale: this.isGrayscale,
      lineSpacing: this.lineSpacing,
      letterSpacing: this.letterSpacing,
      isDyslexicFriendly: this.isDyslexicFriendly,
      showMascot: this.showMascot,
      readOnHover: this.readOnHover,
      isLibrasActive: this.isLibrasActive,
      rate: parseFloat(rateSlider?.value || '1.0'),
      pitch: parseFloat(pitchSlider?.value || '1.0'),
      volume: parseFloat(volumeSlider?.value || '1.0'),
    }));
  }

  private loadSettings() {
    const data = localStorage.getItem('acre_acessivel_settings');
    if (!data) return;
    try {
      const s = JSON.parse(data);
      this.fontScale = s.fontScale ?? 1.0;
      this.isHighContrast = s.isHighContrast ?? false;
      this.isGrayscale = s.isGrayscale ?? false;
      this.lineSpacing = s.lineSpacing ?? 'normal';
      this.letterSpacing = s.letterSpacing ?? 'normal';
      this.isDyslexicFriendly = s.isDyslexicFriendly ?? false;
      this.showMascot = s.showMascot ?? true;
      this.readOnHover = s.readOnHover ?? false;
      this.isLibrasActive = s.isLibrasActive ?? false;

      const rateSlider = this.shadow.getElementById('rateSlider') as HTMLInputElement;
      const rateVal = this.shadow.getElementById('rateVal');
      if (rateSlider && s.rate !== undefined) {
        rateSlider.value = s.rate.toString();
        if (rateVal) rateVal.innerText = `${s.rate.toFixed(2)}x`;
        this.reader.setRate(s.rate);
      }
      const pitchSlider = this.shadow.getElementById('pitchSlider') as HTMLInputElement;
      const pitchVal = this.shadow.getElementById('pitchVal');
      if (pitchSlider && s.pitch !== undefined) {
        pitchSlider.value = s.pitch.toString();
        if (pitchVal) pitchVal.innerText = s.pitch.toFixed(2);
        this.reader.setPitch(s.pitch);
      }
      const volumeSlider = this.shadow.getElementById('volumeSlider') as HTMLInputElement;
      const volumeVal = this.shadow.getElementById('volumeVal');
      if (volumeSlider && s.volume !== undefined) {
        volumeSlider.value = s.volume.toString();
        if (volumeVal) volumeVal.innerText = `${Math.round(s.volume * 100)}%`;
        this.reader.setVolume(s.volume);
      }
    } catch (e) {
      console.error('Erro ao ler configurações:', e);
    }
  }

  private injectVLibras() {
    if (document.getElementById('vlibras-div')) return;
    const div = document.createElement('div');
    div.id = 'vlibras-div';
    div.setAttribute('vw', '');
    div.classList.add('enabled');
    div.innerHTML = `<div vw-access-button class="active"></div><div vw-plugin-wrapper><div class="vw-plugin-top-wrapper"></div></div>`;
    document.body.appendChild(div);
    const script = document.createElement('script');
    script.src = 'https://vlibras.gov.br/app/vlibras-plugin.js';
    script.onload = () => {
      // @ts-ignore
      if (window.VLibras?.Widget) new window.VLibras.Widget('https://vlibras.gov.br/app');
    };
      document.head.appendChild(script);
  }
}

customElements.define('acre-accessibility-panel', AcreAccessibilityPanel);
