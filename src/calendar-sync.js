import { google } from 'googleapis';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCOPES = ['https://www.googleapis.com/auth/calendar'];
const TOKEN_PATH = path.join(__dirname, '..', 'config', 'token.json');
const CREDENTIALS_PATH = path.join(__dirname, '..', 'config', 'credentials.json');

/**
 * Load OAuth2 credentials from file
 */
async function loadCredentials() {
  try {
    const content = await fs.readFile(CREDENTIALS_PATH, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    throw new Error(
      'Unable to load credentials.json. Please follow setup instructions in README.md'
    );
  }
}

/**
 * Create OAuth2 client
 */
async function authorize() {
  const credentials = await loadCredentials();
  const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;

  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

  // Try to load saved token
  try {
    const token = await fs.readFile(TOKEN_PATH, 'utf-8');
    oAuth2Client.setCredentials(JSON.parse(token));
    return oAuth2Client;
  } catch (error) {
    // Token doesn't exist, need to get new one
    return getNewToken(oAuth2Client);
  }
}

/**
 * Get new OAuth2 token
 */
async function getNewToken(oAuth2Client) {
  console.log('\n❌ OAuth token not found!\n');
  console.log('Please run the setup script first to authenticate:\n');
  console.log('   npm run setup\n');

  throw new Error(
    'OAuth token not found. Run "npm run setup" to authenticate with Google Calendar.'
  );
}

/**
 * Get or create the Portsmouth calendar
 */
export async function getOrCreateCalendar(auth, calendarId = null) {
  const calendar = google.calendar({ version: 'v3', auth });

  if (calendarId) {
    // Verify the calendar exists and we have access
    try {
      const response = await calendar.calendars.get({ calendarId });
      console.log(`✅ Using existing calendar: ${response.data.summary}`);
      return calendarId;
    } catch (error) {
      console.log(`⚠️  Calendar ${calendarId} not found, creating new one...`);
    }
  }

  // Create new calendar
  const calendarData = {
    summary: 'Portsmouth NH Municipal Meetings',
    description: 'Automated calendar of Portsmouth, NH municipal meetings and events. Scraped from portsmouthnh.gov',
    timeZone: 'America/New_York',
  };

  const response = await calendar.calendars.insert({
    requestBody: calendarData,
  });

  const newCalendarId = response.data.id;
  console.log(`✅ Created new calendar: ${response.data.summary}`);
  console.log(`   Calendar ID: ${newCalendarId}`);
  console.log(`\n📌 To make this calendar public:`);
  console.log(`   1. Visit: https://calendar.google.com/calendar/r/settings/calendar/${encodeURIComponent(newCalendarId)}`);
  console.log(`   2. Scroll to "Access permissions"`);
  console.log(`   3. Check "Make available to public"`);
  console.log(`   4. Share the calendar URL with others\n`);

  return newCalendarId;
}

/**
 * Get existing events from calendar for deduplication
 */
export async function getExistingEvents(auth, calendarId, timeMin = null) {
  const calendar = google.calendar({ version: 'v3', auth });

  const params = {
    calendarId,
    maxResults: 2500,
    singleEvents: true,
    orderBy: 'startTime',
  };

  if (timeMin) {
    params.timeMin = timeMin;
  } else {
    // Default to 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    params.timeMin = thirtyDaysAgo.toISOString();
  }

  try {
    const response = await calendar.events.list(params);
    return response.data.items || [];
  } catch (error) {
    console.error('Error fetching existing events:', error.message);
    return [];
  }
}

/**
 * Check if an event already exists based on title and date
 */
export function isDuplicateEvent(newEvent, existingEvents) {
  return existingEvents.some(existing => {
    const titleMatch = existing.summary === newEvent.summary;
    const startMatch = existing.start?.dateTime === newEvent.start?.dateTime ||
                      existing.start?.date === newEvent.start?.date;

    return titleMatch && startMatch;
  });
}

/**
 * Create a new event in the calendar
 */
export async function createEvent(auth, calendarId, eventData) {
  const calendar = google.calendar({ version: 'v3', auth });

  try {
    const response = await calendar.events.insert({
      calendarId,
      requestBody: eventData,
    });

    return response.data;
  } catch (error) {
    console.error(`Error creating event "${eventData.summary}":`, error.message);
    throw error;
  }
}

/**
 * Sync meetings to Google Calendar
 */
export async function syncMeetingsToCalendar(meetings, calendarId = null) {
  console.log('🔑 Authorizing with Google Calendar API...');
  const auth = await authorize();

  console.log('📅 Getting or creating Portsmouth calendar...');
  const targetCalendarId = await getOrCreateCalendar(auth, calendarId);

  console.log('🔍 Fetching existing events for deduplication...');
  const existingEvents = await getExistingEvents(auth, targetCalendarId);
  console.log(`   Found ${existingEvents.length} existing events`);

  console.log('\n📤 Syncing meetings to calendar...');
  let created = 0;
  let skipped = 0;

  for (const meeting of meetings) {
    if (isDuplicateEvent(meeting, existingEvents)) {
      skipped++;
      console.log(`  ⏭️  Skipping (duplicate): ${meeting.summary}`);
      continue;
    }

    try {
      await createEvent(auth, targetCalendarId, meeting);
      created++;
      console.log(`  ✅ Created: ${meeting.summary}`);
    } catch (error) {
      console.error(`  ❌ Failed: ${meeting.summary}`);
    }
  }

  console.log(`\n✨ Sync complete!`);
  console.log(`   Created: ${created}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Total processed: ${meetings.length}`);
  console.log(`\n🔗 View calendar: https://calendar.google.com/calendar/r?cid=${encodeURIComponent(targetCalendarId)}`);

  return {
    calendarId: targetCalendarId,
    created,
    skipped,
    total: meetings.length,
  };
}
