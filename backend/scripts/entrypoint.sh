#!/bin/sh
set -e

CIRCUIT_PATH="${CIRCUIT_DIR:-/app/circuits/loan_model}"
PK_KEY_PATH="$CIRCUIT_PATH/pk.key"

if [ -f "$PK_KEY_PATH" ]; then
  echo "pk.key already present — skipping download."
elif [ -n "$PK_KEY_URL" ]; then
  echo "pk.key not found — downloading from PK_KEY_URL..."
  mkdir -p "$CIRCUIT_PATH"
  curl -fL -o "$PK_KEY_PATH" "$PK_KEY_URL"
  echo "pk.key downloaded: $(du -h "$PK_KEY_PATH" | cut -f1)"
else
  echo "WARNING: pk.key missing and PK_KEY_URL is not set — proof generation will fail until this is provided."
fi

exec "$@"