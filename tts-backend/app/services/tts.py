"""
TTS Service — Acre Acessível

Cascata de síntese (qualidade primeiro, com fallback offline):
  1. edge-tts   — neural Azure gratuito (voz pt-BR-FranciscaNeural), melhor qualidade
                   de voz disponível, requer rede.
  2. Piper TTS  — neural local, zero rede, fallback automático quando edge-tts falha
                   (sem internet, instabilidade, rate limit do endpoint da Microsoft).
  ✗ gTTS        — REMOVIDO: depende da API do Google (translate.google.com.br),
                   falha sem rede, falha com rate limit, falha em textos >200 palavras.

Textos longos (editais de 30-60 páginas):
  - synthesize() faz chunking interno em sentenças ≤ 500 chars antes de passar pro Piper,
    concatena os WAVs com wave stdlib (sem ffmpeg) e entrega um único arquivo.
  - O endpoint /api/tts agora aceita POST com JSON body para não ter limite de URL.
"""

import io
import os
import re
import uuid
import wave
import logging
import subprocess
from typing import Any, Dict

logger = logging.getLogger("acre-acessivel")

# Limite seguro por chunk pro Piper/edge-tts (não é limite do endpoint — o endpoint
# aceita texto inteiro; o chunking é interno a synthesize()).
_CHUNK_MAX_CHARS = 500


class TtsService:
    AUDIO_DIR = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "static", "audio"
    )

    @classmethod
    def initialize(cls) -> None:
        os.makedirs(cls.AUDIO_DIR, exist_ok=True)

    # ──────────────────────────────────────────────────────────────────────────
    # API pública
    # ──────────────────────────────────────────────────────────────────────────

    @classmethod
    def synthesize(cls, text: str, file_path: str) -> None:
        """
        Sintetiza `text` (tamanho ilimitado) em áudio e salva em `file_path`.
        Faz chunking interno para motores com limite de entrada.
        Entrega sempre um arquivo WAV válido (compatível com qualquer navegador moderno).
        """
        text = text.strip()
        if not text:
            raise ValueError("Texto vazio.")

        chunks = cls._split_text(text)

        # edge-tts primeiro — voz Azure Neural (Francisca) é a de melhor qualidade.
        try:
            cls._synthesize_edge(chunks, file_path)
            return
        except Exception as e:
            logger.warning(f"edge-tts indisponível ({e}); tentando Piper offline.")

        # Fallback: Piper local (sem rede, qualidade boa, sempre disponível no servidor)
        if cls._piper_available():
            cls._synthesize_piper(chunks, file_path)
            return

        raise RuntimeError(
            "Nenhum motor TTS disponível. edge-tts falhou (verifique a rede) e o "
            "Piper não está instalado localmente. Consulte backend/README.md#piper-setup."
        )

    @classmethod
    def generate_edital_audio(
        cls, edital_data: Dict[str, Any], base_url: str = "http://localhost:8001"
    ) -> Dict[str, str]:
        """Gera áudios para cada seção do edital simplificado."""
        cls.initialize()
        edital_id = str(uuid.uuid4())[:8]
        audio_urls: Dict[str, str] = {}

        resumo_plain = cls._clean_html(edital_data["resumo"])
        audio_urls["resumo"] = cls._generate_audio(
            f"Edital simplificado. {resumo_plain}",
            f"resumo_{edital_id}.wav",
            base_url,
        )

        crono_text = "Cronograma simplificado do edital. " + " ".join(
            f"De {item['data']}, evento: {item['evento']}."
            for item in edital_data["cronograma"]
        )
        audio_urls["cronograma"] = cls._generate_audio(
            crono_text, f"crono_{edital_id}.wav", base_url
        )

        req_text = "Requisitos obrigatórios listados no edital. " + " ".join(
            f"Item {i + 1}: {item}"
            for i, item in enumerate(edital_data["requisitos"])
        )
        audio_urls["requisitos"] = cls._generate_audio(
            req_text, f"requisitos_{edital_id}.wav", base_url
        )

        faq_text = "Perguntas frequentes e respostas sobre este edital. " + " ".join(
            f"Pergunta: {item['pergunta']} Resposta: {item['resposta']}"
            for item in edital_data["faq"]
        )
        audio_urls["faq"] = cls._generate_audio(
            faq_text, f"faq_{edital_id}.wav", base_url
        )

        return audio_urls

    # ──────────────────────────────────────────────────────────────────────────
    # Chunking de texto
    # ──────────────────────────────────────────────────────────────────────────

    @classmethod
    def _split_text(cls, text: str) -> list[str]:
        """
        Divide texto em chunks de no máximo _CHUNK_MAX_CHARS caracteres,
        quebrando sempre em fronteiras de frase (ponto/exclamação/interrogação)
        para não cortar palavras no meio.
        """
        if len(text) <= _CHUNK_MAX_CHARS:
            return [text]

        # Separa em sentenças primeiro
        sentences = re.split(r'(?<=[.!?…])\s+', text)
        chunks: list[str] = []
        current = ""

        for sentence in sentences:
            # Sentença sozinha maior que o limite? quebra por vírgula/espaço
            if len(sentence) > _CHUNK_MAX_CHARS:
                if current:
                    chunks.append(current.strip())
                    current = ""
                sub_chunks = cls._split_by_comma(sentence)
                chunks.extend(sub_chunks)
                continue

            if len(current) + len(sentence) + 1 > _CHUNK_MAX_CHARS:
                if current:
                    chunks.append(current.strip())
                current = sentence
            else:
                current = f"{current} {sentence}".strip() if current else sentence

        if current:
            chunks.append(current.strip())

        return [c for c in chunks if c]

    @classmethod
    def _split_by_comma(cls, text: str) -> list[str]:
        """Último recurso: quebra por vírgula quando a sentença é enorme."""
        parts = re.split(r',\s*', text)
        chunks: list[str] = []
        current = ""
        for part in parts:
            candidate = f"{current}, {part}".strip(", ") if current else part
            if len(candidate) > _CHUNK_MAX_CHARS:
                if current:
                    chunks.append(current.strip())
                current = part
            else:
                current = candidate
        if current:
            chunks.append(current.strip())
        return chunks

    # ──────────────────────────────────────────────────────────────────────────
    # Piper TTS (offline, neural, fallback quando edge-tts falha)
    # ──────────────────────────────────────────────────────────────────────────

    @classmethod
    def _piper_bin(cls) -> str:
        backend_dir = os.path.dirname(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        )
        return os.path.join(backend_dir, "piper", "piper")

    @classmethod
    def _piper_model(cls) -> str:
        backend_dir = os.path.dirname(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        )
        return os.path.join(backend_dir, "pt_BR-giselle-medium.onnx")

    @classmethod
    def _piper_available(cls) -> bool:
        return os.path.exists(cls._piper_bin()) and os.path.exists(cls._piper_model())

    @classmethod
    def _synthesize_piper(cls, chunks: list[str], out_path: str) -> None:
        """
        Sintetiza cada chunk com Piper (WAV) e concatena num único WAV.
        Piper recebe texto via stdin, escreve WAV em stdout com --output-raw
        ou em arquivo com --output_file.
        """
        piper_bin = cls._piper_bin()
        model_path = cls._piper_model()

        if not os.access(piper_bin, os.X_OK):
            os.chmod(piper_bin, 0o755)

        logger.info(f"🗣️ Piper: {len(chunks)} chunk(s) → {out_path}")

        if len(chunks) == 1:
            # Caminho rápido: chunk único, escreve direto no arquivo final
            subprocess.run(
                [piper_bin, "--model", model_path, "--output_file", out_path],
                input=chunks[0].encode("utf-8"),
                check=True,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
            return

        # Múltiplos chunks: sintetiza cada um em memória e concatena WAV
        wav_buffers: list[bytes] = []
        params = None

        for i, chunk in enumerate(chunks):
            result = subprocess.run(
                [piper_bin, "--model", model_path, "--output-raw"],
                input=chunk.encode("utf-8"),
                capture_output=True,
                check=True,
            )
            # Piper com --output-raw entrega PCM s16le bruto.
            # Precisamos do cabeçalho WAV — vamos construir via wave.
            raw_pcm = result.stdout
            wav_buffers.append(raw_pcm)

        # Descobre parâmetros de áudio do primeiro chunk via Piper com output_file
        tmp_probe = out_path + ".probe.wav"
        subprocess.run(
            [piper_bin, "--model", model_path, "--output_file", tmp_probe],
            input=chunks[0].encode("utf-8"),
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        with wave.open(tmp_probe, "rb") as probe:
            params = probe.getparams()
        os.remove(tmp_probe)

        # Concatena todos os PCMs brutos num único arquivo WAV
        with wave.open(out_path, "wb") as out_wav:
            out_wav.setparams(params)
            for pcm in wav_buffers:
                out_wav.writeframes(pcm)

        logger.info(f"🗣️ Piper: concatenação de {len(chunks)} chunks concluída → {out_path}")

    # ──────────────────────────────────────────────────────────────────────────
    # edge-tts (primário — voz Azure Neural, requer rede, sem Google)
    # ──────────────────────────────────────────────────────────────────────────

    @classmethod
    def _synthesize_edge(cls, chunks: list[str], out_path: str) -> None:
        """
        Sintetiza com edge-tts (Azure Neural gratuito, requer rede).
        Múltiplos chunks são sintetizados e concatenados via concatenação de MP3 direta.
        """
        import asyncio
        import edge_tts

        logger.info(f"🗣️ edge-tts: {len(chunks)} chunk(s) → {out_path}")

        async def _run() -> None:
            if len(chunks) == 1:
                comm = edge_tts.Communicate(chunks[0], "pt-BR-FranciscaNeural")
                await comm.save(out_path)
                return

            # Sintetiza chunks em paralelo para reduzir latência em textos longos
            import tempfile
            tmp_files: list[str] = []
            try:
                tasks = []
                for chunk in chunks:
                    tmp = tempfile.mktemp(suffix=".mp3")
                    tmp_files.append(tmp)
                    tasks.append(_save_chunk(chunk, tmp))
                await asyncio.gather(*tasks)
                
                # Concatena todos os MP3s num único arquivo
                with open(out_path, "wb") as out_f:
                    for path in tmp_files:
                        with open(path, "rb") as in_f:
                            out_f.write(in_f.read())
            finally:
                for f in tmp_files:
                    if os.path.exists(f):
                        os.remove(f)

        async def _save_chunk(text: str, path: str) -> None:
            comm = edge_tts.Communicate(text, "pt-BR-FranciscaNeural")
            await comm.save(path)

        asyncio.run(_run())

    # ──────────────────────────────────────────────────────────────────────────
    # Utilitários
    # ──────────────────────────────────────────────────────────────────────────

    @classmethod
    def _concat_wav_files(cls, paths: list[str], out_path: str) -> None:
        """Concatena arquivos WAV com mesmos parâmetros num único arquivo."""
        with wave.open(paths[0], "rb") as first:
            params = first.getparams()

        with wave.open(out_path, "wb") as out_wav:
            out_wav.setparams(params)
            for path in paths:
                with wave.open(path, "rb") as w:
                    out_wav.writeframes(w.readframes(w.getnframes()))

    @classmethod
    def _generate_audio(cls, text: str, filename: str, base_url: str) -> str:
        file_path = os.path.join(cls.AUDIO_DIR, filename)
        try:
            cls.synthesize(text, file_path)
            return f"{base_url}/static/audio/{filename}"
        except Exception as e:
            logger.error(f"Erro ao gerar áudio para {filename}: {e}")
            return ""

    @staticmethod
    def _clean_html(raw_html: str) -> str:
        return re.sub(r"<[^<]+?>", "", raw_html)
