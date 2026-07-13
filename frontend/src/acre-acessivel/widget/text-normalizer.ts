/**
 * Acre Acessível - Normalizador de Texto para Fala (TTS)
 *
 * Resolve os 3 problemas clássicos de leitura "burra" via Web Speech API / TTS genérico:
 *  1. Pronúncia errada de números, moeda, datas, ordinais e siglas.
 *  2. Falta de entonação/tônica: o motor não sabe separar frases nem dar peso a títulos.
 *  3. Falta de pausas naturais: tudo é lido como um bloco só, sem respiro.
 *
 * Estratégia:
 *  - Expande tudo que o motor de fala pronuncia mal para sua forma escrita por extenso
 *    (R$ 1.200,00 -> "1.200 reais e 0 centavos" / "Art. 5º" -> "Artigo quinto").
 *  - Quebra o texto em frases curtas (sentence splitting) para que cada SpeechSynthesisUtterance
 *    seja independente — isso por si só já melhora MUITO a entonação, porque o motor nativo
 *    aplica curva de prosódia por utterance, e utterances longas "atropelam" a entonação.
 *  - Define um perfil de voz (rate/pitch) por tipo de elemento semântico (título lido mais
 *    grave e pausado, texto corrido no tom normal, listas com pausa extra entre itens).
 */

export interface SentenceChunk {
  text: string;
  /** Pausa sugerida (ms) depois deste chunk, antes do próximo */
  pauseAfterMs: number;
}

export interface VoiceProfile {
  rateMultiplier: number;
  pitch: number;
}

// Siglas comuns em portais públicos/educacionais brasileiros — pronúncia letra a letra
// quando o motor tentaria ler como palavra (ex: "IFAC" virando "ifáqui")
const KNOWN_ACRONYMS: Record<string, string> = {
  'IFAC': 'I F A C',
  'FEM': 'F E M',
  'CPF': 'C P F',
  'CNPJ': 'C N P J',
  'CEP': 'C E P',
  'PDF': 'P D F',
  'URL': 'U R L',
  'HTML': 'H T M L',
  'CSS': 'C S S',
  'API': 'A P I',
  'TI': 'T I',
  'RH': 'R H',
  'EAD': 'E A D',
  'ENEM': 'É-NÉM',
  'SUS': 'SÚS',
  'INSS': 'I N S S',
  'IBGE': 'I B G E',
  'MEC': 'MÉQUI',
  'ONG': 'ÓNGUI',
};

const ORDINAL_MASC: Record<string, string> = {
  '1': 'primeiro', '2': 'segundo', '3': 'terceiro', '4': 'quarto', '5': 'quinto',
  '6': 'sexto', '7': 'sétimo', '8': 'oitavo', '9': 'nono', '10': 'décimo',
};

const ORDINAL_FEM: Record<string, string> = {
  '1': 'primeira', '2': 'segunda', '3': 'terceira', '4': 'quarta', '5': 'quinta',
  '6': 'sexta', '7': 'sétima', '8': 'oitava', '9': 'nona', '10': 'décima',
};

// Substantivos femininos comuns em editais públicos que seguem um ordinal
const FEMININE_NOUNS_PATTERN =
  /\b(turma|vez|edição|etapa|fase|questão|rodada|vaga|semana|instância|chamada|convocação|via|cópia|série|versão)\b/i;

const MONTHS = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

export class TextNormalizer {
  /**
   * Ponto de entrada principal: recebe texto bruto de um elemento e retorna
   * uma lista de "chunks" (frases) já normalizados, prontos para serem
   * enfileirados em utterances separadas.
   */
  public static normalizeToChunks(rawText: string): SentenceChunk[] {
    const expanded = this.expandAll(rawText);
    return this.splitIntoSentences(expanded);
  }

  /** Normaliza sem quebrar em frases (usado por quem só precisa do texto plano, ex: backend) */
  public static normalize(rawText: string): string {
    return this.expandAll(rawText);
  }

  /** Perfil de voz (rate/pitch relativos) sugerido para uma tag semântica */
  public static profileForTag(tag: string): VoiceProfile {
    switch (tag) {
      case 'h1':
        return { rateMultiplier: 0.92, pitch: 1.08 };
      case 'h2':
        return { rateMultiplier: 0.94, pitch: 1.05 };
      case 'h3':
      case 'h4':
      case 'h5':
      case 'h6':
        return { rateMultiplier: 0.96, pitch: 1.03 };
      case 'li':
        return { rateMultiplier: 1.0, pitch: 1.0 };
      case 'blockquote':
        return { rateMultiplier: 0.95, pitch: 0.97 };
      case 'figcaption':
        return { rateMultiplier: 0.95, pitch: 0.98 };
      default:
        return { rateMultiplier: 1.0, pitch: 1.0 };
    }
  }

  // ---------------------------------------------------------------------------------
  // Expansão (números, moeda, datas, siglas, pontuação problemática)
  // ---------------------------------------------------------------------------------

  private static expandAll(text: string): string {
    let t = text;

    t = this.expandCurrency(t);
    t = this.expandDates(t);
    t = this.expandPercentages(t);
    t = this.expandOrdinals(t);
    t = this.expandAbbreviations(t);
    t = this.expandAcronyms(t);
    t = this.expandDecimalNumbers(t);
    t = this.normalizePunctuationForProsody(t);

    return t.replace(/\s+/g, ' ').trim();
  }

  /** R$ 1.200,50 -> "1.200 reais e 50 centavos" / R$ 1.200 -> "1.200 reais" */
  private static expandCurrency(text: string): string {
    return text.replace(
      /R\$\s?(\d{1,3}(?:\.\d{3})*)(?:,(\d{2}))?/g,
      (_match, intPart: string, centPart?: string) => {
        const reais = intPart;
        if (centPart && centPart !== '00') {
          return `${reais} reais e ${centPart} centavos`;
        }
        return `${reais} reais`;
      }
    );
  }

  /** 12% -> "12 por cento" */
  private static expandPercentages(text: string): string {
    return text.replace(/(\d+(?:[.,]\d+)?)\s?%/g, (_m, num: string) => `${num} por cento`);
  }

  /** 05/06/2026 ou 5 de junho de 2026 (normaliza separador) -> fala natural */
  private static expandDates(text: string): string {
    return text.replace(
      /\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/g,
      (_m, d: string, mo: string, y: string) => {
        const day = parseInt(d, 10);
        const monthIdx = parseInt(mo, 10) - 1;
        const monthName = MONTHS[monthIdx] ?? mo;
        const year = y.length === 2 ? `20${y}` : y;
        return `${day} de ${monthName} de ${year}`;
      }
    );
  }

  /** 1º, 2ª, Art. 5º -> "primeiro", "segunda", "Artigo quinto" (até 10; acima disso lê o numeral cardinal) */
  private static expandOrdinals(text: string): string {
    // Caso especial: "Art. Nº" / "Artigo Nº" — sempre masculino (artigo é masc)
    text = text.replace(
      /\b(Art\.?|Artigo)\s*(\d{1,3})\s*[ºª]?/gi,
      (_m, _prefix: string, num: string) => {
        const word = ORDINAL_MASC[num];
        return `Artigo ${word ?? num}`;
      }
    );

    // Caso genérico: º = masculino, ª = feminino — sufixo é a marca morfológica.
    text = text.replace(/\b(\d{1,3})(º|ª)/g, (_m, num: string, suffix: string) => {
      if (suffix === 'ª') {
        const word = ORDINAL_FEM[num];
        return word ?? `${num}ª`;
      }
      const word = ORDINAL_MASC[num];
      return word ?? `${num}º`;
    });

    return text;
  }

  /** Verifica se um texto contém substantivo feminino comum (utilitário público para testes) */
  public static hasFeminineNoun(text: string): boolean {
    return FEMININE_NOUNS_PATTERN.test(text);
  }

  /** Abreviações comuns que o motor lê errado ou de forma cortada */
  private static expandAbbreviations(text: string): string {
    const map: Array<[RegExp, string]> = [
      [/\bSr\.\s/g, 'Senhor '],
      [/\bSra\.\s/g, 'Senhora '],
      [/\bDr\.\s/g, 'Doutor '],
      [/\bDra\.\s/g, 'Doutora '],
      [/\bProf\.\s/g, 'Professor '],
      [/\bProfa\.\s/g, 'Professora '],
      [/\bEx\.\s/g, 'Excelência '],
      [/\bpág\.\s?/gi, 'página '],
      [/\bpp\.\s?/gi, 'páginas '],
      [/\bnº\s?/gi, 'número '],
      [/\bn\.\s?/gi, 'número '],
      [/\betc\.\b/gi, 'etcétera'],
    ];
    for (const [regex, replacement] of map) {
      text = text.replace(regex, replacement);
    }
    return text;
  }

  /** Siglas conhecidas -> soletradas, para não virarem palavras estranhas */
  private static expandAcronyms(text: string): string {
    for (const [acronym, spoken] of Object.entries(KNOWN_ACRONYMS)) {
      const regex = new RegExp(`\\b${acronym}\\b`, 'g');
      text = text.replace(regex, spoken);
    }
    return text;
  }

  /** 1.234.567 (separador de milhar) lido corretamente, sem confundir com decimal */
  private static expandDecimalNumbers(text: string): string {
    // Números com ponto de milhar e vírgula decimal (padrão BR): 1.234,56 -> "1234 vírgula 56"
    return text.replace(
      /\b(\d{1,3}(?:\.\d{3})+),(\d+)\b/g,
      (_m, intPart: string, decPart: string) => {
        const cleanInt = intPart.replace(/\./g, '');
        return `${cleanInt} vírgula ${decPart}`;
      }
    );
  }

  /**
   * Normaliza pontuação que confunde o sintetizador:
   * - Múltiplos sinais (??!, ...) colapsados
   * - Travessões e parênteses convertidos em vírgula (geram pausa, sem o motor "engolir" a fala)
   * - Adiciona ponto final se a frase não tiver pontuação de encerramento (ajuda o motor a aplicar
   *   curva de entonação de fim de frase em vez de tom neutro/cortado)
   */
  private static normalizePunctuationForProsody(text: string): string {
    let t = text;
    t = t.replace(/\.{3,}/g, '…');
    t = t.replace(/!{2,}/g, '!');
    t = t.replace(/\?{2,}/g, '?');
    t = t.replace(/[–—]/g, ',');
    t = t.replace(/\(([^)]+)\)/g, ', $1,');
    t = t.replace(/\s*,\s*,\s*/g, ', ');
    return t;
  }

  // ---------------------------------------------------------------------------------
  // Sentence splitting
  // ---------------------------------------------------------------------------------

  /**
   * Quebra o texto em frases curtas. Cada frase se torna uma utterance separada
   * no voice-reader, o que dá ao motor de síntese um "reset" de prosódia por frase
   * (entonação de início/fim de frase aplicada corretamente) em vez de uma leitura
   * corrida que tende a ficar monotônica em textos longos.
   */
  private static splitIntoSentences(text: string): SentenceChunk[] {
    if (!text.trim()) return [];

    // Protege abreviações comuns de serem quebradas como fim de frase
    const protectedText = text.replace(/\b(\w)\.(\w)\./g, '$1_DOT_$2_DOT_');

    const rawSentences = protectedText
      .split(/(?<=[.!?…])\s+(?=[A-ZÀ-Ú0-9])/)
      .map(s => s.replace(/_DOT_/g, '.').trim())
      .filter(s => s.length > 0);

    if (rawSentences.length === 0) {
      return [{ text, pauseAfterMs: 0 }];
    }

    return rawSentences.map((sentence, idx) => {
      const isLast = idx === rawSentences.length - 1;
      const endsStrong = /[.!?…]$/.test(sentence);
      return {
        text: sentence,
        // Pausa maior entre frases reais; nenhuma pausa extra na última (o stop natural já cobre)
        pauseAfterMs: isLast ? 0 : endsStrong ? 260 : 120,
      };
    });
  }
}
