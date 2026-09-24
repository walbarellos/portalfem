FROM python:3.10-slim

WORKDIR /app

# Instala dependências do sistema necessárias para o pdfplumber e processamento de áudio, se necessário
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ ./app/

# O Edge TTS e o pdfplumber precisam de permissão para ler/gravar na pasta temp
RUN mkdir -p /app/app/temp && chmod 777 /app/app/temp

EXPOSE 8001

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
