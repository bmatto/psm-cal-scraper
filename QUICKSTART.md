# Quick Start Guide

Get up and running in 5 minutes!

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Get Google Calendar Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or use existing)
3. Enable "Google Calendar API"
4. Create OAuth 2.0 credentials:
   - Type: "Desktop app"
   - Download credentials JSON
5. Save as `config/credentials.json`

**Important:** Add this redirect URI to your OAuth credentials:
```
http://localhost:3000/oauth2callback
```

## Step 3: Test the Scraper

```bash
npm test
```

This should show you 5 sample meetings from Portsmouth's calendar.

## Step 4: Authenticate with Google

```bash
npm run setup
```

Your browser will open automatically. Sign in and authorize the app.

## Step 5: Run First Sync

```bash
npm run sync
```

This will:
- Scrape all meetings
- Create a new Google Calendar
- Add all meetings to the calendar

## Step 6: Make Calendar Public

1. Visit [Google Calendar](https://calendar.google.com)
2. Find "Portsmouth NH Municipal Meetings"
3. Click ⋮ > "Settings and sharing"
4. Under "Access permissions":
   - ✅ "Make available to public"
5. Copy the public URL to share!

## Ongoing Use

Run the sync daily:

```bash
npm run sync
```

Or set up automation:

```bash
# Run daily at 6 AM
crontab -e
```

Add:
```cron
0 6 * * * cd /Users/bmatto/Sites/psm-cal-scraper && node src/sync.js >> logs/cron.log 2>&1
```

## Troubleshooting

### "Unable to load credentials.json"
- Make sure `config/credentials.json` exists
- Check file permissions

### "OAuth token not found"
- Run `npm run setup` first

### No meetings found
- Check if website is accessible
- Website structure may have changed

### Duplicates created
- Check `GOOGLE_CALENDAR_ID` in `.env` matches your calendar

## Need Help?

See full [README.md](README.md) for detailed instructions.
