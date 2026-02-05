#!/bin/bash
# Initialize secrets and update .env files
# Run this once before first deployment
#
# Usage:
#   ./scripts/init-env-secrets.sh
#
# This script will:
# 1. Generate BOT_MASTER_KEY for API key encryption
# 2. Store it in secrets/ directory
# 3. Update apps/api/.env with BOT_MASTER_KEY

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

SECRETS_DIR="$PROJECT_ROOT/secrets"
API_ENV_FILE="$PROJECT_ROOT/apps/api/.env"
API_ENV_EXAMPLE="$PROJECT_ROOT/apps/api/.env.example"

echo "=========================================="
echo "  ClawBotManager Secrets Initialization"
echo "=========================================="
echo ""

# Create secrets directory
mkdir -p "$SECRETS_DIR"

# Function to generate a random hex key
generate_key() {
    openssl rand -hex 32
}

# Function to update or add a key in .env file
update_env_file() {
    local file="$1"
    local key="$2"
    local value="$3"

    if [ ! -f "$file" ]; then
        echo "$key=$value" > "$file"
        return
    fi

    if grep -q "^${key}=" "$file"; then
        # Key exists, update it (macOS compatible sed)
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s|^${key}=.*|${key}=${value}|" "$file"
        else
            sed -i "s|^${key}=.*|${key}=${value}|" "$file"
        fi
    else
        # Key doesn't exist, append it
        echo "" >> "$file"
        echo "# Bot API Secrets (auto-generated)" >> "$file"
        echo "$key=$value" >> "$file"
    fi
}

# Generate BOT_MASTER_KEY
echo -e "${YELLOW}[1/1]${NC} Generating BOT_MASTER_KEY..."
if [ -f "$SECRETS_DIR/master_key" ]; then
    BOT_MASTER_KEY=$(cat "$SECRETS_DIR/master_key")
    echo -e "  ${GREEN}✓${NC} Using existing master_key from secrets/"
else
    BOT_MASTER_KEY=$(generate_key)
    echo "$BOT_MASTER_KEY" > "$SECRETS_DIR/master_key"
    echo -e "  ${GREEN}✓${NC} Generated new master_key"
fi

echo ""
echo "=========================================="
echo "  Updating .env files"
echo "=========================================="
echo ""

# Update apps/api/.env
if [ -f "$API_ENV_FILE" ]; then
    echo -e "Updating ${YELLOW}$API_ENV_FILE${NC}..."
    update_env_file "$API_ENV_FILE" "BOT_MASTER_KEY" "$BOT_MASTER_KEY"
    echo -e "  ${GREEN}✓${NC} Updated BOT_MASTER_KEY"
else
    echo -e "${RED}Warning:${NC} $API_ENV_FILE not found"
    echo "  Creating new .env file..."
    cp "$API_ENV_EXAMPLE" "$API_ENV_FILE" 2>/dev/null || touch "$API_ENV_FILE"
    update_env_file "$API_ENV_FILE" "BOT_MASTER_KEY" "$BOT_MASTER_KEY"
    echo -e "  ${GREEN}✓${NC} Created $API_ENV_FILE with secrets"
fi

echo ""
echo "=========================================="
echo "  Summary"
echo "=========================================="
echo ""
echo -e "Secrets stored in: ${GREEN}$SECRETS_DIR/${NC}"
echo "  - master_key (BOT_MASTER_KEY)"
echo ""
echo -e "Environment file updated: ${GREEN}$API_ENV_FILE${NC}"
echo ""
echo -e "${YELLOW}Important:${NC}"
echo "  - Keep the secrets/ directory secure and backed up"
echo "  - Never commit secrets/ or .env files to git"
echo "  - Losing master_key means losing access to encrypted API keys"
echo ""
echo -e "${GREEN}Done!${NC}"
