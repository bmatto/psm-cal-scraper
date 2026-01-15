# Portsmouth NH Municipal Meetings Calendar Scraper

Automatically scrapes Portsmouth, NH's municipal meetings calendar and syncs events to a public Google Calendar that can be shared and subscribed to.

## Features

- 🔄 Scrapes all upcoming meetings from [portsmouthnh.gov](https://www.portsmouthnh.gov/city-municipal-meetings-calendar)
- 📅 Syncs to Google Calendar with deduplication
- 🌐 Creates a shareable public calendar
- 🤖 Can be automated with cron/scheduled tasks
- 🎯 Handles JavaScript-rendered content

## Prerequisites

- Node.js (v18 or higher)
- A Google Cloud Project with Calendar API enabled
- Google OAuth 2.0 credentials

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Google Calendar API

#### a. Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Navigate to "APIs & Services" > "Library"
4. Search for "Google Calendar API" and enable it

#### b. Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. If prompted, configure the OAuth consent screen:
   - User Type: External
   - App name: "Portsmouth Calendar Scraper"
   - Add your email as a developer
   - Scopes: Leave default (you'll add calendar scope in code)
4. Application type: "Desktop app"
5. Name: "Portsmouth Calendar Scraper"
6. Click "Create"
7. Download the credentials JSON file
8. Save it as `config/credentials.json` in this project

#### c. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` if you want to specify an existing calendar ID (optional).

### 3. Test the Scraper

Before syncing to Google Calendar, test that the scraper works:

```bash
npm test
```

This will scrape the calendar and display sample meetings without touching Google Calendar.

### 4. First Sync (Authentication)

Run the sync command:

```bash
npm run sync
```

On first run, you'll need to authorize the app:

1. A URL will be displayed in the terminal
2. Visit the URL in your browser
3. Sign in with your Google account
4. Grant calendar permissions
5. You'll be redirected to a page with an authorization code
6. Copy the full redirect URL (or just the code parameter)

**Note:** The initial OAuth flow requires manual intervention. For a smoother experience, you can set up a local OAuth callback server (see Advanced Setup below).

### 5. Make Calendar Public

After the first sync:

1. Visit [Google Calendar](https://calendar.google.com)
2. Find "Portsmouth NH Municipal Meetings" in your calendar list
3. Click the three dots > "Settings and sharing"
4. Under "Access permissions for events":
   - ✅ Check "Make available to public"
5. Copy the "Public URL to this calendar" to share with others

## Usage

### Regular Sync

```bash
npm run sync
```

This will:
1. Scrape the Portsmouth calendar
2. Check for duplicate events
3. Add new meetings to Google Calendar
4. Skip existing events

### Test Scraper Only

```bash
npm test
```

Scrapes and displays meetings without syncing to Google Calendar.

## Automation

### Using Cron (Mac/Linux)

Edit your crontab:

```bash
crontab -e
```

Add this line to run daily at 6 AM:

```cron
0 6 * * * cd /Users/bmatto/Sites/psm-cal-scraper && /usr/local/bin/node src/sync.js >> logs/cron.log 2>&1
```

Create the logs directory:

```bash
mkdir -p logs
```

### Using launchd (Mac)

Create a plist file at `~/Library/LaunchAgents/com.user.psm-cal-scraper.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.user.psm-cal-scraper</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/node</string>
        <string>/Users/bmatto/Sites/psm-cal-scraper/src/sync.js</string>
    </array>
    <key>StartCalendarInterval</key>
    <dict>
        <key>Hour</key>
        <integer>6</integer>
        <key>Minute</key>
        <integer>0</integer>
    </dict>
    <key>WorkingDirectory</key>
    <string>/Users/bmatto/Sites/psm-cal-scraper</string>
    <key>StandardOutPath</key>
    <string>/Users/bmatto/Sites/psm-cal-scraper/logs/stdout.log</string>
    <key>StandardErrorPath</key>
    <string>/Users/bmatto/Sites/psm-cal-scraper/logs/stderr.log</string>
</dict>
</plist>
```

Load it:

```bash
launchctl load ~/Library/LaunchAgents/com.user.psm-cal-scraper.plist
```

### Cloud Deployment (Recommended for 24/7)

**GitHub Actions** - Free, easy, and reliable. No server required!

Quick setup:
```bash
# After running npm run sync at least once locally
./scripts/deploy-to-github.sh
```

This will:
1. Create a GitHub repository
2. Push your code
3. Set up secrets (credentials, token, calendar ID)
4. Enable daily automatic sync at 6 AM EST

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions and other deployment options:
- GitHub Actions (recommended)
- Google Cloud Run + Cloud Scheduler
- AWS Lambda + EventBridge
- Railway / Render / Fly.io

## Project Structure

```
psm-cal-scraper/
├── src/
│   ├── scraper.js           # Web scraper for Portsmouth calendar (FIXED selectors)
│   ├── calendar-sync.js     # Google Calendar API integration
│   ├── oauth-setup.js       # OAuth authentication helper
│   ├── sync.js              # Main sync script
│   └── test-scraper.js      # Test script
├── .github/
│   └── workflows/
│       └── sync-calendar.yml # GitHub Actions workflow
├── scripts/
│   └── deploy-to-github.sh  # Automated deployment script
├── config/
│   ├── credentials.json     # Google OAuth credentials (you provide)
│   └── token.json          # Auto-generated access token
├── .env                    # Environment variables
├── DEPLOYMENT.md           # Cloud deployment guide
├── STRUCTURE.md            # Page structure documentation
├── QUICKSTART.md           # Quick setup guide
└── README.md               # This file
```

## Advanced Setup

### Improved OAuth Flow

To avoid manual code copying, you can set up a local OAuth callback:

1. Modify OAuth redirect URI in Google Cloud Console:
   - Add `http://localhost:3000/oauth2callback`
2. Update `calendar-sync.js` to start a temporary HTTP server
3. The browser will automatically complete the flow

Example implementation (requires `express`):

```javascript
import express from 'express';

async function getNewToken(oAuth2Client) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });

  const app = express();

  return new Promise((resolve, reject) => {
    app.get('/oauth2callback', async (req, res) => {
      const code = req.query.code;
      try {
        const { tokens } = await oAuth2Client.getToken(code);
        oAuth2Client.setCredentials(tokens);
        await fs.writeFile(TOKEN_PATH, JSON.stringify(tokens));
        res.send('Authentication successful! You can close this window.');
        resolve(oAuth2Client);
        server.close();
      } catch (error) {
        reject(error);
      }
    });

    const server = app.listen(3000, () => {
      console.log(`Visit: ${authUrl}`);
    });
  });
}
```

## Troubleshooting

### "Unable to load credentials.json"

Make sure you've placed your Google OAuth credentials in `config/credentials.json`.

### Scraper returns no meetings

- Check if the Portsmouth website is accessible
- The website structure may have changed (inspect the page and update selectors)
- Try running with `DEBUG=true npm run sync` for verbose output

### Duplicate events being created

The deduplication checks event titles and start times. If meetings are still duplicated:
- Check that the calendar ID in `.env` matches your target calendar
- Events with different times or titles will be treated as new

### Authentication expires

The OAuth token is saved to `config/token.json` and should auto-refresh. If you get auth errors:
1. Delete `config/token.json`
2. Run `npm run sync` again to re-authenticate

## Contributing

Feel free to submit issues or pull requests for improvements!

## License

MIT

## Acknowledgments

Built for the Portsmouth, NH community to make municipal meetings more accessible.
