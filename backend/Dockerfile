FROM python:3.11-slim

WORKDIR /app

# ca-certificates: needed for ezkl's HTTPS calls (SRS download)
# libgomp1: onnxruntime needs this on slim Debian images
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .

# circuits/ is mounted as a volume at runtime (see docker-compose.yml) rather
# than baked into the image — pk.key alone can be 150MB+ and is
# environment/model-specific, not something that belongs in the image layer.
RUN mkdir -p /app/circuits

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]