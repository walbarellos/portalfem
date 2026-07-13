"""
Acre Acessível — Normalizador de Texto para Fala (Python)
Espelho de src/widget/text-normalizer.ts — mantidos em sincronia.

ATENÇÃO: qualquer nova regra adicionada aqui DEVE ser replicada no .ts e vice-versa.
Os testes em tests/python/test_text_normalizer.py validam paridade entre os dois.
"""

import re
from dataclasses import dataclass
from typing import Optional

MESES = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]

KNOWN_ACRONYMS: dict[str, str] = {
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
}

ORDINAL_MASC: dict[str, str] = {
    '1': 'primeiro', '2': 'segundo', '3': 'terceiro', '4': 'quarto', '5': 'quinto',
    '6': 'sexto', '7': 'sétimo', '8': 'oitavo', '9': 'nono', '10': 'décimo',
}

ORDINAL_FEM: dict[str, str] = {
    '1': 'primeira', '2': 'segunda', '3': 'terceira', '4': 'quarta', '5': 'quinta',
    '6': 'sexta', '7': 'sétima', '8': 'oitava', '9': 'nona', '10': 'décima',
}

_FEMININE_NOUNS_RE = re.compile(
    r'\b(turma|vez|edição|etapa|fase|questão|rodada|vaga|semana|'
    r'instância|chamada|convocação|via|cópia|série|versão)\b',
    re.IGNORECASE,
)


@dataclass
class SentenceChunk:
    text: str
    pause_after_ms: int


class TextNormalizer:
    @classmethod
    def normalize_to_chunks(cls, raw_text: str) -> list[SentenceChunk]:
        expanded = cls._expand_all(raw_text)
        return cls._split_into_sentences(expanded)

    @classmethod
    def normalize(cls, raw_text: str) -> str:
        return cls._expand_all(raw_text)

    @classmethod
    def _expand_all(cls, text: str) -> str:
        t = text
        t = cls._expand_currency(t)
        t = cls._expand_dates(t)
        t = cls._expand_percentages(t)
        t = cls._expand_ordinals(t)
        t = cls._expand_abbreviations(t)
        t = cls._expand_acronyms(t)
        t = cls._expand_decimal_numbers(t)
        t = cls._normalize_punctuation(t)
        return re.sub(r'\s+', ' ', t).strip()

    @classmethod
    def _expand_currency(cls, text: str) -> str:
        def _replace(m: re.Match) -> str:
            int_part = m.group(1)
            cent_part = m.group(2)
            if cent_part and cent_part != '00':
                return f'{int_part} reais e {cent_part} centavos'
            return f'{int_part} reais'

        return re.sub(
            r'R\$\s?(\d{1,3}(?:\.\d{3})*)(?:,(\d{2}))?',
            _replace,
            text,
        )

    @classmethod
    def _expand_percentages(cls, text: str) -> str:
        return re.sub(r'(\d+(?:[.,]\d+)?)\s?%', lambda m: f'{m.group(1)} por cento', text)

    @classmethod
    def _expand_dates(cls, text: str) -> str:
        def _replace(m: re.Match) -> str:
            d, mo, y = int(m.group(1)), int(m.group(2)), m.group(3)
            month_name = MESES[mo - 1] if 1 <= mo <= 12 else m.group(2)
            year = f'20{y}' if len(y) == 2 else y
            return f'{d} de {month_name} de {year}'

        return re.sub(r'\b(\d{1,2})/(\d{1,2})/(\d{2,4})\b', _replace, text)

    @classmethod
    def _expand_ordinals(cls, text: str) -> str:
        # Art./Artigo — sempre masculino
        text = re.sub(
            r'\b(Art\.?|Artigo)\s*(\d{1,3})\s*[ºª]?',
            lambda m: f'Artigo {ORDINAL_MASC.get(m.group(2), m.group(2))}',
            text,
            flags=re.IGNORECASE,
        )
        # º = masculino, ª = feminino
        def _ordinal(m: re.Match) -> str:
            num, suffix = m.group(1), m.group(2)
            if suffix == 'ª':
                return ORDINAL_FEM.get(num, f'{num}ª')
            return ORDINAL_MASC.get(num, f'{num}º')

        text = re.sub(r'\b(\d{1,3})(º|ª)', _ordinal, text)
        return text

    @classmethod
    def _expand_abbreviations(cls, text: str) -> str:
        replacements = [
            (r'\bSr\.\s', 'Senhor '),
            (r'\bSra\.\s', 'Senhora '),
            (r'\bDr\.\s', 'Doutor '),
            (r'\bDra\.\s', 'Doutora '),
            (r'\bProf\.\s', 'Professor '),
            (r'\bProfa\.\s', 'Professora '),
            (r'\bEx\.\s', 'Excelência '),
            (r'\bpág\.\s?', 'página '),
            (r'\bpp\.\s?', 'páginas '),
            (r'\bnº\s?', 'número '),
            (r'\bn\.\s?', 'número '),
            (r'\betc\.\b', 'etcétera'),
        ]
        for pattern, repl in replacements:
            text = re.sub(pattern, repl, text, flags=re.IGNORECASE)
        return text

    @classmethod
    def _expand_acronyms(cls, text: str) -> str:
        for acronym, spoken in KNOWN_ACRONYMS.items():
            text = re.sub(rf'\b{re.escape(acronym)}\b', spoken, text)
        return text

    @classmethod
    def _expand_decimal_numbers(cls, text: str) -> str:
        def _replace(m: re.Match) -> str:
            int_part = m.group(1).replace('.', '')
            dec_part = m.group(2)
            return f'{int_part} vírgula {dec_part}'

        return re.sub(r'\b(\d{1,3}(?:\.\d{3})+),(\d+)\b', _replace, text)

    @classmethod
    def _normalize_punctuation(cls, text: str) -> str:
        t = re.sub(r'\.{3,}', '…', text)
        t = re.sub(r'!{2,}', '!', t)
        t = re.sub(r'\?{2,}', '?', t)
        t = re.sub(r'[–—]', ',', t)
        t = re.sub(r'\(([^)]+)\)', r', \1,', t)
        t = re.sub(r'\s*,\s*,\s*', ', ', t)
        return t

    @classmethod
    def _split_into_sentences(cls, text: str) -> list[SentenceChunk]:
        if not text.strip():
            return []

        # Protege abreviações internas
        protected = re.sub(r'\b(\w)\.(\w)\.', r'\1_DOT_\2_DOT_', text)
        raw_sentences = re.split(r'(?<=[.!?…])\s+(?=[A-ZÀ-Ú0-9])', protected)
        sentences = [s.replace('_DOT_', '.').strip() for s in raw_sentences if s.strip()]

        if not sentences:
            return [SentenceChunk(text=text, pause_after_ms=0)]

        chunks = []
        for idx, sentence in enumerate(sentences):
            is_last = idx == len(sentences) - 1
            ends_strong = bool(re.search(r'[.!?…]$', sentence))
            pause = 0 if is_last else (260 if ends_strong else 120)
            chunks.append(SentenceChunk(text=sentence, pause_after_ms=pause))

        return chunks
