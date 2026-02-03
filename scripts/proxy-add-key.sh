
#!/bin/bash
# Add an API key to the keyring proxy
# Usage: ./proxy-add-key.sh <vendor> <api-key> [label]
#
# Example: ./proxy-add-key.sh openai sk-xxx... "Production key"

set -e

VENDOR="${1:?Usage: $0 <vendor> <api-key> [label]}"
SECRET="${2:?Usage: $0 <vendor> <api-key> [label]}"
LABEL="${3:-}"

PROXY_URL="${PROXY_ADMIN_URL:-http://localhost:9100}"
ADMIN_TOKEN="${PROXY_ADMIN_TOKEN:-$(cat ./secrets/admin_token 2>/dev/null || echo '')}"

if [ -z "$ADMIN_TOKEN" ]; then
    echo "Error: No admin token. Set PROXY_ADMIN_TOKEN or create ./secrets/admin_token"
    exit 1
fi

# Build JSON body
if [ -n "$LABEL" ]; then
    BODY=$(jq -n --arg v "$VENDOR" --arg s "$SECRET" --arg l "$LABEL" '{vendor: $v, secret: $s, label: $l}')
else
    BODY=$(jq -n --arg v "$VENDOR" --arg s "$SECRET" '{vendor: $v, secret: $s}')
fi

echo "Adding $VENDOR key to proxy..."
RESULT=$(curl -s -X POST "$PROXY_URL/admin/keys" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d "$BODY")

echo "$RESULT" | jq .
