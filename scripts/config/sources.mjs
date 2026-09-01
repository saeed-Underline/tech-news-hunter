/**
 * Source registry. Every source is public and key-free so the workflow needs no secrets.
 *
 * weight  – baseline trust/interest multiplier applied during scoring (1.0 = neutral)
 * limit   – hard cap on how many items a single source may contribute per run,
 *           so one noisy feed can never dominate the daily quest board.
 */

export const HN_SOURCE = {
  id: 'hackernews',
  name: 'Hacker News',
  kind: 'hn',
  weight: 1.15,
  limit: 25,
  // Endpoints are handled inside lib/hn.mjs (Firebase primary, Algolia fallback).
  url: 'https://news.ycombinator.com/',
};

export const RSS_SOURCES = [
  {
    id: 'techcrunch',
    name: 'TechCrunch',
    kind: 'rss',
    weight: 1.0,
    limit: 12,
    url: 'https://techcrunch.com/feed/',
  },
  {
    id: 'theverge',
    name: 'The Verge',
    kind: 'rss',
    weight: 1.0,
    limit: 12,
    url: 'https://www.theverge.com/rss/index.xml',
  },
  {
    id: 'arstechnica',
    name: 'Ars Technica',
    kind: 'rss',
    weight: 1.1,
    limit: 12,
    url: 'https://feeds.arstechnica.com/arstechnica/index',
  },
  {
    id: 'wired',
    name: 'WIRED',
    kind: 'rss',
    weight: 0.95,
    limit: 10,
    url: 'https://www.wired.com/feed/rss',
  },
];

export const ALL_SOURCES = [HN_SOURCE, ...RSS_SOURCES];

/** Display metadata the UI uses for per-source colouring. */
export const SOURCE_META = Object.fromEntries(
  ALL_SOURCES.map((s) => [s.id, { name: s.name, weight: s.weight }]),
);
