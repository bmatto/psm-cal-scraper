import puppeteer from 'puppeteer';
import { fromZonedTime } from 'date-fns-tz';

const CALENDAR_URL = 'https://www.portsmouthnh.gov/city-municipal-meetings-calendar';
const PORTSMOUTH_TZ = 'America/New_York';

/**
 * Scrapes the Portsmouth municipal meetings calendar
 * @returns {Promise<Array>} Array of meeting objects
 */
export async function scrapeMeetings() {
  console.log('🚀 Starting browser...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();

    console.log('📄 Loading calendar page...');
    await page.goto(CALENDAR_URL, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    // Wait for events container to load
    await page.waitForSelector('.view-events', { timeout: 10000 });

    // Click "Load More" buttons to get all events
    console.log('🔄 Loading all events...');
    let loadMoreExists = true;
    let clickCount = 0;

    while (loadMoreExists && clickCount < 20) {
      try {
        const loadMoreButton = await page.$('.pager a[rel="next"]');

        if (loadMoreButton) {
          await loadMoreButton.click();
          // Wait for new content to load
          await new Promise(resolve => setTimeout(resolve, 2000));
          clickCount++;
          console.log(`  Loaded page ${clickCount}...`);
        } else {
          loadMoreExists = false;
        }
      } catch (error) {
        loadMoreExists = false;
      }
    }

    console.log('📊 Extracting meeting data...');

    // Extract all meeting data
    const meetings = await page.evaluate(() => {
      const results = [];

      // Find the rows container
      const rowsContainer = document.querySelector('.rows');
      if (!rowsContainer) {
        console.error('rows container not found');
        return results;
      }

      // Get all children (mix of h2 date headers and article events)
      const children = Array.from(rowsContainer.children);
      let currentDate = null;

      children.forEach((child) => {
        try {
          // Check if this is a date header
          if (child.tagName === 'H2') {
            currentDate = child.textContent.trim();
            return;
          }

          // Check if this is an event article
          if (child.tagName === 'ARTICLE' && child.classList.contains('event')) {
            // Extract title
            const titleElement = child.querySelector('h3 a');
            const title = titleElement?.textContent?.trim();
            const detailsUrl = titleElement?.href;

            // Extract time
            const timeElement = child.querySelector('.time');
            const time = timeElement?.textContent?.trim();

            // Extract location
            const locationElement = child.querySelector('.field--name-field-location');
            const location = locationElement?.textContent?.trim();

            // Extract board/department badge
            const badgeElement = child.querySelector('.abbrev-badge');
            const board = badgeElement?.textContent?.trim();

            // Extract iCal link
            const icalLink = child.querySelector('a.add[href^="data:text/calendar"]');
            const icalData = icalLink?.getAttribute('href');

            if (title && currentDate) {
              results.push({
                title,
                date: currentDate,
                time,
                location,
                board,
                detailsUrl,
                icalData,
                scrapedAt: new Date().toISOString()
              });
            }
          }
        } catch (error) {
          console.error('Error parsing item:', error);
        }
      });

      return results;
    });

    console.log(`✅ Scraped ${meetings.length} meetings`);

    return meetings;
  } catch (error) {
    console.error('❌ Scraping failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

/**
 * Parse the scraped meeting data into a standardized format for Google Calendar
 * @param {Object} meeting - Raw meeting data
 * @returns {Object} Formatted meeting data
 */
export function formatMeeting(meeting) {
  // Parse date string - "January 15, 2026"
  const dateObj = new Date(meeting.date + ' 00:00:00');
  let hours = 9; // Default to 9 AM
  let minutes = 0;

  // Parse time if available
  if (meeting.time) {
    const timeStr = meeting.time;
    const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)/i);

    if (match) {
      hours = parseInt(match[1]);
      minutes = parseInt(match[2]);
      const meridiem = match[3].toUpperCase();

      if (meridiem === 'PM' && hours !== 12) hours += 12;
      if (meridiem === 'AM' && hours === 12) hours = 0;
    }
  }

  // Create date in Portsmouth timezone (America/New_York)
  // This ensures that 7:00 PM means 7:00 PM EST/EDT, regardless of where the code runs
  const year = dateObj.getFullYear();
  const month = dateObj.getMonth();
  const day = dateObj.getDate();

  const localDate = new Date(year, month, day, hours, minutes, 0, 0);
  const startDateTime = fromZonedTime(localDate, PORTSMOUTH_TZ);

  // Assume 2 hour duration
  const endDateTime = new Date(startDateTime.getTime() + 2 * 60 * 60 * 1000);

  // Create description with additional details
  let description = `Portsmouth Municipal Meeting\n\n`;
  if (meeting.board) {
    description += `Board/Committee: ${meeting.board}\n`;
  }
  if (meeting.detailsUrl) {
    description += `\nMore information: ${meeting.detailsUrl}`;
  }
  description += `\n\nAutomatically scraped from: ${CALENDAR_URL}`;

  return {
    summary: meeting.title,
    location: meeting.location || 'Portsmouth, NH',
    description: description.trim(),
    start: {
      dateTime: startDateTime.toISOString(),
      timeZone: 'America/New_York',
    },
    end: {
      dateTime: endDateTime.toISOString(),
      timeZone: 'America/New_York',
    },
    source: {
      title: 'Portsmouth Municipal Calendar',
      url: meeting.detailsUrl || CALENDAR_URL,
    },
    // Store original data for deduplication
    extendedProperties: {
      private: {
        sourceUrl: CALENDAR_URL,
        detailsUrl: meeting.detailsUrl || '',
        scrapedAt: meeting.scrapedAt,
        originalDate: meeting.date,
      }
    }
  };
}

// If running directly, test the scraper
if (import.meta.url === `file://${process.argv[1]}`) {
  scrapeMeetings()
    .then(meetings => {
      console.log('\n📋 Sample meetings:');
      meetings.slice(0, 5).forEach(meeting => {
        console.log(`\n  📅 ${meeting.title}`);
        console.log(`     Date: ${meeting.date}`);
        console.log(`     Time: ${meeting.time || 'Not specified'}`);
        console.log(`     Location: ${meeting.location || 'Not specified'}`);
        console.log(`     Board: ${meeting.board || 'Not specified'}`);
      });

      console.log(`\n✨ Total: ${meetings.length} meetings found`);
    })
    .catch(error => {
      console.error('Failed:', error);
      process.exit(1);
    });
}
