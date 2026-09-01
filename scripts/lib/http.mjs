const USER_AGENT =
  'tech-news-hunter/1.0 (+https://github.com/saeed-Underline/tech-news-hunter) node-fetch';

/**
 * fetch with a timeout and a couple of retries. Feeds go down; a single flaky
 * source must never fail the whole daily run.
 */
export async function fetchText(url, { timeoutMs = 20000, retries = 2 } = {}) {
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const res = await fetch(url, {
        headers: { 'user-agent': USER_AGENT, accept: '*/*' },
        signal: AbortSignal.timeout(timeoutMs),
        redirect: 'follow',
      });

      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      return await res.text();
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        await sleep(1200 * (attempt + 1));
      }
    }
  }

  throw lastError;
}

export async function fetchJson(url, options) {
  return JSON.parse(await fetchText(url, options));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
