import { scrapeMeetings, formatMeeting } from './scraper.js';

async function testScraper() {
  console.log('🧪 Testing Portsmouth calendar scraper...\n');

  try {
    const meetings = await scrapeMeetings();

    console.log(`\n📊 Results: ${meetings.length} meetings scraped\n`);

    if (meetings.length > 0) {
      console.log('━'.repeat(60));
      console.log('Sample Meetings (first 5):');
      console.log('━'.repeat(60));

      meetings.slice(0, 5).forEach((meeting, index) => {
        console.log(`\n${index + 1}. ${meeting.title}`);
        console.log(`   📅 Date: ${meeting.date}`);
        console.log(`   ⏰ Time: ${meeting.time || 'Not specified'}`);
        console.log(`   📍 Location: ${meeting.location || 'Not specified'}`);
        if (meeting.board) {
          console.log(`   🏛️  Board: ${meeting.board}`);
        }
        if (meeting.detailsUrl) {
          console.log(`   🔗 Details: ${meeting.detailsUrl}`);
        }
      });

      console.log('\n━'.repeat(60));
      console.log('Formatted for Google Calendar (first meeting):');
      console.log('━'.repeat(60));

      const formatted = formatMeeting(meetings[0]);
      console.log(JSON.stringify(formatted, null, 2));

      console.log('\n✅ Scraper test passed!');
      console.log(`   Successfully scraped ${meetings.length} meetings`);
      console.log('\n💡 Next steps:');
      console.log('   1. Set up Google Calendar API credentials (see README.md)');
      console.log('   2. Run: npm run sync');

    } else {
      console.log('⚠️  No meetings found. This might indicate:');
      console.log('   - The website structure has changed');
      console.log('   - There are no upcoming meetings');
      console.log('   - A network or loading issue occurred');
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  }
}

testScraper();
