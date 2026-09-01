#!/usr/bin/env node
/**
 * Daily collector. Pulls every configured source, dedupes against the last
 * `dedupeLookbackDays` of history, scores what survives and writes one
 * `public/data/daily/YYYY-MM-DD.json` file, then refreshes the manifest.
 *
 * Designed to be idempotent: running it twice in one day merges into the
 * existing file instead of duplicating it.
 */

import { ALL_SOURCES, SOURCE_META } from './config/sources.mjs';
import { fetchHackerNews } from './lib/hn.mjs';
import { fetchFeed } from './lib/rss.mjs';
import { detectTopics, isNoise, rankOf, scoreArticle } from './lib/score.mjs';
import {
  dailyFile,
  daysBetween,
  ensureDirs,
  listDailyDates,
  loadConfig,
  readJson,
  rebuildIndex,
  todayUTC,
  writeJson,
} from './lib/store.mjs';
import { hashId, hostOf, normalizeUrl, titleKey } from './lib/text.mjs';

const NOW = Date.now();
const TODAY = todayUTC();

async function main() {
  await ensureDirs();
  const config = await loadConfig();

  console.log(`▶ tech-news-hunter collect — ${TODAY} (UTC)`);

  const seen = await buildSeenIndex(config.dedupeLookbackDays);
  console.log(`  history: ${seen.ids.size} article ids in the last ${config.dedupeLookbackDays}d`);

  const { items, sourceReport } = await fetchAllSources();
  console.log(`  fetched: ${items.length} raw items`);

  const fresh = dedupe(items, seen);
  console.log(`  unique:  ${fresh.length} after dedupe`);

  const existing = (await readJson(dailyFile(TODAY)))?.articles ?? [];
  const merged = mergeWithExisting(existing, fresh);
  const selected = applyLimits(merged, config.maxArticlesPerDay);

  const payload = {
    date: TODAY,
    generatedAt: new Date().toISOString(),
    count: selected.length,
    sourceReport,
    articles: selected,
  };

  await writeJson(dailyFile(TODAY), payload);
  console.log(`  wrote:   ${selected.length} quests → public/data/daily/${TODAY}.json`);

  const index = await rebuildIndex({ sources: SOURCE_META });
  console.log(
    `✔ manifest: ${index.stats.daysTracked} days live, ` +
      `${index.stats.articlesLive} articles, ${(index.stats.bytes / 1024).toFixed(0)} KB on disk`,
  );

  const ranks = countRanks(selected);
  console.log(`  ranks:   ${Object.entries(ranks).map(([r, n]) => `${r}:${n}`).join('  ')}`);
}

/** Every source runs independently; failures are reported, never fatal. */
async function fetchAllSources() {
  const tasks = ALL_SOURCES.map(async (source) => {
    const started = Date.now();
    try {
      const raw = source.kind === 'hn' ? await fetchHackerNews(source) : await fetchFeed(source);
      const items = raw.map((item) => decorate(item, source));
      console.log(`  ✓ ${source.name.padEnd(14)} ${String(items.length).padStart(3)} items (${Date.now() - started}ms)`);
      return { source, items, ok: true };
    } catch (err) {
      console.warn(`  ✗ ${source.name.padEnd(14)} failed: ${err?.message ?? err}`);
      return { source, items: [], ok: false, error: String(err?.message ?? err) };
    }
  });

  const results = await Promise.all(tasks);

  const failures = results.filter((r) => !r.ok);
  if (failures.length === ALL_SOURCES.length) {
    throw new Error('every source failed — refusing to write an empty day');
  }

  return {
    items: results.flatMap((r) => r.items),
    sourceReport: Object.fromEntries(
      results.map((r) => [r.source.id, { ok: r.ok, fetched: r.items.length, error: r.error ?? null }]),
    ),
  };
}

function decorate(item, source) {
  const url = normalizeUrl(item.url);
  const score = scoreArticle(item, source.weight, NOW);

  return {
    id: hashId(url),
    title: item.title,
    url,
    host: hostOf(url),
    sourceId: source.id,
    sourceName: source.name,
    author: item.author || '',
    summary: item.summary || '',
    publishedAt: item.publishedAt,
    points: item.points || 0,
    comments: item.comments || 0,
    commentsUrl: item.commentsUrl || '',
    topics: detectTopics(item),
    score,
    rank: rankOf(score),
    _limit: source.limit,
  };
}

/** ids + fuzzy title keys from recent days, so yesterday's story stays yesterday's. */
async function buildSeenIndex(lookbackDays) {
  const ids = new Set();
  const titles = new Set();

  const dates = (await listDailyDates()).filter(
    (date) => date !== TODAY && daysBetween(date, TODAY) <= lookbackDays,
  );

  for (const date of dates) {
    const day = await readJson(dailyFile(date));
    for (const article of day?.articles ?? []) {
      ids.add(article.id);
      titles.add(titleKey(article.title));
    }
  }

  return { ids, titles };
}

function dedupe(items, seen) {
  const byId = new Map();
  const localTitles = new Set();

  for (const item of items.sort((a, b) => b.score - a.score)) {
    if (seen.ids.has(item.id)) continue;
    if (isNoise(item)) continue;

    const key = titleKey(item.title);
    if (key && (seen.titles.has(key) || localTitles.has(key))) continue;
    if (byId.has(item.id)) continue;

    byId.set(item.id, item);
    if (key) localTitles.add(key);
  }

  return [...byId.values()];
}

/** Re-runs on the same day update engagement numbers instead of duplicating rows. */
function mergeWithExisting(existing, fresh) {
  const byId = new Map(existing.map((a) => [a.id, a]));

  for (const item of fresh) {
    const previous = byId.get(item.id);
    byId.set(item.id, previous && previous.score > item.score ? previous : item);
  }

  return [...byId.values()];
}

/** Sort by power level, cap each source, then cap the day. */
function applyLimits(articles, maxPerDay) {
  const perSource = new Map();
  const kept = [];

  for (const article of articles.sort((a, b) => b.score - a.score)) {
    const used = perSource.get(article.sourceId) ?? 0;
    const limit = article._limit ?? Infinity;
    if (used >= limit) continue;

    perSource.set(article.sourceId, used + 1);
    const { _limit, ...clean } = article;
    kept.push(clean);

    if (kept.length >= maxPerDay) break;
  }

  return kept;
}

function countRanks(articles) {
  const order = ['S', 'A', 'B', 'C', 'D', 'E'];
  const counts = Object.fromEntries(order.map((r) => [r, 0]));
  for (const a of articles) counts[a.rank] = (counts[a.rank] ?? 0) + 1;
  return counts;
}

main().catch((err) => {
  console.error('✗ collect failed:', err);
  process.exit(1);
});
