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

# Check current GitHub authentication
echo "🔐 Checking GitHub authentication..."
if gh auth status &> /dev/null; then
    CURRENT_USER=$(gh api user -q .login 2>/dev/null || echo "unknown")
    CURRENT_EMAIL=$(gh api user -q .email 2>/dev/null || echo "unknown")
    echo "✓ Currently logged in as: $CURRENT_USER ($CURRENT_EMAIL)"
    echo ""

    # Check if this is the work account
    if [[ "$CURRENT_USER" == *"hubspot"* ]] || [[ "$CURRENT_USER" == "bmatto_hubspot" ]]; then
        echo "⚠️  WARNING: You're logged into your WORK account ($CURRENT_USER)"
        echo "   This appears to be a personal project."
        echo ""
        echo "To deploy to your personal account (bmatto):"
        echo "  1. Logout of work account: gh auth logout"
        echo "  2. Login to personal account: gh auth login"
        echo "     (Use bmatto@gmail.com in the browser)"
        echo ""
        read -p "Switch accounts now? (Y/n): " SWITCH_NOW
        SWITCH_NOW=${SWITCH_NOW:-Y}

        if [[ $SWITCH_NOW =~ ^[Yy]$ ]]; then
            echo ""
            echo "Logging out..."
            gh auth logout --hostname github.com || true

            echo ""
            echo "Now logging in with personal account..."
            echo "👉 IMPORTANT: Login with bmatto@gmail.com in the browser!"
            echo ""
            read -p "Press Enter to open browser login..."

            gh auth login --hostname github.com --web

            # Verify new login
            if ! gh auth status &> /dev/null; then
                echo "❌ Login failed. Please try again."
                exit 1
            fi

            CURRENT_USER=$(gh api user -q .login)
            echo ""
            echo "✓ Successfully logged in as: $CURRENT_USER"

            if [[ "$CURRENT_USER" == *"hubspot"* ]] || [[ "$CURRENT_USER" == "bmatto_hubspot" ]]; then
                echo "❌ Still logged into work account!"
                echo "   Please ensure you login with bmatto@gmail.com"
                exit 1
            fi
        else
            echo ""
            echo "❌ Cannot proceed with work account for personal project."
            echo "   Run 'gh auth logout' then 'gh auth login' with personal account."
            exit 1
        fi
    else
        # Not a work account, but confirm anyway
        read -p "Is this the correct account for this project? (Y/n): " CORRECT_ACCOUNT
        CORRECT_ACCOUNT=${CORRECT_ACCOUNT:-Y}

        if [[ ! $CORRECT_ACCOUNT =~ ^[Yy]$ ]]; then
            echo ""
            echo "Please switch accounts:"
            echo "  gh auth logout"
            echo "  gh auth login"
            exit 1
        fi
    fi
else
    echo "❌ Not logged in to GitHub."
    echo ""
    echo "Logging in now..."
    echo "👉 IMPORTANT: Login with bmatto@gmail.com in the browser!"
    echo ""
    read -p "Press Enter to open browser login..."

    gh auth login --hostname github.com --web

    if ! gh auth status &> /dev/null; then
        echo "❌ Login failed"
        exit 1
    fi

    CURRENT_USER=$(gh api user -q .login)
    echo "✓ Logged in as: $CURRENT_USER"

    if [[ "$CURRENT_USER" == *"hubspot"* ]] || [[ "$CURRENT_USER" == "bmatto_hubspot" ]]; then
        echo "❌ Logged into work account! Please use personal account."
        exit 1
    fi
fi

echo ""

# Set up local git config to match GitHub account
echo "📝 Setting up git config for this repository..."
GITHUB_USER=$(gh api user -q .login)
GITHUB_NAME=$(gh api user -q .name 2>/dev/null || echo "")

# Don't try to fetch email from API (often fails with 404)
# Instead, prompt or use defaults
if [ -z "$GITHUB_NAME" ]; then
    GITHUB_NAME=$GITHUB_USER
fi

# Check if local config already exists
EXISTING_EMAIL=$(git config --local user.email 2>/dev/null || echo "")

if [ -n "$EXISTING_EMAIL" ]; then
    echo "Current local git config:"
    echo "  Name: $(git config --local user.name)"
    echo "  Email: $EXISTING_EMAIL"
    echo ""
    read -p "Keep this config? (Y/n): " KEEP_CONFIG
    KEEP_CONFIG=${KEEP_CONFIG:-Y}

    if [[ $KEEP_CONFIG =~ ^[Yy]$ ]]; then
        echo "✓ Using existing config"
    else
        read -p "Enter your git name (e.g., Brian Matto): " GITHUB_NAME
        read -p "Enter your git email (e.g., bmatto@gmail.com): " GITHUB_EMAIL
        git config --local user.name "$GITHUB_NAME"
        git config --local user.email "$GITHUB_EMAIL"
        echo "✓ Git config updated"
    fi
else
    # No local config, set it up
    echo "No local git config found."

    # Smart defaults based on username
    if [ "$GITHUB_USER" == "bmatto" ]; then
        DEFAULT_NAME="Brian Matto"
        DEFAULT_EMAIL="bmatto@gmail.com"
    else
        DEFAULT_NAME=$GITHUB_NAME
        DEFAULT_EMAIL=""
    fi

    read -p "Enter your git name (default: $DEFAULT_NAME): " INPUT_NAME
    GITHUB_NAME=${INPUT_NAME:-$DEFAULT_NAME}

    read -p "Enter your git email (e.g., bmatto@gmail.com): " GITHUB_EMAIL

    while [ -z "$GITHUB_EMAIL" ]; do
        echo "Email is required!"
        read -p "Enter your git email: " GITHUB_EMAIL
    done

    git config --local user.name "$GITHUB_NAME"
    git config --local user.email "$GITHUB_EMAIL"

    echo ""
    echo "✓ Git config set:"
    echo "  Name: $GITHUB_NAME"
    echo "  Email: $GITHUB_EMAIL"
fi

echo ""

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
echo "📦 Summary before deployment:"
echo "   GitHub user: $(gh api user -q .login)"
echo "   Git committer: $(git config user.name) <$(git config user.email)>"
echo "   Repository: $REPO_NAME"
echo "   Visibility: $VISIBILITY"
echo ""
read -p "Everything look correct? (Y/n): " CONFIRM
CONFIRM=${CONFIRM:-Y}

if [[ ! $CONFIRM =~ ^[Yy]$ ]]; then
    echo "❌ Deployment cancelled"
    exit 1
fi

echo ""
echo "📦 Creating GitHub repository..."

# Get the GitHub username we'll use
GITHUB_USER=$(gh api user -q .login)

# Initialize git if needed
if [ ! -d ".git" ]; then
    echo "Initializing git repository..."
    git init
    git add .
    git commit -m "Initial commit: Portsmouth calendar scraper"
fi

# Remove existing origin if it exists and points to wrong account or uses SSH
if git remote get-url origin &> /dev/null; then
    CURRENT_REMOTE=$(git remote get-url origin)
    echo "Current remote: $CURRENT_REMOTE"

    # Check if remote uses SSH (git@github.com) - we want HTTPS
    if [[ "$CURRENT_REMOTE" == git@github.com* ]]; then
        echo "⚠️  Remote uses SSH, switching to HTTPS for gh CLI compatibility..."
        git remote remove origin
    elif [[ ! "$CURRENT_REMOTE" == *"$GITHUB_USER"* ]]; then
        echo "⚠️  Remote points to different account, removing..."
        git remote remove origin
    fi
fi

# Add remote if not exists (always use HTTPS)
if ! git remote get-url origin &> /dev/null; then
    echo "Setting remote to: https://github.com/$GITHUB_USER/$REPO_NAME.git"
    git remote add origin "https://github.com/$GITHUB_USER/$REPO_NAME.git"
fi

# Create GitHub repo (don't use --push flag to have more control)
echo "Creating repository on GitHub..."
gh repo create "$GITHUB_USER/$REPO_NAME" $VISIBILITY || {
    echo "⚠️  Repository might already exist. Checking..."
    if gh repo view "$GITHUB_USER/$REPO_NAME" &> /dev/null; then
        echo "✓ Repository exists, proceeding..."
    else
        echo "❌ Failed to create repository"
        exit 1
    fi
}

# Rename branch to main
git branch -M main

# Push to remote
echo "Pushing to GitHub..."
echo "Using account: $GITHUB_USER"
if git push -u origin main; then
    echo "✓ Successfully pushed to GitHub!"
else
    echo ""
    echo "❌ Push failed!"
    echo ""
    echo "This might be a credentials issue. Try:"
    echo "  1. Check gh auth: gh auth status"
    echo "  2. Refresh credentials: gh auth refresh -s repo"
    echo "  3. Or re-authenticate: gh auth login"
    exit 1
fi

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
