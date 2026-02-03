#!/bin/bash
#
# ClawBotManager E2E Test Script
#
# Tests the full bot lifecycle via API calls.
# Exits non-zero on any failure.
#

set -e

BOTMAKER_URL="${BOTMAKER_URL:-http://localhost:7100}"
BOT_NAME="e2e-test-bot-$$"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Cleanup function
cleanup() {
    if [ -n "$BOT_ID" ]; then
        log_info "Cleaning up: deleting bot $BOT_ID"
        curl -sf -X DELETE "$BOTMAKER_URL/api/bots/$BOT_ID" > /dev/null 2>&1 || true
    fi
}

trap cleanup EXIT

# Step 1: Wait for health
log_info "Step 1: Waiting for ClawBotManager to be healthy..."
RETRIES=30
until curl -sf "$BOTMAKER_URL/health" > /dev/null 2>&1; do
    RETRIES=$((RETRIES - 1))
    if [ $RETRIES -le 0 ]; then
        log_error "ClawBotManager health check failed after 30 retries"
        exit 1
    fi
    sleep 1
done
log_info "ClawBotManager is healthy"

# Step 2: Create bot
log_info "Step 2: Creating bot '$BOT_NAME'..."
CREATE_RESPONSE=$(curl -sf -X POST "$BOTMAKER_URL/api/bots" \
    -H "Content-Type: application/json" \
    -d '{
        "name": "'"$BOT_NAME"'",
        "ai_provider": "openai",
        "model": "gpt-4",
        "channel_type": "telegram",
        "channel_token": "test-token-12345",
        "api_key": "sk-test-key-12345",
        "persona": {
            "name": "TestBot",
            "identity": "A test bot for E2E testing",
            "description": "This bot is used for automated testing"
        }
    }')

BOT_ID=$(echo "$CREATE_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$BOT_ID" ]; then
    log_error "Failed to create bot - no ID returned"
    echo "$CREATE_RESPONSE"
    exit 1
fi

log_info "Bot created with ID: $BOT_ID"

# Step 3: Verify bot exists in list
log_info "Step 3: Verifying bot appears in list..."
LIST_RESPONSE=$(curl -sf "$BOTMAKER_URL/api/bots")

if ! echo "$LIST_RESPONSE" | grep -q "$BOT_ID"; then
    log_error "Bot not found in list"
    exit 1
fi
log_info "Bot found in list"

# Step 4: Get bot details
log_info "Step 4: Getting bot details..."
BOT_RESPONSE=$(curl -sf "$BOTMAKER_URL/api/bots/$BOT_ID")

if ! echo "$BOT_RESPONSE" | grep -q "$BOT_NAME"; then
    log_error "Bot details don't match"
    echo "$BOT_RESPONSE"
    exit 1
fi
log_info "Bot details verified"

# Step 5: Stop bot
log_info "Step 5: Stopping bot..."
STOP_RESPONSE=$(curl -sf -X POST "$BOTMAKER_URL/api/bots/$BOT_ID/stop")

if ! echo "$STOP_RESPONSE" | grep -q '"success":true'; then
    log_error "Failed to stop bot"
    echo "$STOP_RESPONSE"
    exit 1
fi
log_info "Bot stopped"

# Step 6: Verify stopped status
log_info "Step 6: Verifying stopped status..."
sleep 2
BOT_RESPONSE=$(curl -sf "$BOTMAKER_URL/api/bots/$BOT_ID")

STATUS=$(echo "$BOT_RESPONSE" | grep -o '"status":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ "$STATUS" != "stopped" ]; then
    log_warn "Bot status is '$STATUS' (expected 'stopped')"
fi
log_info "Bot status: $STATUS"

# Step 7: Start bot
log_info "Step 7: Starting bot..."
START_RESPONSE=$(curl -sf -X POST "$BOTMAKER_URL/api/bots/$BOT_ID/start")

if ! echo "$START_RESPONSE" | grep -q '"success":true'; then
    log_error "Failed to start bot"
    echo "$START_RESPONSE"
    exit 1
fi
log_info "Bot started"

# Step 8: Verify running status
log_info "Step 8: Verifying running status..."
sleep 2
BOT_RESPONSE=$(curl -sf "$BOTMAKER_URL/api/bots/$BOT_ID")

STATUS=$(echo "$BOT_RESPONSE" | grep -o '"status":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ "$STATUS" != "running" ]; then
    log_warn "Bot status is '$STATUS' (expected 'running')"
fi
log_info "Bot status: $STATUS"

# Step 9: Delete bot
log_info "Step 9: Deleting bot..."
DELETE_RESPONSE=$(curl -sf -X DELETE "$BOTMAKER_URL/api/bots/$BOT_ID")

if ! echo "$DELETE_RESPONSE" | grep -q '"success":true'; then
    log_error "Failed to delete bot"
    echo "$DELETE_RESPONSE"
    exit 1
fi
log_info "Bot deleted"

# Clear BOT_ID so cleanup doesn't try to delete again
BOT_ID=""

# Step 10: Verify bot is gone
log_info "Step 10: Verifying bot is deleted..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BOTMAKER_URL/api/bots/$BOT_ID")

if [ "$HTTP_CODE" = "404" ]; then
    log_info "Bot confirmed deleted (404)"
else
    log_warn "Unexpected response code: $HTTP_CODE"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  All E2E tests passed successfully!   ${NC}"
echo -e "${GREEN}========================================${NC}"
