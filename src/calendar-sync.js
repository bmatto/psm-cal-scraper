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
 * Get existing events from calendar within a time window
 */
export async function getExistingEvents(auth, calendarId, timeMin = null, timeMax = null) {
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

  if (timeMax) {
    params.timeMax = timeMax;
  } else {
    // Default to 6 months from now
    const sixMonthsFromNow = new Date();
    sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);
    params.timeMax = sixMonthsFromNow.toISOString();
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
 * Find an existing event that matches the new event
 */
export function findMatchingEvent(newEvent, existingEvents) {
  return existingEvents.find(existing => {
    const titleMatch = existing.summary === newEvent.summary;

    // Compare start times by converting to Date objects for reliable comparison
    let startMatch = false;
    if (existing.start?.dateTime && newEvent.start?.dateTime) {
      const existingTime = new Date(existing.start.dateTime).getTime();
      const newTime = new Date(newEvent.start.dateTime).getTime();
      startMatch = existingTime === newTime;
    } else if (existing.start?.date && newEvent.start?.date) {
      startMatch = existing.start.date === newEvent.start.date;
    }

    return titleMatch && startMatch;
  });
}

/**
 * Check if an event needs to be updated (any field has changed)
 */
export function needsUpdate(newEvent, existingEvent) {
  const descriptionChanged = existingEvent.description !== newEvent.description;
  const locationChanged = existingEvent.location !== newEvent.location;

  // Compare end times by converting to timestamps for reliable comparison
  let endChanged = false;
  if (existingEvent.end?.dateTime && newEvent.end?.dateTime) {
    const existingEnd = new Date(existingEvent.end.dateTime).getTime();
    const newEnd = new Date(newEvent.end.dateTime).getTime();
    endChanged = existingEnd !== newEnd;
  } else if (existingEvent.end?.date && newEvent.end?.date) {
    endChanged = existingEvent.end.date !== newEvent.end.date;
  } else if (existingEvent.end?.dateTime || existingEvent.end?.date || newEvent.end?.dateTime || newEvent.end?.date) {
    // One has end time, the other doesn't
    endChanged = true;
  }

  return descriptionChanged || locationChanged || endChanged;
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
 * Update an existing event in the calendar
 */
export async function updateEvent(auth, calendarId, eventId, eventData) {
  const calendar = google.calendar({ version: 'v3', auth });

  try {
    const response = await calendar.events.update({
      calendarId,
      eventId,
      requestBody: eventData,
    });

    return response.data;
  } catch (error) {
    console.error(`Error updating event "${eventData.summary}":`, error.message);
    throw error;
  }
}

/**
 * Delete an event from the calendar
 */
export async function deleteEvent(auth, calendarId, eventId) {
  const calendar = google.calendar({ version: 'v3', auth });

  try {
    await calendar.events.delete({
      calendarId,
      eventId,
    });
  } catch (error) {
    console.error(`Error deleting event:`, error.message);
    throw error;
  }
}

/**
 * Sync meetings to Google Calendar with full sync (updates and deletions)
 */
export async function syncMeetingsToCalendar(meetings, calendarId = null) {
  console.log('🔑 Authorizing with Google Calendar API...');
  const auth = await authorize();

  console.log('📅 Getting or creating Portsmouth calendar...');
  const targetCalendarId = await getOrCreateCalendar(auth, calendarId);

  // Calculate sync window based on actual meeting dates
  let timeMin = null;
  let timeMax = null;

  if (meetings.length > 0) {
    const meetingDates = meetings.map(m => new Date(m.start.dateTime || m.start.date));
    const earliestMeeting = new Date(Math.min(...meetingDates));
    const latestMeeting = new Date(Math.max(...meetingDates));

    // Extend window by 30 days on each end to catch any manual edits
    timeMin = new Date(earliestMeeting);
    timeMin.setDate(timeMin.getDate() - 30);
    timeMax = new Date(latestMeeting);
    timeMax.setDate(timeMax.getDate() + 30);

    console.log(`🔍 Fetching existing events (${timeMin.toLocaleDateString()} to ${timeMax.toLocaleDateString()})...`);
  } else {
    console.log('🔍 Fetching existing events in default window (30 days ago to 6 months ahead)...');
  }

  const existingEvents = await getExistingEvents(auth, targetCalendarId, timeMin?.toISOString(), timeMax?.toISOString());
  console.log(`   Found ${existingEvents.length} existing events`);

  console.log('\n📤 Syncing meetings to calendar...');
  let created = 0;
  let updated = 0;
  let deleted = 0;
  let unchanged = 0;

  // Track which existing events we've matched
  const matchedEventIds = new Set();

  // Process each scraped meeting
  for (const meeting of meetings) {
    const existingEvent = findMatchingEvent(meeting, existingEvents);

    if (existingEvent) {
      matchedEventIds.add(existingEvent.id);

      if (needsUpdate(meeting, existingEvent)) {
        try {
          await updateEvent(auth, targetCalendarId, existingEvent.id, meeting);
          updated++;
          console.log(`  🔄 Updated: ${meeting.summary}`);
        } catch (error) {
          console.error(`  ❌ Failed to update: ${meeting.summary}`);
        }
      } else {
        unchanged++;
        console.log(`  ✓ Unchanged: ${meeting.summary}`);
      }
    } else {
      try {
        await createEvent(auth, targetCalendarId, meeting);
        created++;
        console.log(`  ✅ Created: ${meeting.summary}`);
      } catch (error) {
        console.error(`  ❌ Failed to create: ${meeting.summary}`);
      }
    }
  }

  // Delete orphaned events (in calendar but not in scrape)
  console.log('\n🧹 Cleaning up orphaned events...');
  for (const existingEvent of existingEvents) {
    if (!matchedEventIds.has(existingEvent.id)) {
      try {
        await deleteEvent(auth, targetCalendarId, existingEvent.id);
        deleted++;
        console.log(`  🗑️  Deleted: ${existingEvent.summary}`);
      } catch (error) {
        console.error(`  ❌ Failed to delete: ${existingEvent.summary}`);
      }
    }
  }

  console.log(`\n✨ Sync complete!`);
  console.log(`   Created: ${created}`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Deleted: ${deleted}`);
  console.log(`   Unchanged: ${unchanged}`);
  console.log(`   Total processed: ${meetings.length}`);
  console.log(`\n🔗 View calendar: https://calendar.google.com/calendar/r?cid=${encodeURIComponent(targetCalendarId)}`);

  return {
    calendarId: targetCalendarId,
    created,
    updated,
    deleted,
    unchanged,
    total: meetings.length,
  };
}
