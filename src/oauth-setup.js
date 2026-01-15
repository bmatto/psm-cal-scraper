import { google } from 'googleapis';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';
import { parse as parseUrl } from 'url';
import open from 'open';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCOPES = ['https://www.googleapis.com/auth/calendar'];
const TOKEN_PATH = path.join(__dirname, '..', 'config', 'token.json');
const CREDENTIALS_PATH = path.join(__dirname, '..', 'config', 'credentials.json');
const PORT = 3000;

async function loadCredentials() {
  try {
    const content = await fs.readFile(CREDENTIALS_PATH, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error('\n❌ Unable to load credentials.json');
    console.error('\nPlease follow these steps:');
    console.error('1. Go to https://console.cloud.google.com/');
    console.error('2. Enable Google Calendar API');
    console.error('3. Create OAuth 2.0 credentials (Desktop app)');
    console.error('4. Download credentials.json');
    console.error('5. Save to: config/credentials.json\n');
    throw error;
  }
}

async function getNewToken(oAuth2Client) {
  return new Promise((resolve, reject) => {
    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
    });

    console.log('\n🔐 Starting OAuth authentication...\n');
    console.log('Opening your browser to authorize the application...');
    console.log('\nIf the browser doesn\'t open automatically, visit:');
    console.log(authUrl);
    console.log('');

    const server = http.createServer(async (req, res) => {
      const url = parseUrl(req.url, true);

      if (url.pathname === '/oauth2callback') {
        const code = url.query.code;

        if (code) {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`
            <!DOCTYPE html>
            <html>
              <head>
                <title>Authentication Successful</title>
                <style>
                  body {
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                    margin: 0;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                  }
                  .container {
                    background: white;
                    padding: 3rem;
                    border-radius: 1rem;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                    text-align: center;
                    max-width: 500px;
                  }
                  h1 { color: #2d3748; margin-bottom: 1rem; }
                  p { color: #4a5568; font-size: 1.1rem; }
                  .success { font-size: 4rem; margin-bottom: 1rem; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="success">✅</div>
                  <h1>Authentication Successful!</h1>
                  <p>You can close this window and return to the terminal.</p>
                </div>
              </body>
            </html>
          `);

          try {
            const { tokens } = await oAuth2Client.getToken(code);
            oAuth2Client.setCredentials(tokens);

            // Save token for future use
            await fs.mkdir(path.dirname(TOKEN_PATH), { recursive: true });
            await fs.writeFile(TOKEN_PATH, JSON.stringify(tokens, null, 2));

            console.log('\n✅ Authentication successful!');
            console.log(`   Token saved to: ${TOKEN_PATH}\n`);

            server.close();
            resolve(oAuth2Client);
          } catch (error) {
            console.error('\n❌ Error getting access token:', error.message);
            server.close();
            reject(error);
          }
        } else {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end('Error: No code provided');
          server.close();
          reject(new Error('No authorization code received'));
        }
      }
    });

    server.listen(PORT, async () => {
      console.log(`🌐 Local server started on http://localhost:${PORT}\n`);
      try {
        await open(authUrl);
      } catch (error) {
        console.log('⚠️  Could not open browser automatically.');
        console.log('   Please copy and paste the URL above into your browser.\n');
      }
    });

    // Timeout after 5 minutes
    setTimeout(() => {
      server.close();
      reject(new Error('Authentication timeout (5 minutes)'));
    }, 5 * 60 * 1000);
  });
}

export async function setupOAuth() {
  console.log('🔧 Setting up Google Calendar OAuth...\n');

  const credentials = await loadCredentials();
  const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;

  // For local OAuth flow, we need to use localhost redirect
  const redirectUri = `http://localhost:${PORT}/oauth2callback`;

  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirectUri
  );

  console.log('⚠️  IMPORTANT: Make sure your OAuth credentials include this redirect URI:');
  console.log(`   ${redirectUri}`);
  console.log('\nTo add it:');
  console.log('1. Go to https://console.cloud.google.com/apis/credentials');
  console.log('2. Edit your OAuth 2.0 Client ID');
  console.log('3. Add to "Authorized redirect URIs"');
  console.log('4. Click "Save"\n');

  await getNewToken(oAuth2Client);

  console.log('🎉 Setup complete! You can now run:');
  console.log('   npm run sync\n');

  return oAuth2Client;
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  setupOAuth()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('\n❌ Setup failed:', error.message);
      process.exit(1);
    });
}
