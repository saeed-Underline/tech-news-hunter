/**
 * Scoring turns heterogeneous feed items into one comparable 0-100 "power level",
 * which the UI renders as an E → S hunter rank.
 *
 *   engagement  (0-55) – real signal where we have it (HN points/comments)
 *   freshness   (0-22) – decays to zero over ~40h
 *   relevance   (0-16) – topic keyword weighting
 *   source      (x)    – per-source trust multiplier
 */

const TOPIC_RULES = [
  {
    tag: 'AI',
    weight: 16,
    pattern:
      /\b(ai|a\.i\.|llm|llms|gpt|chatgpt|claude|anthropic|openai|gemini|deepmind|transformer|neural|machine learning|inference|agentic|diffusion|copilot)\b/i,
  },
  {
    tag: 'SECURITY',
    weight: 15,
    pattern:
      /\b(security|breach|hacked|hacker|vulnerability|vulnerabilities|cve|zero.?day|ransomware|malware|exploit|phishing|encryption|backdoor)\b/i,
  },
  {
    tag: 'HARDWARE',
    weight: 12,
    pattern:
      /\b(chip|chips|silicon|gpu|cpu|nvidia|amd|intel|tsmc|semiconductor|arm|risc-?v|nanometer|wafer|quantum)\b/i,
  },
  {
    tag: 'DEV',
    weight: 12,
    pattern:
      /\b(rust|golang|typescript|javascript|python|kernel|linux|compiler|open.?source|git|database|postgres|sqlite|api|framework|kubernetes|docker)\b/i,
  },
  {
    tag: 'SPACE',
    weight: 10,
    pattern: /\b(space|nasa|spacex|rocket|satellite|orbit|mars|lunar|telescope|astronomy)\b/i,
  },
  {
    tag: 'BUSINESS',
    weight: 8,
    pattern:
      /\b(funding|raises|raised|acquisition|acquires|ipo|valuation|layoffs|revenue|antitrust|lawsuit|billion|merger)\b/i,
  },
  {
    tag: 'SCIENCE',
    weight: 9,
    pattern: /\b(research|study|scientists|physics|biology|climate|fusion|battery|medicine|genome)\b/i,
  },
  {
    tag: 'POLICY',
    weight: 7,
    pattern: /\b(regulation|regulator|privacy|gdpr|congress|senate|eu |ban|policy|court|ruling)\b/i,
  },
  { tag: 'GAMING', weight: 6, pattern: /\b(game|gaming|nintendo|playstation|xbox|steam|valve)\b/i },
  { tag: 'CRYPTO', weight: 4, pattern: /\b(crypto|bitcoin|ethereum|blockchain|web3|stablecoin)\b/i },
];

// Tuned against real distributions: S stays genuinely rare (a couple per day),
// the bulk of a normal day lands in B/C.
const RANK_THRESHOLDS = [
  ['S', 92],
  ['A', 82],
  ['B', 70],
  ['C', 56],
  ['D', 40],
  ['E', 0],
];

/** Affiliate/deal filler that technically ships in tech feeds but is not news. */
const NOISE_PATTERN =
  /(promo code|coupon|discount code|best deals|deals? of the (day|week)|gift guide|prime day|black friday|cyber monday|\bsale:\s|% off\b|sponsored content)/i;

export function isNoise(article) {
  return NOISE_PATTERN.test(`${article.title} ${article.summary ?? ''}`);
}

export function detectTopics(article) {
  const haystack = `${article.title} ${article.summary ?? ''}`;
  const topics = TOPIC_RULES.filter((rule) => rule.pattern.test(haystack)).map((r) => r.tag);
  return topics.length ? topics.slice(0, 3) : ['TECH'];
}

function relevanceBoost(article) {
  const haystack = `${article.title} ${article.summary ?? ''}`;
  const hits = TOPIC_RULES.filter((rule) => rule.pattern.test(haystack));
  if (!hits.length) return 0;

  // Strongest topic counts fully, additional ones with diminishing returns.
  const sorted = hits.map((h) => h.weight).sort((a, b) => b - a);
  const total = sorted[0] + (sorted[1] ?? 0) * 0.35 + (sorted[2] ?? 0) * 0.15;
  return Math.min(16, total);
}

function engagementScore(article) {
  if (article.points || article.comments) {
    const points = Math.log10(article.points + 1) * 20;
    const comments = Math.log10(article.comments + 1) * 12;
    return Math.min(55, points + comments);
  }
  // Editorially curated feeds have no public engagement metric; give them a
  // solid, honest baseline rather than pretending we know.
  return 30;
}

function freshnessScore(article, now) {
  const published = new Date(article.publishedAt).getTime();
  if (!Number.isFinite(published)) return 8;
  const hoursOld = Math.max(0, (now - published) / 3_600_000);
  return Math.max(0, 22 - hoursOld * 0.55);
}

export function scoreArticle(article, sourceWeight = 1, now = Date.now()) {
  const raw =
    (engagementScore(article) + freshnessScore(article, now) + relevanceBoost(article)) *
    sourceWeight;

  return Math.max(1, Math.min(100, Math.round(raw)));
}

export function rankOf(score) {
  return RANK_THRESHOLDS.find(([, min]) => score >= min)?.[0] ?? 'E';
}
