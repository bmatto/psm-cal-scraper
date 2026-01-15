#!/bin/bash

set -e

echo "🔄 Switching to Personal GitHub Account"
echo "======================================="
echo ""

# Check current status
if gh auth status &> /dev/null; then
    CURRENT_USER=$(gh api user -q .login 2>/dev/null || echo "unknown")
    echo "Currently logged in as: $CURRENT_USER"

    if [[ "$CURRENT_USER" == "bmatto" ]]; then
        echo "✅ Already logged into personal account!"
        echo ""
        read -p "Set git config for this repo anyway? (Y/n): " SET_CONFIG
        SET_CONFIG=${SET_CONFIG:-Y}

        if [[ $SET_CONFIG =~ ^[Yy]$ ]]; then
            git config --local user.name "Brian Matto"
            git config --local user.email "bmatto@gmail.com"
            echo "✓ Git config set for this repo"
        fi
        exit 0
    fi

    echo ""
    echo "Logging out of: $CURRENT_USER"
    gh auth logout --hostname github.com || true
else
    echo "Not currently logged in"
fi

echo ""
echo "========================================="
echo "👉 IMPORTANT: Login with bmatto@gmail.com"
echo "========================================="
echo ""
read -p "Press Enter to open browser for login..."

gh auth login --hostname github.com --web

if ! gh auth status &> /dev/null; then
    echo "❌ Login failed"
    exit 1
fi

CURRENT_USER=$(gh api user -q .login)
echo ""
echo "✓ Logged in as: $CURRENT_USER"

if [[ "$CURRENT_USER" != "bmatto" ]]; then
    echo "⚠️  WARNING: Expected 'bmatto' but got '$CURRENT_USER'"
    echo "   Make sure you used bmatto@gmail.com"
    exit 1
fi

echo ""
echo "Setting git config for this repository..."

# For bmatto account, use known defaults
if [[ "$CURRENT_USER" == "bmatto" ]]; then
    git config --local user.name "Brian Matto"
    git config --local user.email "bmatto@gmail.com"
else
    # For other accounts, prompt
    read -p "Enter your name: " GIT_NAME
    read -p "Enter your email: " GIT_EMAIL
    git config --local user.name "$GIT_NAME"
    git config --local user.email "$GIT_EMAIL"
fi

echo ""
echo "✅ All set!"
echo ""
echo "Current configuration:"
echo "  GitHub account: $(gh api user -q .login)"
echo "  Git name: $(git config --local user.name)"
echo "  Git email: $(git config --local user.email)"
echo ""
echo "You can now run: npm run deploy"
echo ""
