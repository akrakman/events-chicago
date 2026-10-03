# 🗓️ Community Event Aggregator & Calendar Feed

An automated event aggregation calendar that polls monitored community links (pre-configured with **`https://linktr.ee/mpod.streeterville`**) once a day, crawls public **Partiful** and **OneTable** events, and presents upcoming events sorted chronologically by date.

### Features
- 🤖 **Automated Daily Polling**: Background scheduler periodically polls monitored links (once every 24h) and checks for new events.
- 🔍 **Deep Event Extraction**: Discovers event links on Linktree profiles, then automatically uses Playwright (Partiful) and Cheerio to harvest exact dates, hosts, RSVP counts, descriptions, and cover flyers.
- 📅 **Chronological Feed**: Lists all upcoming events sorted by date (earliest first), with relative time indicators ("Today", "In 3 days"), location, and direct RSVP buttons.
- 🗓️ **Google Calendar Integration**: 1-click export of any aggregated event directly to Google Calendar.
- ⚙️ **Monitored Sources Manager**: View, manage, and add new community links (Linktree, Partiful) directly in the UI.

---

## 🏗️ Architecture

```
links/
├── package.json               # Root scripts (dev, build, start)
├── server/
│   ├── prisma/
│   │   └── schema.prisma      # SQLite models (ScrapeJob, ExtractedItem)
│   ├── src/
│   │   ├── index.ts           # Fastify server entry point
│   │   ├── db.ts              # PrismaClient singleton
│   │   ├── types.ts           # Core TypeScript types & interfaces
│   │   ├── scraper/
│   │   │   ├── detector.ts    # URL platform detection (Linktree, Partiful, Social, Generic)
│   │   │   ├── cheerioNextData.ts  # Fast static & Next.js __NEXT_DATA__ extractor
│   │   │   ├── playwrightScraper.ts # Headless Chromium browser scraper
│   │   │   └── index.ts       # Orchestrator with auto fallback strategy
│   │   └── routes/
│   │       ├── scrape.ts      # POST /api/scrape
│   │       ├── jobs.ts        # GET/DELETE /api/jobs, POST /api/jobs/:id/rescrape
│   │       ├── items.ts       # GET/DELETE /api/items, GET /api/stats
│   │       └── samples.ts     # GET /api/samples
│   └── tsconfig.json
└── client/
    ├── index.html
    ├── vite.config.ts         # Vite config with /api proxy to Fastify (:3001)
    ├── tailwind.config.js     # Tailwind CSS setup
    └── src/
        ├── App.tsx            # Main application component
        ├── api.ts             # Typed API client
        └── components/
            ├── Navbar.tsx            # Header with live item counters
            ├── ScraperForm.tsx       # URL input with method picker & presets
            ├── JobStatusBanner.tsx   # Scrape execution stats & duration
            ├── FeedFilters.tsx       # Category tabs, search, and layout toggle
            ├── ItemCard.tsx          # Rich cards for Events, Links & Socials
            ├── HistoryDrawer.tsx     # Past scrapes slide-over drawer
            └── RawPayloadModal.tsx   # JSON viewer for Next.js hydration data
```

---

## 🧪 Standalone Scraper CLI Test Script

Run the standalone CLI test script to test any URL across the three parsers:

```bash
# Test Linktree (__NEXT_DATA__ via Cheerio)
npx tsx scripts/test-scrapers.ts https://linktr.ee/billieeilish

# Test Partiful event (Playwright headless browser)
npx tsx scripts/test-scrapers.ts https://partiful.com

# Test Open Graph & Social fallback (Cheerio)
npx tsx scripts/test-scrapers.ts https://github.com/torvalds

# Run all 3 test suites automatically
npx tsx scripts/test-scrapers.ts --all
```

---

## 🚀 Quick Start

### 1. Run Development Server
From the root directory, start both the backend API and frontend dev server simultaneously:

```bash
npm run dev
```

- **Frontend**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:3001](http://localhost:3001)

### 2. Run Individually

**Backend Server:**
```bash
cd server
npm run dev
```

**Frontend Client:**
```bash
cd client
npm run dev
```

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/scrape` | Scrape a target URL (`{ url, mode: 'auto' \| 'cheerio' \| 'playwright' }`) and store in SQLite |
| `GET` | `/api/jobs` | Retrieve all past scrape jobs with status and item counts |
| `GET` | `/api/jobs/:id` | Fetch specific job details with nested items |
| `POST` | `/api/jobs/:id/rescrape` | Re-run scraping for a previous job URL |
| `DELETE` | `/api/jobs/:id` | Cascade delete a job and its associated items |
| `GET` | `/api/items` | List aggregated items with filters (`itemType`, `platform`, `search`, `limit`, `offset`) |
| `DELETE` | `/api/items/:id` | Delete an extracted item |
| `GET` | `/api/stats` | Aggregator metrics (total jobs, items, events, links, socials) |
| `GET` | `/api/samples` | Curated sample URLs for quick testing in the UI |
| `GET` | `/api/health` | Service health status |

---

## 🗄️ Database Schema

### `ScrapeJob`
- `id`: Unique identifier (CUID)
- `url`: Target URL scraped
- `platform`: `LINKTREE` | `PARTIFUL` | `SOCIAL` | `GENERIC`
- `method`: `CHEERIO_NEXT_DATA` | `CHEERIO_STATIC` | `PLAYWRIGHT`
- `status`: `COMPLETED` | `FAILED` | `RUNNING`
- `durationMs`: Total duration in milliseconds
- `title`, `description`, `author`, `avatarUrl`, `errorMessage`, `rawPayload`
- `items`: Relation to `ExtractedItem[]`

### `ExtractedItem`
- `id`: Unique identifier (CUID)
- `jobId`: Foreign key to `ScrapeJob`
- `title`: Item or event title
- `url`: Destination URL
- `itemType`: `LINK` | `EVENT` | `SOCIAL` | `MEDIA`
- `platform`: Platform tag (`SPOTIFY`, `TWITTER`, `GITHUB`, `PARTIFUL`, etc.)
- `eventDate`, `eventEndDate`, `location`, `hostName`, `rsvpCount` (for events)
- `isPinned`, `metadata` (JSON), `createdAt`
