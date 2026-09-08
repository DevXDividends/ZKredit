FROM python:3.11-slim

WORKDIR /app

# ca-certificates: needed for ezkl's HTTPS calls (SRS download) and curl (pk.key download)
# libgomp1: onnxruntime needs this on slim Debian images
# curl: used by entrypoint.sh to fetch pk.key at container startup
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    libgomp1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .

# Small, committed circuit artifacts (settings.json, model.compiled, vk.key,
# proof.json) are baked into the image so this works on platforms without
# volume-mount support (e.g. Render), not just Docker Compose.
COPY circuits/ /app/circuits/

RUN chmod +x /app/scripts/entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["/app/scripts/entrypoint.sh"]
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]