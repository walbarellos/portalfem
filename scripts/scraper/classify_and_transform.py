#!/usr/bin/env python3
"""
Ciclo 00 - Stage B: Classificacao + Transformacao (lego -> encaixe)

Le raw_tree.json (saida do scrape_editais.py) e produz, no formato
exato das collections Directus definidas em frontend/src/schemas/directus.ts:

    editais.json             -> list[Edital]        (com anexos[] embutido)
    categorias_editais.json  -> list[CategoriaEdital]
    resultados.json          -> list[Resultado]      (linkado por numero_edital)
    chamamentos.json         -> list[Chamamento]      (chamamentos publicos avulsos)
    _nao_classificados.json  -> nos que a heuristica nao soube encaixar
                                 (revisao manual antes de importar)

Uso:
    python3 classify_and_transform.py [--in raw_tree.json] [--out-dir out]
"""

import re
import json
import argparse
import unicodedata
from pathlib import Path

# ---------------------------------------------------------------- helpers

def strip_accents(s: str) -> str:
    return "".join(
        c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn"
    )


def norm(s: str) -> str:
    return strip_accents(s or "").upper().strip()


def slugify(s: str) -> str:
    s = strip_accents(s or "").lower()
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s


# ---------------------------------------------------------------- classificacao

CATEGORIA_PATTERNS = [
    r"^PNAB",
    r"^POL[IÍ]TICA NACIONAL ALDIR BLANC",
    r"^LEI PAULO GUSTAVO",
    r"^FUNDO ESTADUAL DE CULTURA",
    r"^FUNDO ESTADUAL DE INCENTIVO",
    r"^CHAMAMENTOS? P[UÚ]BLICOS?",
    r"^EDITAIS? LEI ALDIR",
    r"^EDITAL SELE[CÇ][AÃ]O DE PARECERISTA",
]

EDITAL_PATTERNS = [
    r"^EDITAL\s*N?[ºO°]?\s*[\.\-]?\s*\d",
    r"^EDITAL DE CHAMAMENTO P[UÚ]BLICO",
    r"^EDITAL DE CREDENCIAMENTO",
    r"^EDITAL DE INCENTIVO",
    r"^EDITAL DE APOIO",
    r"^EDITAL DO CONCURSO",
    r"^EDITAL DE FOMENTO",
    r"^EDITAL CHAMAMENTO",
    r"^EDITAL DE ARTE E PATRIM[OÔ]NIO$",
    r"^EDITAL - PR[EÊ]MIO",
    r"^EDITAL DE AUDIOVISUAL$",
    r"^EDITAL\s+\-\s+POVOS\s+ORIGIN[AÁ]RIOS",
    r"^EDITAL\s+PROGRAMA",
    r"^EDITAL\s+MARCHA\s+PARA\s+JESUS",
]

RESULTADO_PATTERNS = [
    r"RESULTADO",
    r"RETIFICA[CÇ][AÃ]O",
    r"ERRATA",
    r"PORTARIA",
    r"HABILITA[CÇ][AÃ]O",
    r"LISTA PRELIMINAR",
    r"AVISO DE PRORROGA[CÇ][AÃ]O",
    r"RENDIMENTOS",
]

ANEXO_PATTERNS = [
    r"^ANEXO",
    r"^AP[EÊ]NDICE",
    r"FICHA DE INSCRI[CÇ][AÃ]O",
    r"FORMUL[AÁ]RIO",
    r"MINUTA",
    r"TERMO DE COMPROMISSO",
    r"CARTA DE ANU[EÊ]NCIA",
    r"MODELO",
    r"^EDITAL$",  # o proprio PDF do edital, quando e' filho de um no' "EDITAL N.../..."
]

NUMERO_RE = re.compile(r"N[ºO°]?\.?\s*(\d{2,4}\s*/\s*\d{4}|\d{2,4}[\-\.]?\d{4}|\d{2,4})")
ANO_RE = re.compile(r"(20\d{2})")


def match_any(patterns, text):
    return any(re.search(p, text) for p in patterns)


def classify(label: str) -> str:
    t = norm(label)
    if match_any(EDITAL_PATTERNS, t):
        return "edital"
    if match_any(CATEGORIA_PATTERNS, t):
        return "categoria"
    if match_any(RESULTADO_PATTERNS, t):
        return "resultado"
    if match_any(ANEXO_PATTERNS, t):
        return "anexo"
    if t.startswith("CHAMAMENTO P"):
        return "chamamento"
    return "desconhecido"


# ---------------------------------------------------------------- transformacao

def extract_numero(label: str) -> str:
    m = NUMERO_RE.search(norm(label))
    return m.group(1).replace(" ", "") if m else ""


def flatten_documents(node: dict, out: list):
    """Coleta recursivamente todo documento com href sob um no' de edital."""
    for child in node.get("children", []):
        if child.get("href"):
            out.append(child)
        flatten_documents(child, out)


def build_edital(node: dict, categoria_slug: str) -> dict:
    label = node["label"]
    numero = extract_numero(label)
    ano_m = ANO_RE.search(label) or (ANO_RE.search(categoria_slug) if categoria_slug else None)
    ano = ano_m.group(1) if ano_m else ""

    docs = []
    flatten_documents(node, docs)

    anexos = []
    resultados = []
    link_pdf = node.get("href")  # se o proprio no' do edital ja' e' um link (pdf)

    for d in docs:
        d_class = classify(d["label"])
        entry = {"nome": d["label"], "arquivo": d["href"]}
        if d_class == "resultado":
            resultados.append(
                {
                    "titulo": d["label"],
                    "descricao": "",
                    "data_publicacao": "",
                    "arquivo": d["href"],
                    "numero_edital_relacionado": numero,  # resolvido p/ id no Ciclo 01 (import)
                    "status": "draft",
                }
            )
        else:
            # tudo que nao e' explicitamente "resultado" vira anexo
            # (inclui ANEXO, APENDICE, FORMULARIO, FICHA, e o proprio PDF
            # do edital quando aparece como filho em vez de href direto)
            anexos.append(entry)

    return {
        "titulo": label,
        "numero": numero,
        "data_abertura": "",
        "data_encerramento": "",
        "status_label": "encerrado" if ano and ano < "2026" else "breve",
        "link_pdf": link_pdf,
        "link_inscricao": None,
        "pdf_edital": None,       # preenchido no Ciclo 01, apos upload no Directus
        "pdf_diario_oficial": None,
        "anexos": anexos,
        "resumo": "",
        "categoria_slug": categoria_slug,  # resolvido p/ id da categoria no Ciclo 01
        "status": "draft",
    }, resultados


def walk(tree: list, categoria_atual: dict, editais: list, resultados: list,
         categorias: dict, chamamentos: list, nao_classificados: list):
    for node in tree:
        label = node["label"]
        if not label:
            continue
        kind = classify(label)

        if kind == "categoria":
            slug = slugify(label)
            categorias[slug] = {"nome": label, "slug": slug}
            walk(node.get("children", []), categorias[slug], editais, resultados,
                 categorias, chamamentos, nao_classificados)

        elif kind == "edital":
            cat_slug = categoria_atual["slug"] if categoria_atual else "sem-categoria"
            edital, ed_resultados = build_edital(node, cat_slug)
            editais.append(edital)
            resultados.extend(ed_resultados)

        elif kind == "chamamento":
            # CHAMAMENTOS PUBLICOS avulsos (fora do fluxo padrao de edital/PNAB)
            for child in node.get("children", []):
                chamamentos.append(
                    {
                        "titulo": child["label"],
                        "descricao": "",
                        "data_publicacao": "",
                        "arquivo": child.get("href"),
                        "status": "draft",
                    }
                )
            walk(node.get("children", []), categoria_atual, editais, resultados,
                 categorias, chamamentos, nao_classificados)

        elif kind in ("resultado", "anexo"):
            # documento solto, fora do escopo direto de um "edital" pai
            # (ex.: links de nivel superior tipo "LINK PARA EMISSAO DE CERTIDOES")
            nao_classificados.append({"label": label, "href": node.get("href"), "reason": kind})
            walk(node.get("children", []), categoria_atual, editais, resultados,
                 categorias, chamamentos, nao_classificados)

        else:
            # desconhecido: desce mesmo assim, pode ter editais dentro
            walk(node.get("children", []), categoria_atual, editais, resultados,
                 categorias, chamamentos, nao_classificados)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--in", dest="infile", default="raw_tree.json")
    ap.add_argument("--out-dir", default="out")
    args = ap.parse_args()

    raw = json.loads(Path(args.infile).read_text(encoding="utf-8"))
    tree = raw["tree"]

    editais, resultados, chamamentos, nao_classificados = [], [], [], []
    categorias = {}

    walk(tree, None, editais, resultados, categorias, chamamentos, nao_classificados)

    out_dir = Path(args.out_dir)
    out_dir.mkdir(exist_ok=True)

    (out_dir / "editais.json").write_text(
        json.dumps(editais, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    (out_dir / "categorias_editais.json").write_text(
        json.dumps(list(categorias.values()), ensure_ascii=False, indent=2), encoding="utf-8"
    )
    (out_dir / "resultados.json").write_text(
        json.dumps(resultados, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    (out_dir / "chamamentos.json").write_text(
        json.dumps(chamamentos, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    (out_dir / "_nao_classificados.json").write_text(
        json.dumps(nao_classificados, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    print(f"[Stage B] {len(editais)} editais")
    print(f"[Stage B] {len(categorias)} categorias")
    print(f"[Stage B] {len(resultados)} resultados")
    print(f"[Stage B] {len(chamamentos)} chamamentos avulsos")
    print(f"[Stage B] {len(nao_classificados)} nos nao classificados (revisar manualmente)")
    print(f"[Stage B] arquivos gravados em: {out_dir}/")


if __name__ == "__main__":
    main()
