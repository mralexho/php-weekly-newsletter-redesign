import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Eta } from "eta";
import juice from "juice";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = path.join(__dirname, "..", "templates");

const eta = new Eta({ views: TEMPLATES_DIR });
const css = readFileSync(path.join(TEMPLATES_DIR, "styles.css"), "utf8");

/** Renders a parsed issue into an email-ready HTML string with inlined CSS. */
export function renderIssue(issue) {
  const html = eta.render("issue", { ...issue, css });
  return juice(html, { removeStyleTags: true });
}
