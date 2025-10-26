#!/usr/bin/env bash
#
# Set GitHub repository secrets from 1Password
# Secrets are piped directly to gh CLI without being displayed
#
# Usage: ./scripts/set-github-secrets.sh
#

set -e

echo "🔐 Setting GitHub secrets from 1Password..."
echo ""

# Check if op CLI is available
if ! command -v op &> /dev/null; then
    echo "❌ 1Password CLI (op) not found. Install it first:"
    echo "   brew install --cask 1password-cli"
    exit 1
fi

# Check if gh CLI is available
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) not found. Install it first:"
    echo "   brew install gh"
    exit 1
fi

# Check gh auth status
if ! gh auth status &> /dev/null; then
    echo "❌ GitHub CLI not authenticated. Run:"
    echo "   gh auth login"
    exit 1
fi

echo "📋 Setting secrets for repository: $(gh repo view --json nameWithOwner -q .nameWithOwner)"
echo ""

# Set MOZILLA_API_KEY (JWT issuer)
echo "Setting MOZILLA_API_KEY..."
op item get "Mozilla Extension Sign" --field "JWT issuer" --reveal | gh secret set MOZILLA_API_KEY
echo "✅ MOZILLA_API_KEY set"

# Set MOZILLA_API_SECRET (JWT secret)
echo "Setting MOZILLA_API_SECRET..."
op item get "Mozilla Extension Sign" --field "JWT secret" --reveal | gh secret set MOZILLA_API_SECRET
echo "✅ MOZILLA_API_SECRET set"

echo ""
echo "🎉 All secrets set successfully!"
echo ""
echo "You can verify with:"
echo "  gh secret list"
