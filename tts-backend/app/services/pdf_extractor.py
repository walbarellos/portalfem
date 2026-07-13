import pdfplumber
import logging
from typing import Optional

logger = logging.getLogger("acre-acessivel")

class PdfExtractorService:
    @staticmethod
    def extract_text(file_path: str) -> Optional[str]:
        """
        Extrai todo o conteúdo de texto de um arquivo PDF.
        """
        try:
            text_content = []
            with pdfplumber.open(file_path) as pdf:
                for i, page in enumerate(pdf.pages):
                    page_text = page.extract_text()
                    if page_text:
                        text_content.append(page_text)
                    else:
                        logger.warning(f"Aviso: Não foi possível extrair texto da página {i + 1}")
            
            if not text_content:
                return None
                
            return "\n\n--- NOVA PÁGINA ---\n\n".join(text_content)
        except Exception as e:
            logger.error(f"Erro ao ler arquivo PDF {file_path}: {str(e)}")
            return None
