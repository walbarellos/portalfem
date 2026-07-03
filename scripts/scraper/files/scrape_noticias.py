#!/usr/bin/env python3
"""
Ciclo 00 - Noticias
Portal FEM Cultura -> /noticias/ (paginado: /noticias/2/, /noticias/3/, ...)

Estrutura Elementor "Posts" widget: article.elementor-post dentro de
.elementor-posts-container. A pagina 1 expoe data-max-page no elemento
.e-load-more-anchor -- usamos isso pra descobrir quantas paginas existem
e percorrer todas.

Saida: noticias.json no formato Noticia (frontend/src/schemas/directus.ts)

Uso:
    python3 scrape_noticias.py [BASE_URL] [--out noticias.json] [--max-pages N] [--delay 1.0]
"""

import re
import sys
import json
import time
import argparse
import unicodedata
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup, Tag

DEFAULT_BASE_URL = "https://www.femcultura.ac.gov.br/noticias/"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (compatible; FEM-PortalMigration-Bot/1.0; "
        "+interno-TI-FEM-Cultura; migracao-conteudo-noticias)"
    ),
    "Accept-Language": "pt-BR,pt;q=0.9",
}

MESES = {
    "janeiro": 1, "fevereiro": 2, "marco": 3, "março": 3, "abril": 4,
    "maio": 5, "junho": 6, "julho": 7, "agosto": 8, "setembro": 9,
    "outubro": 10, "novembro": 11, "dezembro": 12,
}
DATA_RE = re.compile(r"(\d{1,2})\s+de\s+([a-zçã]+)\s+de\s+(\d{4})", re.IGNORECASE)

# categoria (classe WP category-*) -> enum Noticia.categoria
# enum disponivel: destaque | editais | musica | patrimonio | artes_visuais |
#                  institucional | educacao | eventos
# nem toda categoria do WP tem correspondencia clara -- as que nao batem
# ficam None e vao pro campo "categoria_bruta" para revisao manual.
CATEGORIA_MAP = {
    "especial": "destaque",
    "editais": "editais",
    "lei-aldir-blanc": "editais",
    "festival": "eventos",
    "eventos": "eventos",
    "musica": "musica",
    "patrimonio": "patrimonio",
    "artes-visuais": "artes_visuais",
    "institucional": "institucional",
    "educacao": "educacao",
}


def strip_accents(s: str) -> str:
    return "".join(
        c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn"
    )


def slugify_from_url(url: str) -> str:
    if not url:
        return ""
    path = url.rstrip("/").rsplit("/", 1)[-1]
    return path


def parse_data_publicacao(text: str):
    """'4 de março de 2026' -> '2026-03-04T12:00:00Z'"""
    m = DATA_RE.search(text or "")
    if not m:
        return ""
    dia, mes_nome, ano = m.groups()
    mes_key = strip_accents(mes_nome.lower())
    mes = MESES.get(mes_key) or MESES.get(mes_nome.lower())
    if not mes:
        return ""
    return f"{int(ano):04d}-{mes:02d}-{int(dia):02d}T12:00:00Z"


def extract_categorias_brutas(article: Tag) -> list:
    classes = article.get("class", [])
    return [c.replace("category-", "") for c in classes if c.startswith("category-")]


def map_categoria(categorias_brutas: list):
    for c in categorias_brutas:
        if c in CATEGORIA_MAP:
            return CATEGORIA_MAP[c]
    return None


def fetch_full_content(post_url: str) -> str:
    if not post_url:
        return ""
    try:
        r = requests.get(post_url, headers=HEADERS, timeout=30)
        r.raise_for_status()
        soup = BeautifulSoup(r.text, "html.parser")
        
        # Procura pelo container do Elementor
        content_container = (
            soup.select_one(".elementor-widget-theme-post-content .elementor-widget-container")
            or soup.select_one(".entry-content")
            or soup.select_one("article .elementor-text-editor")
        )
        if not content_container:
            return ""
            
        # Corrige imagens lazy-loaded dentro do corpo do post
        for img in content_container.find_all("img"):
            real_src = (
                img.get("data-lazy-src")
                or img.get("data-src")
                or img.get("src")
            )
            if real_src:
                img["src"] = urljoin(post_url, real_src)
                # Limpa atributos lazy do WordPress para evitar bugs
                for attr in ["data-lazy-src", "data-lazy-srcset", "data-lazy-sizes", "data-src", "data-srcset", "lazy-src"]:
                    if img.has_attr(attr):
                        del img[attr]
                        
        # Retorna o HTML interno limpo
        return str(content_container)
    except Exception as e:
        print(f"  ⚠️ Falha ao baixar conteudo de {post_url}: {e}")
        return ""


def extract_post(article: Tag, base_url: str):
    link_tag = article.select_one(".elementor-post__title a")
    href = urljoin(base_url, link_tag.get("href")) if link_tag and link_tag.get("href") else None
    titulo = link_tag.get_text(strip=True) if link_tag else ""

    thumb = article.select_one(".elementor-post__thumbnail img")
    imagem = None
    if thumb is not None:
        imagem = (
            thumb.get("data-lazy-src")
            or thumb.get("data-src")
            or thumb.get("src")
        )
        if imagem and imagem.startswith("data:"):
            imagem = thumb.get("data-lazy-src") or thumb.get("data-src")
            
        if imagem:
            imagem = urljoin(base_url, imagem)

    excerpt_tag = article.select_one(".elementor-post__excerpt")
    resumo = excerpt_tag.get_text(" ", strip=True) if excerpt_tag else ""

    date_tag = article.select_one(".elementor-post-date")
    data_texto = date_tag.get_text(strip=True) if date_tag else ""
    data_publicacao = parse_data_publicacao(data_texto)

    categorias_brutas = extract_categorias_brutas(article)
    categoria = map_categoria(categorias_brutas)
    destaque = "especial" in categorias_brutas

    conteudo = ""
    if href:
        print(f"  📥 Baixando conteudo completo: {href}")
        conteudo = fetch_full_content(href)
        # Delay de cortesia
        time.sleep(0.3)

    incompleto = not titulo or not resumo or not conteudo

    return {
        "titulo": titulo,
        "resumo": resumo,
        "conteudo": conteudo,
        "imagem_destaque": imagem,
        "data_publicacao": data_publicacao,
        "autor": None,
        "categoria": categoria,
        "categoria_bruta": categorias_brutas,  # nao existe no schema; usar so' p/ revisao
        "slug": slugify_from_url(href),
        "destaque": destaque,
        "status": "draft",
        "_url_original": href,
        "_incompleto": incompleto,  # titulo/resumo vazios no HTML de origem
    }


def discover_max_page(soup: BeautifulSoup) -> int:
    anchor = soup.select_one(".e-load-more-anchor")
    if anchor and anchor.get("data-max-page"):
        try:
            return int(anchor["data-max-page"])
        except ValueError:
            pass
    return 1


def scrape(base_url: str, max_pages: int, delay: float) -> list:
    posts = []
    page = 1
    total_pages = max_pages if max_pages > 0 else 999

    while page <= total_pages:
        url = base_url if page == 1 else urljoin(base_url, f"{page}/")
        print(f"[Noticias] pagina {page}/{total_pages}: {url}")
        resp = requests.get(url, headers=HEADERS, timeout=30)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")

        if page == 1 and max_pages == 0:
            total_pages = discover_max_page(soup)
            print(f"[Noticias] paginacao detectada: {total_pages} paginas")

        articles = soup.select("article.elementor-post")
        if not articles:
            print(f"[Noticias] pagina {page} sem posts, parando.")
            break

        for art in articles:
            posts.append(extract_post(art, url))

        page += 1
        if page <= total_pages:
            time.sleep(delay)

    return posts


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("base_url", nargs="?", default=DEFAULT_BASE_URL)
    ap.add_argument("--out", default="noticias.json")
    ap.add_argument("--max-pages", type=int, default=0,
                     help="0 = autodetectar via data-max-page (padrao)")
    ap.add_argument("--delay", type=float, default=1.0,
                     help="segundos entre requests (educado com o servidor)")
    args = ap.parse_args()

    try:
        posts = scrape(args.base_url, args.max_pages, args.delay)
    except requests.RequestException as e:
        print(f"ERRO ao buscar paginas: {e}", file=sys.stderr)
        sys.exit(1)

    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(posts, f, ensure_ascii=False, indent=2)

    sem_categoria = sum(1 for p in posts if p["categoria"] is None)
    incompletos = sum(1 for p in posts if p["_incompleto"])

    print(f"[Noticias] {len(posts)} noticias extraidas -> {args.out}")
    print(f"[Noticias] AVISO: {sem_categoria} sem categoria mapeada (revisar categoria_bruta)")
    print(f"[Noticias] AVISO: {incompletos} com titulo/resumo vazios no HTML original")


if __name__ == "__main__":
    main()
