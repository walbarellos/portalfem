#!/usr/bin/env python3
"""
Ciclo 00 - Stage A: Coleta estruturada com Elementor
Portal FEM Cultura -> /editais/

Responsabilidade única: baixar a página e reconstruir a árvore de menu
usando a estrutura de headings e toggles do Elementor.
Saída: raw_tree.json

Uso:
    python3 scrape_editais.py [URL] [--out raw_tree.json]
"""

import sys
import json
import time
import argparse
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup

DEFAULT_URL = "https://www.femcultura.ac.gov.br/editais/"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "pt-BR,pt;q=0.9",
}


def fetch(url: str) -> str:
    resp = requests.get(url, headers=HEADERS, timeout=30)
    resp.raise_for_status()
    return resp.text


def parse_elementor(soup: BeautifulSoup, base_url: str) -> list:
    # Container principal do Elementor
    container = soup.find("div", class_="entry-content") or soup.find("main") or soup.body
    
    tree = []
    current_category = None
    
    # No Elementor, cada widget (cabeçalho, toggle, etc.) fica dentro de um div com a classe 'elementor-widget-container'
    widgets = container.find_all("div", class_="elementor-widget-container")
    
    for widget in widgets:
        # 1. Verificar se é uma heading (Categoria)
        heading = widget.find(["h1", "h2", "h3", "h4", "h5", "h6"], class_="elementor-heading-title")
        if heading:
            title = heading.get_text(strip=True)
            if not title:
                continue
            # Ignora cabeçalhos institucionais, de menus ou navegação
            if any(x in title.upper() for x in ["NOTÍCIAS", "ESPAÇOS CULTURAIS", "EVENTOS", "BIBLIVRE", "CULTURA DO ESTADO", "LINK PARA EMISSÃO"]):
                continue
            
            current_category = {
                "label": title,
                "href": None,
                "children": []
            }
            tree.append(current_category)
            continue
            
        # 2. Verificar se é um widget de Toggle (Acordeão contendo editais)
        toggle = widget.find("div", class_="elementor-toggle")
        if toggle:
            # Caso encontre um toggle antes de qualquer cabeçalho, cria uma categoria genérica
            if current_category is None:
                current_category = {
                    "label": "Editais Gerais",
                    "href": None,
                    "children": []
                }
                tree.append(current_category)
                
            items = toggle.find_all("div", class_="elementor-toggle-item")
            for item in items:
                title_el = item.find("a", class_="elementor-toggle-title")
                if not title_el:
                    continue
                edital_title = title_el.get_text(strip=True)
                
                # Coleta arquivos do conteúdo do toggle (geralmente uma lista de links)
                content_el = item.find("div", class_="elementor-tab-content")
                doc_nodes = []
                if content_el:
                    for a in content_el.find_all("a"):
                        doc_label = a.get_text(strip=True)
                        doc_href = a.get("href")
                        if doc_href:
                            doc_href = urljoin(base_url, doc_href)
                            doc_nodes.append({
                                "label": doc_label,
                                "href": doc_href,
                                "children": []
                            })
                
                # Adiciona o edital à categoria ativa
                current_category["children"].append({
                    "label": edital_title,
                    "href": None,
                    "children": doc_nodes
                })
                
    return tree


def scrape(url: str) -> dict:
    html = fetch(url)
    soup = BeautifulSoup(html, "html.parser")
    tree = parse_elementor(soup, url)
    
    return {
        "source_url": url,
        "scraped_at": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
        "extraction_mode": "elementor-toggle-accurate",
        "warning": "Parsed using Elementor heading + toggle selectors.",
        "tree": tree,
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("url", nargs="?", default=DEFAULT_URL)
    ap.add_argument("--out", default="raw_tree.json")
    args = ap.parse_args()

    print(f"[Stage A] Baixando e analisando: {args.url}")
    try:
        data = scrape(args.url)
    except requests.RequestException as e:
        print(f"[Stage A] ERRO ao buscar a página: {e}", file=sys.stderr)
        sys.exit(1)

    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    total_nodes = _count(data["tree"])
    print(f"[Stage A] modo de extração: {data['extraction_mode']}")
    print(f"[Stage A] {total_nodes} nós estruturados -> {args.out}")


def _count(tree):
    n = 0
    for node in tree:
        n += 1
        n += _count(node.get("children", []))
    return n


if __name__ == "__main__":
    main()
