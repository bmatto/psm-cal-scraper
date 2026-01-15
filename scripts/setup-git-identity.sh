#!/bin/bash

set -e

echo "🔧 Setting up Git identity for this repository"
echo "=============================================="
echo ""

# Check current config
echo "Current global git config:"
echo "  User: $(git config --global user.name || echo 'Not set')"
echo "  Email: $(git config --global user.email || echo 'Not set')"
echo ""

# Ask for identity to use
read -p "Enter your name for commits (e.g., 'Brian Matto'): " GIT_NAME
read -p "Enter your email (e.g., 'bmatto@gmail.com'): " GIT_EMAIL

echo ""
echo "Setting local repository config..."

# Set local config (overrides global)
git config --local user.name "$GIT_NAME"
git config --local user.email "$GIT_EMAIL"

echo "✅ Local git config set:"
echo "  User: $(git config --local user.name)"
echo "  Email: $(git config --local user.email)"
echo ""
echo "This config only applies to this repository."
echo "Your global config remains unchanged."
echo ""
