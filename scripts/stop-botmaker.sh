#!/bin/bash
#
# Stop ClawBotManager via Docker Compose
#

set -e

cd "$(dirname "$0")/.."

echo "Stopping ClawBotManager..."
docker compose down

echo "ClawBotManager stopped"