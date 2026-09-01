import { XMLParser } from 'fast-xml-parser';
import { fetchText } from './http.mjs';
import { decodeEntities, stripHtml } from './text.mjs';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  trimValues: true,
  parseTagValue: false,
  processEntities: true,
});

/**
 * Fetch and normalise one RSS 2.0 or Atom feed into plain item objects.
 * Returns [] rather than throwing: a dead feed degrades the run, not kills it.
 */
export async function fetchFeed(source) {
  const xml = await fetchText(source.url);
  const doc = parser.parse(xml);

  const rssItems = asArray(doc?.rss?.channel?.item);
  const atomItems = asArray(doc?.feed?.entry);
  const rdfItems = asArray(doc?.['rdf:RDF']?.item);

  const raw = rssItems.length ? rssItems : atomItems.length ? atomItems : rdfItems;

  return raw
    .map((item) => normalizeItem(item, source))
    .filter((item) => item && item.title && item.url);
}

function normalizeItem(item, source) {
  const title = decodeEntities(pickText(item.title)).trim();
  const url = pickLink(item);
  if (!title || !url) return null;

  const publishedAt = parseDate(
    item.pubDate ?? item.published ?? item.updated ?? item['dc:date'] ?? item.date,
  );

  const summary = stripHtml(
    pickText(item.description ?? item.summary ?? item['content:encoded'] ?? item.content),
  );

  return {
    sourceId: source.id,
    sourceName: source.name,
    title,
    url,
    summary,
    author: decodeEntities(pickText(item['dc:creator'] ?? item.author?.name ?? item.author) || ''),
    publishedAt,
    tags: asArray(item.category)
      .map((c) => decodeEntities(pickText(c?.['@_term'] ?? c)).trim())
      .filter(Boolean)
      .slice(0, 4),
    points: 0,
    comments: 0,
    commentsUrl: '',
  };
}

function pickLink(item) {
  // RSS: <link>url</link>. Atom: <link rel="alternate" href="url"/> (possibly many).
  const links = asArray(item.link);

  for (const link of links) {
    if (typeof link === 'string' && link.trim()) return link.trim();
    const rel = link?.['@_rel'];
    if (link?.['@_href'] && (!rel || rel === 'alternate')) return String(link['@_href']).trim();
  }

  const fallback = item.guid;
  const guid = pickText(fallback);
  return /^https?:\/\//i.test(guid) ? guid : '';
}

function pickText(value) {
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (Array.isArray(value)) return pickText(value[0]);
  if (typeof value === 'object') return pickText(value['#text'] ?? value['@_term'] ?? '');
  return '';
}

function parseDate(value) {
  const text = pickText(value);
  if (!text) return new Date().toISOString();
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

function asArray(value) {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}
