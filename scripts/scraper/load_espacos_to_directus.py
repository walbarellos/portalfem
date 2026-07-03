#!/usr/bin/env python3
"""
Loader: Importa Espaços Culturais para o Directus
Portal FEM Cultura -> Directus

Uso:
    python3 scripts/scraper/load_espacos_to_directus.py
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
    """Baixa a imagem e faz upload para o Directus."""
    if not url:
        return None
        
    os.makedirs("temp_downloads", exist_ok=True)
    clean_label = "".join(c for c in label if c.isalnum() or c in (" ", "-", "_")).strip()
    filename_base = clean_label[:60] if clean_label else "espaco"
    
    parsed = urlparse(url)
    ext = os.path.splitext(parsed.path)[1] or ".jpg"
    
    print(f"  📥 Baixando imagem: {url}")
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
        print(f"  ⚠️ Falha ao baixar imagem ({e}).")
        return None


def main():
    print("🚀 Iniciando importação de Espaços Culturais para o Directus...")
    
    # Verifica se o arquivo de dados existe
    json_path = "espacos_culturais.json"
    if not os.path.exists(json_path):
        json_path = "out/espacos_culturais.json"
    if not os.path.exists(json_path):
        print(f"❌ Arquivo de dados de espaços culturais não encontrado!")
        return
        
    with open(json_path, "r", encoding="utf-8") as f:
        espacos = json.load(f)
        
    for esp in espacos:
        nome = esp["nome"]
        print(f"\n👉 Importando Espaço Cultural: {nome}")
        
        # Faz upload da imagem de capa se houver
        imagem_id = None
        if esp.get("imagem"):
            imagem_id = get_or_create_file(esp["imagem"], nome)
            
        payload = {
            "nome": nome,
            "descricao": esp.get("descricao") or "",
            "endereco": esp.get("endereco") or "",
            "latitude": esp.get("latitude"),
            "longitude": esp.get("longitude"),
            "imagem": imagem_id,
            "horario_funcionamento": esp.get("horario_funcionamento") or "",
            "categoria": esp.get("categoria"),  # museu | teatro | biblioteca | espaco_memoria | centro_cultural
            "status": "published"  # publicamos direto no portal
        }
        
        # Envia para o Directus
        r = requests.post(f"{DIRECTUS_URL}/items/espacos_culturais", headers=HEADERS, json=payload)
        r.raise_for_status()
        print(f"  ✅ Espaço Cultural criado com sucesso! ID: {r.json()['data']['id']}")
        
    # Remove a pasta temp temporária se vazia
    if os.path.exists("temp_downloads") and not os.listdir("temp_downloads"):
        os.rmdir("temp_downloads")
        
    print("\n🎉 Importação de Espaços Culturais concluída com sucesso!")


if __name__ == "__main__":
    main()
