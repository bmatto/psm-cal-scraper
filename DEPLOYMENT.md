# Deployment Guide

Deploy the Portsmouth calendar scraper to run automatically on a schedule.

## Option 1: GitHub Actions (Recommended) ⭐

**Free, easy, and reliable**

### Setup

1. **Push to GitHub**
   ```bash
   cd ~/Sites/psm-cal-scraper
   git init
   git add .
   git commit -m "Initial commit"
   gh repo create psm-cal-scraper --private --source=. --push
   ```

2. **Set up secrets**

   First, run the scraper locally once to generate credentials:
   ```bash
   npm run setup
   npm run sync
   ```

   Then add these secrets to your GitHub repo:
   ```bash
   # Get your credentials (base64 encoded to avoid formatting issues)
   cat config/credentials.json | base64 | pbcopy
   # Add as secret GOOGLE_CREDENTIALS

   cat config/token.json | base64 | pbcopy
   # Add as secret GOOGLE_TOKEN

   echo "817b800ae95c9541ced7392bb9c061070508218339722f20e8b2b53423f48000@group.calendar.google.com" | pbcopy
   # Add as secret GOOGLE_CALENDAR_ID
   ```

   Using GitHub CLI:
   ```bash
   gh secret set GOOGLE_CREDENTIALS < config/credentials.json
   gh secret set GOOGLE_TOKEN < config/token.json
   gh secret set GOOGLE_CALENDAR_ID --body "817b800ae95c9541ced7392bb9c061070508218339722f20e8b2b53423f48000@group.calendar.google.com"
   ```

   Or via GitHub UI:
   - Go to repo → Settings → Secrets and variables → Actions
   - Add each secret

3. **Enable Actions**
   - Go to Actions tab in your repo
   - Enable workflows
   - The workflow will run daily at 6 AM EST

4. **Test it**
   - Go to Actions tab
   - Select "Sync Portsmouth Calendar"
   - Click "Run workflow" to test manually

### Modify Schedule

Edit `.github/workflows/sync-calendar.yml`:
```yaml
schedule:
  - cron: '0 11 * * *'  # Daily at 6 AM EST (11 AM UTC)
  # - cron: '0 */6 * * *'  # Every 6 hours
  # - cron: '0 11 * * 1-5'  # Weekdays only at 6 AM EST
```

---

## Option 2: Google Cloud Run + Cloud Scheduler

**Best if you want to stay in Google ecosystem**

### Setup

1. **Create Dockerfile**

```dockerfile
FROM node:20-slim

# Install Chromium for Puppeteer
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY . .

CMD ["node", "src/sync.js"]
```

2. **Deploy to Cloud Run**

```bash
# Enable APIs
gcloud services enable run.googleapis.com
gcloud services enable cloudscheduler.googleapis.com

# Build and deploy
gcloud run deploy psm-cal-scraper \
  --source . \
  --region us-east1 \
  --no-allow-unauthenticated \
  --set-env-vars GOOGLE_CALENDAR_ID=817b800ae95c9541ced7392bb9c061070508218339722f20e8b2b53423f48000@group.calendar.google.com \
  --set-secrets=/app/config/credentials.json=google-credentials:latest,/app/config/token.json=google-token:latest

# Create scheduler job
gcloud scheduler jobs create http psm-calendar-sync \
  --location us-east1 \
  --schedule "0 11 * * *" \
  --uri "https://psm-cal-scraper-xxxxx-ue.a.run.app" \
  --http-method POST \
  --oidc-service-account-email YOUR_SERVICE_ACCOUNT@YOUR_PROJECT.iam.gserviceaccount.com
```

**Cost:** ~$0/month (within free tier)

---

## Option 3: AWS Lambda + EventBridge

**Good for AWS users, but requires special Puppeteer setup**

### Challenges
- Puppeteer needs special Lambda layer or `chrome-aws-lambda`
- 15 minute timeout (usually fine for this scraper)
- More complex setup

### Setup

1. **Update package.json**
   ```json
   {
     "dependencies": {
       "chrome-aws-lambda": "^10.1.0",
       "puppeteer-core": "^21.11.0"
     }
   }
   ```

2. **Update scraper to use chrome-aws-lambda**
   ```javascript
   import chromium from 'chrome-aws-lambda';

   const browser = await chromium.puppeteer.launch({
     args: chromium.args,
     executablePath: await chromium.executablePath,
     headless: chromium.headless,
   });
   ```

3. **Deploy with SAM or Serverless Framework**

**Cost:** Free tier covers it (~$0/month)

---

## Option 4: Railway / Render / Fly.io

**Modern alternatives with easy deployment**

### Railway

1. Install Railway CLI: `brew install railway`
2. Create project: `railway init`
3. Add secrets in dashboard
4. Deploy: `railway up`
5. Add cron job in `railway.toml`

**Cost:** ~$5/month

### Render

1. Create account at render.com
2. Create Cron Job (not Web Service)
3. Connect GitHub repo
4. Set schedule: `0 11 * * *`
5. Add environment variables

**Cost:** Free tier available

---

## Option 5: Your Mac with Cron

**Simplest if you leave your Mac running**

Already documented in README.md:

```bash
crontab -e
```

Add:
```
0 6 * * * cd /Users/bmatto/Sites/psm-cal-scraper && /usr/local/bin/node src/sync.js >> logs/cron.log 2>&1
```

**Cost:** Free

---

## Recommended Choice

For your use case, I recommend **GitHub Actions** because:

1. ✅ **Free** - No cost for private repos (2000 minutes/month free)
2. ✅ **Simple** - No server management
3. ✅ **Reliable** - GitHub's infrastructure
4. ✅ **Easy secrets** - Built-in secrets management
5. ✅ **Puppeteer works** - No special setup needed
6. ✅ **Quick setup** - ~5 minutes to deploy
7. ✅ **Version controlled** - Workflow lives in repo

The workflow is already created at `.github/workflows/sync-calendar.yml` and ready to use!

---

## Monitoring & Alerts

### GitHub Actions
- Check Actions tab for run history
- Enable email notifications in Settings → Notifications

### Add Error Notifications

Update sync.js to send notifications on failure:

```javascript
// Add at the end of catch block
if (process.env.GITHUB_ACTIONS) {
  console.error('::error::Sync failed - check logs');
}
```

Or use a service like:
- Better Uptime (uptime monitoring)
- Sentry (error tracking)
- Email via SendGrid/AWS SES
