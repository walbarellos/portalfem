#!/usr/bin/env python3
"""
Loader: Importa Notícias para o Directus
Portal FEM Cultura -> Directus

Uso:
    python3 scripts/scraper/load_noticias_to_directus.py
"""

import os
import json
import mimetypes
from urllib.parse import urlparse
import requests
from bs4 import BeautifulSoup

DIRECTUS_URL = os.getenv("DIRECTUS_URL", "http://localhost:8055")
DIRECTUS_TOKEN = os.getenv("DIRECTUS_TOKEN", "fem-admin-static-token-2025")

HEADERS = {
    "Authorization": f"Bearer {DIRECTUS_TOKEN}"
}


def upload_file_to_directus(filepath: str, filename: str) -> str:
    """Faz upload de um arquivo local para o Directus e retorna seu UUID."""
    mime_type, _ = mimetypes.guess_type(filepath)
    if not mime_type:
        mime_type = "application/octet-stream"
        
    url = f"{DIRECTUS_URL}/files"
    with open(filepath, "rb") as f:
        files = {
            "file": (filename, f, mime_type)
        }
        r = requests.post(url, headers=HEADERS, files=files)
        r.raise_for_status()
        return r.json()["data"]["id"]


def get_or_create_file(url: str, label: str) -> str:
    """Baixa a imagem e faz upload para o Directus."""
    if not url:
        return None
        
    os.makedirs("temp_downloads", exist_ok=True)
    clean_label = "".join(c for c in label if c.isalnum() or c in (" ", "-", "_")).strip()
    filename_base = clean_label[:60] if clean_label else "noticia"
    
    parsed = urlparse(url)
    ext = os.path.splitext(parsed.path)[1] or ".jpg"
    
    try:
        r = requests.get(url, timeout=30)
        r.raise_for_status()
        
        filepath = f"temp_downloads/{filename_base}{ext}"
        with open(filepath, "wb") as f:
            f.write(r.content)
            
        file_id = upload_file_to_directus(filepath, f"{filename_base}{ext}")
        os.remove(filepath)
        return file_id
    except Exception as e:
        print(f"    ⚠️ Falha ao baixar imagem {url} ({e}).")
        return None


def migrate_embedded_images(html_content: str, post_title: str) -> str:
    """Procura imagens no corpo do post, baixa e reescreve a URL para Directus local."""
    if not html_content:
        return ""
        
    soup = BeautifulSoup(html_content, "html.parser")
    images = soup.find_all("img")
    
    for i, img in enumerate(images):
        old_src = img.get("src")
        if old_src and (old_src.startswith("http://") or old_src.startswith("https://")):
            print(f"    🖼️ Migrando imagem embutida {i+1}: {old_src}")
            file_id = get_or_create_file(old_src, f"{post_title}_artigo_{i+1}")
            if file_id:
                # Substitui a URL do src original para o padrao da nossa API local
                img["src"] = f"/api/file/{file_id}"
                
    return str(soup)


def main():
    print("🚀 Iniciando importação de Notícias para o Directus...")
    
    # 0. Limpa todas as notícias existentes para evitar duplicações
    print("🧹 Limpando notícias existentes no Directus...")
    try:
        r = requests.get(f"{DIRECTUS_URL}/items/noticias?limit=500", headers=HEADERS)
        existing_ids = [x["id"] for x in r.json().get("data", [])]
        if existing_ids:
            requests.delete(f"{DIRECTUS_URL}/items/noticias", headers=HEADERS, json=existing_ids)
            print(f"  ✅ Deletadas {len(existing_ids)} notícias antigas.")
    except Exception as e:
        print(f"  ⚠️ Falha ao limpar notícias antigas: {e}")
        
    json_path = "noticias.json"
    if not os.path.exists(json_path):
        json_path = "out/noticias.json"
    if not os.path.exists(json_path):
        print(f"❌ Arquivo de dados de notícias não encontrado!")
        return
        
    with open(json_path, "r", encoding="utf-8") as f:
        noticias = json.load(f)
        
    for noti in noticias:
        titulo = noti["titulo"]
        
        # Ignora posts vazios/incompletos
        if noti.get("_incompleto") or not titulo:
            print(f"\n⚠️ Ignorando notícia incompleta/vazia.")
            continue
            
        print(f"\n👉 Importando Notícia: {titulo}")
        
        # 1. Faz upload da imagem de destaque principal
        imagem_destaque_id = None
        if noti.get("imagem_destaque") and not noti["imagem_destaque"].startswith("data:"):
            print(f"  📥 Baixando imagem de destaque...")
            imagem_destaque_id = get_or_create_file(noti["imagem_destaque"], f"{titulo}_destaque")
            
        # 2. Migra as imagens dentro do HTML de conteudo
        conteudo_migrado = noti.get("conteudo") or ""
        if conteudo_migrado:
            conteudo_migrado = migrate_embedded_images(conteudo_migrado, titulo)
            
        payload = {
            "titulo": titulo,
            "resumo": noti.get("resumo") or "",
            "conteudo": conteudo_migrado or noti.get("resumo") or "",
            "imagem_destaque": imagem_destaque_id,
            "data_publicacao": noti.get("data_publicacao"),
            "autor": None,
            "categoria": noti.get("categoria"),  # destaque | editais | musica | patrimonio | artes_visuais | institucional | educacao | eventos
            "slug": noti.get("slug"),
            "destaque": noti.get("destaque", False),
            "status": "published"  # publicamos direto no portal
        }
        
        # Envia para o Directus
        r = requests.post(f"{DIRECTUS_URL}/items/noticias", headers=HEADERS, json=payload)
        r.raise_for_status()
        print(f"  ✅ Notícia criada com sucesso! ID: {r.json()['data']['id']}")
        
    # Remove a pasta temp temporária se vazia
    if os.path.exists("temp_downloads") and not os.listdir("temp_downloads"):
        os.rmdir("temp_downloads")
        
    print("\n🎉 Importação de Notícias concluída com sucesso!")


if __name__ == "__main__":
    main()
