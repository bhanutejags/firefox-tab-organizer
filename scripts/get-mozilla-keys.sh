#!/usr/bin/env bash
#
# Fetch Mozilla signing credentials from 1Password
# Usage: source scripts/get-mozilla-keys.sh
#

set -e

echo "🔐 Fetching Mozilla credentials from 1Password..."

# Check if op CLI is available
if ! command -v op &> /dev/null; then
    echo "❌ 1Password CLI (op) not found. Install it first:"
    echo "   brew install --cask 1password-cli"
    exit 1
fi

# Fetch credentials
export WEB_EXT_API_KEY=$(op item get "Mozilla Extension Sign" --field "JWT issuer" --reveal)
export WEB_EXT_API_SECRET=$(op item get "Mozilla Extension Sign" --field "JWT secret" --reveal)

if [ -z "$WEB_EXT_API_KEY" ] || [ -z "$WEB_EXT_API_SECRET" ]; then
    echo "❌ Failed to fetch credentials from 1Password"
    exit 1
fi

echo "✅ Mozilla credentials loaded!"
echo "   WEB_EXT_API_KEY: ${WEB_EXT_API_KEY:0:20}..."
echo "   WEB_EXT_API_SECRET: [hidden]"
echo ""
echo "💡 You can now run: bun run sign"
