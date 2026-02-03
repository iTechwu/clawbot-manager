
#!/bin/bash
# Initialize secrets for keyring-proxy
# Run this once before first deployment

set -e

SECRETS_DIR="${1:-./secrets}"

mkdir -p "$SECRETS_DIR"

# Generate 32-byte master key for AES-256-GCM encryption
if [ ! -f "$SECRETS_DIR/master_key" ]; then
    openssl rand -hex 32 > "$SECRETS_DIR/master_key"
    echo "Created master_key"
else
    echo "master_key already exists, skipping"
fi

# Generate admin token for proxy admin API
if [ ! -f "$SECRETS_DIR/admin_token" ]; then
    openssl rand -hex 32 > "$SECRETS_DIR/admin_token"
    echo "Created admin_token"
else
    echo "admin_token already exists, skipping"
fi

# Copy admin token as proxy_admin_token for ClawBotManager to use
if [ ! -f "$SECRETS_DIR/proxy_admin_token" ]; then
    cp "$SECRETS_DIR/admin_token" "$SECRETS_DIR/proxy_admin_token"
    echo "Created proxy_admin_token (copy of admin_token)"
else
    echo "proxy_admin_token already exists, skipping"
fi

echo ""
echo "Secrets initialized in $SECRETS_DIR"
echo "Files:"
ls -la "$SECRETS_DIR"
