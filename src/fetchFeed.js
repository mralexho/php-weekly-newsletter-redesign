import { XMLParser } from "fast-xml-parser";

const FEED_URL = "https://phpweekly.com/rss.xml";

const parser = new XMLParser({
  ignoreAttributes: false,
  parseTagValue: false,
});

function toArray(value) {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

/**
 * Fetches the PHP Weekly RSS feed (which redirects to a Mailchimp
 * campaign-archive feed) and returns issues newest-first.
 */
export async function fetchFeedItems(feedUrl = FEED_URL) {
  const res = await fetch(feedUrl, { redirect: "follow" });
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
