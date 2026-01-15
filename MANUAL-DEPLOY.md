# Manual Deployment Guide

If the automated deploy script has issues, follow these manual steps.

## Step 1: Switch to Personal GitHub Account

```bash
# Check current account
gh auth status

# If it shows bmatto_hubspot, logout
gh auth logout

# Login with personal account
gh auth login

# When prompted:
# - Choose: GitHub.com
# - Choose: HTTPS
# - Authenticate: Yes
# - Choose: Login with a web browser
# - In browser: Make sure you login with bmatto@gmail.com

# Verify
gh auth status
# Should show: bmatto
```

## Step 2: Set Local Git Config

```bash
cd ~/Sites/psm-cal-scraper

# Set for this repo only (won't affect other repos)
git config --local user.name "Brian Matto"
git config --local user.email "bmatto@gmail.com"

# Verify
git config user.email
# Should show: bmatto@gmail.com
```

## Step 3: Initialize Git Repository

```bash
# If not already initialized
git init

# Add all files
git add .

# Make initial commit
git commit -m "Initial commit: Portsmouth calendar scraper"
```

## Step 4: Create GitHub Repository

```bash
# Create repo on GitHub (choose private or public)
gh repo create psm-cal-scraper --private --source=. --remote=origin

# Or if you prefer public
gh repo create psm-cal-scraper --public --source=. --remote=origin
```

## Step 5: Push to GitHub

```bash
# Rename branch to main
git branch -M main

# Push
git push -u origin main
```

If push fails with authentication error, try:
```bash
# Refresh credentials
gh auth refresh -s repo

# Try push again
git push -u origin main
```

## Step 6: Set Up GitHub Secrets

```bash
# Base64 encode your credentials
cat config/credentials.json | base64 | pbcopy

# Go to GitHub repo → Settings → Secrets and variables → Actions
# Add secret: GOOGLE_CREDENTIALS
# Paste the base64 encoded content

# Do the same for token
cat config/token.json | base64 | pbcopy
# Add secret: GOOGLE_TOKEN

# Add calendar ID (get from .env file)
grep GOOGLE_CALENDAR_ID .env | cut -d '=' -f2 | pbcopy
# Add secret: GOOGLE_CALENDAR_ID
```

Or use gh CLI:
```bash
# Get your calendar ID
CALENDAR_ID=$(grep GOOGLE_CALENDAR_ID .env | cut -d '=' -f2 | tr -d ' ')

# Set secrets
cat config/credentials.json | gh secret set GOOGLE_CREDENTIALS
cat config/token.json | gh secret set GOOGLE_TOKEN
echo "$CALENDAR_ID" | gh secret set GOOGLE_CALENDAR_ID
```

## Step 7: Enable GitHub Actions

1. Go to your repo on GitHub
2. Click the "Actions" tab
3. Enable workflows if prompted
4. You should see "Sync Portsmouth Calendar" workflow

## Step 8: Test the Workflow

1. Go to Actions tab
2. Click "Sync Portsmouth Calendar"
3. Click "Run workflow"
4. Select branch: main
5. Click "Run workflow"

Wait a minute and check the results!

## Troubleshooting

### Push fails with "permission denied"

```bash
# Check which account git will use for push
gh auth status

# Make sure it shows bmatto, not bmatto_hubspot
# If wrong account, logout and login again
gh auth logout
gh auth login
```

### Push fails with "remote already exists"

```bash
# Check current remote
git remote -v

# If it points to wrong account, remove and re-add
git remote remove origin
git remote add origin https://github.com/bmatto/psm-cal-scraper.git

# Try push again
git push -u origin main
```

### Can't set secrets with gh CLI

Use the GitHub web interface:
1. Go to: https://github.com/bmatto/psm-cal-scraper/settings/secrets/actions
2. Click "New repository secret"
3. Add each secret manually

### GitHub Actions not running

Check:
1. Actions tab → Enable workflows
2. Settings → Actions → General → Allow all actions
3. Make sure secrets are set correctly

## Verification

After everything is set up:

```bash
# Check local git config
git config user.email
# Should be: bmatto@gmail.com

# Check remote
git remote -v
# Should show: https://github.com/bmatto/psm-cal-scraper.git

# Check GitHub auth
gh auth status
# Should show: bmatto

# Check secrets are set
gh secret list
# Should show: GOOGLE_CALENDAR_ID, GOOGLE_CREDENTIALS, GOOGLE_TOKEN
```

## Quick Reference Commands

```bash
# Switch GitHub account
gh auth logout && gh auth login

# Check current account
gh auth status

# Set local git config
git config --local user.email "bmatto@gmail.com"

# Check what will be used
git config user.email

# View remote URL
git remote -v

# Set secrets
cat config/credentials.json | gh secret set GOOGLE_CREDENTIALS
cat config/token.json | gh secret set GOOGLE_TOKEN
```
