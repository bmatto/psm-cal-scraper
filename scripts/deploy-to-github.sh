#!/bin/bash

set -e

echo "🚀 Deploying Portsmouth Calendar Scraper to GitHub Actions"
echo "=========================================================="
echo ""

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI not found. Install it first:"
    echo "   brew install gh"
    exit 1
fi

# Check if logged in
if ! gh auth status &> /dev/null; then
    echo "🔐 Authenticating with GitHub..."
    gh auth login
fi

# Check if credentials exist
if [ ! -f "config/credentials.json" ]; then
    echo "❌ config/credentials.json not found!"
    echo "   Run 'npm run setup' first to create credentials."
    exit 1
fi

if [ ! -f "config/token.json" ]; then
    echo "❌ config/token.json not found!"
    echo "   Run 'npm run sync' at least once to generate the token."
    exit 1
fi

# Check if calendar ID is in .env
if [ ! -f ".env" ]; then
    echo "❌ .env file not found!"
    exit 1
fi

CALENDAR_ID=$(grep GOOGLE_CALENDAR_ID .env | cut -d '=' -f2 | tr -d ' ')
if [ -z "$CALENDAR_ID" ]; then
    echo "❌ GOOGLE_CALENDAR_ID not found in .env"
    echo "   Run 'npm run sync' at least once to create the calendar."
    exit 1
fi

echo "📝 Found credentials:"
echo "   ✓ credentials.json"
echo "   ✓ token.json"
echo "   ✓ GOOGLE_CALENDAR_ID: ${CALENDAR_ID:0:20}..."
echo ""

# Ask for repo name
read -p "Enter repository name (default: psm-cal-scraper): " REPO_NAME
REPO_NAME=${REPO_NAME:-psm-cal-scraper}

# Ask for visibility
read -p "Make repository private? (Y/n): " PRIVATE
PRIVATE=${PRIVATE:-Y}

if [[ $PRIVATE =~ ^[Yy]$ ]]; then
    VISIBILITY="--private"
else
    VISIBILITY="--public"
fi

echo ""
echo "📦 Creating GitHub repository..."

# Initialize git if needed
if [ ! -d ".git" ]; then
    git init
    git add .
    git commit -m "Initial commit: Portsmouth calendar scraper"
fi

# Create GitHub repo
gh repo create "$REPO_NAME" $VISIBILITY --source=. --push || {
    echo "⚠️  Repository might already exist. Continuing..."
}

# Push to remote
git remote get-url origin &> /dev/null || git remote add origin "https://github.com/$(gh api user -q .login)/$REPO_NAME.git"
git branch -M main
git push -u origin main

echo ""
echo "🔐 Setting up GitHub secrets..."

# Encode credentials as base64
CREDS_B64=$(base64 < config/credentials.json)
TOKEN_B64=$(base64 < config/token.json)

# Set secrets
echo "$CREDS_B64" | gh secret set GOOGLE_CREDENTIALS
echo "$TOKEN_B64" | gh secret set GOOGLE_TOKEN
echo "$CALENDAR_ID" | gh secret set GOOGLE_CALENDAR_ID

echo "   ✓ GOOGLE_CREDENTIALS"
echo "   ✓ GOOGLE_TOKEN"
echo "   ✓ GOOGLE_CALENDAR_ID"

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Next steps:"
echo "  1. Go to: https://github.com/$(gh api user -q .login)/$REPO_NAME/actions"
echo "  2. Enable workflows if prompted"
echo "  3. Click 'Sync Portsmouth Calendar' → 'Run workflow' to test"
echo ""
echo "The workflow will run automatically daily at 6 AM EST."
echo ""
