# GitHub Account Setup Guide

How to use your personal GitHub account (bmatto@gmail.com) instead of your work account.

## Problem

Your machine might be configured globally with your work GitHub account (bmatto_hubspot), but you want to deploy this personal project to your personal account (bmatto@gmail.com).

## Solutions

### Option 1: Use the Automated Script (Recommended)

The deploy script now handles this automatically:

```bash
./scripts/deploy-to-github.sh
```

It will:
1. Check which GitHub account you're logged into with `gh`
2. Ask if it's the correct account
3. Help you switch if needed
4. Set local git config to match your GitHub account

### Option 2: Manual Setup

If you prefer to do it manually:

#### Step 1: Check Current GitHub CLI Auth

```bash
gh auth status
```

#### Step 2: Switch to Personal Account (if needed)

```bash
# Logout of current account
gh auth logout

# Login with personal account
gh auth login
# Choose: GitHub.com > HTTPS > Yes (authenticate Git) > Login with browser
# Make sure you login with bmatto@gmail.com account in the browser
```

#### Step 3: Set Local Git Config

Set the git identity for ONLY this repository (won't affect other repos):

```bash
cd ~/Sites/psm-cal-scraper

# Set local config (overrides global)
git config --local user.name "Brian Matto"
git config --local user.email "bmatto@gmail.com"

# Verify it's set
git config --local user.name
git config --local user.email
```

#### Step 4: Verify Global Config Unchanged

```bash
# Your global config should still be your work account
git config --global user.name   # Should be bmatto_hubspot
git config --global user.email  # Should be work email
```

This is correct! Local config overrides global only for this project.

#### Step 5: Deploy

```bash
./scripts/deploy-to-github.sh
```

### Option 3: Using Git Credential Helper

If you work with both accounts frequently:

```bash
# Use different credential helpers per directory
git config --global credential.https://github.com.useHttpPath true

# Then for each repo, specify which account to use
cd ~/Sites/psm-cal-scraper
git config --local user.name "Brian Matto"
git config --local user.email "bmatto@gmail.com"
```

### Option 4: SSH Keys (Advanced)

Use different SSH keys for personal and work accounts:

```bash
# Generate separate SSH key for personal account
ssh-keygen -t ed25519 -C "bmatto@gmail.com" -f ~/.ssh/id_ed25519_personal

# Add to SSH agent
ssh-add ~/.ssh/id_ed25519_personal

# Add to GitHub (Settings > SSH Keys)
cat ~/.ssh/id_ed25519_personal.pub | pbcopy

# Configure SSH config (~/.ssh/config)
cat >> ~/.ssh/config <<EOF

# Personal GitHub
Host github-personal
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_ed25519_personal
  IdentitiesOnly yes

# Work GitHub
Host github-work
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_ed25519
  IdentitiesOnly yes
EOF

# Use personal account for this repo
cd ~/Sites/psm-cal-scraper
git remote set-url origin git@github-personal:bmatto/psm-cal-scraper.git
```

## Verifying It's Working

### Check Current Setup

```bash
cd ~/Sites/psm-cal-scraper

# Check GitHub CLI account
gh auth status

# Check git config for THIS repo
git config --local user.name
git config --local user.email

# Check what will be used for commits
git config user.name   # Should be personal
git config user.email  # Should be bmatto@gmail.com
```

### Test Commit

```bash
# Make a test commit
echo "test" >> .gitignore
git add .gitignore
git commit -m "test commit"

# Check the author
git log -1 --format='%an <%ae>'
# Should show: Brian Matto <bmatto@gmail.com>
```

### If Commit Shows Wrong Author

If you already made commits with the wrong author:

```bash
# Fix the last commit
git commit --amend --author="Brian Matto <bmatto@gmail.com>" --no-edit

# Or fix all commits in current branch
git rebase -i --root
# Change 'pick' to 'edit' for each commit, then:
git commit --amend --author="Brian Matto <bmatto@gmail.com>" --no-edit
git rebase --continue
```

## Common Issues

### Issue: "Permission denied" when pushing

**Solution:** Make sure `gh` is logged into the correct account:
```bash
gh auth status
gh auth login  # if needed
```

### Issue: Commits still showing work email

**Solution:** Check that local config is set correctly:
```bash
git config --local user.email  # Should be bmatto@gmail.com
git config --local user.name   # Should be Brian Matto

# NOT global!
git config --global user.email  # Can be work email
```

### Issue: Repository created under wrong account

**Solution:** Delete and recreate:
```bash
gh repo delete YOUR_WRONG_ACCOUNT/psm-cal-scraper --yes
# Then run deploy script again with correct account
```

## Quick Reference

| Command | Purpose |
|---------|---------|
| `gh auth status` | Check which GitHub account is active |
| `gh auth logout && gh auth login` | Switch GitHub accounts |
| `git config --local user.email "bmatto@gmail.com"` | Set email for this repo only |
| `git config --local user.name "Brian Matto"` | Set name for this repo only |
| `git config user.email` | Show which email will be used (checks local then global) |
| `git log -1 --format='%an <%ae>'` | Check author of last commit |

## Recommended Workflow

For personal projects in `~/Sites/`:

```bash
# Always set local config first
git config --local user.email "bmatto@gmail.com"
git config --local user.name "Brian Matto"

# Keep global config as work account (for HubSpot repos)
git config --global user.email "bmatto@hubspot.com"
git config --global user.name "Brian Matto"
```

This way:
- Work repos use work account (global default)
- Personal repos use personal account (local override)
