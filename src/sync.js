import dotenv from 'dotenv';
import { scrapeMeetings, formatMeeting } from './scraper.js';
import { syncMeetingsToCalendar } from './calendar-sync.js';

dotenv.config();

const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || null;

async function main() {
  try {
    console.log('🏛️  Portsmouth Municipal Meetings Calendar Sync\n');
    console.log('═'.repeat(50));

    // Step 1: Scrape meetings
    console.log('\n1️⃣  Scraping Portsmouth calendar...\n');
    const rawMeetings = await scrapeMeetings();

    if (rawMeetings.length === 0) {
      console.log('⚠️  No meetings found. Exiting.');
      return;
    }

    // Step 2: Format meetings for Google Calendar
    console.log('\n2️⃣  Formatting meeting data...\n');
    const formattedMeetings = rawMeetings.map(formatMeeting);

    console.log(`✅ Formatted ${formattedMeetings.length} meetings`);

    // Step 3: Sync to Google Calendar
    console.log('\n3️⃣  Syncing to Google Calendar...\n');
    const result = await syncMeetingsToCalendar(formattedMeetings, CALENDAR_ID);

    console.log('\n═'.repeat(50));
    console.log('✨ Sync complete!\n');

    // Save calendar ID to .env if it's new
    if (!CALENDAR_ID && result.calendarId) {
      console.log('💡 TIP: Add this to your .env file:');
      console.log(`   GOOGLE_CALENDAR_ID=${result.calendarId}\n`);
    }

  } catch (error) {
    console.error('\n❌ Sync failed:', error.message);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  }
}

main();
