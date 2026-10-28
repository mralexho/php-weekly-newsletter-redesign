import { XMLParser } from "fast-xml-parser";

const FEED_URL = "https://phpweekly.com/rss.xml";
const MAX_FETCH_ATTEMPTS = 3;
const MAX_RETRY_DELAY_MS = 30_000;
const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

const parser = new XMLParser({
  ignoreAttributes: false,
  parseTagValue: false,
});

function retryDelay(response, attempt) {
  const retryAfter = response?.headers.get("retry-after");
  if (retryAfter) {
    const seconds = Number(retryAfter);
    const retryAt = Number.isFinite(seconds)
      ? Date.now() + seconds * 1000
      : Date.parse(retryAfter);
    if (Number.isFinite(retryAt)) {
      return Math.min(MAX_RETRY_DELAY_MS, Math.max(0, retryAt - Date.now()));
    }
  }

  return Math.min(1000 * 2 ** (attempt - 1), MAX_RETRY_DELAY_MS);
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(feedUrl) {
  for (let attempt = 1; attempt <= MAX_FETCH_ATTEMPTS; attempt++) {
    let response;
    try {
      response = await fetch(feedUrl, { redirect: "follow" });
    } catch (error) {
      if (attempt === MAX_FETCH_ATTEMPTS) throw error;

      const delay = retryDelay(null, attempt);
      console.warn(
        `Feed request failed (attempt ${attempt}/${MAX_FETCH_ATTEMPTS}): ${error.message}. Retrying in ${delay}ms.`,
      );
      await wait(delay);
      continue;
    }

    if (response.ok || !RETRYABLE_STATUSES.has(response.status)) return response;
    if (attempt === MAX_FETCH_ATTEMPTS) return response;

    const delay = retryDelay(response, attempt);
    console.warn(
      `Feed request returned ${response.status} ${response.statusText} (attempt ${attempt}/${MAX_FETCH_ATTEMPTS}). Retrying in ${delay}ms.`,
    );
    await wait(delay);
  }
}

function toArray(value) {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

/**
 * Fetches the PHP Weekly RSS feed (which redirects to a Mailchimp
 * campaign-archive feed) and returns issues newest-first.
 */
export async function fetchFeedItems(feedUrl = FEED_URL) {
  const res = await fetchWithRetry(feedUrl);
  if (!res.ok) {
    throw new Error(`Failed to fetch feed ${feedUrl}: ${res.status} ${res.statusText}`);
  }
  const xml = await res.text();
  const doc = parser.parse(xml);
  const items = toArray(doc?.rss?.channel?.item);

  const issues = items.map((item) => ({
    guid: typeof item.guid === "object" ? item.guid["#text"] : item.guid,
    title: item.title,
    link: item.link,
    pubDate: item.pubDate,
    html: item["content:encoded"] ?? item.description ?? "",
  }));

  issues.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
  return issues;
}
