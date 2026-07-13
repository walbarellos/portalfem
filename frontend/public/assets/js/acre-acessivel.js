(function(){var e=class extends HTMLElement{shadow;isMuted=!1;isExpanded=!1;greetTimeoutId=null;pressTimeoutId=null;handleKeydown=e=>{(e.key===`Enter`||e.key===` `||e.key===`Spacebar`)&&(e.preventDefault(),this.activate())};constructor(){super(),this.shadow=this.attachShadow({mode:`open`})}static get observedAttributes(){return[`state`,`muted`]}attributeChangedCallback(e,t,n){e===`state`?this.setMascotState(n):e===`muted`&&(this.isMuted=n===`true`,this.updateMutedIcon())}connectedCallback(){this.setAttribute(`role`,`button`),this.setAttribute(`aria-haspopup`,`menu`),this.setAttribute(`aria-expanded`,`false`),this.setAttribute(`aria-label`,`Capi, mascote do Acre Acessível. Ativar para abrir o menu de acessibilidade.`),this.setAttribute(`tabindex`,`0`),this.render(),this.setupEvents(),this.addEventListener(`keydown`,this.handleKeydown),this.greetTimeoutId=window.setTimeout(()=>this.greet(),2200)}disconnectedCallback(){this.removeEventListener(`keydown`,this.handleKeydown),this.greetTimeoutId!==null&&window.clearTimeout(this.greetTimeoutId),this.pressTimeoutId!==null&&window.clearTimeout(this.pressTimeoutId)}render(){this.shadow.innerHTML=`
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
    `}setupEvents(){this.addEventListener(`click`,()=>this.activate())}activate(){this.isExpanded=!this.isExpanded,this.setAttribute(`aria-expanded`,String(this.isExpanded)),this.classList.add(`pressed`),this.pressTimeoutId!==null&&window.clearTimeout(this.pressTimeoutId),this.pressTimeoutId=window.setTimeout(()=>this.classList.remove(`pressed`),150),this.dispatchEvent(new CustomEvent(`toggle-panel`,{bubbles:!0,composed:!0,detail:{expanded:this.isExpanded}}))}setMascotState(e){let t=this.shadow.querySelector(`.speech-bubble`);t&&(e===`speaking`?(t.innerText=`Estou lendo para você...`,t.style.opacity=`1`,t.style.transform=`translateY(0) scale(1)`):e===`reading`?(t.innerText=`Modo leitura ativo!`,t.style.opacity=`1`,t.style.transform=`translateY(0) scale(1)`):(t.innerText=`Olá! Sou o Capi. Clique em mim!`,t.style.opacity=``,t.style.transform=``))}updateMutedIcon(){let e=this.shadow.getElementById(`mutedIndicator`);e&&(this.isMuted?e.classList.add(`visible`):e.classList.remove(`visible`))}setHighContrast(e){let t=this.shadow.host;e?t.classList.add(`high-contrast`):t.classList.remove(`high-contrast`)}greet(){this.classList.add(`greeting`),setTimeout(()=>this.classList.remove(`greeting`),1300)}};customElements.define(`capi-mascot`,e);var t={IFAC:`I F A C`,FEM:`F E M`,CPF:`C P F`,CNPJ:`C N P J`,CEP:`C E P`,PDF:`P D F`,URL:`U R L`,HTML:`H T M L`,CSS:`C S S`,API:`A P I`,TI:`T I`,RH:`R H`,EAD:`E A D`,ENEM:`É-NÉM`,SUS:`SÚS`,INSS:`I N S S`,IBGE:`I B G E`,MEC:`MÉQUI`,ONG:`ÓNGUI`},n={1:`primeiro`,2:`segundo`,3:`terceiro`,4:`quarto`,5:`quinto`,6:`sexto`,7:`sétimo`,8:`oitavo`,9:`nono`,10:`décimo`},r={1:`primeira`,2:`segunda`,3:`terceira`,4:`quarta`,5:`quinta`,6:`sexta`,7:`sétima`,8:`oitava`,9:`nona`,10:`décima`},i=/\b(turma|vez|edição|etapa|fase|questão|rodada|vaga|semana|instância|chamada|convocação|via|cópia|série|versão)\b/i,a=[`janeiro`,`fevereiro`,`março`,`abril`,`maio`,`junho`,`julho`,`agosto`,`setembro`,`outubro`,`novembro`,`dezembro`],o=class{static normalizeToChunks(e){let t=this.expandAll(e);return this.splitIntoSentences(t)}static normalize(e){return this.expandAll(e)}static profileForTag(e){switch(e){case`h1`:return{rateMultiplier:.92,pitch:1.08};case`h2`:return{rateMultiplier:.94,pitch:1.05};case`h3`:case`h4`:case`h5`:case`h6`:return{rateMultiplier:.96,pitch:1.03};case`li`:return{rateMultiplier:1,pitch:1};case`blockquote`:return{rateMultiplier:.95,pitch:.97};case`figcaption`:return{rateMultiplier:.95,pitch:.98};default:return{rateMultiplier:1,pitch:1}}}static expandAll(e){let t=e;return t=this.expandCurrency(t),t=this.expandDates(t),t=this.expandPercentages(t),t=this.expandOrdinals(t),t=this.expandAbbreviations(t),t=this.expandAcronyms(t),t=this.expandDecimalNumbers(t),t=this.normalizePunctuationForProsody(t),t.replace(/\s+/g,` `).trim()}static expandCurrency(e){return e.replace(/R\$\s?(\d{1,3}(?:\.\d{3})*)(?:,(\d{2}))?/g,(e,t,n)=>{let r=t;return n&&n!==`00`?`${r} reais e ${n} centavos`:`${r} reais`})}static expandPercentages(e){return e.replace(/(\d+(?:[.,]\d+)?)\s?%/g,(e,t)=>`${t} por cento`)}static expandDates(e){return e.replace(/\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/g,(e,t,n,r)=>`${parseInt(t,10)} de ${a[parseInt(n,10)-1]??n} de ${r.length===2?`20${r}`:r}`)}static expandOrdinals(e){return e=e.replace(/\b(Art\.?|Artigo)\s*(\d{1,3})\s*[ºª]?/gi,(e,t,r)=>`Artigo ${n[r]??r}`),e=e.replace(/\b(\d{1,3})(º|ª)/g,(e,t,i)=>i===`ª`?r[t]??`${t}ª`:n[t]??`${t}º`),e}static hasFeminineNoun(e){return i.test(e)}static expandAbbreviations(e){for(let[t,n]of[[/\bSr\.\s/g,`Senhor `],[/\bSra\.\s/g,`Senhora `],[/\bDr\.\s/g,`Doutor `],[/\bDra\.\s/g,`Doutora `],[/\bProf\.\s/g,`Professor `],[/\bProfa\.\s/g,`Professora `],[/\bEx\.\s/g,`Excelência `],[/\bpág\.\s?/gi,`página `],[/\bpp\.\s?/gi,`páginas `],[/\bnº\s?/gi,`número `],[/\bn\.\s?/gi,`número `],[/\betc\.\b/gi,`etcétera`]])e=e.replace(t,n);return e}static expandAcronyms(e){for(let[n,r]of Object.entries(t)){let t=RegExp(`\\b${n}\\b`,`g`);e=e.replace(t,r)}return e}static expandDecimalNumbers(e){return e.replace(/\b(\d{1,3}(?:\.\d{3})+),(\d+)\b/g,(e,t,n)=>`${t.replace(/\./g,``)} vírgula ${n}`)}static normalizePunctuationForProsody(e){let t=e;return t=t.replace(/\.{3,}/g,`…`),t=t.replace(/!{2,}/g,`!`),t=t.replace(/\?{2,}/g,`?`),t=t.replace(/[–—]/g,`,`),t=t.replace(/\(([^)]+)\)/g,`, $1,`),t=t.replace(/\s*,\s*,\s*/g,`, `),t}static splitIntoSentences(e){if(!e.trim())return[];let t=e.replace(/\b(\w)\.(\w)\./g,`$1_DOT_$2_DOT_`).split(/(?<=[.!?…])\s+(?=[A-ZÀ-Ú0-9])/).map(e=>e.replace(/_DOT_/g,`.`).trim()).filter(e=>e.length>0);return t.length===0?[{text:e,pauseAfterMs:0}]:t.map((e,n)=>{let r=n===t.length-1,i=/[.!?…]$/.test(e);return{text:e,pauseAfterMs:r?0:i?260:120}})}},s=class{synth;currentUtterance=null;config;textElements=[];currentIndex=-1;currentState=`idle`;highlightClassName=`acre-reading-highlight`;_isSequentialReading=!1;useServerTts=!0;audioPlayer=null;constructor(e={}){if(console.log(`🦫 VoiceReader v6: Inicializando...`),this.synth=typeof window<`u`?window.speechSynthesis:null,this.config={rate:e.rate??1,volume:e.volume??1,pitch:e.pitch??1,lang:e.lang??`pt-BR`,onStateChange:e.onStateChange??(()=>{}),onElementHighlight:e.onElementHighlight??(()=>{})},this.synth)try{this.synth.cancel()}catch{}this.injectHighlightStyles(),this.detectVoiceSupport(),this.setupMediaSession()}get isSequentialReading(){return this._isSequentialReading}getBackendUrl(){if(typeof window<`u`){let e=window.AcreAcessivelConfig?.backendUrl;return e?e.replace(/\/$/,``):`${window.location.protocol}//${window.location.hostname}:8001`}return`http://localhost:8001`}injectHighlightStyles(){if(document.getElementById(`acre-highlight-styles`))return;let e=document.createElement(`style`);e.id=`acre-highlight-styles`,e.innerHTML=`
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
    `,document.head.appendChild(e)}detectVoiceSupport(){if(this.useServerTts=!0,!this.synth){console.warn(`🦫 SpeechSynthesis indisponível. Usando servidor.`);return}let e=()=>{let e=this.synth.getVoices();if(console.log(`🦫 detectVoiceSupport: ${e.length} vozes disponíveis no navegador.`),e.length===0)return;let t=e.some(e=>e.lang.toLowerCase().startsWith(`pt`));this.useServerTts=!t,t?console.log(`🦫 Voz pt local encontrada. Usando SpeechSynthesis local.`):console.warn(`🦫 Sem voz pt-BR local. Fallback para servidor.`)};this.synth.addEventListener(`voiceschanged`,e),Promise.resolve().then(e),e()}setRate(e){if(this.config.rate=e,this.currentState===`speaking`)if(this.useServerTts&&this.audioPlayer)this.audioPlayer.playbackRate=e;else{let e=this.currentIndex;this.stop(),this._isSequentialReading=!0,this.readElementAtIndex(e,!1)}}setVolume(e){this.config.volume=e,this.useServerTts&&this.audioPlayer?this.audioPlayer.volume=e:this.currentUtterance&&(this.currentUtterance.volume=e)}setPitch(e){this.config.pitch=e}getReadableText(e){if(e.tagName.toLowerCase()===`img`)return e.getAttribute(`alt`)||e.getAttribute(`title`)||``;let t=e.getAttribute(`aria-label`);if(t)return t.trim();let n=e.getAttribute(`title`);return n&&!(e.textContent||``).trim()?n.trim():(e.textContent||``).replace(/\s+/g,` `).trim()}scanReadableElements(){this.textElements=[];let e=Array.from(document.querySelectorAll(`h1, h2, h3, h4, h5, h6, p, li, blockquote, figcaption, img[alt]`)),t=[];for(let n of e){if(n.closest(`acre-accessibility-panel`)||n.closest(`capi-mascot`)||n.closest(`#vlibras-div`)||n.closest(`.audio-player-wrapper`)||n.closest(`audio`))continue;let e=window.getComputedStyle(n);if(!(e.display===`none`||e.visibility===`hidden`||e.opacity===`0`)&&!(this.getReadableText(n).trim().length<2)&&!t.some(e=>e.contains(n))){for(let e=t.length-1;e>=0;e--)n.contains(t[e])&&t.splice(e,1);t.push(n)}}this.textElements=t,console.log(`🦫 Varredura: ${this.textElements.length} elementos legíveis.`)}updateState(e){this.currentState=e,this.config.onStateChange(e),this.updateMediaSessionPlaybackState(e);try{document.dispatchEvent(new CustomEvent(`acre:voice:state`,{detail:{state:e}}))}catch{}}play(){if(this.currentState===`paused`){this.resume();return}if(this.scanReadableElements(),this.textElements.length===0){console.warn(`🦫 Nenhum elemento legível encontrado.`);return}this._isSequentialReading=!0,this.currentIndex=0,this.readElementAtIndex(this.currentIndex,!1)}pause(){this.currentState===`speaking`&&(this.useServerTts&&this.audioPlayer?this.audioPlayer.pause():this.synth&&this.synth.pause(),this.updateState(`paused`))}resume(){this.currentState===`paused`&&(this.useServerTts&&this.audioPlayer?this.audioPlayer.play().catch(e=>console.error(`🦫 Erro ao retomar:`,e)):this.synth&&this.synth.resume(),this.updateState(`speaking`))}stop(){if(this._isSequentialReading=!1,this.clearWaitingFeedback(),this._serverAbort&&=(this._serverAbort.abort(),null),this._prefetchedChunks.clear(),this.audioPlayer&&=(this.audioPlayer.pause(),null),this.synth)try{this.synth.cancel()}catch{}this.removeHighlight(),this.currentIndex=-1,this.updateState(`idle`)}next(){this.textElements.length===0&&this.scanReadableElements(),this.currentIndex<this.textElements.length-1?(this.stopSpeechOnly(),this.currentIndex++,this.readElementAtIndex(this.currentIndex,!0)):(console.log(`🦫 Fim dos elementos da página.`),this.stop())}previous(){this.textElements.length===0&&this.scanReadableElements(),this.currentIndex>0&&(this.stopSpeechOnly(),this.currentIndex--,this.readElementAtIndex(this.currentIndex,!0))}stopSpeechOnly(){if(this.clearWaitingFeedback(),this._serverAbort&&=(this._serverAbort.abort(),null),this._prefetchedChunks.clear(),this.audioPlayer&&=(this.audioPlayer.pause(),null),this.synth)try{this.synth.cancel()}catch{}this.removeHighlight()}removeHighlight(){this.textElements.forEach(e=>e.classList.remove(this.highlightClassName)),this.config.onElementHighlight(null)}setupMediaSession(){if(typeof navigator>`u`||!(`mediaSession`in navigator)){console.warn(`🦫 Media Session API indisponível — controles de hardware (fone/tela de bloqueio) não vão funcionar. Atalhos de teclado e botões do painel continuam normais.`);return}let e=navigator.mediaSession,t=(t,n)=>{try{e.setActionHandler(t,n)}catch{}};t(`play`,()=>this.play()),t(`pause`,()=>this.pause()),t(`stop`,()=>this.stop()),t(`previoustrack`,()=>this.previous()),t(`nexttrack`,()=>this.next()),t(`seekbackward`,()=>this.previous()),t(`seekforward`,()=>this.next())}updateMediaSessionPlaybackState(e){if(!(typeof navigator>`u`||!(`mediaSession`in navigator)))try{navigator.mediaSession.playbackState=e===`speaking`?`playing`:e===`paused`?`paused`:`none`,e===`idle`&&(navigator.mediaSession.metadata=null)}catch{}}updateMediaSessionMetadata(e,t){if(typeof navigator>`u`||!(`mediaSession`in navigator)||typeof MediaMetadata>`u`)return;let n=e.length>70?`${e.slice(0,70).trim()}…`:e.trim(),r=this.textElements.length,i=r>0&&t>=0&&t<r?`Trecho ${t+1} de ${r}`:`Acre Acessível`;try{navigator.mediaSession.metadata=new MediaMetadata({title:n||`Lendo conteúdo da página`,artist:i,album:document.title||`Acre Acessível`})}catch{}}readElementAtIndex(e,t){if(e<0||e>=this.textElements.length){this.stop();return}let n=this.textElements[e];this.removeHighlight(),n.classList.add(this.highlightClassName),this.config.onElementHighlight(n),t&&n.scrollIntoView({behavior:`smooth`,block:`center`});let r=this.getReadableText(n);if(!r.trim()){this._isSequentialReading&&(this.currentIndex++,this.readElementAtIndex(this.currentIndex,!1));return}this.updateMediaSessionMetadata(r,e);let i=n.tagName.toLowerCase(),a=o.normalizeToChunks(r),s=o.profileForTag(i);if(console.log(`🦫 [${e}] (${i}) "${r.substring(0,60)}${r.length>60?`...`:``}" — ${a.length} frase(s)`),this.useServerTts){this.readChunksViaServer(a,0,e,()=>{this._isSequentialReading&&this.currentState===`speaking`&&this.currentIndex===e&&this.next()});return}this.speakChunks(a,s,0,e,()=>{this._isSequentialReading&&this.currentState===`speaking`&&this.currentIndex===e&&this.next()},n=>this.handleSpeechError(n,()=>this.readElementAtIndex(e,t)))}speakChunks(e,t,n,r,i,a){if(n===0&&this.updateState(`speaking`),n>=e.length){i();return}if(this._isSequentialReading&&this.currentIndex!==r)return;let o=e[n],s=new SpeechSynthesisUtterance(o.text);s.lang=this.config.lang,s.rate=this.config.rate*t.rateMultiplier,s.volume=this.config.volume,s.pitch=this.clampPitch(this.config.pitch*t.pitch);let c=this.getBestPtVoice();c&&(s.voice=c),this.currentUtterance=s,s.onend=()=>{o.pauseAfterMs>0?setTimeout(()=>{this.speakChunks(e,t,n+1,r,i,a)},o.pauseAfterMs):this.speakChunks(e,t,n+1,r,i,a)},s.onerror=e=>{e.error!==`interrupted`&&a(e)},this.synth.speak(s)}clampPitch(e){return Math.min(2,Math.max(0,e))}readSpecificElement(e,t=!1){if(this._isSequentialReading)return;this.scanReadableElements();let n=this.textElements.indexOf(e);if(n===-1){let t=e.closest(`h1, h2, h3, h4, h5, h6, p, li, blockquote, article span, label, figcaption, a, button, img[alt], [role="button"]`);t&&(n=this.textElements.indexOf(t),e=t)}n===-1?(this.stopSpeechOnly(),this.readSingleElement(e)):(this.stopSpeechOnly(),this.currentIndex=n,this.readElementAtIndex(this.currentIndex,t))}readSingleElement(e){this.removeHighlight(),e.classList.add(this.highlightClassName),this.config.onElementHighlight(e);let t=this.getReadableText(e);if(!t.trim())return;if(this.updateMediaSessionMetadata(t,this.currentIndex),this.useServerTts){let e=o.normalizeToChunks(t);this.readChunksViaServer(e,0,this.currentIndex,()=>{this.removeHighlight(),this.updateState(`idle`)});return}let n=e.tagName.toLowerCase(),r=o.normalizeToChunks(t),i=o.profileForTag(n);this.speakChunks(r,i,0,this.currentIndex,()=>{this.removeHighlight(),this.updateState(`idle`)},t=>this.handleSpeechError(t,()=>this.readSingleElement(e)))}readTextDirectly(e){if(this._isSequentialReading||(this.stopSpeechOnly(),this.removeHighlight(),!e.trim()))return;if(this.updateMediaSessionMetadata(e,this.currentIndex),this.useServerTts){let t=o.normalizeToChunks(e);this.readChunksViaServer(t,0,this.currentIndex,()=>this.updateState(`idle`));return}let t=o.normalizeToChunks(e);this.speakChunks(t,{rateMultiplier:1,pitch:1},0,this.currentIndex,()=>this.updateState(`idle`),t=>this.handleSpeechError(t,()=>this.readTextDirectly(e)))}_serverAbort=null;_prefetchedChunks=new Map;fetchChunkAudio(e,t){let n=this.getBackendUrl();return fetch(`${n}/api/tts`,{method:`POST`,headers:{"Content-Type":`application/json`},body:JSON.stringify({text:e}),signal:t}).then(e=>{if(!e.ok)throw Error(`TTS HTTP ${e.status}`);return e.blob()})}ensurePrefetched(e,t,n){let r=this._prefetchedChunks.get(t);return r||(r=this.fetchChunkAudio(e[t].text,n),this._prefetchedChunks.set(t,r)),r}readChunksViaServer(e,t,n,r){if(t===0&&(this.updateState(`speaking`),this._prefetchedChunks.clear(),this._serverAbort=new AbortController),t>=e.length){r();return}if(this._serverAbort?.signal.aborted||this._isSequentialReading&&this.currentIndex!==n)return;let i=e[t],a=this._serverAbort.signal;this.startWaitingFeedback(),this.ensurePrefetched(e,t,a).then(o=>{if(this.clearWaitingFeedback(),a.aborted)return;let s=URL.createObjectURL(o),c=new Audio(s);c.preload=`auto`,c.playbackRate=this.config.rate,c.volume=this.config.volume,this.audioPlayer=c,c.onplay=()=>{a.aborted||t+1>=e.length||this.ensurePrefetched(e,t+1,a).catch(()=>{this._prefetchedChunks.delete(t+1)})},c.onended=()=>{if(URL.revokeObjectURL(s),this.audioPlayer=null,this._prefetchedChunks.delete(t),a.aborted)return;let o=()=>this.readChunksViaServer(e,t+1,n,r);i.pauseAfterMs>0?setTimeout(o,i.pauseAfterMs):o()},c.onerror=()=>{URL.revokeObjectURL(s),!a.aborted&&(console.error(`🦫 Erro ao reproduzir áudio do servidor.`),this.stop())},c.play().catch(e=>{URL.revokeObjectURL(s),e.name!==`AbortError`&&(console.error(`🦫 Autoplay bloqueado:`,e),this.stop())})}).catch(e=>{this.clearWaitingFeedback(),!(e.name===`AbortError`||a.aborted)&&(console.error(`🦫 Erro no fetch TTS:`,e),this.stop())})}_earconTimer=null;_earconInterval=null;_earconCtx=null;startWaitingFeedback(){this.clearWaitingFeedback(),this._earconTimer=setTimeout(()=>{this.playEarcon(),this._earconInterval=setInterval(()=>this.playEarcon(),1600)},700)}clearWaitingFeedback(){this._earconTimer&&=(clearTimeout(this._earconTimer),null),this._earconInterval&&=(clearInterval(this._earconInterval),null)}playEarcon(){try{if(!this._earconCtx){let e=window.AudioContext||window.webkitAudioContext;this._earconCtx=new e}let e=this._earconCtx;e.state===`suspended`&&e.resume();let t=e.currentTime,n=.05*this.config.volume,r=e.createOscillator(),i=e.createGain();r.type=`sine`,r.frequency.value=880,i.gain.setValueAtTime(0,t),i.gain.linearRampToValueAtTime(n,t+.03),i.gain.linearRampToValueAtTime(0,t+.2),r.connect(i),i.connect(e.destination),r.start(t),r.stop(t+.22)}catch{}}handleSpeechError(e,t){let n=e.error;n!==`interrupted`&&(this.stop(),(n===`synthesis-failed`||n===`language-unavailable`||n===`network`||!n)&&(console.warn(`🦫 Chaveando para servidor TTS.`),this.useServerTts=!0,this._isSequentialReading&&=!0,t()))}getBestPtVoice(){if(!this.synth)return null;let e=this.synth.getVoices(),t=[e=>e.lang.toLowerCase().replace(`_`,`-`).startsWith(`pt-br`)&&e.name.toLowerCase().includes(`natural`),e=>e.lang.toLowerCase().replace(`_`,`-`).startsWith(`pt-br`)&&e.name.toLowerCase().includes(`online`),e=>e.lang.toLowerCase().replace(`_`,`-`).startsWith(`pt-br`)&&e.name.includes(`Google`),e=>e.lang.toLowerCase().replace(`_`,`-`).startsWith(`pt-br`)&&e.name.includes(`Microsoft`),e=>e.lang.toLowerCase().replace(`_`,`-`).startsWith(`pt-br`),e=>e.lang.toLowerCase().startsWith(`pt`)];for(let n of t){let t=e.find(n);if(t)return t}return null}get state(){return this.currentState}},c=class extends HTMLElement{shadow;reader;isOpen=!1;fontScale=1;isHighContrast=!1;isGrayscale=!1;lineSpacing=`normal`;letterSpacing=`normal`;isDyslexicFriendly=!1;showMascot=!0;readOnHover=!1;isLibrasActive=!1;hoverTimeout=null;lastHoveredElement=null;constructor(){super(),this.shadow=this.attachShadow({mode:`open`,delegatesFocus:!0}),this.reader=new s({onStateChange:e=>this.handleVoiceStateChange(e),onElementHighlight:e=>this.handleElementHighlight(e)}),this.injectGlobalStyles()}connectedCallback(){this.render(),this.setupEvents(),this.setupKeyboardShortcuts(),this.loadSettings(),this.applySettingsToPage();let e=()=>{document.removeEventListener(`click`,e,!0),document.removeEventListener(`keydown`,e,!0),setTimeout(()=>{this.reader.readTextDirectly(`Acre Acessível pronto. Pressione Alt P para ouvir a página, ou Alt A para abrir o menu.`)},400)};document.addEventListener(`click`,e,!0),document.addEventListener(`keydown`,e,!0)}setMascotState(e){let t=this.shadow.getElementById(`capiMascot`);if(t){if(!customElements.get(`capi-mascot`)){setTimeout(()=>this.setMascotState(e),100);return}t.setAttribute(`state`,e)}}injectGlobalStyles(){if(document.getElementById(`acre-global-styles`))return;let e=document.createElement(`style`);e.id=`acre-global-styles`,e.innerHTML=`
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
    `,document.head.appendChild(e)}render(){this.shadow.innerHTML=`
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
    `}setupEvents(){let e=this.shadow,t=e.getElementById(`panelDrawer`),n=e.getElementById(`capiBubble`),r=e.querySelector(`.alt-trigger`),i=e.getElementById(`closeBtn`),a=()=>{if(this.isOpen=!this.isOpen,this.isOpen){t.classList.add(`open`),t.setAttribute(`aria-hidden`,`false`),this.reader.stop(),n.classList.remove(`visible`);let r=e.getElementById(`altTriggerBtn`);r&&r.setAttribute(`aria-expanded`,`true`),setTimeout(()=>{t.querySelector(`button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])`)?.focus()},410)}else{t.classList.remove(`open`),t.setAttribute(`aria-hidden`,`true`);let n=e.getElementById(`altTriggerBtn`);n&&n.setAttribute(`aria-expanded`,`false`)}};e.addEventListener(`keydown`,e=>{e.key===`Escape`&&this.isOpen&&a()}),this.addEventListener(`close-panel`,()=>{this.isOpen&&a()}),t.addEventListener(`keydown`,e=>{if(!this.isOpen||e.key!==`Tab`)return;let n=Array.from(t.querySelectorAll(`button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])`));n.length&&(e.shiftKey&&document.activeElement===n[0]?(e.preventDefault(),n[n.length-1].focus()):!e.shiftKey&&document.activeElement===n[n.length-1]&&(e.preventDefault(),n[0].focus()))}),setTimeout(()=>{if(!this.isOpen){n.classList.add(`visible`),setTimeout(()=>n.classList.remove(`visible`),6e3);let e=this.shadow.getElementById(`capiMascot`);e&&typeof e.greet==`function`&&e.greet()}},2e3),this.addEventListener(`toggle-panel`,a),r.addEventListener(`click`,a),i.addEventListener(`click`,a);let o=e.getElementById(`playPauseBtn`),s=e.getElementById(`stopBtn`),c=e.getElementById(`prevBtn`),l=e.getElementById(`nextBtn`),u=e.getElementById(`rateSlider`),d=e.getElementById(`pitchSlider`),f=e.getElementById(`volumeSlider`);o.addEventListener(`click`,()=>{this.reader.state===`speaking`?this.reader.pause():this.reader.state===`paused`?this.reader.resume():this.reader.play()}),s.addEventListener(`click`,()=>this.reader.stop()),c.addEventListener(`click`,()=>this.reader.previous()),l.addEventListener(`click`,()=>this.reader.next()),u.addEventListener(`input`,t=>{let n=parseFloat(t.target.value),r=e.getElementById(`rateVal`);r&&(r.innerText=`${n.toFixed(2)}x`),this.reader.setRate(n),this.saveSettings()}),d.addEventListener(`input`,t=>{let n=parseFloat(t.target.value),r=e.getElementById(`pitchVal`);r&&(r.innerText=n.toFixed(2)),this.reader.setPitch(n),this.saveSettings()}),f.addEventListener(`input`,t=>{let n=parseFloat(t.target.value),r=e.getElementById(`volumeVal`);r&&(r.innerText=`${Math.round(n*100)}%`),this.reader.setVolume(n),this.saveSettings()}),e.getElementById(`btnFontInc`)?.addEventListener(`click`,()=>{this.fontScale=Math.min(this.fontScale+.1,2),this.applySettingsToPage(),this.saveSettings()}),e.getElementById(`btnFontDec`)?.addEventListener(`click`,()=>{this.fontScale=Math.max(this.fontScale-.1,.8),this.applySettingsToPage(),this.saveSettings()}),e.getElementById(`btnContrast`)?.addEventListener(`click`,()=>{this.isHighContrast=!this.isHighContrast,this.applySettingsToPage(),this.saveSettings()}),e.getElementById(`btnGrayscale`)?.addEventListener(`click`,()=>{this.isGrayscale=!this.isGrayscale,this.applySettingsToPage(),this.saveSettings()}),e.getElementById(`btnLineSpacing`)?.addEventListener(`click`,()=>{this.lineSpacing=this.lineSpacing===`normal`?`medium`:this.lineSpacing===`medium`?`large`:`normal`,this.applySettingsToPage(),this.saveSettings()}),e.getElementById(`btnLetterSpacing`)?.addEventListener(`click`,()=>{this.letterSpacing=this.letterSpacing===`normal`?`medium`:this.letterSpacing===`medium`?`large`:`normal`,this.applySettingsToPage(),this.saveSettings()}),e.getElementById(`btnDyslexic`)?.addEventListener(`click`,()=>{this.isDyslexicFriendly=!this.isDyslexicFriendly,this.applySettingsToPage(),this.saveSettings()}),e.getElementById(`btnToggleMascot`)?.addEventListener(`click`,()=>{this.showMascot=!this.showMascot,this.applySettingsToPage(),this.saveSettings()});let p=e.getElementById(`btnHoverSpeak`),m=()=>{this.readOnHover=!this.readOnHover,this.applySettingsToPage(),this.saveSettings()};p.addEventListener(`click`,m),p.addEventListener(`keydown`,e=>{(e.key===`Enter`||e.key===` `)&&(e.preventDefault(),m())}),e.getElementById(`btnLibras`)?.addEventListener(`click`,()=>{this.isLibrasActive=!this.isLibrasActive,this.reader.readTextDirectly(this.isLibrasActive?`Tradução em Libras ativada`:`Tradução em Libras desativada`),document.dispatchEvent(new CustomEvent(`acre:libras:state`,{detail:{active:this.isLibrasActive}})),this.applySettingsToPage(),this.saveSettings()}),document.addEventListener(`click`,e=>{if(this.reader.isSequentialReading)return;let t=e.target;if(t.closest(`acre-accessibility-panel`)||t.closest(`capi-mascot`)||t.closest(`.audio-player-wrapper`)||t.closest(`audio`))return;let n=t.closest(`h1,h2,h3,h4,h5,h6,p,li,blockquote,article span,label,figcaption,a,button,img[alt],[role="button"]`);n&&this.reader.readSpecificElement(n,!1)});let h=()=>{setTimeout(()=>{if(this.reader.isSequentialReading)return;let e=window.getSelection()?.toString().trim();if(!e||e.length<=2)return;let t=window.getSelection();if(t?.anchorNode){let e=t.anchorNode.parentElement;if(e?.closest(`acre-accessibility-panel`)||e?.closest(`capi-mascot`)||e?.closest(`.vpw-plugin-wrapper`)||e?.closest(`#vlibras-div`))return}this.reader.readTextDirectly(e)},80)};document.addEventListener(`mouseup`,h),document.addEventListener(`touchend`,h),document.addEventListener(`mouseover`,e=>{if(!this.readOnHover||this.reader.isSequentialReading)return;let t=e.target;if(t.closest(`acre-accessibility-panel`)||t.closest(`capi-mascot`)||t.closest(`.audio-player-wrapper`)||t.closest(`audio`))return;let n=t.closest(`h1,h2,h3,h4,h5,h6,p,li,blockquote,article span,label,figcaption,a,button,img[alt],[role="button"]`);n&&n!==this.lastHoveredElement&&(this.lastHoveredElement=n,this.hoverTimeout&&clearTimeout(this.hoverTimeout),this.hoverTimeout=setTimeout(()=>{this.reader.isSequentialReading||this.reader.readSpecificElement(n,!1)},300))}),document.addEventListener(`mouseout`,e=>{if(!this.readOnHover)return;let t=e.target,n=e.relatedTarget,r=`h1,h2,h3,h4,h5,h6,p,li,blockquote,article span,label,figcaption,a,button,img[alt],[role="button"]`,i=t.closest(r),a=n?n.closest(r):null;i&&i===this.lastHoveredElement&&!a&&(this.hoverTimeout&&clearTimeout(this.hoverTimeout),this.lastHoveredElement=null)}),document.addEventListener(`focusin`,e=>{if(!this.readOnHover||this.reader.isSequentialReading)return;let t=e.target;if(t.closest(`acre-accessibility-panel`)||t.closest(`capi-mascot`))return;let n=t.closest(`h1,h2,h3,h4,h5,h6,p,li,blockquote,article span,label,figcaption,a,button,img[alt],[role="button"]`);n&&(this.hoverTimeout&&clearTimeout(this.hoverTimeout),this.reader.readSpecificElement(n,!1))})}setupKeyboardShortcuts(){window.addEventListener(`keydown`,e=>{if(e.altKey)switch(e.key.toLowerCase()){case`a`:e.preventDefault(),this.dispatchEvent(new CustomEvent(`toggle-panel`,{bubbles:!0,composed:!0}));break;case`p`:e.preventDefault(),this.reader.state===`speaking`?this.reader.pause():this.reader.state===`paused`?this.reader.resume():this.reader.play();break;case`s`:e.preventDefault(),this.reader.stop();break;case`n`:e.preventDefault(),this.reader.next();break;case`b`:e.preventDefault(),this.reader.previous();break;case`c`:e.preventDefault(),this.isHighContrast=!this.isHighContrast,this.applySettingsToPage(),this.saveSettings();break}})}handleVoiceStateChange(e){let t=this.shadow,n=t.getElementById(`playPauseBtn`),r=t.getElementById(`iconPlay`);!n||!r||(e===`speaking`?(r.setAttribute(`viewBox`,`0 0 24 24`),r.setAttribute(`fill`,`currentColor`),r.innerHTML=`<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>`,n.setAttribute(`aria-label`,`Pausar leitura`),n.setAttribute(`title`,`Pausar leitura (Alt+P)`),this.setMascotState(`speaking`)):e===`paused`?(r.setAttribute(`viewBox`,`0 0 24 24`),r.setAttribute(`fill`,`currentColor`),r.innerHTML=`<polygon points="5 3 19 12 5 21 5 3"/>`,n.setAttribute(`aria-label`,`Retomar leitura`),n.setAttribute(`title`,`Retomar leitura (Alt+P)`),this.setMascotState(`idle`)):(r.setAttribute(`viewBox`,`0 0 24 24`),r.setAttribute(`fill`,`currentColor`),r.innerHTML=`<polygon points="5 3 19 12 5 21 5 3"/>`,n.setAttribute(`aria-label`,`Iniciar leitura`),n.setAttribute(`title`,`Ler página (Alt+P)`),this.setMascotState(`idle`)))}handleElementHighlight(e){e?this.setMascotState(this.reader.state===`speaking`?`speaking`:`reading`):this.setMascotState(`idle`)}applySettingsToPage(){let e=this.shadow,t=document.body,n=document.documentElement;n.style.setProperty(`--acre-font-multiplier`,this.fontScale.toString());let r=e.getElementById(`btnContrast`);if(this.isHighContrast){n.classList.add(`acre-high-contrast-mode`),this.classList.add(`high-contrast`),r?.classList.add(`active`),r?.setAttribute(`aria-pressed`,`true`);let t=e.getElementById(`capiMascot`);t?.setHighContrast&&t.setHighContrast(!0)}else{n.classList.remove(`acre-high-contrast-mode`),this.classList.remove(`high-contrast`),r?.classList.remove(`active`),r?.setAttribute(`aria-pressed`,`false`);let t=e.getElementById(`capiMascot`);t?.setHighContrast&&t.setHighContrast(!1)}let i=e.getElementById(`btnGrayscale`);this.isGrayscale?(t.classList.add(`acre-grayscale-mode`),i?.classList.add(`active`),i?.setAttribute(`aria-pressed`,`true`)):(t.classList.remove(`acre-grayscale-mode`),i?.classList.remove(`active`),i?.setAttribute(`aria-pressed`,`false`));let a=e.getElementById(`lineSpacingLabel`),o=e.getElementById(`btnLineSpacing`),[s,c,l]={normal:[`normal`,`Normal`,!1],medium:[`1.8`,`Médio`,!0],large:[`2.3`,`Largo`,!0]}[this.lineSpacing];n.style.setProperty(`--acre-line-spacing`,s),a&&(a.innerText=c),o?.classList.toggle(`active`,l);let u=e.getElementById(`letterSpacingLabel`),d=e.getElementById(`btnLetterSpacing`),[f,p,m]={normal:[`normal`,`Normal`,!1],medium:[`0.12em`,`Médio`,!0],large:[`0.2em`,`Largo`,!0]}[this.letterSpacing];n.style.setProperty(`--acre-letter-spacing`,f),u&&(u.innerText=p),d?.classList.toggle(`active`,m);let h=e.getElementById(`btnDyslexic`);t.classList.toggle(`acre-dyslexic-mode`,this.isDyslexicFriendly),h?.classList.toggle(`active`,this.isDyslexicFriendly),h?.setAttribute(`aria-pressed`,String(this.isDyslexicFriendly));let g=e.getElementById(`mascotTrigger`),_=e.getElementById(`altTriggerContainer`),v=e.getElementById(`mascotBtnLabel`);this.showMascot?(g?.classList.remove(`hidden`),_?.classList.add(`hidden`),v&&(v.innerText=`Ocultar Mascote`),e.getElementById(`btnToggleMascot`)?.classList.remove(`active`)):(g?.classList.add(`hidden`),_?.classList.remove(`hidden`),v&&(v.innerText=`Mostrar Mascote`),e.getElementById(`btnToggleMascot`)?.classList.add(`active`));let y=e.getElementById(`hoverSpeakLabel`),b=e.getElementById(`btnHoverSpeak`);y&&(y.innerText=this.readOnHover?`On`:`Off`),y?.classList.toggle(`on`,this.readOnHover),b?.setAttribute(`aria-pressed`,String(this.readOnHover));let x=e.getElementById(`librasLabel`),S=e.getElementById(`btnLibras`);if(x&&(x.innerText=this.isLibrasActive?`On`:`Off`),S?.classList.toggle(`active`,this.isLibrasActive),S?.setAttribute(`aria-pressed`,String(this.isLibrasActive)),this.isLibrasActive)document.getElementById(`vlibras-div`)?document.getElementById(`vlibras-div`).style.display=`block`:this.injectVLibras();else{let e=document.getElementById(`vlibras-div`);e&&(e.style.display=`none`)}}saveSettings(){let e=this.shadow.getElementById(`rateSlider`),t=this.shadow.getElementById(`pitchSlider`),n=this.shadow.getElementById(`volumeSlider`);localStorage.setItem(`acre_acessivel_settings`,JSON.stringify({fontScale:this.fontScale,isHighContrast:this.isHighContrast,isGrayscale:this.isGrayscale,lineSpacing:this.lineSpacing,letterSpacing:this.letterSpacing,isDyslexicFriendly:this.isDyslexicFriendly,showMascot:this.showMascot,readOnHover:this.readOnHover,isLibrasActive:this.isLibrasActive,rate:parseFloat(e?.value||`1.0`),pitch:parseFloat(t?.value||`1.0`),volume:parseFloat(n?.value||`1.0`)}))}loadSettings(){let e=localStorage.getItem(`acre_acessivel_settings`);if(e)try{let t=JSON.parse(e);this.fontScale=t.fontScale??1,this.isHighContrast=t.isHighContrast??!1,this.isGrayscale=t.isGrayscale??!1,this.lineSpacing=t.lineSpacing??`normal`,this.letterSpacing=t.letterSpacing??`normal`,this.isDyslexicFriendly=t.isDyslexicFriendly??!1,this.showMascot=t.showMascot??!0,this.readOnHover=t.readOnHover??!1,this.isLibrasActive=t.isLibrasActive??!1;let n=this.shadow.getElementById(`rateSlider`),r=this.shadow.getElementById(`rateVal`);n&&t.rate!==void 0&&(n.value=t.rate.toString(),r&&(r.innerText=`${t.rate.toFixed(2)}x`),this.reader.setRate(t.rate));let i=this.shadow.getElementById(`pitchSlider`),a=this.shadow.getElementById(`pitchVal`);i&&t.pitch!==void 0&&(i.value=t.pitch.toString(),a&&(a.innerText=t.pitch.toFixed(2)),this.reader.setPitch(t.pitch));let o=this.shadow.getElementById(`volumeSlider`),s=this.shadow.getElementById(`volumeVal`);o&&t.volume!==void 0&&(o.value=t.volume.toString(),s&&(s.innerText=`${Math.round(t.volume*100)}%`),this.reader.setVolume(t.volume))}catch(e){console.error(`Erro ao ler configurações:`,e)}}injectVLibras(){if(document.getElementById(`vlibras-div`))return;let e=document.createElement(`div`);e.id=`vlibras-div`,e.setAttribute(`vw`,``),e.classList.add(`enabled`),e.innerHTML=`<div vw-access-button class="active"></div><div vw-plugin-wrapper><div class="vw-plugin-top-wrapper"></div></div>`,document.body.appendChild(e);let t=document.createElement(`script`);t.src=`https://vlibras.gov.br/app/vlibras-plugin.js`,t.onload=()=>{window.VLibras?.Widget&&new window.VLibras.Widget(`https://vlibras.gov.br/app`)},document.head.appendChild(t)}};customElements.define(`acre-accessibility-panel`,c);var l=new class{panelInstance=null;init(e={}){if(!(typeof window>`u`)){if(document.querySelector(`acre-accessibility-panel`)){console.warn(`Acre Acessível já inicializado nesta página.`);return}this.panelInstance=document.createElement(`acre-accessibility-panel`),e.libras&&this.injectVLibras(),document.body.appendChild(this.panelInstance),console.log(`💚 Acre Acessível inicializado com sucesso! Mascote Capi pronto para ajudar.`)}}injectVLibras(){if(document.getElementById(`vlibras-div`))return;let e=document.createElement(`div`);e.id=`vlibras-div`,e.setAttribute(`vw`,``),e.classList.add(`enabled`),e.innerHTML=`
      <div vw-access-button class="active"></div>
      <div vw-plugin-wrapper>
        <div class="vw-plugin-top-wrapper"></div>
      </div>
    `,document.body.appendChild(e);let t=document.createElement(`script`);t.src=`https://vlibras.gov.br/app/vlibras-plugin.js`,t.onload=()=>{new window.VLibras.Widget(`https://vlibras.gov.br/app`)},document.head.appendChild(t)}};window.AcreAcessivel=l;function u(){if(document.currentScript instanceof HTMLScriptElement)return document.currentScript;let e=document.getElementsByTagName(`script`);for(let t=e.length-1;t>=0;t--)if(e[t].src.includes(`acre-acessivel`))return e[t];return null}function d(){let e=u()?.dataset??{},t=e.acreAuto!==`false`;if(e.acreBackend&&(window.AcreAcessivelConfig={...window.AcreAcessivelConfig??{},backendUrl:e.acreBackend}),!t){console.log(`🦫 Acre Acessível carregado em modo manual. Chame window.AcreAcessivel.init() quando quiser.`);return}let n={libras:e.acreLibras===`true`};window.AcreAcessivel&&window.AcreAcessivel.init(n)}document.readyState===`loading`?document.addEventListener(`DOMContentLoaded`,d):d()})();