FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .

# Small, committed circuit artifacts (settings.json, model.compiled, vk.key,
# proof.json) are baked into the image so this works on platforms without
# volume-mount support (e.g. Render), not just Docker Compose. pk.key
# (150MB+, gitignored) is deliberately NOT in the build context, so it
# won't be here either — /generate-proof will fail gracefully with a clear
# error on platforms where it hasn't been separately provisioned.
COPY circuits/ /app/circuits/

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]