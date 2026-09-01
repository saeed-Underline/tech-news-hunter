import { createHash } from 'node:crypto';

const NAMED_ENTITIES = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  hellip: '…',
  mdash: '—',
  ndash: '–',
  rsquo: '’',
  lsquo: '‘',
  ldquo: '“',
  rdquo: '”',
  eacute: 'é',
  uuml: 'ü',
};

export function decodeEntities(input = '') {
  return String(input)
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => safeCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => safeCodePoint(parseInt(dec, 10)))
    .replace(/&([a-z]+);/gi, (match, name) => NAMED_ENTITIES[name.toLowerCase()] ?? match);
}

function safeCodePoint(code) {
  if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return '';
  try {
    return String.fromCodePoint(code);
  } catch {
    return '';
  }
}

/** Turn feed HTML into a clean one-line summary. */
export function stripHtml(input = '', maxLength = 260) {
  const text = decodeEntities(
    String(input)
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/\s+/g, ' ')
    .trim();

  if (text.length <= maxLength) return text;
  const cut = text.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > maxLength * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

/**
 * Strip tracking noise so the same story from two feeds collapses to one URL.
 */
export function normalizeUrl(rawUrl = '') {
  try {
    const url = new URL(String(rawUrl).trim());
    url.hash = '';
    url.hostname = url.hostname.toLowerCase().replace(/^www\./, '');

    for (const key of [...url.searchParams.keys()]) {
      if (/^(utm_|ref$|ref_|source$|cmpid$|guccounter|mc_cid|mc_eid|fbclid|gclid)/i.test(key)) {
        url.searchParams.delete(key);
      }
    }

    if (url.pathname.length > 1 && url.pathname.endsWith('/')) {
      url.pathname = url.pathname.replace(/\/+$/, '');
    }

    return url.toString();
  } catch {
    return String(rawUrl).trim();
  }
}

export function hashId(value) {
  return createHash('sha1').update(String(value)).digest('hex').slice(0, 16);
}

/** Aggressively normalised title, used only for cross-source duplicate detection. */
export function titleKey(title = '') {
  return decodeEntities(title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b(the|a|an|of|for|to|in|on|and|is|are|with|its|new)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 70);
}

export function hostOf(url = '') {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}
