# AniStream - Anime Streaming Platform

A modern anime streaming web application built with Next.js 16, TypeScript, Tailwind CSS v4, Prisma, and SQLite.

## Features

- **Home** — Hero section, trending carousel (10 titles, 5 visible, auto-advance every 10s), content rows
- **Search & Browse** — Full-text search with 8+ combinable filters, URL-synced state, pagination
- **Random Picker** — Animated 3D die, pre-roll constraints (genre, score, format, status)
- **Watchlist** — Auth-gated, 5 status tabs, episode progress, grid/list view, bulk actions
- **Schedule** — Daily airing schedule with live countdowns, timezone-aware, weekday switcher
- **Authentication** — Email/password registration, login, session cookies
- **Theme** — Dark mode by default, light mode toggle, persisted preference
- **Accessibility** — WCAG 2.1 AA: keyboard nav, focus states, ARIA labels, reduced-motion support
- **Responsive** — Mobile-first, works at 375px, 768px, 1280px, 1920px

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Database | Prisma + SQLite |
| Auth | Cookie-based sessions with bcryptjs |
| Icons | Lucide React |
| Utilities | clsx, date-fns |

## Getting Started

### Prerequisites

- Node.js 20.9+
- npm

### Setup

```bash
# Clone the repository
git clone <repo-url>
cd anime-stream

# Install dependencies
npm install

# Initialize database
npx prisma generate
npx prisma db push

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Environment Variables

Create a `.env` file (already included with defaults):

```env
DATABASE_URL="file:./dev.db"
AUTH_SECRET="dev-secret-change-in-production"
NEXTAUTH_URL="http://localhost:3000"
```

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── anime/route.ts          # Search/filter anime
│   │   ├── auth/
│   │   │   ├── login/route.ts      # Login endpoint
│   │   │   ├── logout/route.ts     # Logout endpoint
│   │   │   ├── me/route.ts         # Current user endpoint
│   │   │   └── register/route.ts   # Registration endpoint
│   │   └── watchlist/route.ts      # Watchlist CRUD
│   ├── auth/
│   │   ├── login/page.tsx          # Login page
│   │   └── register/page.tsx       # Registration page
│   ├── random/page.tsx             # Random anime picker
│   ├── schedule/page.tsx           # Airing schedule
│   ├── search/page.tsx             # Search & browse
│   ├── watchlist/page.tsx          # Personal watchlist
│   ├── globals.css                 # Design system & tokens
│   ├── layout.tsx                  # Root layout
│   └── page.tsx                    # Home page
├── components/
│   ├── anime/
│   │   ├── AnimeCard.tsx           # Reusable anime card
│   │   ├── Carousel.tsx            # Infinite auto-advancing carousel
│   │   ├── Die.tsx                 # 3D animated die
│   │   ├── EmptyState.tsx          # Empty state component
│   │   ├── FilterPanel.tsx         # Search filter panel
│   │   ├── HomeClient.tsx          # Home page client wrapper
│   │   └── ScheduleRow.tsx         # Schedule entry row
│   ├── layout/
│   │   ├── Header.tsx              # Navigation header
│   │   └── ThemeProvider.tsx       # Theme context provider
│   └── ui/
│       ├── Badge.tsx               # Badge/chip component
│       ├── Button.tsx              # Button component
│       ├── Input.tsx               # Input component
│       ├── Modal.tsx               # Modal dialog
│       └── Skeleton.tsx            # Loading skeleton
├── lib/
│   ├── anime-data.ts               # 78 anime mock database
│   ├── auth.ts                     # Authentication helpers
│   ├── prisma.ts                   # Prisma client singleton
│   └── utils.ts                    # Utility functions
└── types/
    ├── bcryptjs.d.ts               # Type declarations
    └── index.ts                    # Shared types
```

## Database Schema

```prisma
model User {
  id           String    @id @default(cuid())
  email        String    @unique
  name         String
  passwordHash String
  avatar       String?
  timezone     String    @default("UTC")
  audioPref    String    @default("sub")
  theme        String    @default("dark")
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  watchlist    Watchlist[]
}

model Watchlist {
  id        String   @id @default(cuid())
  userId    String
  animeId   Int
  status    String   @default("plan_to_watch")
  progress  Int      @default(0)
  score     Int?
  addedAt   DateTime @default(now())
  updatedAt DateTime @updatedAt
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@unique([userId, animeId])
}
```

## Scripts

```bash
npm run dev          # Start development server
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Run ESLint
```

## Content Licensing

This application uses mock anime data for demonstration purposes. In production, the operator should ensure all streamed or linked content is properly licensed for distribution. Where licensing is not in place, the player should be stubbed or linked to official providers.

## License

MIT
