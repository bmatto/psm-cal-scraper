# Portsmouth Calendar Page Structure

Documentation of the actual HTML structure found on the Portsmouth NH municipal meetings calendar page.

## Page URL
`https://www.portsmouthnh.gov/city-municipal-meetings-calendar`

## Overall Structure

```
.view-events (or .events-list-page-view)
├── .view-filters (filter dropdown)
├── .rows (events container) ⭐
│   ├── <h2>January 15, 2026</h2> (date header)
│   ├── <article class="event listing clearfix">...</article>
│   ├── <article class="event listing clearfix">...</article>
│   ├── <h2>January 20, 2026</h2> (next date header)
│   ├── <article class="event listing clearfix">...</article>
│   └── ...
└── .pager (pagination with "Load More")
```

## Event Article Structure

Each event is an `<article>` element with the following structure:

```html
<article class="event listing clearfix">
  <div class="content">
    <!-- Department badge -->
    <a href="..." class="image">
      <span class="abbrev-badge medium bg-department-theme-default-blue">
        COP
      </span>
    </a>

    <div class="wrapper">
      <div class="row">
        <!-- Left column: Title, attachments, iCal link -->
        <div class="col-sm-7 left-col">
          <h3>
            <a href="/city/events/...">
              <span>Event Title</span>
            </a>
          </h3>

          <div class="attachments">
            <span>Attachments:</span>
            <div class="field field--name-field-attachments">
              <a href="..." target="_blank">Agenda</a>
            </div>
          </div>

          <a class="add" href="data:text/calendar;...">
            Add to Your Calendar
          </a>
        </div>

        <!-- Right column: Time and location -->
        <div class="col-sm-4 col-sm-offset-1 right-col">
          <span class="time">10:00 AM</span>
          <div class="field field--name-field-location">
            Location details...
          </div>
        </div>
      </div>
    </div>
  </div>
</article>
```

## Key Selectors

| Data | Selector | Notes |
|------|----------|-------|
| Main container | `.view-events` or `.events-list-page-view` | Top-level view container |
| Events wrapper | `.rows` | Direct container for events and date headers |
| Date headers | `h2` | Children of `.rows`, interleaved with events |
| Event articles | `article.event.listing` | Each meeting |
| Event title | `h3 a` | Inside `.left-col` |
| Event link | `h3 a[href]` | Link to event details page |
| Time | `.time` | Inside `.right-col` |
| Location | `.field--name-field-location` | Inside `.right-col` |
| Department badge | `.abbrev-badge` | Shows COP, CC, SD, etc. |
| iCal data | `a.add[href^="data:text/calendar"]` | Download link for iCal |
| Load More button | `.pager a[rel="next"]` | Pagination link |

## Date Format

Date headers appear as `<h2>` elements with text like:
- "January 15, 2026"
- "February 3, 2026"

These can be parsed directly by JavaScript's `new Date()` constructor.

## Time Format

Times appear in 12-hour format with AM/PM:
- "10:00 AM"
- "7:00 PM"

Use regex: `/(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)/i`

## Pagination

The "Load More" button loads additional events via AJAX. Each click loads approximately 10 more events. The scraper clicks this button up to 20 times to load all available events.

## Important Notes

1. **NOT `.views-row`**: The original scraper used `.views-row` which doesn't exist on this page
2. **NOT `.view-content`**: While common in Drupal Views, this site uses `.rows` instead
3. **Date grouping**: Dates are `h2` siblings of event articles, not parent containers
4. **Board abbreviations**: COP (City of Portsmouth), CC (City Council), SD (School District), CD (Community Development), etc.

## Testing

To verify the structure hasn't changed:

```bash
npm test
```

This will scrape the live site and display sample events. Look for:
- 200+ meetings found
- Dates in "Month Day, Year" format
- Times in "H:MM AM/PM" format
- Valid locations and detail URLs
