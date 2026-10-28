# Copilot instructions for php-weekly-newsletter-design

## Response style

- Code only, no explanation.
- Use bullets over paragraphs.
- No explanations unless asked.

## Commands

This repo is a small Node.js email-generation workflow with no dedicated test or lint scripts.

- Install dependencies: `npm install`
- Preview the latest issues without sending mail: `npm run convert -- --dry-run`
  - This writes `out/preview.html` and is the main local validation path.
- Send a real test email locally: `node src/cli.js --force`
  - Requires `RESEND_API_KEY`, `TO_EMAIL`, and optional `FROM_EMAIL` from a local `.env` file or the environment.
- Production run: `node src/cli.js`
  - This is what GitHub Actions executes weekly.
  - It skips sending when the latest issue has already been recorded in `data/last-issue.json`.

There are currently no `test`, `build`, or `lint` npm scripts in `package.json`; prefer the dry-run preview flow when validating changes.

## High-level architecture

This project is an ETL + HTML rendering pipeline for PHP Weekly:

- `src/fetchFeed.js` fetches the PHP Weekly RSS feed and extracts each issue's metadata and HTML payload.
- `src/parseIssue.js` normalizes the raw issue HTML from the feed, strips extraneous styling/attributes, and groups content into logical sections such as article lists, sponsors, and jobs.
- `src/render.js` renders the parsed issue using the Eta template in `templates/issue.eta` and the CSS in `templates/styles.css`, then inlines CSS for email-client compatibility with `juice`.
- `src/send.js` sends the final HTML via Resend.
- `src/cli.js` is the orchestration layer: it fetches the latest issue, checks `data/last-issue.json` for duplicates, writes a preview for `--dry-run`, or sends the email and records the last sent issue.
- `.github/workflows/weekly.yml` runs this pipeline every Thursday and commits the updated `data/last-issue.json` back to the repo so the cron job does not resend the same issue.

The app is intentionally simple and mostly side-effectful: the real “app” is the generated HTML email, not a web service.

## Key repository conventions

- This project uses ESM modules (`"type": "module"` in `package.json`), so new source files should use `import`/`export` syntax and extension-aware imports such as `./fetchFeed.js`.
- HTML is treated as untrusted feed content and is aggressively normalized before rendering. `parseIssue.js` strips `style` and `class` attributes and removes legacy `<font>` elements for cleaner email-safe markup.
- Email rendering is intentionally conservative: use plain HTML structures and CSS that survive mail clients, rather than modern frontend patterns.
- Special-case parsing is expected for PHP Weekly's feed markup. `parseIssue.js` explicitly ignores “How did you like this issue?” blocks, keeps sponsor sections separate from article sections, and renders a custom `jobs` block when the feed includes job listings.
- Local preview output is kept under `out/preview.html`; it is the easiest way to inspect visual changes without sending mail.
- State persistence is via `data/last-issue.json`, not a database. This file is treated as the source of truth for “already sent this issue” checks.
- Secret configuration is environment-based: `RESEND_API_KEY`, `TO_EMAIL`, and `FROM_EMAIL` are expected by the runtime and by the GitHub Actions workflow.

## Files worth checking first

- `README.md` for setup and local workflow expectations
- `src/cli.js` for the end-to-end orchestration and CLI flags
- `src/parseIssue.js` for the feed-to-structure transformation rules
- `src/render.js` and `templates/issue.eta` for the final HTML/email layout
- `.github/workflows/weekly.yml` for the scheduled production behavior
