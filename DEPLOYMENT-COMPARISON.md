# Deployment Options Comparison

Quick reference to choose the best deployment method for your Portsmouth calendar scraper.

## Quick Decision Matrix

| Need | Recommended Option |
|------|-------------------|
| 🆓 Free and simple | **GitHub Actions** |
| 🏢 Already using AWS | AWS Lambda + EventBridge |
| 🌐 Already using Google Cloud | Google Cloud Run + Scheduler |
| 💻 Mac always running | Local cron job |
| 🚀 Want something modern | Railway / Render / Fly.io |

## Detailed Comparison

| Feature | GitHub Actions | Google Cloud | AWS Lambda | Local Cron | Railway/Render |
|---------|---------------|--------------|------------|------------|----------------|
| **Cost** | Free (2000 min/month) | ~$0 (free tier) | ~$0 (free tier) | Free | ~$5/month |
| **Setup Time** | 5 minutes | 15 minutes | 20 minutes | 2 minutes | 10 minutes |
| **Maintenance** | None | Low | Medium | None | Low |
| **Reliability** | High | High | High | Medium* | High |
| **Puppeteer Support** | ✅ Native | ✅ Docker | ⚠️ Needs layer | ✅ Native | ✅ Native |
| **Secrets Management** | ✅ Built-in | ✅ Secret Manager | ✅ Systems Manager | ❌ Local files | ✅ Built-in |
| **Logs/Monitoring** | ✅ Actions UI | ✅ Cloud Logging | ✅ CloudWatch | ⚠️ Manual | ✅ Dashboard |
| **Scheduling** | Cron syntax | Cloud Scheduler | EventBridge | Crontab | Cron jobs |
| **Always On** | ✅ Yes | ✅ Yes | ✅ Yes | ⚠️ Mac dependent | ✅ Yes |
| **Version Control** | ✅ Yes | ⚠️ Separate | ⚠️ Separate | ❌ No | ⚠️ Separate |

*Requires Mac to be running

## Deployment Commands

### GitHub Actions (Recommended)
```bash
./scripts/deploy-to-github.sh
```
**Done!** Workflow runs automatically.

### Google Cloud Run
```bash
gcloud run deploy psm-cal-scraper --source .
gcloud scheduler jobs create http psm-calendar-sync --schedule "0 11 * * *"
```

### AWS Lambda
```bash
# Requires SAM/Serverless setup
sam deploy --guided
```

### Local Cron
```bash
crontab -e
# Add: 0 6 * * * cd /path && node src/sync.js
```

### Railway
```bash
railway init
railway up
# Set schedule in dashboard
```

## My Recommendation

### For You: **GitHub Actions** 🏆

**Why:**
1. ✅ **Free** - No cost at all
2. ✅ **Zero maintenance** - No servers to manage
3. ✅ **Already have Google Calendar API** - Stays in ecosystem
4. ✅ **Automatic script** - One command deployment
5. ✅ **Built-in monitoring** - See every run in Actions tab
6. ✅ **Version controlled** - Workflow lives with code
7. ✅ **Easy secrets** - No extra setup needed
8. ✅ **Puppeteer works** - No special configuration

**Setup:**
```bash
# 1. Run scraper locally once to generate credentials
npm run setup
npm run sync

# 2. Deploy to GitHub (automated)
./scripts/deploy-to-github.sh

# 3. Done! Check https://github.com/YOUR_USERNAME/psm-cal-scraper/actions
```

The workflow will:
- Run daily at 6 AM EST
- Show summary of each run
- Save logs as artifacts
- Email you on failures (if enabled in GitHub settings)

## When to Use Alternatives

### Use **Google Cloud Run** if:
- You already have GCP projects
- You want to trigger from other Google services
- You need more control over compute resources

### Use **AWS Lambda** if:
- You're already invested in AWS
- You want to integrate with other AWS services
- You have Lambda expertise

### Use **Local Cron** if:
- Your Mac is always on
- You don't want cloud dependencies
- You prefer complete control

### Use **Railway/Render** if:
- You want a modern PaaS experience
- You're okay with ~$5/month cost
- You want pretty dashboards

## Migration Path

Start with GitHub Actions (free, easy) → If you need more features later, migrate to:
- Google Cloud (more control, same ecosystem)
- AWS (enterprise integrations)
- Railway (better UI/UX)

You can always export your data from Google Calendar, so no lock-in concerns.
