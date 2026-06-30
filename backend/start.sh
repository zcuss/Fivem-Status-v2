#!/bin/bash
set -e

BACKEND_DIR="/root/project/fivem-status/backend"

echo "=== Starting Fivem-Status Backend ==="

# Run node directly (skip pnpm wrapper overhead)
echo "[API] Starting on port 34002..."
cd "$BACKEND_DIR/packages/api" && node dist/index.js &
API_PID=$!

echo "[BOT] Starting Discord bot..."
cd "$BACKEND_DIR/packages/bot" && node dist/index.js &
BOT_PID=$!

echo "=== Both services started ==="
echo "  API PID:  $API_PID"
echo "  BOT PID:  $BOT_PID"

wait -n $API_PID $BOT_PID
echo "=== A service exited, shutting down ==="
kill $API_PID $BOT_PID 2>/dev/null
