# Config Directory

This directory contains your Google Calendar API credentials and tokens.

## Required Files

### credentials.json

Your Google OAuth 2.0 client credentials. To obtain:

1. Visit [Google Cloud Console](https://console.cloud.google.com/)
2. Enable Google Calendar API
3. Create OAuth 2.0 credentials (Desktop app)
4. Download JSON file
5. Save as `credentials.json` in this directory

**⚠️ Keep this file secure and never commit it to version control!**

### token.json (auto-generated)

OAuth access and refresh tokens. This file is created automatically on first authentication and should not be edited manually.

## File Security

Both files are excluded from git via `.gitignore`. Do not share these files publicly.
