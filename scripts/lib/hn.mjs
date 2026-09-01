import { fetchJson } from './http.mjs';
import { stripHtml } from './text.mjs';

/**
 * Hacker News carries real engagement numbers (points / comments), which the
 * scorer weighs far more heavily than a bare RSS item.
 *
 * Primary  : the official Firebase API (topstories + one call per item).
 * Fallback : the Algolia search API in one call, used when Firebase is
 *            unreachable. Algolia has had multi-hour 500 outages, hence the
 *            ordering.
 */
export async function fetchHackerNews(source) {
  try {
    return await fetchViaFirebase(source);
  } catch (err) {
    console.warn(`    hn: firebase failed (${err?.message ?? err}), trying algolia`);
    return await fetchViaAlgolia(source);
  }
}

async function fetchViaFirebase(source) {
  const ids = await fetchJson('https://hacker-news.firebaseio.com/v0/topstories.json');
  if (!Array.isArray(ids) || !ids.length) throw new Error('empty topstories list');

  // Over-fetch a little: some ids resolve to dead/deleted or non-story items.
  const wanted = ids.slice(0, Math.min(ids.length, source.limit * 2 + 10));
  const items = await mapWithConcurrency(wanted, 8, (id) =>
    fetchJson(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, { retries: 1 }).catch(
      () => null,
    ),
  );

  const stories = items
    .filter((item) => item && item.type === 'story' && item.title && !item.dead && !item.deleted)
    .map((item) => toArticle(source, item));

  if (!stories.length) throw new Error('no usable stories from firebase');
  return stories;
}

async function fetchViaAlgolia(source) {
  const data = await fetchJson(
    'https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=50',
  );

  return (data?.hits ?? [])
    .filter((hit) => hit?.title)
    .map((hit) =>
      toArticle(source, {
        id: hit.objectID,
        title: hit.title,
        url: hit.url,
        text: hit.story_text,
        by: hit.author,
        score: hit.points,
        descendants: hit.num_comments,
        time: hit.created_at_i,
      }),
    );
}

function toArticle(source, item) {
  const discussion = `https://news.ycombinator.com/item?id=${item.id}`;

  return {
    sourceId: source.id,
    sourceName: source.name,
    title: String(item.title).trim(),
    // Ask HN / text posts have no external url — link to the discussion itself.
    url: item.url || discussion,
    summary: stripHtml(item.text ?? ''),
    author: item.by ?? '',
    publishedAt: item.time
      ? new Date(item.time * 1000).toISOString()
      : new Date().toISOString(),
    tags: [],
    points: Number(item.score) || 0,
    comments: Number(item.descendants) || 0,
    commentsUrl: discussion,
  };
}

/** Bounded parallelism so we stay polite to the API. */
async function mapWithConcurrency(items, concurrency, worker) {
  const results = new Array(items.length);
  let cursor = 0;

  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index]);
    }
  });

  await Promise.all(runners);
  return results;
}
