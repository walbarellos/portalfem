#!/usr/bin/env python3
"""
Ciclo 00 - Espacos Culturais
Portal FEM Cultura -> /espacosculturais/

Elementor NAO usa <ul>/<li> aqui: cada espaco e' uma
div.elementor-column contendo widget de imagem + heading + text-editor
(endereco/horario, muitas vezes colado direto do Google Maps, cheio de
divs aninhadas irrelevantes -- get_text() ja' ignora essas classes).

Saida: espacos_culturais.json no formato EspacoCultural (frontend/src/schemas/directus.ts)

Uso:
    python3 scrape_espacos_culturais.py [URL] [--out espacos_culturais.json]
"""

import re
import sys
import json
import argparse
import unicodedata
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup, Tag

DEFAULT_URL = "https://www.femcultura.ac.gov.br/espacosculturais/"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (compatible; FEM-PortalMigration-Bot/1.0; "
        "+interno-TI-FEM-Cultura; migracao-conteudo-espacos)"
    ),
    "Accept-Language": "pt-BR,pt;q=0.9",
}

DIAS_RE = re.compile(
    r"(segunda|ter[cç]a|quarta|quinta|sexta|s[aá]bado|domingo)", re.IGNORECASE
)
HORA_RE = re.compile(r"\d{1,2}h(\d{2})?\s*(às|as|-|–)\s*\d{1,2}h(\d{2})?", re.IGNORECASE)

CATEGORIA_KEYWORDS = [
    (r"biblioteca", "biblioteca"),
    (r"museu", "museu"),
    (r"teatro", "teatro"),
    (r"casa de cultura", "casa_de_cultura"),
    (r"centro cultural", "centro_cultural"),
    (r"galeria", "centro_cultural"),  # nao ha' enum "galeria"; revisar manualmente
    (r"mem[oó]ria|arquivo", "espaco_memoria"),
]


def strip_accents(s: str) -> str:
    return "".join(
        c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn"
    )


def slugify(s: str) -> str:
    s = strip_accents(s or "").lower()
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s


def infer_categoria(nome: str):
    t = strip_accents(nome or "").lower()
    for pattern, cat in CATEGORIA_KEYWORDS:
        if re.search(pattern, t):
            return cat
    return None  # sem match -> revisar manualmente


BLACKLIST = {
    "CULTURA DO ESTADO DO ACRE", "CULTURA DO ESTADO ACRE",
    "FUNDAÇÃO DE CULTURA  \nELIAS MANSOUR", "FUNDAÇÃO DE CULTURA\nELIAS MANSOUR",
    "FUNDAÇÃO DE CULTURA ELIAS MANSOUR",
    "ESPAÇOS CULTURAIS", "TEATRO", "DEFIC", "DARTES",
    "BASTIDORES DA GESTÃO", "GOVERNO DO ESTADO ACRE", "REDES SOCIAIS"
}


def best_image_src(img_tag: Tag, base_url: str):
    if img_tag is None:
        return None
    src = (
        img_tag.get("data-lazy-src")
        or img_tag.get("data-src")
        or img_tag.get("src")
    )
    if src and src.startswith("data:"):
        src = img_tag.get("data-lazy-src") or img_tag.get("data-src")
    return urljoin(base_url, src) if src else None


def split_endereco_horario(raw_text: str):
    """Separa linhas de endereco das linhas de horario de funcionamento."""
    lines = [l.strip() for l in raw_text.splitlines() if l.strip()]
    endereco_lines, horario_lines = [], []
    for line in lines:
        if DIAS_RE.search(line) or HORA_RE.search(line):
            horario_lines.append(line)
        else:
            endereco_lines.append(line)
    return " ".join(endereco_lines).strip(", "), " | ".join(horario_lines)


def extract_card(column: Tag, base_url: str):
    heading = column.select_one(".elementor-widget-heading .elementor-heading-title")
    if heading is None:
        return None
    link = heading.find("a")
    # Usa get_text com newline para que possamos tratar quebras de linha
    nome = (link.get_text("\n", strip=True) if link else heading.get_text("\n", strip=True))
    if not nome:
        return None

    nome_original = nome
    nome = nome.replace("\r", "")
    categoria_extra = None
    if "\n" in nome:
        parts = [p.strip() for p in nome.split("\n") if p.strip()]
        if len(parts) > 1:
            first = parts[0].upper()
            if first in ["TEATRO", "MUSEU", "BIBLIOTECA", "GALERIA"]:
                nome = " ".join(parts[1:])
                if first == "TEATRO":
                    categoria_extra = "teatro"
                elif first == "MUSEU":
                    categoria_extra = "museu"
                elif first == "BIBLIOTECA":
                    categoria_extra = "biblioteca"
                elif first == "GALERIA":
                    categoria_extra = "centro_cultural"
            else:
                nome = " ".join(parts)

    img = None
    img_container = column.select_one(".elementor-widget-image .elementor-image")
    if img_container is not None:
        img = img_container.find("img")
        # evita pegar o <img> duplicado dentro de <noscript>
        if img is not None and img.find_parent("noscript") is not None:
            img = img_container.find("img", recursive=True)

    text_block = column.select_one(".elementor-widget-text-editor .elementor-text-editor")
    raw_text = text_block.get_text("\n", strip=True) if text_block else ""
    endereco, horario = split_endereco_horario(raw_text)

    return {
        "nome": nome,
        "slug": slugify(nome),
        "categoria": infer_categoria(nome_original) or categoria_extra,
        "descricao": "",
        "endereco": endereco,
        "latitude": None,
        "longitude": None,
        "imagem": best_image_src(img, base_url),
        "horario_funcionamento": horario,
        "status": "draft",
    }


def scrape(url: str) -> list:
    resp = requests.get(url, headers=HEADERS, timeout=30)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "html.parser")

    cards = []
    seen = set()
    # so' colunas que tem um heading dentro (evita pegar colunas de layout puro)
    for col in soup.select("div.elementor-column"):
        if col.select_one(".elementor-widget-heading") is None:
            continue
        card = extract_card(col, url)
        if card is None:
            continue
            
        # Filtra elementos de layout indesejados
        nome_norm = card["nome"].strip()
        if nome_norm in BLACKLIST:
            continue
            
        key = (card["nome"], card["imagem"])
        if key in seen:
            continue
        seen.add(key)
        cards.append(card)
    return cards


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("url", nargs="?", default=DEFAULT_URL)
    ap.add_argument("--out", default="espacos_culturais.json")
    args = ap.parse_args()

    print(f"[Espacos Culturais] baixando: {args.url}")
    try:
        cards = scrape(args.url)
    except requests.RequestException as e:
        print(f"ERRO ao buscar a pagina: {e}", file=sys.stderr)
        sys.exit(1)

    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(cards, f, ensure_ascii=False, indent=2)

    sem_categoria = [c["nome"] for c in cards if c["categoria"] is None]
    sem_imagem = [c["nome"] for c in cards if not c["imagem"]]

    print(f"[Espacos Culturais] {len(cards)} espacos extraidos -> {args.out}")
    if sem_categoria:
        print(f"[Espacos Culturais] AVISO: sem categoria inferida ({len(sem_categoria)}): {sem_categoria}")
    if sem_imagem:
        print(f"[Espacos Culturais] AVISO: sem imagem encontrada ({len(sem_imagem)}): {sem_imagem}")


if __name__ == "__main__":
    main()
