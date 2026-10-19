# PHP Weekly, redesigned

Fetches each new [PHP Weekly](https://phpweekly.com) issue, reformats it into
a layout inspired by [JavaScript Weekly](https://javascriptweekly.com), and
emails it to you. Runs automatically every week via GitHub Actions.

## How it works

1. `src/fetchFeed.js` reads `phpweekly.com/rss.xml` (which redirects to
   PHP Weekly's Mailchimp campaign-archive feed). Each feed item already
   contains the full HTML of that issue.
2. `src/parseIssue.js` parses that HTML into structured sections and
   articles.
3. `src/render.js` renders the structured data into a redesigned HTML email
   (`templates/issue.eta` + `templates/styles.css`), with CSS inlined for
   email-client compatibility.
4. `src/send.js` sends it via [Resend](https://resend.com).
5. `src/cli.js` ties it together, and skips sending if the latest issue was
   already sent (tracked in `data/last-issue.json`).

## Setup

1. `npm install`
2. Create a [Resend](https://resend.com) account and API key.
3. In this repo's GitHub settings, add these repository secrets:
   - `RESEND_API_KEY`
   - `TO_EMAIL` — the address you want issues sent to
   - `FROM_EMAIL` (optional) — defaults to Resend's shared
     `onboarding@resend.dev` sender, which only works for the address
     registered to your Resend account. Set up and verify your own domain
     in Resend for anything else.

The GitHub Actions workflow (`.github/workflows/weekly.yml`) runs every
Thursday and can also be triggered manually from the Actions tab
("Run workflow").

## Local testing

Preview the redesigned layout without sending anything:

```
npm run convert -- --dry-run
open out/preview.html
```

Send a real test email (reads `RESEND_API_KEY`/`TO_EMAIL`/`FROM_EMAIL` from
a local `.env` file or the environment):

```
node src/cli.js --force
```

`--force` skips the "already sent this issue" check, which is otherwise
what makes the weekly cron safe to re-run without duplicate sends.
