# SSH vs HTTPS for GitHub

## The Problem We Had

When deploying, you got this error:
```
ERROR: Permission to bmatto/psm-cal-scraper.git denied to bmatto_hubspot.
fatal: Could not read from remote repository.
```

Even though `gh` CLI was logged in as `bmatto`, git was using SSH keys that were tied to your work account (`bmatto_hubspot`).

## Why This Happened

### SSH Authentication
- Uses SSH keys (`~/.ssh/id_rsa`, `~/.ssh/id_ed25519`, etc.)
- SSH keys are tied to a specific GitHub account
- When you have multiple GitHub accounts, SSH keys can get confused
- Your SSH keys were configured for `bmatto_hubspot`
- Remote URL: `git@github.com:bmatto/psm-cal-scraper.git`

### HTTPS Authentication
- Uses username/password or tokens
- `gh` CLI manages authentication automatically
- Works seamlessly with multiple accounts
- Remote URL: `https://github.com/bmatto/psm-cal-scraper.git`

## The Fix

Changed your git remote from SSH to HTTPS:

```bash
# Before (SSH)
git remote -v
origin  git@github.com:bmatto/psm-cal-scraper.git (fetch)
origin  git@github.com:bmatto/psm-cal-scraper.git (push)

# Fixed (HTTPS)
git remote set-url origin https://github.com/bmatto/psm-cal-scraper.git
origin  https://github.com/bmatto/psm-cal-scraper.git (fetch)
origin  https://github.com/bmatto/psm-cal-scraper.git (push)
```

## When to Use Each

### Use HTTPS When:
- ✅ Using `gh` CLI for authentication
- ✅ Working with multiple GitHub accounts
- ✅ You want it to "just work" without SSH setup
- ✅ You're new to git/GitHub

### Use SSH When:
- You have SSH keys properly configured for each account
- You want password-free authentication
- You've set up `~/.ssh/config` with different hosts for different accounts
- You're comfortable with SSH key management

## For Multiple GitHub Accounts

If you want to use SSH with multiple accounts, you need to configure SSH properly:

### SSH Config Setup

Edit `~/.ssh/config`:

```ssh
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
  IdentityFile ~/.ssh/id_ed25519_work
  IdentitiesOnly yes
```

Then use different hosts for different repos:

```bash
# Personal repo
git remote set-url origin git@github-personal:bmatto/psm-cal-scraper.git

# Work repo
git remote set-url origin git@github-work:bmatto_hubspot/work-repo.git
```

## Our Recommendation

**For personal projects like this:** Use HTTPS with `gh` CLI
- Simpler
- Less configuration
- Works with `gh auth` switching
- No SSH key confusion

**For work projects:** Follow your company's guidelines
- HubSpot likely has specific SSH setup
- Keep work SSH keys separate

## Checking Your Setup

```bash
# Check current remote type
git remote -v

# If using SSH (git@github.com)
origin  git@github.com:user/repo.git

# If using HTTPS (https://github.com)
origin  https://github.com/user/repo.git

# To switch from SSH to HTTPS
git remote set-url origin https://github.com/USER/REPO.git

# To switch from HTTPS to SSH
git remote set-url origin git@github.com:USER/REPO.git
```

## What We Updated

The deploy script now:
1. ✅ Detects if you're using SSH (`git@github.com`)
2. ✅ Automatically switches to HTTPS
3. ✅ Uses HTTPS by default for new repos
4. ✅ Works seamlessly with `gh auth` for multiple accounts

## Bottom Line

**For this project:** HTTPS is the way to go. It works with your `gh` CLI authentication and handles the multiple account scenario cleanly.

**For HubSpot repos:** Continue using whatever method HubSpot recommends (likely SSH with your work keys).
