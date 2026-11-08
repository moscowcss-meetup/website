# website — agent guide

`CLAUDE.md` and `AGENTS.md` in this folder are **identical**, kept in sync so any
agent (Claude, Cursor, …) reads either and gets the same rules — **edit both
together.** Repo-wide rules live in the **root `CLAUDE.md`**, which wins on
conflict. Below is only what's specific to this app.

## What this is

The Astro **community site**, static output, two languages (`ru` at `/`, `en`
under `/en/`). Consumes `@moscowcss/content`, `@moscowcss/og`, `@moscowcss/ui`,
`@moscowcss/icons`, `@moscowcss/fonts` and `@moscowcss/design-system`.
Decisions: `specs/001-blog-like-architecture.md`, `adr/001-*.md`, `adr/002-*.md`.

```
src/
├── i18n/       # config.ts (locales), ui.ts (UI dictionary, ru is the source), URL helpers
├── content/    # catalog.ts (relations + validation), archive.ts + archive-filter.ts (lists), format.ts, markdown-safety.ts
├── seo/        # pages.ts (public pages), og.ts (card input), jsonld.ts (schema.org), sitemap.ts (sitemap + robots)
├── layouts/    # BaseLayout: canonical, hreflang, og/twitter tags
├── pages/      # [...locale]/ (home, events, talks, speakers, search), og/ and avatars/ (images),
│               # 404.astro (one bilingual page for GitHub Pages), sitemap.xml.ts, robots.txt.ts,
│               # [...locale]/rss.xml.ts (feed), [icon].ts (favicon set + manifest, from @moscowcss/og)
├── sections/   # homepage sections
├── components/ # page-level pieces that are not reusable UI (EntityPage, ArchivePage, …)
├── archive/    # filter.client.ts: the filter of the list pages
├── search/     # Pagefind client
├── rss/        # feed.ts: per-language meetup feed (/rss.xml, /en/rss.xml)
├── agents/     # markdown.ts (index.md of every page), discovery.ts (llms.txt, skill, ARD), webmcp.ts, archive-data.ts
└── test/       # fixtures for tests
scripts/        # check-seo, seo-checks (SEO gate over dist), new-entry (new:* generator), content-report (docs/todo tables)
```

## Rules

- **No raw design values in pages.** Compose from `@moscowcss/ui` components;
  when you must write CSS, go **strictly** through `@moscowcss/design-system`
  tokens (`vars` / `media`) — never raw hex, `px`, or literal breakpoints.
- **No user-facing text literals in `.astro` files.** Strings come from the
  dictionary `src/i18n/ui.ts` or from content. A new key goes into `ru` first;
  every other locale must cover all keys (`ui.test.ts` checks it). The locale
  list lives in `src/i18n/config.ts` **and** `astro.config.mjs` — keep them in
  sync.
- **Sizes in `rem` through tokens**, no `px` in `.css.ts`, no literal sizes
  inside `@media` (structure only). Constant inner padding is `vars.padding`;
  `vars.layout.*` only where the value grows with width.
- **Import `@moscowcss/fonts` once** at the page/layout root (side-effect CSS).
- `astro.config.mjs` registers the **vanilla-extract Vite plugin** and the
  `markdownSafety` integration — keep both. The plugin
  (`src/content/markdown-safety.ts`) fails the build on raw HTML in content and on
  any `href`/`src` that is not `https:`/`mailto:` after URL resolution. Check
  stays on the parsed tree (hast), never regexes over the source.
  The plugin also opens external links in a new tab (`target="_blank"`,
  `rel="noopener noreferrer"`). Rendered content is cached in
  `.astro/data-store.json` and `node_modules/.astro/`: after changing a Markdown
  plugin or a content schema (`packages/content/src/schema.ts`), stop the dev server and delete those files,
  or unchanged content keeps the old HTML and the old parsed frontmatter locally: an entry is re-parsed only
  when its file changes, and a dev server running during the schema change caches it without the new fields
  (CI starts clean).
- `site` is `https://css.moscow`, `trailingSlash: 'always'`: canonical, hreflang
  and internal links are absolute/with a trailing slash.
- **Content entries** are created with `pnpm new:event | new:talk | new:speaker |
  new:partner | new:faq | new:organizer | new:review` (drafts, `ru` + `en`, never overwrite); hand-made
  entries are fine if they pass the schema. Content lives in `@moscowcss/content`; the page code only
  reads it through `src/content/catalog.ts`.
- **Organizers** are read through `src/content/organizers.ts`
  (`organizersByStatus`, `contactsOf`: pure, tested) and rendered by
  `sections/OrganizersSection.astro` after the FAQ with `OrganizerCard`; only
  `status: current` shows on the home page, in a `CardSlider` with `shuffle` and `autoplayMs`. The agent Markdown twins and JSON-LD do
  not list organizers yet.
- **Hero and the floating button.** The Hero shows the meetup modes and its
  `tags` as a `TagPile`; the floating `CallToAction` renders only for an upcoming
  meetup with `registrationUrl` (label `hero.register`, accessible name
  `hero.registerLabel`). To see it, build with `BUILD_NOW` set before that
  meetup's date. A past meetup has no button; `data-visual="navbar"` captures only
  the sticky top row of the header.
- **Meetup date** is `date` (a day) + `time` (Moscow time). "Nearest meetup" is
  computed at build time; a meetup stays "upcoming" for 4 hours after its start.
  `BUILD_NOW=<ISO date>` pins "now" for **visual snapshots only**; it is in
  `turbo.json` `build.env` and must never be set for a real build.
- **Lists** (spec 007): `/events/`, `/talks/`, `/speakers/` and their `/en/` versions are public
  pages of kind `list` (no content entry: title and description come from the dictionary),
  rendered by `components/ArchivePage.astro`. The rows come from `archiveOf` in
  `src/content/archive.ts`: meetups and talks newest first (talks of one meetup in programme
  order), speakers by their latest talk, once each, speakers without talks last by name. A meetup
  label is its number, or its year when the file name is not a number (`online-2021`). The filter
  (`src/content/archive-filter.ts`: words without case and `ё`, year, recording) is one pure
  function for the page script and WebMCP; the state lives in the address (`?q=&year=&media=1`).
  Without JavaScript the whole list shows and the filter form stays `hidden`. The rows of a
  language are also `/archive.json` (`/en/archive.json`), linked from every page's head.
- **Programme of a meetup** is one component, `components/ProgramList.astro`, on the home page (`ProgramSection`) and on the meetup page (`EventSchedule`): time, speaker avatar, title, description. The whole row links to the talk through the stretched `::after` of the title link; speaker names and links in the description sit above it (`zIndex.ring`) and lead to their own pages.
- **Meetup and speaker pages** share `components/DetailPage.css.ts`: a hero in the home page's language (dashed chip,
  big title, blue date, slash list, coloured topic pills, pill links), the programme via `ProgramList`, talk cards
  (`TalkCard`) on the speaker page and a meetup `gallery` opened in `Lightbox` (`@moscowcss/ui`). A speaker portrait is
  an octagon over a shifted pink one; only a real photo opens large.
- **Talk page** shares the same language: meetup chip, big title, speakers as rectangle links with octagon avatars,
  the cover opening in `Lightbox`, the description panel and the other talks of the meetup as `TalkCard`s.
- **404** (`pages/404.astro`): one bilingual page; CSS properties that hide an element fall in a `TagPile` over a
  huge 404, with a broken `display: none` rule and pill-free rectangle links.
- **Build images in dev**: `/og`, `/covers` and `/avatars` routes find their data by URL, not by props (the Astro 7
  dev server passes no props to endpoints with an extension in the param), and `src/middleware.ts` adds the trailing
  slash the dev server needs. Both are no-ops in the static build.
- **Partner block** on the home page: `sections/PartnerSection.astro` by default; a partner with `look: school21`
  gets `sections/SchoolPartnerSection.astro` instead (dark plate, green pill buttons, rounded stat cards, pixel motif of
  their logo). Its colours are the `color.school*` tokens and stay the same in both site themes.
- **Reviews** (spec 008): `/reviews/` and `/en/reviews/` are public pages of kind `reviews` (title
  and description from the dictionary), rendered by `components/ReviewsPage.astro`. A language gets
  the page and the header and footer links only with a published review. `src/content/reviews.ts`
  holds `publishedReviews`, `reviewCategories` (buttons of the filter, state in `?category=`) and `previewOf` (first paragraph cut at a word boundary, not a CSS clamp:
  that hides text under increased spacing, WCAG 1.4.12). No `Review` schema.org markup on purpose.
  A review whose `speaker` has `founder: true` gets the badge `speaker.founder` in the `color.founder` violet (sticker
  and window, `badge` prop); the speaker page shows the same filled chip. The flag lives on the speaker only.
- **Talk covers.** Every talk gets one generated cover in a single style, `/covers/<lang>/<talk>.png`
  (`pages/covers/[...path].ts`, `renderTalkCover` from `@moscowcss/og`, inputs from `talkCoverSourceOf`): the title in
  a red-to-brown gradient, the speakers and the meetup label on white, the first speaker's photo in colour (TBD
  without one) with the grey-and-red stars. It shows on the talk page and the cards and is the talk's OG and Twitter
  card. The talks' `cover` files (old announcement cards) stay in content but are no longer displayed.
- **Header** links go across the site, not to home sections: History (`/events/`), Talks,
  Speakers, Reviews (only with a published review), About (`/about/`, which also holds the Contacts section), Search (`src/layouts/nav.ts`); the current section gets
  `aria-current`. Registration is the floating button.
- **Footer** (`@moscowcss/ui` `Footer`, wired in `BaseLayout`): the star links home, then the speaker guide (new tab),
  the policy page and the Telegram channel (`src/layouts/footer.ts`), and `© 2015–<build year>`. 2015 is the year the community began; the
  end year is Moscow time at build, so the nightly rebuild turns it over. The body is a flex column, so the footer
  stays at the bottom of a short page. `data-floating-cta` on the floating button makes the footer leave room for it.
- **About page** (`/about/`): a document with `contacts` renders through `components/AboutPage.astro` in the meetup
  page's language: chip, big title, `facts` after slashes, counts of meetups, talks and speakers with plural labels and a
  strip of recent meetup photos (`aboutStatsOf`, `aboutPhotosOf`, `pluralFormOf` in `src/content/about.ts`, tested), the
  body in a dashed panel and contact cards in `#contacts` with pill links.
- **Help page** (`/help/`): a document with `help` renders through `components/HelpPage.astro` in the about page's
  language: numbered need cards with outlined `01…`, reach numbers from content next to the archive counts
  (`aboutStatsOf`), an offer list, the venues of past meetups falling in a `TagPile` (`venuesOf` in
  `src/content/help.ts`, tested: newest first, once each, online-only meetups skipped) and a black contact block. The
  footer links it on every page; the FAQ and the about page have a card for it.
- **Speaker guide** (`/speaker-guide/`, a document with `topics` as a `Disclosure`) opens in a new tab from the
  footer and from any content link: `NEW_TAB_PATHS` in `src/content/markdown-safety.ts`, so a reader returns to the
  form or the FAQ.
- **Documents** (`documents` collection) render at `/<name>/` via
  `pages/[...locale]/[document].astro` and are public pages in `src/seo/pages.ts`
  (kind `document`, no JSON-LD). The meetup page hides the registration link once
  the meetup is past (`src/content/event-links.ts`, "now" from `src/content/now.ts`).
- **Legacy addresses** of the old site (`/28.html`, `/29.html`, `/30.html`,
  `/personal-data.html`, `/personal-data/` + `/en/personal-data/` where the
  policy lived before `/privacy/`, and `/contact/` + `/en/contact/`, now the Contacts section of `/about/`) are noindex stub pages with a meta refresh to the new
  address: one `pages/<name>.html.ts` per address, table and HTML in
  `src/seo/legacy.ts`. Not a `[legacy].html` dynamic route: Astro 7 loses its
  param.
- **The build is not cached** (`turbo.json` here: `build.cache=false`) because it
  depends on the current date.
- Every indexable page needs the full SEO set; `pnpm check:seo` verifies the
  built `dist` and CI runs it.
- Headings go in order (`h1` → `h2` → `h3`, no skipped level): section titles
  are `h2` (`BlockTitle`), cards inside them are `h3`. Agents and screen readers
  read a skipped level as a missing section.
- Structured data is built in `src/seo/jsonld.ts` from the same catalog as the
  page: `Organization` + `WebSite` on home, `Event` on a meetup, `Person` on a
  speaker. Event times are written in Moscow time with `+03:00`.
- **RSS** is one feed per language (`/rss.xml`, `/en/rss.xml`), like the blog:
  one item per published meetup, newest first, `pubDate` = meetup start. The
  feed route takes its language from the URL, not from `props` (Astro gives an
  extension endpoint under `[...locale]` the first path's props). `check:seo`
  checks the head links, the feed language and that every item link is a page.
- **Icons** (`favicon.ico`/`.svg`, `apple-touch-icon.png`, manifest + 192/512) are
  drawn at build time from the MoscowCSS star in the brand red (`color.brand`,
  as the Hero star): `src/seo/icons.ts` lists them, `@moscowcss/og` renders them.
- **Agent access** (spec 003). Every public page has a Markdown twin
  `<path>/index.md` (`pages/[...path]/index.md.ts`, built by `src/agents/markdown.ts`
  from the same catalog as the HTML) and links it with
  `rel="alternate" type="text/markdown"`. `/llms.txt`, the skill
  (`/.well-known/agent-skills/`), the ARD catalog (`ai-catalog.json`, `ard.json`)
  and `robots.txt` (`Content-Signal`, `Agentmap`) come from `src/agents/discovery.ts`
  and `src/seo/sitemap.ts`. Every page registers WebMCP tools `search_site`,
  `get_page_markdown`, `list_archive`, `get_next_meetup` and `get_contacts` (`src/agents/webmcp.ts`). The last three
  read `archive.json`: the list rows, plus `reviews`, `contacts` (from the about page) and `next`, the upcoming meetup at
  build time (`nextMeetupOf` in `src/content/archive.ts`; the tool re-checks the start against the clock).
  `list_archive` filters exactly by speaker, meetup, topic and review category through `matchesRelation`
  (`src/content/archive-filter.ts`). The search form is the declarative tool `search_page`. GitHub Pages cannot set headers, so there is no
  `Accept: text/markdown` negotiation, no `Vary`/`Link` headers and no Markdown
  404. The Pages upload keeps `/.well-known/` only with `include-hidden-files: true`
  in `deploy.yml`. `check:seo` checks the Markdown links, the `llms.txt` and catalog
  links and the skill digest.
- Tests are vitest (`vitest.config.ts` uses `getViteConfig`, so they see the same
  plugins as the build); `astro:content` is mocked with `vi.mock`.
- Theme is **colour-only**: OS preference until the visitor presses `ThemeToggle`, then `data-theme`
  on `<html>`, set before the first paint by the inline `themeInitScript` in `BaseLayout` — see `@moscowcss/design-system`.

## Validate

```bash
pnpm dev:site                     # local dev server (no search index in dev)
pnpm test                         # from repo root: vitest
pnpm build                        # astro build + Pagefind index (must pass)
pnpm --filter website check:seo   # SEO gate over dist, after the build
# hit areas of the header, menu, slider, language switcher and footer (preview must run):
node tools/visual/check-targets.mjs http://127.0.0.1:4321/
```
