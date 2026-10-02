# Nekoflix — Anime Streaming Platform

A production-ready anime streaming web application built with Next.js 16, TypeScript, Tailwind CSS v4, Prisma, and PostgreSQL.

## Features

- **Home** — Hero banner with featured anime, content rows (Trending, Popular, Top Rated, Continue Watching)
- **Search & Browse** — Full-text search with URL-synced filters, pagination, and suggestions
- **Anime Detail** — Banner, synopsis, score, genres, studio, characters, recommendations, episode list
- **Watch** — `/watch/[id]/[episode]` route with a custom HLS player
- **Player** — Quality selector, playback speed, subtitles, picture-in-picture, skip intro/outro, keyboard shortcuts, resume progress, next-episode countdown
- **Schedule** — Weekly airing schedule with local-time conversion and live countdowns
- **Watchlist** — 5 status tabs, episode progress, grid/list view, optimistic UI updates
- **Library** — Personal video library with watch history
- **Random Picker** — Redirects to a random anime detail page
- **Authentication** — Email/password registration, login, secure session cookies
- **Themes** — Dark, Light, Midnight, Abyss modes with persisted preference
- **SEO** — Dynamic metadata, sitemap.xml, robots.txt
- **Accessibility** — Semantic HTML, ARIA labels, keyboard navigation, reduced-motion support
- **Responsive** — Mobile-first, works from 360px to 4K

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Database | Prisma + PostgreSQL |
| Auth | Cookie-based sessions with bcryptjs |
| Icons | Lucide React |
| Player | hls.js |
| Tests | Playwright |

## Data Sources

- **AniList GraphQL API** — Primary metadata (titles, scores, genres, synopses, schedule)
- **Jikan (MAL) API** — Fallback metadata
- **AniKoto API** — Streaming sources and episode lists
- **AniSkip API** — Intro/outro timestamps

## Getting Started

### Prerequisites

- Node.js 20.9+
- npm
- PostgreSQL database (local or Vercel Postgres)

### Setup

```bash
# Clone the repository
git clone https://github.com/CupOnTheTable/Nekoflix.git
cd nekoflix

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your DATABASE_URL and AUTH_SECRET

# Initialize database
npx prisma generate
npx prisma db push

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Environment Variables

See `.env.example` for the full template:

```env
DATABASE_URL="postgres://..."
AUTH_SECRET="your-random-secret-here"
NEXTAUTH_URL="https://your-app.vercel.app"
```

## Scripts

```bash
npm run dev              # Start development server
npm run build            # Production build
npm run start            # Start production server
npm run lint             # Run ESLint
npm run test:e2e         # Run Playwright tests
npm run test:e2e:ui      # Run Playwright tests in UI mode
npm run db:push          # Push Prisma schema to database
```

## Deployment

### Vercel + Neon (recommended)

1. Create a Neon project at [neon.tech](https://neon.tech).
2. In Neon, copy both connection strings:
   - **Pooled connection** → use as `DATABASE_URL`
   - **Direct connection** → use as `DIRECT_URL`
3. Connect your GitHub repository to Vercel.
4. In Vercel Dashboard → Settings → Environment Variables, add:
   - `DATABASE_URL` (pooled)
   - `DIRECT_URL` (direct)
   - `AUTH_SECRET` (random string)
   - `NEXTAUTH_URL` (your Vercel domain)
5. Set the build command to:
   ```bash
   prisma generate && prisma migrate deploy && next build
   ```
6. Deploy.

If the migration step times out on Vercel, run migrations locally instead:
```bash
DIRECT_URL="postgresql://..." npm run db:migrate
```

### Render

Use the included `render.yaml` blueprint. Add `DIRECT_URL` as a sync-disabled environment variable in the Render dashboard (required for Prisma migrations on Neon).

## Content Licensing

This application aggregates publicly available anime metadata and resolves streams through third-party providers. The operator is responsible for ensuring all streamed content complies with local licensing laws.

## License

MIT
