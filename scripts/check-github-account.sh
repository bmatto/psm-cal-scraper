#!/bin/bash

echo "🔍 Checking GitHub Account Setup"
echo "================================="
echo ""

# Check GitHub CLI status
echo "GitHub CLI Account:"
if gh auth status &> /dev/null; then
    GH_USER=$(gh api user -q .login 2>/dev/null || echo "unknown")
    echo "  ✓ Logged in as: $GH_USER"
    # Don't try to fetch email from API (often fails with 404)
else
    echo "  ✗ Not logged in"
    echo ""
    echo "Run: gh auth login"
fi

echo ""
echo "Git Configuration:"
echo ""

# Check global config
echo "Global (default for all repos):"
GLOBAL_NAME=$(git config --global user.name 2>/dev/null || echo "Not set")
GLOBAL_EMAIL=$(git config --global user.email 2>/dev/null || echo "Not set")
echo "  Name:  $GLOBAL_NAME"
echo "  Email: $GLOBAL_EMAIL"

echo ""

# Check local config (if in a git repo)
if git rev-parse --git-dir &> /dev/null; then
    echo "Local (this repo only):"
    LOCAL_NAME=$(git config --local user.name 2>/dev/null || echo "Not set")
    LOCAL_EMAIL=$(git config --local user.email 2>/dev/null || echo "Not set")
    echo "  Name:  $LOCAL_NAME"
    echo "  Email: $LOCAL_EMAIL"

    echo ""

    # Show what will actually be used
    echo "Effective (what will be used for commits):"
    EFFECTIVE_NAME=$(git config user.name 2>/dev/null || echo "Not set")
    EFFECTIVE_EMAIL=$(git config user.email 2>/dev/null || echo "Not set")
    echo "  Name:  $EFFECTIVE_NAME"
    echo "  Email: $EFFECTIVE_EMAIL"

    # Check if there are any commits
    if git log -1 &> /dev/null; then
        echo ""
        echo "Last commit author:"
        LAST_AUTHOR=$(git log -1 --format='%an <%ae>' 2>/dev/null)
        echo "  $LAST_AUTHOR"
    fi
else
    echo "Local: Not in a git repository"
fi

echo ""
echo "================================="
echo ""

# Recommendations
if gh auth status &> /dev/null; then
    GH_USER=$(gh api user -q .login 2>/dev/null)

    if [ "$GH_USER" == "bmatto" ]; then
        echo "✅ Setup looks good for personal account!"
    elif [[ "$GH_USER" == *"hubspot"* ]]; then
        echo "⚠️  You appear to be using a work account ($GH_USER)."
        echo ""
        echo "To switch to personal account:"
        echo "  npm run switch-account"
    fi

    if git rev-parse --git-dir &> /dev/null; then
        if [[ "$EFFECTIVE_EMAIL" == *"@gmail.com"* ]]; then
            echo "✅ Git email looks good for personal project!"
        elif [ "$LOCAL_EMAIL" == "Not set" ]; then
            echo "⚠️  No local git config set for this repo."
            echo ""
            echo "To set personal git config for this repo only:"
            echo "  git config --local user.name 'Brian Matto'"
            echo "  git config --local user.email 'bmatto@gmail.com'"
        fi
    fi
else
    echo "❌ Not logged into GitHub CLI"
    echo ""
    echo "Run: gh auth login"
fi

echo ""
