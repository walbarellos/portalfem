import './capi-mascot';
import './accessibility-panel';

export interface AcreAcessivelConfig {
  leitura?: boolean;
  contraste?: boolean;
  fonte?: boolean;
  audio?: boolean;
  libras?: boolean; // Preparação para integração com VLibras ou outros
}

class AcreAcessivelInitializer {
  private panelInstance: HTMLElement | null = null;

  public init(config: AcreAcessivelConfig = {}) {
    // Garante que o inicializador rode no navegador
    if (typeof window === 'undefined') return;

    // Evita duplicidade
    if (document.querySelector('acre-accessibility-panel')) {
      console.warn('Acre Acessível já inicializado nesta página.');
      return;
    }

    // Cria a instância do Web Component do painel
    this.panelInstance = document.createElement('acre-accessibility-panel');
    
    // Passa configurações para atributos se necessário
    if (config.libras) {
      this.injectVLibras();
    }

    // Anexa o componente ao body
    document.body.appendChild(this.panelInstance);

    console.log('💚 Acre Acessível inicializado com sucesso! Mascote Capi pronto para ajudar.');
  }

  /**
   * Integração opcional com o VLibras do Governo Federal
   */
  private injectVLibras() {
    if (document.getElementById('vlibras-div')) return;

    // Cria a div necessária para o VLibras
    const vlibrasDiv = document.createElement('div');
    vlibrasDiv.id = 'vlibras-div';
    vlibrasDiv.setAttribute('vw', '');
    vlibrasDiv.classList.add('enabled');
    vlibrasDiv.innerHTML = `
      <div vw-access-button class="active"></div>
      <div vw-plugin-wrapper>
        <div class="vw-plugin-top-wrapper"></div>
      </div>
    `;
    document.body.appendChild(vlibrasDiv);

    // Carrega o script do VLibras
    const script = document.createElement('script');
    script.src = 'https://vlibras.gov.br/app/vlibras-plugin.js';
    script.onload = () => {
      // @ts-ignore
      new window.VLibras.Widget('https://vlibras.gov.br/app');
    };
    document.head.appendChild(script);
  }
}

// Expõe globalmente
const AcreAcessivel = new AcreAcessivelInitializer();
// @ts-ignore
window.AcreAcessivel = AcreAcessivel;

export default AcreAcessivel;
