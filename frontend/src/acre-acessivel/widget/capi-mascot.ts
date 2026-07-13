/**
 * Acre Acessível - Mascote Capi (Capivarinha)
 * Web Component para o Mascote Interativo Capi.
 */

export class CapiMascot extends HTMLElement {
  private shadow: ShadowRoot;
  private isMuted: boolean = false;
  private isExpanded: boolean = false;
  private greetTimeoutId: number | null = null;
  private pressTimeoutId: number | null = null;
  private readonly handleKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
      event.preventDefault();
      this.activate();
    }
  };

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
  }

  static get observedAttributes() {
    return ['state', 'muted'];
  }

  attributeChangedCallback(name: string, _oldValue: string, newValue: string) {
    if (name === 'state') {
      this.setMascotState(newValue);
    } else if (name === 'muted') {
      this.isMuted = newValue === 'true';
      this.updateMutedIcon();
    }
  }

  connectedCallback() {
    // role="button" (não "img"): o elemento é interativo e abre um menu,
    // então leitores de tela precisam anunciá-lo como acionável.
    this.setAttribute('role', 'button');
    this.setAttribute('aria-haspopup', 'menu');
    this.setAttribute('aria-expanded', 'false');
    this.setAttribute('aria-label', 'Capi, mascote do Acre Acessível. Ativar para abrir o menu de acessibilidade.');
    this.setAttribute('tabindex', '0');
    this.render();
    this.setupEvents();
    this.addEventListener('keydown', this.handleKeydown);
    // Acena após 2s de carregamento
    this.greetTimeoutId = window.setTimeout(() => this.greet(), 2200);
  }

  disconnectedCallback() {
    this.removeEventListener('keydown', this.handleKeydown);
    if (this.greetTimeoutId !== null) window.clearTimeout(this.greetTimeoutId);
    if (this.pressTimeoutId !== null) window.clearTimeout(this.pressTimeoutId);
  }

  private render() {
    this.shadow.innerHTML = `
    <style>
    :host {
      display: block;
      width: 90px;
      height: 110px;
      cursor: pointer;
      user-select: none;
      transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      filter: drop-shadow(0 10px 15px rgba(0,0,0,0.15));
      /* Cores da Bandeira do Acre (aproximação, sem hex oficial publicado em lei) */
      --ac-green: #0d8a3e;
      --ac-yellow: #ffd400;
      --ac-red: #d62828;
    }

    :host(:hover) {
      transform: scale(1.1) translateY(-5px);
    }

    :host(:focus-visible) {
      outline: none;
      transform: scale(1.06) translateY(-3px);
    }

    /* Anel de foco visível — essencial num widget de acessibilidade */
    .focus-ring {
      fill: none;
      stroke: var(--ac-yellow);
      stroke-width: 0;
      opacity: 0;
      transition: opacity 0.15s, stroke-width 0.15s;
    }

    :host(:focus-visible) .focus-ring {
      opacity: 1;
      stroke-width: 3;
      stroke-dasharray: 4 3;
    }

    :host(.pressed) {
      transform: scale(0.94) translateY(0);
    }

    @media (prefers-reduced-motion: reduce) {
      :host { transition: none; }
      :host(:hover) { transform: none; }
      .animate-float,
      .eye-group-left,
      .eye-group-right,
      .ear-right,
      .ear-left,
      .mouth-talk,
      :host(.greeting) {
        animation: none !important;
      }
    }

    .mascot-container {
      position: relative;
      width: 100%;
      height: 100%;
    }

    /* SVG Animado da Capivara Capi */
    svg {
      width: 100%;
      height: 100%;
      overflow: visible;
    }

    /* Cores da Capivara */
    .fur-body { fill: url(#furGradient); transition: fill 0.3s; }
    .fur-snout { fill: #6E4720; transition: fill 0.3s; }
    .fur-belly { fill: url(#bellyGradient); transition: fill 0.3s; }
    .fur-ear-inner { fill: #523416; }
    .eye { fill: #222; }
    .eye-shine { fill: #FFF; }
    .glasses-frame { stroke: var(--ac-green); stroke-width: 2.5; fill: none; opacity: 0; transition: opacity 0.3s, stroke 0.3s; }
    .glasses-lens { fill: url(#lensGradient); stroke: rgba(135, 206, 250, 0.4); stroke-width: 1; opacity: 0; transition: opacity 0.3s; }
    .glasses-accent { fill: var(--ac-yellow); opacity: 0; transition: opacity 0.3s; }
    .cheek { fill: #FF8A8A; opacity: 0.6; }
    .leaf-main { fill: #2d6a4f; }
    .leaf-side { fill: #1b4332; }
    .leaf-center { fill: #347a52; }
    .leaf-vein { stroke: #14271c; stroke-width: 0.5; opacity: 0.5; fill: none; }
    .ac-star { fill: var(--ac-red); }
    .seal-ring { fill: none; stroke: url(#sealGradient); stroke-width: 2; opacity: 0.55; }
    .seal-ring-inner { fill: none; stroke: var(--ac-yellow); stroke-width: 0.75; opacity: 0.35; stroke-dasharray: 1.5 2.5; }

    /* Boca */
    .mouth-idle { display: block; }
    .mouth-talk { display: none; fill: #4A1E00; }

    /* Animações */
    @keyframes blink {
      0%, 90%, 100% { transform: scaleY(1); }
      95% { transform: scaleY(0.1); }
    }

    @keyframes ear-wiggle {
      0%, 90%, 100% { transform: rotate(0deg); }
      93% { transform: rotate(-8deg); }
      96% { transform: rotate(8deg); }
    }

    @keyframes talk {
      0%, 100% { transform: scaleY(0.2); }
      50% { transform: scaleY(1.3); }
    }

    @keyframes float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-4px); }
    }


    @keyframes greeting-wave {
      0%, 100% { transform: rotate(0deg) translateY(0); }
      15% { transform: rotate(-15deg) translateY(-3px); }
      30% { transform: rotate(12deg) translateY(-5px); }
      45% { transform: rotate(-10deg) translateY(-3px); }
      60% { transform: rotate(8deg) translateY(-4px); }
      75% { transform: rotate(-5deg) translateY(-2px); }
      90% { transform: rotate(3deg) translateY(-1px); }
    }

    :host(.greeting) {
      animation: greeting-wave 1.2s ease-in-out;
    }

    .animate-float {
      animation: float 4s ease-in-out infinite;
    }

    .eye-group-left {
      transform-origin: 35px 43px;
      animation: blink 5s infinite;
    }

    .eye-group-right {
      transform-origin: 58px 43px;
      animation: blink 5s infinite;
    }

    .ear-right {
      transform-origin: 65px 25px;
      animation: ear-wiggle 6s infinite;
    }

    .ear-left {
      transform-origin: 25px 22px;
      animation: ear-wiggle 6s infinite 0.5s;
    }

    /* Estados ativos */
    :host([state="speaking"]) .mouth-idle {
      display: none;
    }
    :host([state="speaking"]) .mouth-talk {
      display: block;
      transform-origin: 48px 65px;
      animation: talk 0.25s infinite alternate;
    }

    :host([state="reading"]) .glasses-frame,
    :host([state="reading"]) .glasses-lens,
    :host([state="reading"]) .glasses-accent,
    :host([state="speaking"]) .glasses-frame,
    :host([state="speaking"]) .glasses-lens,
    :host([state="speaking"]) .glasses-accent {
      opacity: 1;
    }

    /* Alto Contraste */
    :host(.high-contrast) .fur-body { fill: #000; stroke: #FFF; stroke-width: 2; }
    :host(.high-contrast) .fur-snout { fill: #000; stroke: #FFF; stroke-width: 2; }
    :host(.high-contrast) .fur-ear-inner { fill: #FFF; }
    :host(.high-contrast) .eye { fill: #FFF; }
    :host(.high-contrast) .glasses-frame { stroke: #FFFF00; stroke-width: 3; }
    :host(.high-contrast) .glasses-lens { fill: rgba(255, 255, 0, 0.1); stroke: #FFFF00; }

    /* Balão de Fala do Capi */
    .speech-bubble {
      position: absolute;
      bottom: 110px;
      right: 0px;
      max-width: min(220px, 70vw);
      width: max-content;
      background: white;
      border: 2px solid #1b4332;
      border-radius: 12px;
      padding: 8px 12px;
      font-family: 'Outfit', 'Inter', system-ui, -apple-system, sans-serif;
      font-size: 12px;
      font-weight: 500;
      line-height: 1.35;
      color: #1b4332;
      white-space: normal;
      box-shadow: 0 4px 10px rgba(0,0,0,0.1);
      opacity: 0;
      transform: translateY(10px) scale(0.9);
      transition: opacity 0.3s, transform 0.3s;
      pointer-events: none;
    }

    .speech-bubble::after {
      content: '';
      position: absolute;
      bottom: -8px;
      right: 35px;
      border-width: 8px 8px 0;
      border-style: solid;
      border-color: white transparent;
      display: block;
      width: 0;
    }

    .speech-bubble::before {
      content: '';
      position: absolute;
      bottom: -11px;
      right: 34px;
      border-width: 9px 9px 0;
      border-style: solid;
      border-color: #1b4332 transparent;
      display: block;
      width: 0;
      z-index: -1;
    }

    :host(:hover) .speech-bubble {
      opacity: 1;
      transform: translateY(0) scale(1);
    }

    .muted-indicator {
      position: absolute;
      top: -5px;
      right: -5px;
      background: #ef4444;
      color: white;
      border-radius: 50%;
      width: 22px;
      height: 22px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.2);
      opacity: 0;
      transform: scale(0.5);
      transition: opacity 0.3s, transform 0.3s;
    }

    .muted-indicator.visible {
      opacity: 1;
      transform: scale(1);
    }
    </style>

    <div class="mascot-container animate-float">
    <div class="speech-bubble">Olá! Sou o Capi. Clique em mim!</div>

    <!-- Mascote SVG -->
    <svg viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="furGradient" cx="40%" cy="30%" r="75%">
        <stop offset="0%" stop-color="#A8723F" />
        <stop offset="70%" stop-color="#8B5A2B" />
        <stop offset="100%" stop-color="#6E4720" />
      </radialGradient>
      <radialGradient id="bellyGradient" cx="50%" cy="20%" r="80%">
        <stop offset="0%" stop-color="#B98249" />
        <stop offset="100%" stop-color="#8E5D33" />
      </radialGradient>
      <linearGradient id="lensGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="rgba(255,255,255,0.35)" />
        <stop offset="55%" stop-color="rgba(135,206,250,0.12)" />
        <stop offset="100%" stop-color="rgba(135,206,250,0.18)" />
      </linearGradient>
      <linearGradient id="sealGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="var(--ac-yellow)" />
        <stop offset="100%" stop-color="var(--ac-green)" />
      </linearGradient>
    </defs>

    <!-- Selo institucional: anel sutil ao fundo, remete a brasão/carimbo oficial -->
    <circle cx="50" cy="58" r="48" class="seal-ring" />
    <circle cx="50" cy="58" r="44" class="seal-ring-inner" />

    <!-- Anel de foco (visível apenas via :focus-visible) -->
    <circle cx="50" cy="58" r="52" class="focus-ring" />

    <!-- Patas traseiras/Corpo de baixo -->
    <ellipse cx="50" cy="98" rx="28" ry="12" class="fur-belly" />

    <!-- Corpo principal -->
    <path d="M 28 98 C 22 75, 25 50, 40 45 C 55 40, 72 45, 76 65 C 79 80, 76 95, 72 98 Z" class="fur-body" />

    <!-- Orelha Esquerda -->
    <g class="ear-left">
    <ellipse cx="28" cy="25" rx="7" ry="9" class="fur-body" transform="rotate(-15 28 25)" />
    <ellipse cx="28" cy="26" rx="4" ry="6" class="fur-ear-inner" transform="rotate(-15 28 26)" />
    </g>

    <!-- Orelha Direita -->
    <g class="ear-right">
    <ellipse cx="65" cy="27" rx="8" ry="10" class="fur-body" transform="rotate(15 65 27)" />
    <ellipse cx="65" cy="28" rx="5" ry="7" class="fur-ear-inner" transform="rotate(15 65 28)" />
    </g>

    <!-- Cabeça -->
    <!-- O formato característico de 'bloco' da cabeça da capivara -->
    <path d="M 28 50 C 28 30, 35 22, 52 24 C 69 26, 70 35, 68 55 C 66 68, 55 72, 45 72 C 34 71, 28 65, 28 50 Z" class="fur-body" />

    <!-- Focinho/Parte da Boca da capivara (mais escura) -->
    <path d="M 40 50 C 40 45, 48 42, 60 44 C 68 46, 68 55, 65 62 C 60 69, 48 68, 42 66 C 39 64, 40 55, 40 50 Z" class="fur-snout" />

    <!-- Bochecha corada -->
    <ellipse cx="37" cy="60" rx="4" ry="3" class="cheek" />

    <!-- Olho Esquerdo (visível de perfil de 3/4) -->
    <g class="eye-group-left">
    <ellipse cx="35" cy="43" rx="3.5" ry="4.5" class="eye" />
    <circle cx="33.5" cy="41.5" r="1.2" class="eye-shine" />
    </g>

    <!-- Olho Direito (faltava — a lente direita dos óculos ficava "flutuando" sem olho por baixo) -->
    <g class="eye-group-right">
    <ellipse cx="58" cy="43" rx="3.2" ry="4" class="eye" />
    <circle cx="56.7" cy="41.5" r="1" class="eye-shine" />
    </g>

    <!-- Óculos (Aparecem quando o estado é 'reading') -->
    <g class="glasses">
    <!-- Lente e Armação da Esquerda -->
    <circle cx="35" cy="43" r="8" class="glasses-lens" />
    <circle cx="35" cy="43" r="8" class="glasses-frame" />
    <!-- Ponte dos óculos -->
    <path d="M 43 43 Q 47 41 51 43" class="glasses-frame" />
    <!-- Micro-triângulo amarelo: eco da diagonal bandeira do Acre, discreto, só visível com a ponte -->
    <polygon points="45.5,41.7 47,39.8 48.5,41.7" class="glasses-accent" />
    <!-- Lente e Armação da Direita (raio levemente menor para não sobrepor a base da orelha direita) -->
    <circle cx="58" cy="44" r="7.3" class="glasses-lens" />
    <circle cx="58" cy="44" r="7.3" class="glasses-frame" />
    </g>

    <!-- Nariz de Capivara -->
    <path d="M 62 46 C 64 45, 66 45, 67 47 C 67 49, 65 52, 62 50 Z" fill="#2D1C0C" />

    <!-- Boca / Linha de expressão -->
    <!-- Boca Ociosa -->
    <path d="M 52 61 Q 57 63 60 60" stroke="#3A2410" stroke-width="2" fill="none" class="mouth-idle" />

    <!-- Boca Falando -->
    <ellipse cx="56" cy="62" rx="3" ry="4" class="mouth-talk" />

    <!-- Pequeno Dente de capivara aparecendo na boca falando -->
    <rect x="54.5" y="58" width="3" height="2" fill="#FFF" class="mouth-talk" style="animation: none;" />

    <!-- Folha de Seringueira (Hevea brasiliensis): 3 folíolos em leque, símbolo do extrativismo acreano -->
    <g class="seringueira-leaf">
    <path d="M 18 108 Q 19 92 13 86 Q 11 100 16 110 Z" class="leaf-center" />
    <path d="M 18 108 Q 13.5 95 13 86" class="leaf-vein" />
    <path d="M 20 108 Q 15 100 8 102 Q 13 108 20 110 Z" class="leaf-main" />
    <path d="M 20 108.5 Q 14.5 103 8 102" class="leaf-vein" />
    <path d="M 23 108 Q 22 95 16 93 Q 20 105 23 110 Z" class="leaf-side" />
    <path d="M 22.7 108.5 Q 19 100 16 93" class="leaf-vein" />
    </g>

    <!-- Broche estrela vermelha (estrela solitária da bandeira do Acre), sempre visível -->
    <path class="ac-star" transform="translate(12, -15)" d="M 50 86 L 51.18 89.82 L 55.18 89.82 L 51.9 92.09 L 53.09 95.91 L 50 93.64 L 46.91 95.91 L 48.09 92.09 L 44.82 89.82 L 48.82 89.82 Z" />
    </svg>

    <div class="muted-indicator" id="mutedIndicator">🔇</div>
    </div>
    `;
  }

  private setupEvents() {
    this.addEventListener('click', () => this.activate());
  }

  private activate() {
    this.isExpanded = !this.isExpanded;
    this.setAttribute('aria-expanded', String(this.isExpanded));

    // Feedback tátil/visual rápido ao acionar
    this.classList.add('pressed');
    if (this.pressTimeoutId !== null) window.clearTimeout(this.pressTimeoutId);
    this.pressTimeoutId = window.setTimeout(() => this.classList.remove('pressed'), 150);

    // Dispara um evento customizado que o painel principal irá escutar
    this.dispatchEvent(new CustomEvent('toggle-panel', {
      bubbles: true,
      composed: true,
      detail: { expanded: this.isExpanded }
    }));
  }

  private setMascotState(state: string) {
    const bubble = this.shadow.querySelector('.speech-bubble') as HTMLElement;
    if (!bubble) return;

    if (state === 'speaking') {
      bubble.innerText = 'Estou lendo para você...';
      bubble.style.opacity = '1';
      bubble.style.transform = 'translateY(0) scale(1)';
    } else if (state === 'reading') {
      bubble.innerText = 'Modo leitura ativo!';
      bubble.style.opacity = '1';
      bubble.style.transform = 'translateY(0) scale(1)';
    } else {
      // idle — volta ao estado padrão (hover mostra via CSS)
      bubble.innerText = 'Olá! Sou o Capi. Clique em mim!';
      bubble.style.opacity = '';
      bubble.style.transform = '';
    }
  }

  private updateMutedIcon() {
    const indicator = this.shadow.getElementById('mutedIndicator');
    if (indicator) {
      if (this.isMuted) {
        indicator.classList.add('visible');
      } else {
        indicator.classList.remove('visible');
      }
    }
  }

  public setHighContrast(active: boolean) {
    const host = this.shadow.host;
    if (active) {
      host.classList.add('high-contrast');
    } else {
      host.classList.remove('high-contrast');
    }
  }

  // Animação de boas-vindas — pode ser chamada externamente
  public greet() {
    this.classList.add('greeting');
    setTimeout(() => this.classList.remove('greeting'), 1300);
  }

}

customElements.define('capi-mascot', CapiMascot);
