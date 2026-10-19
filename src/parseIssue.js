import * as cheerio from "cheerio";

const SKIP_TITLE_RE = /how did you like this issue/i;
const SPONSOR_TITLE_RE = /sponsor/i;
const JOBS_TITLE_RE = /^jobs$/i;

function collapseWhitespace(text) {
  return text.replace(/[\s ]+/g, " ").trim();
}

function stripStyling(html) {
  const $ = cheerio.load(`<div id="root">${html}</div>`);
  $("#root [style]").removeAttr("style");
  $("#root [class]").removeAttr("class");
  $("#root font").each((_, el) => {
    $(el).replaceWith($(el).contents());
  });
  return $("#root").html()?.trim() ?? "";
}

function splitIntoBlocks(html) {
  return html
    .split(/(?:<br\s*\/?>\s*){2,}/i)
    .map((block) => block.trim())
    .filter(Boolean);
}

function parseArticleBlocks(html) {
  const items = [];
  for (const block of splitIntoBlocks(html)) {
    const $block = cheerio.load(`<div id="root">${block}</div>`);
    const anchor = $block("#root a").first();
    if (anchor.length === 0) continue;

    const title = collapseWhitespace(anchor.text());
    const url = anchor.attr("href");
    anchor.remove();

    $block("#root br").replaceWith(" ");
    const description = collapseWhitespace($block("#root").text());

    if (title && url) items.push({ title, url, description });
  }
  return items;
}

/**
 * Parses a PHP Weekly issue's raw HTML (from the RSS feed's content:encoded)
 * into a structured representation the template can render.
 */
export function parseIssue(html, { date, sourceUrl } = {}) {
  const $ = cheerio.load(html);
  const sections = [];
  let intro = null;

  $("td.bodyContent").each((_, el) => {
    const $td = $(el);
    const $h2 = $td.find("h2").first();

    if ($h2.length === 0) {
      if (intro === null) {
        intro = collapseWhitespace($td.text()) ? stripStyling($td.html()) : null;
      }
      return;
    }

    const title = collapseWhitespace($h2.text());
    if (!title || SKIP_TITLE_RE.test(title)) return;

    $h2.remove();
    const restHtml = $td.html() ?? "";

    if (JOBS_TITLE_RE.test(title)) {
      const text = collapseWhitespace($.load(`<div>${restHtml}</div>`)("div").text());
      if (!text) return;
      const jobsHtml = stripStyling(restHtml).replace(/^(?:-{2,}\s*<br\s*\/?>\s*)+/i, "");
      sections.push({ type: "jobs", title, html: jobsHtml });
      return;
    }

    const items = parseArticleBlocks(restHtml);
    if (items.length === 0) return;

    sections.push({
      type: SPONSOR_TITLE_RE.test(title) ? "sponsor" : "articles",
      title,
      items,
    });
  });

  return { date, sourceUrl, intro, sections };
}
