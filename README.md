# ⚔️ Tech News Hunter

A daily tech-news aggregator that runs entirely on GitHub Actions and publishes to GitHub Pages —
no server, no database, no API keys. The UI is a **Solo Leveling**-inspired "System window":
every article is a *quest*, ranked **E → S** by a computed power level.

**Live site:** https://saeed-underline.github.io/tech-news-hunter/

---

## How it works

```
┌─ GitHub Actions (cron, 06:17 UTC daily) ──────────────────────────┐
│                                                                    │
│  scripts/collect.mjs      fetch → dedupe → score → rank            │
│         ↓                                                          │
│  public/data/daily/YYYY-MM-DD.json      (full day, committed)      │
│         ↓                                                          │
│  scripts/retention.mjs    age out → condense → enforce byte cap    │
│         ↓                                                          │
│  public/data/archive/YYYY-MM.json + index.json                     │
│         ↓                                                          │
│  git commit ──▶ deploy.yml ──▶ vite build ──▶ GitHub Pages         │
└────────────────────────────────────────────────────────────────────┘
```

The datastore is **plain JSON committed to the repo** and served as static files by the site
itself. That is what makes the whole thing free and backend-less — and it is also why the
retention policy below is load-bearing rather than optional.

## Sources

All public and key-free:

| Source | Method | Why |
| --- | --- | --- |
| Hacker News | Firebase API (Algolia fallback) | Real engagement signal — points and comments |
| TechCrunch | RSS | Startup / funding coverage |
| The Verge | Atom | Consumer tech |
| Ars Technica | RSS | Deep technical reporting |
| WIRED | RSS | Long-form and policy |

A failing source is logged and skipped; the run only fails if *every* source is down.
Per-source caps (`scripts/config/sources.mjs`) stop any one feed from flooding the board.

## Ranking

Each article gets a 0–100 power level:

| Component | Range | Notes |
| --- | --- | --- |
| Engagement | 0–55 | `log10` of HN points and comments; RSS items get a flat baseline |
| Freshness | 0–22 | Decays to zero over ~40 hours |
| Relevance | 0–16 | Topic keyword weighting (AI, security, hardware, dev, …) |
| Source weight | ×0.95–1.15 | Per-source trust multiplier |

Ranks: **S** ≥ 92 · **A** ≥ 82 · **B** ≥ 70 · **C** ≥ 56 · **D** ≥ 40 · **E** below.
S-rank is deliberately rare — usually one or two a day.

## Retention policy

Tuned in [`retention.config.json`](retention.config.json), enforced by `scripts/retention.mjs`,
and surfaced live in the UI's **Mana Core** panel.

| Tier | What is kept | How long | Setting |
| --- | --- | --- | --- |
| **Hot** | Full day files, every field | 45 days | `dailyRetentionDays` |
| **Archive** | Top 12 quests per day, trimmed fields | 18 months | `archiveRetentionMonths`, `archiveTopPerDay` |
| **Hard cap** | Oldest days, then oldest archives, are released | — | `maxDataBytes` (25 MB) |

Other knobs: `maxArticlesPerDay` (60) bounds each day file; `dedupeLookbackDays` (7) stops a story
reappearing all week.

At a steady state this settles around **1.5–2 MB** — roughly 30 KB per hot day plus ~25 KB per
archived month — so the repository stays small indefinitely. Preview a sweep without touching
disk:

```bash
node scripts/retention.mjs --dry-run
```

## Local development

```bash
npm install
npm run collect      # fetch today's news into public/data/
npm run retention    # apply the storage policy
npm run dev          # http://localhost:5173
```

Other scripts: `npm run build` (type-check + production build), `npm run preview`,
`npm run pipeline` (collect + retention).

## Repository layout

```
scripts/
  collect.mjs           daily collector (entry point)
  retention.mjs         storage policy sweep (entry point)
  config/sources.mjs    source registry — edit this to add a feed
  lib/                  http, rss, hn, scoring, datastore helpers
src/
  App.tsx               view state, filtering, sorting
  components/           System windows, quest cards, rank badges, boot sequence
  lib/                  data fetching hooks and formatters
  styles/               tokens · chrome (System-window language) · app
public/data/            the committed datastore
.github/workflows/      collect.yml (cron) · deploy.yml (Pages)
```

## Adding a source

Append an entry to `RSS_SOURCES` in `scripts/config/sources.mjs`:

```js
{
  id: 'lobsters',
  name: 'Lobste.rs',
  kind: 'rss',
  weight: 1.05,   // trust multiplier applied to the score
  limit: 10,      // max items this feed may contribute per day
  url: 'https://lobste.rs/rss',
}
```

Both RSS 2.0 and Atom are handled. Nothing else needs to change — the UI picks up new sources
from the data.

## Setup notes

GitHub Pages must be set to **Source: GitHub Actions** (Settings → Pages). The workflows need no
secrets; `GITHUB_TOKEN` covers both the data commit and the Pages deploy.

## Design

Dark void blues, System-window cyan, monarch violet, and gold reserved for S-rank. Panels use
glowing corner brackets and faint scanlines; ambient "mana motes" drift behind the content on a
canvas. The boot sequence plays once per browser session and is skippable with any key. Everything
animated is disabled under `prefers-reduced-motion`.

## License

MIT
