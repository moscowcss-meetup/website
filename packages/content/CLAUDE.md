# @moscowcss/content — agent guide

`CLAUDE.md` and `AGENTS.md` in this folder are **identical**, kept in sync so any
agent (Claude, Cursor, …) reads either and gets the same rules — **edit both
together.** Repo-wide rules (pnpm-only, exact versions, Russian comments, git
discipline) live in the **root `CLAUDE.md`**, which wins on conflict. Below is
only what's specific to this package.

## What this is

The single home of all site content: Markdown files with frontmatter, split by
collection and then by language. Source-only — no build step. Exports `.`,
`./collections` (Astro content collections) and `./schema` (zod schemas).
`apps/website` re-exports the collections from its `content.config.ts`.

Decision record: `adr/001-content-model-md-relations.md`.

## Rules

- **Only `.md` files** for content. No `.mdx`, `.yml`, `.json`. Images live in
  `assets/` next to the collection (`speakers/assets/`, `organizers/assets/`,
  `talks/assets/` for talk `cover`s, the announcement cards; `cover` must match `ru`).
- **The schema is the single source of the shape.** Fields are defined in
  `src/schema.ts` only; do not make required fields optional to "ease" editing —
  the editor-facing answer is short flat fields and clear error messages.
- **Layout:** `src/<collection>/<lang>/<name>.md`, languages `ru` and `en`. A
  translation is the same path in the other language folder. The entry id is
  `<lang>/<name>`; a meetup number is the file name (`events/ru/31.md`).
- **Relations are stored in the talk only** (`event`, `speakers`) as short file
  names without the language (`event: "31"`, `speakers: [daria-egorova]`). Reverse
  lists are built at build time. Never write both directions.
- **Language-independent fields are duplicated in the translation** and checked
  against `ru` at build time (`apps/website/src/content/catalog.ts`, tests next to
  it). A mismatch fails the build with the file path and the field name.
- **Meetup date and time:** `date` is a day (`2026-07-09`, no time), `time` is the
  start in Moscow time (`"18:00"`, quoted). A date with a time is rejected: YAML
  would read it as UTC. Only the 2017 meetups (1–6) have no `time` and no
  `venue.address`: no source kept them, and the site then shows the date and
  the venue alone. Every new meetup has both.
- **Links are `https` only**; bodies are Markdown only (raw HTML or a non-`https`
  link fails the build — `apps/website/src/content/markdown-safety.ts`). Empty
  bodies of pages, talks and FAQ are errors.
- **Partner logo and QR are per partner:** `logo` is a file in `partners/assets/`
  (optional — the name is shown without it), `qrUrl` is the address the QR code
  encodes; the site draws the QR at build time. A speaker `photo` is optional too:
  without it the site generates an initials avatar (`@moscowcss/og`).
- **`draft: true`** keeps an entry off the site. A published meetup cannot
  reference a draft partner. The `new:*` templates start as drafts.
- **Organizers** (`organizers/<lang>/<name>.md`, photos in `organizers/assets/`):
  `status: current | past` is required and, like `contacts`, must match `ru`
  (the build fails with the file and the field). `contacts.telegram | channel |
  github | website` are optional `https` URLs, not a free list: the card prints only the
  filled ones in that order, with a short text taken from the URL. `photo` is
  optional and has no description: the name stands next to it, so the page uses an empty `alt`. There is no order field: organizers are equal, so
  the home page shows them in a self-playing looped slider, shuffled on every load. It shows
  `current` entries only; `past` ones are for a future about-page. Never invent
  data for people whose details are not provided.
- **Reviews** (`reviews/<lang>/<name>.md`, images in `reviews/assets/`): real words of real people,
  never invented; the Russian text is kept verbatim. `name`, `category` (`speaker | organizer |
  past-organizer | guest | partner`, must match `ru`, drives the wall's filter) and the body are required. `role`,
  `photo` (a portrait; without one the site draws initials) and `gallery` (`image` + translated `alt`,
  shown in the review window) are optional; `photo` and the gallery files must match `ru`. No order
  field: the wall shuffles on every load. The first paragraph goes on the sticker.
- **Meetup `tags`:** optional list of topics shown as falling tags in the Hero,
  next to the meetup modes. It is translated text, so it is not checked against `ru`.
- **New entries:** `pnpm new:event | new:talk | new:speaker | new:partner | new:faq | new:organizer | new:review`
  writes drafts in both languages from `templates/` (outside `src/`, so they are
  not content). Hand-made files are fine if they pass the same schema.
- **Russian text is the source of truth.** Do not edit Russian wording while
  moving content; the English text is a translation of the Russian meaning,
  names are transliterated.
- Collections: `pages`, `events`, `talks`, `speakers`, `partners`, `faq`,
  `organizers`, `reviews`, `documents`.
- **Archive gaps:** talk `time` and speaker `role` are optional because old meetups
  did not keep them — never fill them in from guesswork. Meetup `vkPhotosUrl` (vk.com/vk.ru) and
  `diskPhotosUrl` (Yandex Disk) link external photo albums, one or both, each checked by host; the registration link is hidden on past meetups.
- **`documents`** are standalone pages without a section prefix
  (`documents/ru/privacy.md` → `/privacy/`; also `about`, which ends with the Contacts section, and
  `speaker-guide`). Optional `topics` (`summary` + plain-text `items`) renders as a closed `Disclosure` after the body;
  `facts` + `contacts` (`lead`, cards with `title`, `text`, `links`) switch the page to the about layout.
- `README.md` here is for editors and is written in Russian; keep its field
  table in sync with `src/schema.ts`.

## Validate

```bash
pnpm lint            # from repo root
pnpm test            # catalog, schema and generator tests (they live in apps/website)
pnpm build           # website build loads every collection and validates it
```
