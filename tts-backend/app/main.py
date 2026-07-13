import os
import shutil
import logging
from fastapi import FastAPI, UploadFile, File, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Dict, Any

from app.services.pdf_extractor import PdfExtractorService
from app.services.simplifier import SimplifierService
from app.services.tts import TtsService

# Configuração de Logs
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("acre-acessivel")

app = FastAPI(
    title="Acre Acessível - Gerador de Editais",
    description="API para extração, simplificação de linguagem e geração de áudios de editais públicos.",
    version="1.0.0"
)

# Configuração de CORS (Essencial para comunicação com o widget JS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permite requisições de qualquer origem para o widget
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Diretórios
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "static")
TEMP_DIR = os.path.join(BASE_DIR, "temp")

os.makedirs(STATIC_DIR, exist_ok=True)
os.makedirs(TEMP_DIR, exist_ok=True)

# Mapeia arquivos estáticos para servir áudios
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

@app.get("/")
def read_root():
    return {
        "status": "online",
        "servico": "Acre Acessível - Gerador de Conteúdo",
        "documentacao": "/docs"
    }

@app.post("/api/process-pdf")
async def process_pdf(request: Request, file: UploadFile = File(...)):
    """
    Recebe um PDF de edital público, extrai o texto, simplifica para
    linguagem simples, gera os respectivos áudios MP3 e retorna o JSON estruturado.
    """
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Formato de arquivo inválido. Apenas PDF é suportado.")

    # Define o caminho do arquivo temporário
    temp_file_path = os.path.join(TEMP_DIR, f"upload_{uuid_str()}.pdf")
    
    try:
        # Salva o arquivo enviado localmente
        with open(temp_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # 1. Extração de texto
        logger.info(f"Extraindo texto do arquivo: {file.filename}")
        extracted_text = PdfExtractorService.extract_text(temp_file_path)
        if not extracted_text:
            raise HTTPException(status_code=422, detail="Não foi possível extrair texto do PDF. O arquivo pode estar vazio ou protegido.")

        # 2. Simplificação (Linguagem Simples, Cronograma, Checklist, FAQ)
        logger.info("Simplificando edital para linguagem acessível...")
        edital_simplificado = SimplifierService.simplify_edital(extracted_text)

        # 3. Geração de Áudio (MP3 por abas)
        logger.info("Gerando arquivos de áudio para cada seção...")
        # Descobre a URL base do servidor dinamicamente
        base_url = str(request.base_url).rstrip('/')
        audio_urls = TtsService.generate_edital_audio(edital_simplificado, base_url)

        # Junta os dados estruturados e as URLs de áudio
        edital_simplificado["audios"] = audio_urls
        edital_simplificado["texto_original"] = extracted_text

        return edital_simplificado
    
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Erro no processamento do PDF: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro interno no processamento: {str(e)}")
    
    finally:
        # Remove o arquivo temporário
        if os.path.exists(temp_file_path):
            try:
                os.remove(temp_file_path)
            except Exception as e:
                logger.error(f"Erro ao deletar arquivo temporário {temp_file_path}: {str(e)}")

class TtsRequest(BaseModel):
    text: str


@app.post("/api/tts")
def text_to_speech(req: TtsRequest):
    """
    Sintetiza texto em áudio e retorna o arquivo.

    Mudanças em relação à versão GET:
    - Aceita POST com JSON body → sem limite de tamanho de URL (editais de 60 páginas ok).
    - Motor: edge-tts (Azure, melhor qualidade, requer rede) → Piper local (offline,
      fallback automático). gTTS removido.
    - Chunking interno no TtsService — textos longos são divididos em sentenças,
      sintetizados e concatenados em WAV único antes de devolver.
    - Gravação atômica via .tmp + os.replace mantida para evitar status 416.
    - Cache por hash MD5 mantido para evitar re-síntese do mesmo trecho.
    """
    from fastapi.responses import FileResponse
    import hashlib
    import mimetypes

    text = (req.text or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Texto vazio ou não fornecido.")

    try:
        text_hash = hashlib.md5(text.encode("utf-8")).hexdigest()
        filename = f"tts_demand_{text_hash}.wav"
        file_path = os.path.join(TEMP_DIR, filename)

        if not os.path.exists(file_path):
            temp_path = f"{file_path}.tmp"
            TtsService.synthesize(text, temp_path)
            os.replace(temp_path, file_path)

        media_type, _ = mimetypes.guess_type(file_path)
        if not media_type:
            media_type = "audio/wav"

        # Correção caso o edge-tts salve MP3 com extensão .wav
        if media_type == "audio/wav":
            try:
                with open(file_path, "rb") as f:
                    header = f.read(4)
                    if not header.startswith(b"RIFF"):
                        media_type = "audio/mpeg"
            except Exception:
                pass

        return FileResponse(
            file_path,
            media_type=media_type,
            filename=filename,
            headers={
                "Accept-Ranges": "bytes",
                "Cache-Control": "public, max-age=3600",
            },
        )
    except Exception as e:
        logger.error(f"Erro ao gerar TTS: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro interno de síntese: {str(e)}")

def uuid_str() -> str:
    import uuid
    return str(uuid.uuid4())
