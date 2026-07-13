import './style.css';
import AcreAcessivel from './widget/index';

// Inicializa o Acre Acessível
// Habilita leitura, contraste, fontes, áudio e integração com VLibras
AcreAcessivel.init({
  leitura: true,
  contraste: true,
  fonte: true,
  audio: true,
  libras: true
});
