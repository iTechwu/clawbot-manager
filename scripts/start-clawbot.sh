
#!/bin/bash
#
# Start ClawBotManager via Docker Compose
#

set -e

cd "$(dirname "$0")/.."

echo "Starting ClawBotManager..."
docker compose up -d

echo "Waiting for health check..."
RETRIES=30
until curl -sf http://localhost:13100/health > /dev/null 2>&1; do
    RETRIES=$((RETRIES - 1))
    if [ $RETRIES -le 0 ]; then
        echo "ERROR: Health check failed after 30 retries"
        docker compose logs
        exit 1
    fi
    sleep 1
done

echo "ClawBotManager is running:"
echo "  - Web: http://localhost:13000"
echo "  - API: http://localhost:13100/api"
