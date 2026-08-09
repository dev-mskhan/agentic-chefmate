#!/usr/bin/env bash
# init.sh — creates the chefmate-media bucket in MinIO
# Run this after docker-compose up and MinIO is healthy.
#
# Usage: bash infra/minio/init.sh
#
# Requires: mc (MinIO Client) — https://min.io/docs/minio/linux/reference/minio-mc.html

set -euo pipefail

MINIO_ENDPOINT="${MINIO_ENDPOINT:-http://localhost:9000}"
MINIO_ACCESS_KEY="${MINIO_ACCESS_KEY:-minioadmin}"
MINIO_SECRET_KEY="${MINIO_SECRET_KEY:-minioadmin123}"
MINIO_BUCKET="${MINIO_BUCKET:-chefmate-media}"
ALIAS="chefmate-local"
MAX_RETRIES=20
RETRY_INTERVAL=3

echo "Waiting for MinIO at ${MINIO_ENDPOINT}..."

for i in $(seq 1 $MAX_RETRIES); do
  if curl -sf "${MINIO_ENDPOINT}/minio/health/live" > /dev/null 2>&1; then
    echo "  ✓ MinIO is healthy"
    break
  fi
  if [ "$i" -eq "$MAX_RETRIES" ]; then
    echo "  ✗ MinIO did not become healthy after ${MAX_RETRIES} retries. Aborting."
    exit 1
  fi
  echo "  … waiting (attempt $i/${MAX_RETRIES})"
  sleep "$RETRY_INTERVAL"
done

echo "Configuring mc alias: ${ALIAS} → ${MINIO_ENDPOINT}"
mc alias set "$ALIAS" "$MINIO_ENDPOINT" "$MINIO_ACCESS_KEY" "$MINIO_SECRET_KEY"

echo "Creating bucket: ${MINIO_BUCKET}"
if mc ls "${ALIAS}/${MINIO_BUCKET}" > /dev/null 2>&1; then
  echo "  ✓ Bucket already exists: ${MINIO_BUCKET}"
else
  mc mb "${ALIAS}/${MINIO_BUCKET}"
  echo "  ✓ Created bucket: ${MINIO_BUCKET}"
fi

echo ""
echo "MinIO bootstrap complete. Run 'mc ls ${ALIAS}' to verify."
