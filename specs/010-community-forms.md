---
id: "010"
title: Community forms: talk proposal, meetup feedback, question
status: draft
created: 2026-11-15
updated: 2026-11-15
supersedes: []
superseded_by: null
tasks: null
prd: null
---

# 010 — Community forms

## Problem

A talk proposal goes to a third-party form, feedback on a meetup has no place at all, and a question to a speaker
lives in the chat, where it gets lost. The community bot (`moscowcss-bot`) now has an HTTP API for all three, so the
site can be the front door: public forms that post to the bot and need no account.

## Decisions

- **Three forms, three documents.** `/cfp/` (talk proposal), `/feedback/` (meetup feedback), `/question/` (a question
  to a speaker or the organisers), and their `/en/` versions. Each is a `documents` entry with a new optional
  `form: cfp | feedback | question`, so title, description, intro text, SEO, sitemap, `llms.txt`, the Markdown twin and
  both languages come from the page machinery that already exists. `[document].astro` renders `FormPage` after the body.
- **Components.** `Field` (label, hint, control, per-field error) and `ChoiceGroup` (radio group in a `fieldset`) in
  `@moscowcss/ui`, with stories. The page-level `FormPage` composes them; all text is in the dictionary (`forms.*`).
- **No JavaScript, no form.** The page is static and submitting needs `fetch` and the captcha, so the form is `hidden`
  until the script reveals it; `noscript` shows the list of places to write to.
- **Contract.** Fixed by the bot: `POST {base}/forms/cfp|feedback|question`, JSON body = the fields +
  `turnstileToken` + the honeypot `website`, header `Idempotency-Key`; `GET {base}/public/events/current` for the
  meetup and its speakers. Answers: 201 / 200 `duplicate` / 202 accepted, 422 `fields` (shown under the matching
  field), 429, 403 `blocked` or `captcha_failed`, 5xx.
- **Delivery chain** (the bot's ADR, spec 005 of the bot). The bot has one base, `https://api.css.moscow` (nginx on
  the bot's server, no Cloudflare in front); a network error, a timeout (8 s) or 5xx retries it once with the same
  `Idempotency-Key`; a 4xx is never retried. The key lives as long as the
  content stays the same, so a manual retry after a failure reuses it and an edit starts a new one. If both fail the
  input stays and the page shows «Не получилось отправить форму. Напишите нам:» with the bot, VK, the chat and the
  three organisers.
- **One config module.** `apps/website/src/forms/config.ts` holds the base URL, the Turnstile sitekey and script,
  the timeout and the fallback links. The bot was deployed on 2026-11-15: the base is `https://api.css.moscow`, the
  sitekey is the production widget for css.moscow, and the fallback list links @MoscowCSS_bot. The plan of a
  Cloudflare-fronted base plus a direct one was dropped by the owner (DNS stays at reg.ru).
- **Spam.** Cloudflare Turnstile (explicit render, the page theme and language) and a honeypot `website`: out of the
  flow, `aria-hidden`, `tabindex="-1"`, not `display: none`. The widget's box is reserved, so the form does not move
  when the script loads.
- **CFP fields.** `contact`* (a Telegram handle or an email, one free string), `title`*, `theses`, `format`
  (`talk | standup | workshop | other`), `readiness` (`idea | theses | slides | presented`), `comment`, `consent`*
  with a link to the policy. There is deliberately no name field.
- **Feedback fields.** Anonymous, and the page says so. `attendance`* online or offline, `eventRating`* 1–5 and
  `eventComment`; the venue block (`venueRating`*, `venueComment`) exists only for offline and is left out of the
  request otherwise; then one block per speaker of the current meetup, each with a required rating. After success:
  «Спасибо, мы вам благодарны, приходите ещё!». With no current meetup (404) the page says so instead of a form.
- **Question fields.** `target`* speaker or organizers; for a speaker the current meetup's speakers fill a select
  (`eventId` and `speakerId` go with the request); `text`*, optional `contact`. With no current meetup only the
  organizers can be asked.
- **Privacy note.** A new section «Формы на сайте» in `/privacy/` (both languages): what is stored, why, where (a server
  in Switzerland), how long (a proposal is deleted after 12 months unless the organisers keep it), how to ask for deletion.
  The forms link to it.
- **Where the forms are linked.** A «Формы на сайте» card in the Contacts section of `/about/`. `/cfp/` replaced the
  Yandex form after the bot went live (2026-11-15) in the speaker guide, the help page and the FAQ on the home page. The header and the footer already hold their limit of links, and the
  pages are in the sitemap and `llms.txt` without extra code.
- **Errors.** Field errors sit under their field (`aria-describedby`, `aria-invalid`, the first invalid field takes
  focus); a status line announces the summary through a live region. The error colour token is below AA contrast on
  white, so the message stays in text colour with a bar of the error colour.

## Out of scope

- The bot itself, its storage and the moderation of what arrives.
- Headers or a CSP for Turnstile: GitHub Pages cannot set them.
- A retention period for feedback and questions: not decided, the policy says so.

## Acceptance

1. `/cfp/`, `/feedback/`, `/question/` and their `/en/` versions are public pages: canonical, hreflang, OG card, sitemap,
   Markdown twin; `pnpm lint`, `pnpm test`, `pnpm build`, `check:seo`, `check:a11y` and `build:storybook` pass.
2. The base URL and the sitekey appear in `apps/website/src/forms/config.ts` only.
3. The delivery chain, the response mapping, the idempotency key and the per-form payload are covered by unit tests:
   a 4xx is never retried, a 5xx or a network error retries once with the same key, the venue block is absent for online.
4. Honeypot is empty for people, out of the tab order and hidden from assistive technology.
5. With the bot unreachable the input stays and the fallback with all links shows.
