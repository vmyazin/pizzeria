# Pizzeria — Email-Controlled CMS Demo

A demo Astro site for a fictitious pizzeria (Giacomo's Pizza) that showcases an email-controlled CMS. The site renders content from JSON files and lets the “owner” update menu, hours, or about copy by emailing the system.

## What This Demonstrates

- A polished marketing site for a fictional pizzeria.
- Email-driven content updates (menu, hours, about).
- AI-assisted intent parsing for change proposals.
- A human-in-the-loop approval flow before changes are applied.

## Quickstart

```sh
npm install
npm run dev
```

Visit `http://localhost:4321`.

## Email CMS Flow

1. Owner emails an update request (menu, hours, or about).
2. The `/api/poll-email` endpoint reads unread emails via IMAP.
3. Gemini analyzes the email and proposes JSON updates.
4. A confirmation email is sent to the owner.
5. The owner replies with `YES` to approve.
6. The change is applied to `content/*.json` and can optionally push to GitHub and trigger a deploy.

## Content Files

- `content/menu.json`
- `content/hours.json`
- `content/about.json`

These files are the source of truth for the site content.

## Environment Variables

Create a `.env` file at the project root with:

- `GMAIL_USER`
- `GMAIL_APP_PASSWORD`
- `OWNER_EMAIL`
- `GEMINI_API_KEY`

Optional (for automated publish/deploy):

- `GITHUB_TOKEN`
- `GITHUB_REPO` (format: `owner/repo`)
- `VERCEL_DEPLOY_HOOK_URL`

## Run Email Polling

Manually trigger polling while running the dev server:

```sh
curl "http://localhost:4321/api/poll-email"
```

In production, this is intended to be called by a cron job or scheduler.

## Scripts

- `npm run dev` — local dev server
- `npm run build` — production build
- `npm run preview` — preview build

## Notes

This is a demo project intended to illustrate an email-controlled CMS workflow, not a production-ready CMS.
