# @moscowcss/ui — agent guide

`CLAUDE.md` and `AGENTS.md` in this folder are **identical**, kept in sync so any
agent (Claude, Cursor, …) reads either and gets the same rules — **edit both
together.** Repo-wide rules (pnpm-only, exact versions, Russian comments, git
discipline) live in the **root `CLAUDE.md`**, which wins on conflict. Below is
only what's specific to this package.

## What this is

The Astro **component library** (`@moscowcss/ui`). Source-only — no build step;
exports `.` and `./components/*`. Components are consumed by `apps/website` and
demoed in `apps/storybook`.

## Rules

- **Design tokens come STRICTLY from `@moscowcss/design-system`.** Import `vars`
  and `media` from it. In a component **never** write a raw hex colour, a raw
  `px`/`rem` size, a literal breakpoint, or reference the primitive `palette`.
  Colour → `vars.color.*`, spacing → `vars.padding.*` (inner) / `vars.spacing.*`
  (gaps/margins) / `vars.radius.*`, type →
  `vars.font.shorthand.*`, media queries → `media.*`, fixed component sizes →
  `vars.size.*`.
- **Padding and gaps are constant; only `vars.layout.inset|gap.*` grow with width**
  (ADR-002). Use `layout.*` only where the design grows the value. Inside a
  component's `@media` change structure (direction, columns, visibility) or swap one
  token step for another; never put a literal size there. If a size must change
  with width, add it to the scale tables in `@moscowcss/design-system`.
- **No user-facing text literals.** A component takes its text through props or
  slots; the website feeds them from the i18n dictionary or from content, so the
  same component serves `ru` and `en`.
- **One folder per component** under `src/components/<Name>/`: `<Name>.astro`,
  `<Name>.css.ts` (vanilla-extract), `index.ts`. `pnpm new:component`
  scaffolds all of it plus the story; by hand is fine if the result has the same
  shape (story and JSDoc included).
- **Props extend the native element with a single-source tag:**
  `const Tag = 'button'` + `interface Props extends HTMLAttributes<typeof Tag>`,
  rendered `<Tag>` with `class:list={[…, className]}` + `{...attrs}`. Declare only
  your **own** props; give each a short **Russian** `/** … */` JSDoc (Storybook
  autodocs reads it). Never a bare DOM type like `HTMLButtonElement['type']`.
- **Sizes that follow the designer's layout are `vars.adaptive.*`**, fixed ones are
  `vars.size.*`. Transitions and animations take duration and curve from
  `vars.motion.*` (no `ms`, `ease`, `cubic-bezier` literals); under
  `prefers-reduced-motion` they become instant, so the state must be visible
  without the motion.
- **Small interactive elements** (links, icon buttons, slider arrows, language
  switcher) have a hit area of at least `vars.size.hitTarget` (42px): enlarge the
  box or its padding, not the glyph. The `:focus-visible` ring is one global rule in the
  design system, so a component writes no `outline`; on a black block set
  `vars: { [vars.color.focus]: vars.color.focusOnInverse }`. `tools/visual/check-targets.mjs`
  checks this on the built site.
- **Components with logic** keep the DOM-free part in a plain `.ts`
  (`TagPile/pile.ts`: the pile layout, a pure function of the tags and a seed) with
  a `*.test.ts` next to it; the package has its own vitest suite
  (`pnpm --filter @moscowcss/ui test`, also run by `pnpm test`). Client scripts are
  `*.client.ts` and are initialised from the component's `<script>`.
- **Notable components:** `FallingDecor` (the falling springs or snowflakes over every page, `pointer-events: none`; grey and nearly transparent while over text, so they never hurt reading), `IconToggle` (icon button with `aria-pressed`), `DecorToggle` and `ThemeToggle` built on it (in the header from `tablet`, in the menu on phones; the choice lives in `localStorage`), `TagPile` (topic tags that fall into a pile; static and
  fully visible without JS or under reduced motion), `OrganizerCard` (portrait slot
  in an octagon, name, text from Markdown in the default slot, contacts; the contacts list may be empty),
  `CallToAction` (floating registration button, `position: fixed`,
  `mix-blend-mode: difference`), `Button` (link or button, `default` and `nav`
  sizes), `CardSlider`/`Card`/`BlockTitle` (FAQ block; `autoplayMs` makes the slider self-playing and looped, paused on hover, on focus and under reduced motion, `shuffle` randomises the cards: both used by the organizers), `MapDialog` (native modal `dialog` with the Yandex map, loaded on open, and links to Yandex, 2GIS and Google), `NavBar` (header and the
  full-screen menu; a link with `current` gets `aria-current`). The list pages (spec 007) use
  `CardGrid` (a `ul` whose `li` cells share one border line, like the designer's table; one
  column, or as many as fit from `tablet`), `SpeakerCard` (whole-card link: octagon photo, name,
  up to three meetup labels), `ArchiveRow` (the whole row is the title link, stretched by its `::after`; caption line, labels), `ArchiveFilter`
  (form `hidden` until the page script shows it) and `SectionTabs` (links between the lists).
- **Styles live only in the colocated `.css.ts`** — no inline `style="…"` with
  literal values.
- **Stories live in `apps/storybook/stories/`**, not here (`pnpm new:component`
  creates the story with the component).
- Source-only: Vite/Astro pick up changes live; nothing to build here.

## Validate

```bash
pnpm lint            # from repo root (or: pnpm --filter @moscowcss/ui lint)
pnpm --filter @moscowcss/ui test   # component logic such as TagPile/pile.ts
pnpm build           # website builds (consumes this package)
pnpm build:storybook # if components/stories changed
```
