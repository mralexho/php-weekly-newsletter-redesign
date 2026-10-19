import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import "dotenv/config";
import { fetchFeedItems } from "./fetchFeed.js";
import { parseIssue } from "./parseIssue.js";
import { renderIssue } from "./render.js";
import { sendIssueEmail } from "./send.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const STATE_FILE = path.join(ROOT, "data", "last-issue.json");
const PREVIEW_FILE = path.join(ROOT, "out", "preview.html");

function readState() {
  if (!existsSync(STATE_FILE)) return null;
  return JSON.parse(readFileSync(STATE_FILE, "utf8"));
}

function writeState(state) {
  mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2) + "\n");
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const force = args.includes("--force");

  const items = await fetchFeedItems();
  const latest = items[0];
  if (!latest) {
    console.log("No issues found in feed.");
    return;
  }

  const state = readState();
  if (!dryRun && !force && state?.guid === latest.guid) {
    console.log(`No new issue (latest is still "${latest.title}"). Nothing to do.`);
    return;
  }

  const parsed = parseIssue(latest.html, { date: latest.title, sourceUrl: latest.link });
  const html = renderIssue(parsed);

  if (dryRun) {
    mkdirSync(path.dirname(PREVIEW_FILE), { recursive: true });
    writeFileSync(PREVIEW_FILE, html);
    console.log(`Dry run: wrote preview to ${PREVIEW_FILE}`);
    return;
  }

  const to = process.env.TO_EMAIL;
  if (!to) throw new Error("TO_EMAIL environment variable is required to send.");

  await sendIssueEmail({ html, date: parsed.date, to, from: process.env.FROM_EMAIL });
  console.log(`Sent "${latest.title}" to ${to}.`);

  writeState({ guid: latest.guid, date: latest.title, sentAt: new Date().toISOString() });
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
