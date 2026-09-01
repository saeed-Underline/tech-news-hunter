import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

/** Data lives under public/ so Vite copies it into the built site verbatim. */
export const DATA_DIR = path.join(ROOT, 'public', 'data');
export const DAILY_DIR = path.join(DATA_DIR, 'daily');
export const ARCHIVE_DIR = path.join(DATA_DIR, 'archive');
export const INDEX_FILE = path.join(DATA_DIR, 'index.json');
export const CONFIG_FILE = path.join(ROOT, 'retention.config.json');

export async function loadConfig() {
  return readJson(CONFIG_FILE, {
    dailyRetentionDays: 45,
    archiveRetentionMonths: 18,
    maxArticlesPerDay: 60,
    archiveTopPerDay: 12,
    maxDataBytes: 26_214_400,
    dedupeLookbackDays: 7,
  });
}

export async function ensureDirs() {
  await fs.mkdir(DAILY_DIR, { recursive: true });
  await fs.mkdir(ARCHIVE_DIR, { recursive: true });
}

export async function readJson(file, fallback = null) {
  let raw;
  try {
    raw = await fs.readFile(file, 'utf8');
  } catch {
    return fallback; // missing file is a normal, expected case
  }

  try {
    // Strip a UTF-8 BOM: editors on Windows add one and JSON.parse chokes on it.
    return JSON.parse(raw.replace(/^﻿/, ''));
  } catch (err) {
    // A corrupt file silently falling back to defaults hides real problems.
    console.warn(`  ! ${path.relative(ROOT, file)} is not valid JSON: ${err.message}`);
    return fallback;
  }
}

export async function writeJson(file, data, { pretty = false } = {}) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, pretty ? `${JSON.stringify(data, null, 2)}\n` : JSON.stringify(data), 'utf8');
}

export function dailyFile(date) {
  return path.join(DAILY_DIR, `${date}.json`);
}

export function archiveFile(month) {
  return path.join(ARCHIVE_DIR, `${month}.json`);
}

/** Sorted list (oldest → newest) of `YYYY-MM-DD` day keys currently on disk. */
export async function listDailyDates() {
  const entries = await safeReaddir(DAILY_DIR);
  return entries
    .filter((name) => /^\d{4}-\d{2}-\d{2}\.json$/.test(name))
    .map((name) => name.replace(/\.json$/, ''))
    .sort();
}

/** Sorted list (oldest → newest) of `YYYY-MM` archive keys currently on disk. */
export async function listArchiveMonths() {
  const entries = await safeReaddir(ARCHIVE_DIR);
  return entries
    .filter((name) => /^\d{4}-\d{2}\.json$/.test(name))
    .map((name) => name.replace(/\.json$/, ''))
    .sort();
}

async function safeReaddir(dir) {
  try {
    return await fs.readdir(dir);
  } catch {
    return [];
  }
}

export async function fileSize(file) {
  try {
    return (await fs.stat(file)).size;
  } catch {
    return 0;
  }
}

export async function dirSize(dir) {
  let total = 0;
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return 0;
  }

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    total += entry.isDirectory() ? await dirSize(full) : await fileSize(full);
  }
  return total;
}

export function todayUTC(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

export function monthOf(date) {
  return date.slice(0, 7);
}

export function daysBetween(fromDate, toDate) {
  const a = Date.parse(`${fromDate}T00:00:00Z`);
  const b = Date.parse(`${toDate}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

export function monthsBetween(fromMonth, toMonth) {
  const [fy, fm] = fromMonth.split('-').map(Number);
  const [ty, tm] = toMonth.split('-').map(Number);
  return (ty - fy) * 12 + (tm - fm);
}

/**
 * Rebuild data/index.json from whatever is actually on disk.
 * Both collect and retention call this, so the manifest can never drift.
 */
export async function rebuildIndex({ sources = {} } = {}) {
  const config = await loadConfig();
  const dates = await listDailyDates();
  const months = await listArchiveMonths();

  const days = [];
  let articlesLive = 0;

  for (const date of dates.slice().reverse()) {
    const day = await readJson(dailyFile(date));
    if (!day) continue;

    const articles = day.articles ?? [];
    articlesLive += articles.length;

    days.push({
      date,
      file: `daily/${date}.json`,
      count: articles.length,
      topScore: articles[0]?.score ?? 0,
      topRank: articles[0]?.rank ?? 'E',
      bytes: await fileSize(dailyFile(date)),
      sources: countBy(articles, (a) => a.sourceId),
    });
  }

  const archives = [];
  let articlesArchived = 0;

  for (const month of months.slice().reverse()) {
    const archive = await readJson(archiveFile(month));
    if (!archive) continue;
    const count = archive.articles?.length ?? 0;
    articlesArchived += count;
    archives.push({
      month,
      file: `archive/${month}.json`,
      days: archive.days ?? 0,
      count,
      bytes: await fileSize(archiveFile(month)),
    });
  }

  const bytes = await dirSize(DATA_DIR);

  const index = {
    generatedAt: new Date().toISOString(),
    latest: days[0]?.date ?? null,
    sources,
    retention: {
      dailyRetentionDays: config.dailyRetentionDays,
      archiveRetentionMonths: config.archiveRetentionMonths,
      maxArticlesPerDay: config.maxArticlesPerDay,
      archiveTopPerDay: config.archiveTopPerDay,
      maxDataBytes: config.maxDataBytes,
    },
    stats: {
      daysTracked: days.length,
      monthsArchived: archives.length,
      articlesLive,
      articlesArchived,
      bytes,
      bytesLimit: config.maxDataBytes,
    },
    days,
    archives,
  };

  await writeJson(INDEX_FILE, index, { pretty: true });
  return index;
}

export function countBy(items, keyFn) {
  const out = {};
  for (const item of items) {
    const key = keyFn(item);
    if (!key) continue;
    out[key] = (out[key] ?? 0) + 1;
  }
  return out;
}
