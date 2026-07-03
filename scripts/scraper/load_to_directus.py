#!/usr/bin/env python3
"""
Ciclo 01 - Loader: Importa dados classificados para o Directus
Portal FEM Cultura -> Directus

Responsabilidade única:
    1. Ler categorias, editais e resultados dos JSONs gerados.
    2. Baixar arquivos de editais e resultados de forma resiliente.
    3. Tratar links de Google Drive ou externos gerando arquivos de atalho.
    4. Fazer upload de tudo para o endpoint /files do Directus.
    5. Inserir as coleções categorias_editais, editais e resultados relacionadas.

Uso:
    python3 scripts/scraper/load_to_directus.py
"""

import os
import json
import mimetypes
from urllib.parse import urlparse
import requests

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
    """
    Baixa o arquivo e faz upload para o Directus.
    Se for um link do Google Drive ou pasta externa, cria um arquivo de atalho (.txt)
    para satisfazer o schema do Directus e manter a referência.
    """
    if not url:
        return None
        
    os.makedirs("temp_downloads", exist_ok=True)
    
    # Limpa caracteres inválidos para o nome do arquivo
    clean_label = "".join(c for c in label if c.isalnum() or c in (" ", "-", "_")).strip()
    filename_base = clean_label[:60] if clean_label else "documento"
    
    # Detecta se é link direto
    parsed = urlparse(url)
    path_lower = parsed.path.lower()
    is_direct = any(path_lower.endswith(ext) for ext in [
        ".pdf", ".doc", ".docx", ".zip", ".rar", ".7z", ".xlsx", ".xls", ".txt", ".png", ".jpg", ".jpeg"
    ]) or "wp-content/uploads" in url
    
    if is_direct:
        print(f"  📥 Baixando arquivo direto: {url}")
        try:
            r = requests.get(url, timeout=30)
            r.raise_for_status()
            
            # Tenta descobrir a extensão correta
            ext = ".pdf"
            ct = r.headers.get("content-type", "").lower()
            if "word" in ct:
                ext = ".docx"
            elif "zip" in ct:
                ext = ".zip"
            elif "rar" in ct:
                ext = ".rar"
            elif "text/plain" in ct:
                ext = ".txt"
            
            filepath = f"temp_downloads/{filename_base}{ext}"
            with open(filepath, "wb") as f:
                f.write(r.content)
                
            file_id = upload_file_to_directus(filepath, f"{filename_base}{ext}")
            os.remove(filepath)
            return file_id
        except Exception as e:
            print(f"  ⚠️ Falha ao baixar arquivo direto ({e}). Usando fallback de link...")

    # Fallback para Google Drive, formulários ou links externos
    print(f"  🔗 Criando arquivo de atalho para link externo: {url}")
    shortcut_content = (
        f"ATALHO PARA RECURSO EXTERNO\n"
        f"Nome: {label}\n"
        f"Link original: {url}\n\n"
        f"Este documento está hospedado externamente (ex. Google Drive ou formulários)."
    )
    filepath = f"temp_downloads/{filename_base}_ATALHO.txt"
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(shortcut_content)
        
    file_id = upload_file_to_directus(filepath, f"{filename_base}_ATALHO.txt")
    os.remove(filepath)
    return file_id


def load_categories() -> dict:
    """Carrega ou cria as categorias no Directus e retorna um mapa de slug -> ID."""
    print("\n📦 Processando categorias de editais...")
    with open("out/categorias_editais.json", "r", encoding="utf-8") as f:
        cats = json.load(f)
        
    slug_to_id = {}
    
    for cat in cats:
        slug = cat["slug"]
        nome = cat["nome"]
        
        # Verifica se a categoria já existe
        r = requests.get(
            f"{DIRECTUS_URL}/items/categorias_editais?filter[slug][_eq]={slug}",
            headers=HEADERS
        )
        r.raise_for_status()
        existing = r.json()["data"]
        
        if existing:
            cat_id = existing[0]["id"]
            print(f"  Existing: '{nome}' -> ID {cat_id}")
        else:
            # Cria a categoria
            r = requests.post(
                f"{DIRECTUS_URL}/items/categorias_editais",
                headers=HEADERS,
                json={"nome": nome, "slug": slug}
            )
            r.raise_for_status()
            cat_id = r.json()["data"]["id"]
            print(f"  Created: '{nome}' -> ID {cat_id}")
            
        slug_to_id[slug] = cat_id
        
    return slug_to_id


def load_editais(cat_map: dict) -> tuple:
    """Carrega os editais no Directus e retorna mapas de (número -> ID, título -> ID)."""
    print("\n📦 Processando editais...")
    with open("out/editais.json", "r", encoding="utf-8") as f:
        editais = json.load(f)
        
    num_to_id = {}
    title_to_id = {}
    
    for ed in editais:
        titulo = ed["titulo"]
        numero = ed["numero"]
        cat_slug = ed["categoria_slug"]
        cat_id = cat_map.get(cat_slug)
        
        print(f"\n👉 Importando Edital: {titulo}")
        
        # 1. Resolver e criar anexos
        directus_anexos = []
        for an in ed.get("anexos", []):
            file_id = get_or_create_file(an["arquivo"], an["nome"])
            if file_id:
                directus_anexos.append({
                    "nome": an["nome"],
                    "arquivo": file_id
                })
                
        # 2. Se o edital possui link direto para o PDF dele mesmo
        pdf_edital_id = None
        if ed.get("link_pdf"):
            pdf_edital_id = get_or_create_file(ed["link_pdf"], f"PDF {titulo}")
            
        payload = {
            "titulo": ed["titulo"],
            "numero": ed["numero"],
            "data_abertura": None,
            "data_encerramento": None,
            "status_label": ed["status_label"],
            "link_pdf": ed["link_pdf"] if not pdf_edital_id else None,
            "pdf_edital": pdf_edital_id,
            "anexos": directus_anexos,
            "resumo": ed["resumo"],
            "categoria": cat_id,
            "status": ed["status"]
        }
        
        # Envia para o Directus
        r = requests.post(f"{DIRECTUS_URL}/items/editais", headers=HEADERS, json=payload)
        r.raise_for_status()
        edital_id = r.json()["data"]["id"]
        print(f"  ✅ Edital criado com sucesso! ID: {edital_id}")
        
        if numero:
            num_to_id[numero] = edital_id
        title_to_id[titulo] = edital_id
            
    return num_to_id, title_to_id


def load_resultados(num_to_id: dict, title_to_id: dict):
    """Carrega os resultados e os associa aos seus respectivos editais."""
    print("\n📦 Processando resultados...")
    with open("out/resultados.json", "r", encoding="utf-8") as f:
        resultados = json.load(f)
        
    for res in resultados:
        titulo = res["titulo"]
        num_edital = res["numero_edital_relacionado"]
        titulo_edital = res.get("titulo_edital_relacionado", "")
        
        # Busca ID do edital usando o número ou o título para maior resiliência
        edital_id = None
        if num_edital:
            edital_id = num_to_id.get(num_edital)
        if not edital_id and titulo_edital:
            edital_id = title_to_id.get(titulo_edital)
        
        if not edital_id:
            print(f"  ⚠️ Ignorando resultado '{titulo}' (Edital '{num_edital or titulo_edital}' não localizado)")
            continue
            
        print(f"\n👉 Importando Resultado: {titulo} (Para Edital {num_edital or titulo_edital})")
        
        file_id = get_or_create_file(res["arquivo"], titulo)
        if not file_id:
            continue
            
        payload = {
            "titulo": titulo,
            "descricao": res["descricao"],
            "data_publicacao": None,
            "arquivo": file_id,
            "edital_relacionado": edital_id,
            "status": res["status"]
        }
        
        r = requests.post(f"{DIRECTUS_URL}/items/resultados", headers=HEADERS, json=payload)
        r.raise_for_status()
        print(f"  ✅ Resultado criado com sucesso! ID: {r.json()['data']['id']}")


def main():
    print("🚀 Iniciando importação para o Directus...")
    try:
        # 1. Carregar Categorias
        cat_map = load_categories()
        
        # 2. Carregar Editais
        num_to_id, title_to_id = load_editais(cat_map)
        
        # 3. Carregar Resultados relacionados
        load_resultados(num_to_id, title_to_id)
        
        print("\n🎉 Importação concluída com sucesso!")
        
        # Remove a pasta temp temporária se vazia
        if os.path.exists("temp_downloads") and not os.listdir("temp_downloads"):
            os.rmdir("temp_downloads")
            
    except Exception as e:
        print(f"\n❌ ERRO durante a importação: {e}")


if __name__ == "__main__":
    main()
