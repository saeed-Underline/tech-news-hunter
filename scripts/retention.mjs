#!/usr/bin/env node
/**
 * Retention / storage control.
 *
 * The datastore is committed to git, so it must be bounded or the repo grows
 * forever. Three tiers, applied in order:
 *
 *   1. HOT     – full daily files for `dailyRetentionDays`.
 *   2. ARCHIVE – older days are folded into one condensed file per month
 *                (top `archiveTopPerDay` quests, trimmed fields), kept for
 *                `archiveRetentionMonths`.
 *   3. HARD CAP– if public/data/ still exceeds `maxDataBytes`, the oldest
 *                remaining days (then the oldest archives) are dropped until
 *                it fits.
 *
 * Run with --dry-run to see what would happen without touching disk.
 */

import fs from 'node:fs/promises';
import { SOURCE_META } from './config/sources.mjs';
import {
  archiveFile,
  DATA_DIR,
  dailyFile,
  daysBetween,
  dirSize,
  ensureDirs,
  listArchiveMonths,
  listDailyDates,
  loadConfig,
  monthOf,
  monthsBetween,
  readJson,
  rebuildIndex,
  todayUTC,
  writeJson,
} from './lib/store.mjs';

const DRY_RUN = process.argv.includes('--dry-run');
const TODAY = todayUTC();

async function main() {
  await ensureDirs();
  const config = await loadConfig();

  const before = await dirSize(DATA_DIR);
  console.log(`▶ retention sweep — ${TODAY} (UTC)${DRY_RUN ? ' [dry run]' : ''}`);
  console.log(
    `  policy: hot ${config.dailyRetentionDays}d · archive ${config.archiveRetentionMonths}mo · ` +
      `cap ${fmtBytes(config.maxDataBytes)}`,
  );
  console.log(`  before: ${fmtBytes(before)}`);

  const actions = { archived: 0, droppedDays: 0, droppedMonths: 0 };

  // ---- Tier 1 → 2: age out full daily files into monthly archives ----------
  for (const date of await listDailyDates()) {
    if (daysBetween(date, TODAY) <= config.dailyRetentionDays) continue;
    await foldIntoArchive(date, config);
    actions.archived += 1;
  }

  // ---- Tier 2 expiry: drop archives beyond the retention horizon -----------
  const currentMonth = monthOf(TODAY);
  for (const month of await listArchiveMonths()) {
    if (monthsBetween(month, currentMonth) <= config.archiveRetentionMonths) continue;
    console.log(`  ⌫ archive ${month} expired`);
    await remove(archiveFile(month));
    actions.droppedMonths += 1;
  }

  // ---- Tier 3: hard byte cap ----------------------------------------------
  let size = await dirSize(DATA_DIR);

  if (size > config.maxDataBytes) {
    console.log(`  ! over cap by ${fmtBytes(size - config.maxDataBytes)} — trimming oldest`);

    // Sacrifice whole days first, always keeping at least the most recent one.
    let dates = await listDailyDates();
    while (size > config.maxDataBytes && dates.length > 1) {
      const oldest = dates.shift();
      await foldIntoArchive(oldest, config);
      actions.archived += 1;
      actions.droppedDays += 1;
      size = await dirSize(DATA_DIR);
      if (DRY_RUN) break;
    }

    // Still over? Start expiring archives from the oldest end.
    let months = await listArchiveMonths();
    while (size > config.maxDataBytes && months.length > 0) {
      const oldest = months.shift();
      console.log(`  ⌫ archive ${oldest} dropped to fit the cap`);
      await remove(archiveFile(oldest));
      actions.droppedMonths += 1;
      size = await dirSize(DATA_DIR);
      if (DRY_RUN) break;
    }
  }

  const index = DRY_RUN ? null : await rebuildIndex({ sources: SOURCE_META });
  const after = await dirSize(DATA_DIR);

  console.log(
    `  actions: ${actions.archived} day(s) archived · ` +
      `${actions.droppedMonths} archive(s) expired`,
  );
  console.log(`  after:  ${fmtBytes(after)} (${pct(after, config.maxDataBytes)}% of cap)`);
  if (index) {
    console.log(
      `✔ ${index.stats.daysTracked} hot days · ${index.stats.monthsArchived} archived months · ` +
        `${index.stats.articlesLive + index.stats.articlesArchived} articles retained`,
    );
  }
}

/**
 * Move one day out of the hot tier: condense its top articles into the
 * month archive, then delete the full file. Idempotent — re-folding the same
 * date replaces its archive entries rather than duplicating them.
 */
async function foldIntoArchive(date, config) {
  const day = await readJson(dailyFile(date));
  if (!day) return;

  const month = monthOf(date);
  const archive = (await readJson(archiveFile(month))) ?? {
    month,
    updatedAt: null,
    days: 0,
    articles: [],
  };

  const others = archive.articles.filter((a) => a.date !== date);
  const condensed = (day.articles ?? [])
    .slice(0, config.archiveTopPerDay)
    .map((a) => ({
      date,
      id: a.id,
      title: a.title,
      url: a.url,
      sourceId: a.sourceId,
      topics: a.topics ?? [],
      score: a.score,
      rank: a.rank,
      publishedAt: a.publishedAt,
    }));

  const articles = [...others, ...condensed].sort(
    (a, b) => b.date.localeCompare(a.date) || b.score - a.score,
  );

  const next = {
    month,
    updatedAt: new Date().toISOString(),
    days: new Set(articles.map((a) => a.date)).size,
    articles,
  };

  console.log(`  ↓ ${date}: ${day.articles?.length ?? 0} → ${condensed.length} archived into ${month}`);

  if (DRY_RUN) return;
  await writeJson(archiveFile(month), next);
  await remove(dailyFile(date));
}

async function remove(file) {
  if (DRY_RUN) return;
  await fs.rm(file, { force: true });
}

function fmtBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function pct(value, total) {
  return total ? ((value / total) * 100).toFixed(1) : '0.0';
}

main().catch((err) => {
  console.error('✗ retention failed:', err);
  process.exit(1);
});
