# PuzzleRiddler — Multi-Game Platform + Super-Admin Panel

## Context

The repo is a **stock Create-Next-App** (Next.js `16.2.12`, React `19.2.4`, TS strict, Tailwind v4) — a single "Initial commit," no game code yet. The gameplay lives in a **standalone `emojiguess.html`** (the "Guessemojiddle" game: ~266 puzzles across **13 categories**, a full scoring/timer/answer-matching engine, host + solo modes, custom-pack importer) that the user has now supplied. Nothing in it is wired into the Next app, and all puzzle data is hardcoded in the file's `PUZZLES` object.

**Goal:** turn this into a **multi-game platform** where puzzle content lives in Postgres, is edited through a password-protected admin UI, is served through a 24h cache so the frontend never hits the DB on the hot path, and both games run as first-class Next.js routes:

- **Home** — a "choose a game" grid (two games now, built to add more).
- **Game 1 — Guessemojiddle** — port the existing HTML into React; move all puzzle data to the DB.
- **Game 2 — Dingbats / Rebus** — build from scratch, mirroring the emoji game's two modes (Host a Room + Solo Practice) and **reusing its engine**.
- **Super-admin panel** — CRUD puzzles & categories for both games, configure cache TTL, view basic analytics.

### Verified against the actual source (`emojiguess.html`)
- **13 categories** (`bolly, holly, jargon, people, places, food, idioms, brands, cricket, nineties, shows, festivals, songs`), ~266 puzzles. Data shape `{e, a[], d(1|2|3), h}` → maps cleanly to DB `content.emoji / answers / difficulty / note`.
- **Engine** exactly as named below: `graphemes/emo` (`Intl.Segmenter`), `norm/core/NOISE/lev/check`, `shuffle/buildDeck`, `POINTS={1:10,2:20,3:30}`, `DECAY=[100,70,45]`, `LIVES=3`, `ROUND=10`, `LETTER_COST=15`, `CLUE_COST=25`, `STREAK_BONUS=10`.
- Twemoji via CDN `<script>` (`twemoji@14.0.2`), WebAudio `beep`, `data-theme` on `documentElement`, localStorage keys (`emojiddle_theme/sound/best/packs/themeTouched`), TSV/pipe/comma `parsePack`, host keyboard (`1–6`/`R`/`Space`/`T`/`Esc`), and a **projector-friendly auto-switch to light theme on first host** (`emojiddle_themeTouched` flag). All preserved in the port.

### Decisions locked in (from user)
- **Stack**: Vercel + **Neon** (serverless Postgres) + **Prisma**.
- **Admin auth**: single admin password (env) + httpOnly signed session cookie, guarded in `proxy.ts`.
- **Dingbats**: mirrors emoji game — Host a Room **and** Solo Practice.
- **Analytics**: basic self-hosted counts (visits, plays/game, solves, reveals).

### Assumptions (sensible defaults — flag if wrong)
- The old localStorage **custom-packs** feature is dropped; its TSV parser is repurposed as an admin **bulk-import**. Content is now server-side/admin-authored.
- Game sessions/scores stay **ephemeral client state** (personal-best localStorage kept per-game; no persistent leaderboard).
- Games are **single client-component SPAs** (screen state, not nested routes) — no deep-linking to individual puzzles.
- `DailyStat.day` pinned to **UTC**; counts include bots/prefetch (fine for "basic").

---

## Next.js 16 rules this plan obeys (verified against docs + web)
- `params` / `searchParams` / `cookies()` / `headers()` are **async** — always `await`.
- `middleware.ts` → **`proxy.ts`** (nodejs runtime; export `proxy` fn + `config.matcher`). **No cache-invalidation calls inside it.**
- `fetch` is **not** cached by default.
- Enable **Cache Components** (`cacheComponents: true` in `next.config.ts`) → use `'use cache'` + `cacheLife({stale,revalidate,expire})` + `cacheTag('...')` in helper fns (never inside a Route Handler body). This **removes** `export const revalidate/dynamic/fetchCache` segment config — don't use it.
- On-demand invalidation: **`updateTag('tag')`** (Server Actions only; immediate read-your-own-writes) and **`revalidateTag('tag', 'max')`** (Server Actions + Route Handlers; **2nd arg required in v16** — never the 1-arg form).
- Mutations via **Server Actions** (`'use server'`); pending UI via `useActionState`.

---

## Data & cache flow

```mermaid
flowchart LR
  subgraph Content pipeline (one-time + live)
    HTML[emojiguess.html PUZZLES] -->|one-time parse, Phase 1| SEED[prisma/data/emoji.seed.json]
    DING[hand-authored dingbats.seed.json] --> SEEDR[seed.ts upserts]
    SEED --> SEEDR --> PG[(Neon Postgres)]
  end
  PG --> R["lib/data/*  'use cache'\ncacheTag(game:slug) + cacheLife(ttl)"]
  R --> SP[server page games/emoji/page.tsx]
  SP -->|serializable payload| CG[EmojiGame / DingbatsGame  'use client']
  CG -->|beacon| TR[/api/track/] --> DS[(DailyStat upsert+1)]
  DS --> DASH[admin dashboard]

  subgraph Admin write path
    AF[admin form] -->|Server Action| ACT[re-verify cookie → Zod → Prisma write]
    ACT -->|updateTag(game:slug)| R
  end
```

The cache key/lifetime trick: the game page does `const ttl = await getCacheTtl(); const payload = await getGamePayload(slug, ttl);`. `ttl` is a serializable number → part of the cache key **and** drives `cacheLife.revalidate` (the documented "dynamic cache lifetime from data" pattern). 24h auto-refresh **plus** instant admin edits via `updateTag`.

---

## Architecture

### 0. Repo prep
- Commit the supplied `emojiguess.html` to **`reference/emojiguess.html`** so the port + seed extraction have a committed source of truth.
- New deps: `prisma` (dev), `@prisma/client`, `@neondatabase/serverless` + `@prisma/adapter-neon`, `zod`, `@twemoji/api`.
- `next.config.ts`: `cacheComponents: true`. `.env.local` scaffold. `lib/db.ts` Prisma singleton (`globalThis.prisma` hot-reload guard, Neon adapter).

### 1. Prisma schema — `prisma/schema.prisma`
Hybrid: shared fields as columns, game-specific visual data as JSON.
- **Game** `{ id, slug @unique ("emoji"|"dingbats"), name, kind (enum EMOJI|DINGBATS), isActive, sortOrder }`
- **Category** `{ id, gameId, slug, name, icon, sortOrder, isActive, @@unique([gameId, slug]) }` — namespaced per game.
- **Puzzle** `{ id, gameId, categoryId, answers String[], note, difficulty Int(1|2|3), content Json, isActive, sortOrder, @@index([gameId, categoryId]) }`
  - Emoji `content`: `{ "emoji": "🪙🔫🐴" }` — **store the raw string** (no spaces); the client applies `emo()` grapheme-spacing at render, matching the source.
  - Dingbats `content`: `{ "layout": [{text, transform, position, repeat, size?}], "style": { arrangement: "stack"|"row"|"grid"|"free" } }`, `transform ∈ none|reverse|rotate90|rotate180|vertical|mirror`. **Zod-validated on every write** — the JSON's only safety net.
- **AdminSettings** `{ id @default(1), cacheTtlSeconds @default(86400), updatedAt }` — single-row, upsert on `id=1`.
- **DailyStat** `{ day @db.Date, metric ("visit"|"play"|"solve"|"reveal"), gameSlug @default(""), count, @@id([day, metric, gameSlug]) }` — pre-aggregated; each event is one `upsert … update:{count:{increment:1}}`. O(1) writes, bounded growth.

Migrations: `prisma migrate dev` locally; `prisma migrate deploy` in Vercel build.

### 2. Cached data layer — `lib/data/`
Plain async helpers, each `'use cache'` + `cacheTag` + `cacheLife`.
- `settings.ts#getCacheTtl()` → `cacheTag('settings')`, `cacheLife('max')`, returns `cacheTtlSeconds`.
- `puzzles.ts#getGamePayload(gameSlug, ttlSeconds)` → `cacheTag('game:'+gameSlug)`, `cacheLife({ revalidate: ttlSeconds, expire: ttlSeconds*2, stale: 300 })`, returns game + active categories + active puzzles shaped for the client.
- `analytics.ts#getDashboard()` — `cacheLife('minutes')` (or dynamic behind Suspense) so numbers feel live.
- Tags: `settings`, `game:emoji`, `game:dingbats`.

### 3. Seed — `prisma/seed.ts` + `prisma/data/*.json`
- One-time throwaway parse of `reference/emojiguess.html`'s `PUZZLES`/`BUILTIN_CATEGORIES` → committed `prisma/data/emoji.seed.json` (deterministic; never re-parse HTML at seed time). Store `e` raw (unspaced).
- Hand-author `prisma/data/dingbats.seed.json` (~15–20 starter dingbats using the layout schema) so game 2 is playable day one.
- `seed.ts` upserts Games, Categories, Puzzles (`e→content.emoji`, `a→answers`, `d→difficulty`, `h→note`) and `AdminSettings{id:1}`. Idempotent.

### 4. Routes & components
```
app/
  layout.tsx            # next/font Fraunces + Space_Grotesk (REPLACE Geist); theme no-flash inline script; <TrackVisit/>
  globals.css           # REPLACE starter with ported game CSS-variable theme (:root + html[data-theme])
  page.tsx              # HOME (server) — game grid from Game table
  games/emoji/page.tsx      # server: getCacheTtl → getGamePayload → <EmojiGame payload/>
  games/dingbats/page.tsx   # server: same → <DingbatsGame payload/>
  admin/
    login/page.tsx          # login form → auth server action
    layout.tsx              # admin shell (guarded by proxy.ts)
    page.tsx                # dashboard (analytics)
    games/[gameSlug]/categories/page.tsx
    games/[gameSlug]/puzzles/page.tsx     # list + new/edit + bulk import
    settings/page.tsx       # cache TTL form
  api/track/route.ts        # analytics POST (sendBeacon target)
components/
  home/GameCard.tsx
  games/emoji/EmojiGame.tsx        # 'use client' — whole interactive app
  games/dingbats/DingbatsGame.tsx  # 'use client'
  games/shared/*                   # Timer, TeamScoreboard, GuessInput, Verdict, Twemoji, TrackVisit
  admin/*                          # forms/tables (client where interactive)
lib/
  db.ts
  data/{settings,puzzles,analytics}.ts     # cached readers
  actions/{puzzles,categories,settings,auth}.ts   # 'use server'
  auth/session.ts                          # Web Crypto HMAC sign/verify cookie
  games/engine/{match,deck,score,grapheme}.ts     # framework-agnostic pure TS
  games/{emoji,dingbats}/types.ts
  games/dingbats/render.tsx                # layout renderer
proxy.ts
prisma/{schema.prisma,seed.ts,data/*.json}
reference/emojiguess.html
```
Server components (home, game pages, admin) do the cached DB read and pass serializable `payload`. Client components (each game; admin mutating forms) get data as props — **no hardcoded `PUZZLES`**.

### 5. Porting the emoji game → React 19 + Tailwind
- **(a) Pure TS engine** `lib/games/engine/` — copied **verbatim** from the source, unit-testable, shared by both games: `match.ts` (`norm/core/NOISE/lev/check`), `deck.ts` (`shuffle/buildDeck` over the server payload array), `grapheme.ts` (`graphemes` via `Intl.Segmenter`, `emo`), `score.ts` (`POINTS/DECAY/LIVES/ROUND/costs/pointsNow`). `check()`'s short-answer rules (no typo forgiveness ≤4 chars; "close/warm" only on longer answers) are subtle — **keep byte-for-byte**.
- **(b) Browser side-effects** `components/games/shared/`: `useAudio` (WebAudio `beep`, init on first gesture), `<Twemoji>`/`useTwemoji` (npm `@twemoji/api`, `twemoji.parse` in `useEffect` — **drop the CDN `<script>`**), `useTheme` (toggles `document.documentElement.dataset.theme`, persists to localStorage; no-flash inline script in `layout.tsx`; preserve the first-host light-theme switch via `themeTouched`).
- **(c) React state**: `show(id)` screen-switcher → `screen` state; DOM-mutating render fns (`renderTeams/loadHost/drawBlanks`) → JSX from state (`teams[]/deck[]/idx/revealed/scores`); `setInterval` → `useEffect` with cleanup; `keydown` listeners → `useEffect` window listeners; **drop `escapeHtml`** (React escapes).
- **Fonts**: the source loads Fraunces + Space Grotesk from Google Fonts CDN → move to `next/font/google` in `layout.tsx`, replacing the stock Geist setup.
- **CSS**: port the source `<style>` block **verbatim into `globals.css` first** (fastest faithful port; the custom `:root`/`html[data-theme]` variables coexist with Tailwind v4). Tailwind-ify later if desired.

### 6. Dingbats game (from scratch)
- `lib/games/dingbats/types.ts` — discriminated `DingbatsContent` + Zod schema.
- `lib/games/dingbats/render.tsx` — renders `layout` honoring `transform`/`position`/`arrangement` (CSS transforms for reverse/rotate/vertical/mirror; flex/grid for stack/row/grid).
- `DingbatsGame.tsx` — same two modes as emoji, **reusing** `engine/{match,deck,score}` + shared Timer/Scoreboard/GuessInput. Only the puzzle **renderer** differs.

### 7. Admin auth
- Env: `DATABASE_URL` (Neon pooled), `DIRECT_URL` (Neon direct, migrations), `ADMIN_PASSWORD_HASH` (hash preferred), `ADMIN_SESSION_SECRET` (HMAC key).
- `lib/auth/session.ts` — Web Crypto HMAC sign/verify token (payload+expiry); stateless, no DB session table (works inside `proxy.ts` with no DB call).
- `lib/actions/auth.ts` (`'use server'`) — `login` (constant-time compare, sets httpOnly/Secure/SameSite=Lax `admin_session` cookie via `await cookies()`), `logout`. `useActionState` on the form.
- **`proxy.ts`** (matcher `['/admin/:path*']`): allow `/admin/login`, else verify cookie or redirect. Auth only — no cache calls. Server Actions **re-verify** the cookie (defense in depth).

### 8. Analytics
- **Write**: `POST /api/track` validates `metric`+`gameSlug`, does the single `DailyStat` upsert-increment. Client fires **fire-and-forget** via `navigator.sendBeacon` (`fetch` `keepalive` fallback). Visit = once/session (`sessionStorage` flag in `<TrackVisit/>`); play = on game start; solve/reveal = **batched**, flushed at round end in one beacon.
- **Read**: `getDashboard()` — `groupBy` over `DailyStat` (totals, last-30-day visits, plays/game, solved vs revealed). Rendered on `app/admin/page.tsx` (number tiles + per-day list; charts later via the dataviz skill if wanted).

### 9. Admin mutations — `lib/actions/*.ts`
Each: (1) re-verify admin cookie, (2) Zod-validate (puzzle `content` against the game-kind schema), (3) Prisma write, (4) invalidate cache, (5) return `useActionState` result.
- `puzzles.ts`: create/update/delete + `bulkImportPuzzles` (reuse the source's TSV parser) → `updateTag('game:'+slug)`.
- `categories.ts`: same → `updateTag('game:'+slug)`.
- `settings.ts`: `updateCacheTtl` upserts AdminSettings → `updateTag('settings')` + `revalidateTag('game:emoji','max')` + `revalidateTag('game:dingbats','max')` (TTL is baked into those entries).

---

## Build phases
0. **Infra**: commit `reference/emojiguess.html` + this `PLAN.md`. Add deps; `npm install`; set `cacheComponents:true`; `.env.local`; `lib/db.ts`. Verify `next build` + `prisma validate`.
1. **Schema + seed**: `schema.prisma`, `migrate dev`, extract `emoji.seed.json`, author `dingbats.seed.json`, `seed.ts`, `db seed`. Verify counts in Prisma Studio (**13 categories, ~266 emoji puzzles**).
2. **Data layer**: cached readers + tags. Verify a server page shows counts; edit+invalidate reflects.
3. **Emoji port**: engine modules (+ `check()` sanity assertions) → `EmojiGame.tsx` → CSS/theme/fonts → `app/games/emoji/page.tsx`. Verify Host + Solo end-to-end (twemoji, timers, sound, theme, matching parity).
4. **Home**: game grid from `Game` table. Verify routing.
5. **Dingbats**: types + `render.tsx` + `DingbatsGame.tsx`. Verify seed dingbats render (reverse/stack/vertical) and are solvable.
6. **Admin auth + proxy**: session lib, login action, `proxy.ts`. Verify `/admin` redirects logged-out, passes logged-in; cookie httpOnly/Secure.
7. **Admin CRUD + settings**: list/create/edit/delete both games (namespaced), Zod-validated content, TTL form, invalidation. Verify new puzzle appears live immediately; TTL change observed.
8. **Analytics**: `track` route + beacons + dashboard. Verify `DailyStat` increments and dashboard reflects.
9. **Deploy**: Neon env vars in Vercel; `migrate deploy` + `db seed` in build; smoke test.

## Critical files
- `prisma/schema.prisma` · `prisma/seed.ts`
- `lib/data/{puzzles,settings,analytics}.ts` · `lib/games/engine/match.ts`
- `components/games/emoji/EmojiGame.tsx` · `components/games/dingbats/DingbatsGame.tsx` · `lib/games/dingbats/render.tsx`
- `lib/actions/{puzzles,settings,auth}.ts` · `proxy.ts` · `app/api/track/route.ts`
- Source of truth for the port: `reference/emojiguess.html`

## Verification
- **Engine**: assertion checks on `check()` for exact/close/typo/short-alias cases (parity with HTML — e.g. "GOT" must not fuzzy-match "Goa").
- **Games**: drive Host + Solo for both games in the browser (`run`/`verify` skills) — render, timers, sound, theme, scoring, answer matching.
- **Cache**: edit a puzzle in admin → confirm it appears immediately in the live game (`updateTag`); change TTL → confirm new lifetime.
- **Auth**: `/admin` redirects when logged out, passes when logged in; verify cookie flags.
- **Analytics**: play a round → confirm `DailyStat` rows increment → dashboard reflects.
- **Build**: `next build` clean; `prisma migrate deploy` + seed succeed on deploy.

## Risks
- Cache Components is all-or-nothing and removes segment config — enable in Phase 0, never reach for `export const revalidate`.
- `content` JSON safety rests entirely on **Zod-on-write** — non-negotiable.
- Twemoji CDN `<script>` won't survive the port — use the npm package + `useEffect`; consider self-hosting SVGs in `/public`.
- AudioContext autoplay policy — init on user gesture or the game is silent.
- `revalidateTag`/`updateTag` forbidden in `proxy.ts`; never the single-arg `revalidateTag`.
- No login rate-limit / bot filtering in "basic" scope — acceptable, noted.
