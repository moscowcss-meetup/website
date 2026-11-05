# CLAUDE.md

Rules of engagement for any AI agent (and human) working in this repository.
Read this file **fully** before running commands or writing code. When a rule
here conflicts with a habit or a default, this file wins.

**Agent files are everywhere and synced.** This root file holds **repo-wide**
rules. **Every package and app** additionally carries its own `CLAUDE.md` **and**
`AGENTS.md` (in `packages/*/` and `apps/*/`) with that unit's specific rules —
and within each folder the two files are **byte-identical**, so any agent reads
either. Keep them in sync: when you edit one, edit its twin. The nearest
package/app file governs local detail; this root file wins on conflict.

---

## 1. What this repo is

A Turborepo monorepo (pnpm workspaces) hosting the MoscowCSS community website
built with **Astro**: two languages (`ru` at `/`, `en` at `/en/`), content as
Markdown files in a dedicated package, build-time OpenGraph cards, search, plus
a component library, a Storybook, and shared tooling. Styling is done with
**vanilla-extract** on top of a two-layer, theme-aware design-token system.

Decision records: spec `specs/001-blog-like-architecture.md`,
`adr/001-content-model-md-relations.md` (content model),
`adr/002-adaptive-scale-and-root-size.md` (responsive scale). Read them before
changing the architecture they describe.

```
.
├── apps/
│   ├── website/          # the site itself (Astro)
│   │   ├── src/i18n/     #   locales, UI dictionary (ru is the source), URL helpers
│   │   ├── src/seo/      #   public page list, OG card input, meta tags
│   │   ├── src/content/  #   catalog (relations + validation), Markdown safety plugin
│   │   ├── src/layouts/  #   BaseLayout: canonical, hreflang, og/twitter tags
│   │   ├── src/pages/    #   [...locale]/ routes (home, events, talks, speakers, search), og/ cards
│   │   ├── src/sections/ #   homepage sections
│   │   └── scripts/      #   check-seo (gate over dist), new-entry (new:* content generator)
│   └── storybook/        # component demo (@storybook-astro/framework)
├── packages/
│   ├── content/          # all site content: .md files per collection and language + zod schema
│   ├── og/               # build-time OG/Twitter cards, speaker avatars, site icons (satori + sharp)
│   ├── ui/               # Astro components + their vanilla-extract styles (own vitest suite)
│   ├── design-system/    # the design-token system: palette + semantic vars + scale tables + layout/typography/motion/adaptive tokens + breakpoints
│   ├── icons/            # source SVGs -> SVGO-cleaned, generated .astro icon components
│   ├── fonts/            # @font-face css + font files: Montserrat, Inter, JetBrains Mono, Jost, Golos Text (font *loading*, not the font tokens)
│   ├── eslint-config/    # shared flat ESLint config (single source of truth)
│   └── typescript-config/# shared tsconfig bases (single source of truth)
├── tools/visual/         # screenshot capture/compare for visual regression + check-targets.mjs, the hit-area gate (not a workspace package)
├── adr/, specs/, plans/  # decision records, specs, task queues
├── docs/deploy.md        # one-off GitHub Pages and DNS setup
├── .github/workflows/    # deploy.yml: every check on push/PR, Pages deploy, nightly rebuild
├── plop-templates/       # generator for new:component
├── turbo.json
├── pnpm-workspace.yaml
├── .npmrc
└── package.json
```

Workspace package names use the `@moscowcss/*` scope: `@moscowcss/content`,
`@moscowcss/og`, `@moscowcss/ui`, `@moscowcss/design-system`, `@moscowcss/icons`,
`@moscowcss/fonts`, `@moscowcss/eslint-config`, `@moscowcss/typescript-config`.

---

## 2. Golden rules (non-negotiable)

1. **pnpm only.** Never run `npm install` / `yarn`. Never hand-edit a lockfile.
2. **Always install the latest version.** Add every dependency with
   `pnpm add <pkg>` (or `pnpm add -D <pkg>`) so the current published version is
   resolved. **Never** type a version range into `package.json` by hand, and
   **never** pin a version from memory — you don't know what is current, `pnpm`
   does.
3. **Exact versions, no ranges.** `.npmrc` sets `save-exact=true` and
   `save-prefix=''`, so `pnpm add` writes exact versions (`"astro": "5.13.2"`,
   not `"^5.13.2"`). Keep it that way.
4. **Install into the package that uses it.** Run `pnpm add` from inside the
   target package directory, or use `pnpm --filter <pkg> add <dep>`. Shared
   tooling that every workspace uses (turbo, prettier) lives at the root with
   `pnpm add -Dw`.
5. **Internal deps use the workspace protocol:** `"@moscowcss/ui": "workspace:*"`.
6. **Tooling config has exactly one home.** ESLint and TypeScript settings live
   in `packages/eslint-config` and `packages/typescript-config`. Every other
   package *extends* those. If a rule needs changing globally, change it there.
   Only add local overrides when something is genuinely unique to that package.
7. **Never downgrade the recommendation.** No "this is just a demo / MVP /
   student project" shortcuts. Always the current best-practice setup.
8. **`pnpm lint`, `pnpm test` and `pnpm build` must pass** before you consider a
   task done.
9. **Agents own git end to end: commit, push, merge.**
   - Commit as you go, one coherent change per commit: a finished task or a
     self-contained step of it, never a half-done state. The checks that the
     change touches (`pnpm lint`, `pnpm build`, `pnpm test`) pass before the
     commit; the husky `pre-commit` hook re-runs lint and build.
   - Branch for multi-step work so `main` stays deployable (every push to
     `main` deploys the site); push, open a PR or merge into `main` when the
     work is done and green. Prefer a squash merge when the branch has commits
     that are broken on their own.
   - Message in English, Conventional Commits (`feat:`, `fix:`, `chore:`,
     `refactor:`, `docs:`, `test:`, `ci:`), subject says what changed, body says
     why. Stage files explicitly — no `git add -A` that sweeps in stray files.
   - Never commit secrets, `.env` files, build output or generated artefacts
     (`dist/`, `packages/icons/src/generated/`, `.visual/`).
   - No force-push and no rewriting of history that is already pushed: others
     may have built on it.

---

## 3. Package manager & dependency policy

`.npmrc` (do not remove these lines):

```properties
save-exact=true
save-prefix=''
```

Adding dependencies:

```bash
# a runtime dep in the website
pnpm --filter website add <pkg>

# a dev dep in the ui package
pnpm --filter @moscowcss/ui add -D <pkg>

# a repo-wide dev tool (turbo, prettier, syncpack…)
pnpm add -Dw <pkg>

# link an internal package
pnpm --filter website add @moscowcss/ui@workspace:*
```

A release is installed only 3 days after publication (`minimumReleaseAge` in
`pnpm-workspace.yaml`). The repo works on Windows, macOS and Linux: no POSIX-only
commands in scripts, LF everywhere (`.gitattributes`).

Node & pnpm:

- Node: use the **current LTS** (pinned for CI in `.nvmrc`). The hard floor is
  **>= 22.23.4**, the strictest `engines` among the installed tools (Astro 7);
  root `engines.node` states it. Node 25+ does not ship Corepack: install it once
  per Node version with `npm i -g corepack && corepack enable`.
- Pin pnpm via Corepack — run `corepack use pnpm@latest` once; it writes the
  `packageManager` field. Do not guess/pin a pnpm version by hand.

---

## 4. Scripts (run from repo root)

| Script                | What it does                                                        |
| --------------------- | ------------------------------------------------------------------- |
| `pnpm dev`            | Runs the **website** (:4321) and **Storybook** (:6006) together.    |
| `pnpm dev:site`       | Runs only the **website** dev server (Astro).                       |
| `pnpm storybook`      | Runs **Storybook** for the UI components.                           |
| `pnpm build`          | Production build of the **website** (`astro build` + Pagefind index). |
| `pnpm build:storybook`| Static Storybook build (for deploy).                                |
| `pnpm lint`           | Lints **and** applies safe autofixes across all packages.           |
| `pnpm test`           | Runs every package's vitest suite through turbo.                    |
| `pnpm --filter website check:seo` | Gate over the built `dist` (run after `pnpm build`). |
| `pnpm check:a11y`     | WCAG 2.2 A and AA gate over the built `dist`: axe, keyboard, menu, reflow, both themes. |
| `pnpm new:component`  | Scaffolds a new component in `packages/ui` + its story (plop).      |
| `pnpm new:event <number>` | Draft event files in `packages/content`, `ru` and `en`.         |
| `pnpm new:talk <name>`    | Draft talk files, `ru` and `en`.                                |
| `pnpm new:speaker <name>` | Draft speaker files, `ru` and `en`; no photo means an initials avatar. |
| `pnpm new:partner <name>` | Draft partner files, `ru` and `en`.                             |
| `pnpm new:faq <name>`     | Draft FAQ entry files, `ru` and `en`.                           |
| `pnpm new:organizer <name>` | Draft organizer files, `ru` and `en`; the editor fills `status` and `contacts`. |
| `pnpm --filter @moscowcss/ui test` | The UI package's own vitest suite (pure logic, e.g. the `TagPile` layout in `pile.ts`). |
| `node tools/visual/check-targets.mjs [url]` | Hit-area gate over the built site at 375 and 1440 (needs `astro preview` and `CHROMIUM_PATH`). |

Notes:

- `lint` = ESLint with `--fix`: autofixable issues are fixed, the rest are
  reported (non-zero exit). There is no separate "fix" script by design.
- `dev`/`storybook` are long-running (Turborepo `persistent`, uncached).
- `@moscowcss/ui` and `@moscowcss/fonts` are **source-only** packages (they export
  `.astro` / `.css.ts` / `.css` directly, no build step), so their changes are
  picked up live by the website's and Storybook's Vite dev servers.
- `@moscowcss/icons` **does** have a build step (SVG → generated `.astro`), so the
  website/storybook `build` depends on it topologically via `^build`.
- `@moscowcss/ui` has a `test` script (`vitest run`), so `pnpm test` covers it.
  Component logic that needs no DOM (layout, ordering) goes into a plain `.ts`
  next to the component and is tested there.
- `@moscowcss/content` and `@moscowcss/og` are source-only too. `og` has a `test`
  script (`tsc --noEmit && vitest run`); `content` is validated by the website
  build and tests.
- The `new:*` content generators are `apps/website/scripts/new-entry.mjs`, fed by
  templates in `packages/content/templates`. They never overwrite: an existing
  file means exit code 1 and nothing is written. New files are drafts
  (`draft: true`); editors fill them in and flip the flag.
- **The website build is never cached** (`apps/website/turbo.json`): it depends on
  the current date (which meetup is "next"), so a cached `dist` would be stale.
- `BUILD_NOW` (an ISO date, e.g. `2026-07-01`) pins "now" for the homepage. It is
  for visual snapshots only, never set it for a real build. It is declared in
  `turbo.json` `build.env`, otherwise turbo's strict env mode drops it.
- `pnpm lint` does not cover `tools/visual`; keep that tooling readable by hand.

---

## 5. Design tokens & theming (the heart of the system)

Tokens live in the dedicated **`@moscowcss/design-system`** package
(`packages/design-system/src`) and are the *only* place values are defined.
Components never contain raw hex colours, raw pixel sizes, or literal
breakpoints. `@moscowcss/ui` **consumes** these tokens; it does not define them.
The responsive model is recorded in `adr/002-adaptive-scale-and-root-size.md`.

### Two layers

1. **Primitive palette** — raw values, named by *what they are*
   (`palette.green = '#70DC55'`). Plain TS constants in `palette.ts`.
2. **Semantic contract** — named by *what they mean*
   (`vars.color.success` → `palette.green`). Components consume **only** this
   layer.

### Each concern is its own file

The semantic tokens are split by concern so each group is self-contained (it owns
its contract slice **and** its values — `colors` splits `light`/`dark`, the rest
expose a single theme-independent `values`), then assembled into one theme:

- **palette** (`palette.ts`) — the primitives.
- **semantic colours** (`colors.ts`) — `vars.color.*` mapped from the palette.
- **scale** (`scale.ts`) — the single source of the numbers: "base + overrides
  per breakpoint" tables in `rem` (`typeScale`, `space`, `layoutSpace`) and a
  resolver, covered by `scale.test.ts`. The themes generate their CSS variables
  and `:root` media queries from these tables. A table may override on any of
  the steps `tablet`, `laptop`, `desktop`, `wide`, `desktopLarge` (`widthSteps`;
  `wide` = 1440px sits between `desktop` and `desktopLarge`).
- **spacing** (`spacing.ts`) — a t-shirt scale (`xs`…`4xl`) split into two
  semantic groups over the same values: `vars.padding.*` (inner padding) and
  `vars.spacing.*` (gaps/margins between elements), plus `vars.radius.*`. These
  steps are **constant at every width**: a component's inner padding never
  changes with the window.
- **layout** (`layout.ts`) — `vars.layout.inset.*` and `vars.layout.gap.*`: the
  ladders that *do* grow with width (the former responsive `m`/`l`/`xxl`). Use
  them only where the design says the value grows; everything else uses
  `padding`/`spacing`.
- **typography** (`typography.ts`) — `vars.font.*` **tokens** (the font
  shorthands). These are *not* the font *loading*: `@font-face` + files live in
  `@moscowcss/fonts`. The family names here must match that package.
- **adaptive** (`adaptive.ts`, table `adaptiveScale` in `scale.ts`) —
  `vars.adaptive.*`: component dimensions that follow the designer's layout
  (button and card paddings, nav and hero gaps, floating-button size, slider
  arrows, card and organizer widths, line heights). Each entry is "base + the
  steps where the value changes"; `themes/adaptive.css.ts` emits the base and the
  `:root` media overrides. Use it instead of a literal inside `@media`; keep
  `vars.size.*` for fixed sizes that never change with width.
- **motion** (`motion.ts`) — `vars.motion.duration.*` and `vars.motion.easing.*`.
  Every transition and animation takes its duration and curve from here; no
  `120ms`, `ease` or `cubic-bezier(…)` in a component. `themes/motion.css.ts`
  zeroes the durations under `prefers-reduced-motion: reduce`.
- **size tokens** (`spacing.ts`) — `vars.size.*` are fixed sizes. `vars.size.hitTarget`
  (42px) is the minimum hit area of every small interactive element (links, icon
  buttons, slider arrows, language switcher): enlarge the box, not the glyph, and
  give it a `:focus-visible` outline of at least `vars.border.width.thin` in
  `vars.color.focus` comes from one global rule (`themes/focus.css.ts`), components write no `outline` of their
  own; a block with a black background only swaps the token to `focusOnInverse`. `tools/visual/check-targets.mjs` enforces it on the built site.

`contract.ts` assembles the slices into `vars`; the per-concern appliers in
`themes/` apply them — colour per theme, padding/radius/typography once on
`:root`. **Each concern applies its own tokens *and* owns its adaptive** in its
own file (`themes/colors.css.ts`, `themes/spacing.css.ts`,
`themes/layout.css.ts`, `themes/typography.css.ts`, …), so no single theme file
bloats with every concern's responsive rules; `themes/index.css.ts` imports them
all.

**Root font size.** All sizes are `rem` (no `px` in `.css.ts`). `themes/root.css.ts`
sets `html { font-size: max(100%, 100vw / 120) }`: up to 1920px it equals the
browser setting (16px by default), above that the whole interface scales in
proportion to the window (32px at 3840px). `@media` thresholds are in `rem` of the
browser font, so they do not move with the root size.

### Tooling choice

Use vanilla-extract's **`createGlobalThemeContract`** (not `createThemeContract`)
so the emitted CSS custom properties get **readable, stable names** like
`--padding-l` and `--font-shorthand-caption` instead of hashed ones. The naming
mapper turns the token path into the variable name (`padding.l` →
`--padding-l`).

**The theme switch affects colour and nothing else.** Padding, radius and
typography are theme-independent — `themes/spacing.css.ts` and
`themes/typography.css.ts` set them **once** on `:root` via
`createGlobalTheme(':root', vars.padding | vars.radius | vars.font, …)`. Do
**not** re-emit them per theme. Width-driven changes (font sizes, `layout.*`)
come from the scale tables as `:root` media overrides, never from the theme.

Colour is the only slice with a light/dark distinction:

- `createGlobalTheme(':root', vars.color, light)` — light is the base.
- `@media (prefers-color-scheme: dark)` on `:root` applies the **dark** colours
  automatically (OS preference).
- `:root[data-theme="dark"]` / `:root[data-theme="light"]` force a theme (manual
  toggle wins over OS). Both override **only** the `--color-*` vars.

The dark theme is graphite, not black (`dark` in `colors.ts`, spec 005). The partner block and
organizer cards stay black in both themes, the cards inside the partner block turn graphite with a light edge; `colors.test.ts` checks the contrast of the token pairs.
Without a saved choice the site follows `prefers-color-scheme`; `ThemeToggle` writes `data-theme` and
`localStorage`, and an inline script in `<head>` applies the choice before the first paint.

### Breakpoints are special

CSS media queries **cannot** read `var()`. So breakpoints (and anything used
inside `@media`) are **build-time TS constants** in `breakpoints.ts`, imported
into `.css.ts` files. Everything else (spacing, colour, radius, typography) is a
runtime CSS variable from the contract. Do not try to put breakpoints in the
contract.

`breakpoints.ts` exports named breakpoints (`mobile` / `tablet` / `laptop` /
`desktop` / `wide` / `desktopLarge`, in `rem`; `wide` = 1440px is where the full header fits on one line and where the designer's layout takes its desktop step) and a **`media`** map of ready-made
media-query strings for those names. In components use **`media`** as the
`@media` key — don't hand-write `(min-width: …)`.

**`@media` in a component is for structure only** (direction, columns,
visibility, swapping one token step for another). Sizes, gaps and fonts are
never literals inside it: a value that has to change with width becomes an entry
in a `scale.ts` table (or a `vars.size.*` token) and the component references
the var.

### Typography is responsive by var-indirection

`fonts.ts` holds the family/weight primitives (`fontFamily.{display,sans,mono,logo,text}`,
`fontWeight.*`). The `font` contract has three parts: **`size`** (rem values),
**`shorthand`** (a ready `font:` value per role), **`letterSpacing`**. A component
sets `font: vars.font.shorthand.h1` (+ optional `letterSpacing`). Roles:
`h1`/`h2`/`h3` = display (Montserrat), `body`/`caption` = sans (Inter), `ui` = mono
(JetBrains Mono); the designer's layout adds `logo` = Jost (header logo, hero chip
and the huge hero title) and `text` = Golos Text (hero lead and body text), plus
JetBrains Mono Light for the small header lines. The keys of `font.size` and
`font.shorthand` are generated from `typeScale`, so a new role starts as a row in
`scale.ts` and a shorthand in `typography.ts`.

The trick: each `shorthand` embeds its **size var** (`… var(--font-size-h1) …`),
so `themes/typography.css.ts` makes type responsive by overriding **only** the
size vars per breakpoint — the overrides are generated from `typeScale` in
`scale.ts`, the shorthands follow automatically. Never redefine a whole
shorthand per breakpoint.

### The rule for components

```ts
// ✅ correct — semantic vars + media query from the `media` map
import { vars, media } from '@moscowcss/design-system';
export const card = style({
  padding: vars.padding.l,
  gap: vars.spacing.m,
  color: vars.color.success,
  font: vars.font.shorthand.caption,
  '@media': { [media.laptop]: { flexDirection: vars.flexDirection.row } },
});

// ❌ forbidden in a component
export const card = style({ padding: '16px', color: '#00FF00' }); // raw values
export const card = style({ color: vars.palette.green });         // primitive layer
```

File layout in `packages/design-system/src` (the package's own `CLAUDE.md` has
the annotated tree, including the non-colour slices `border`, `dimensions`,
`zIndex`, `motion`, `adaptive`):

```
src/
├── palette.ts        # primitives: brand colours + neutrals  (raw values, no vars)
├── fonts.ts          # primitives: fontFamily {display,sans,mono,logo,text} + fontWeight (NOT @font-face)
├── colors.ts         # semantic colour tokens: contract slice + light/dark (from palette)
├── scale.ts          # scale tables (base + overrides per breakpoint, rem) + resolver; scale.test.ts
├── spacing.ts        # constant padding/spacing steps (xs…4xl) + radius + size tokens
├── layout.ts         # layout.inset / layout.gap ladders (grow with width) + display/position helpers
├── typography.ts     # font tokens: size / shorthand / letterSpacing (shorthand refs size vars)
├── motion.ts         # transition durations and easing curves (zeroed under prefers-reduced-motion)
├── adaptive.ts       # vars.adaptive.*: layout-driven component sizes, values from `adaptiveScale`
├── contract.ts       # createGlobalThemeContract -> `vars` (assembles the slices)
├── themes/           # per-concern appliers: each writes to :root and owns its adaptive
│   ├── colors.css.ts, spacing.css.ts, layout.css.ts, typography.css.ts, motion.css.ts, adaptive.css.ts, …
│   ├── root.css.ts       # html font-size: max(100%, 100vw / 120)
│   └── index.css.ts      # imports the appliers — the theme entry point
├── breakpoints.ts    # mobile/tablet/laptop/desktop/wide/desktopLarge (rem) + `media` query strings
└── index.ts          # applies the theme; re-exports { vars, breakpoints, media, palette, dimensions }
```

---

## 6. `packages/ui` — components

- Components are **Astro components** (`.astro`).
- Each component gets its own folder under `src/components/`:
  `src/components/Button/Button.astro`, `Button.css.ts` (vanilla-extract),
  `index.ts` (the story lives in `apps/storybook/stories/Button.stories.ts`). Consumers import a component by folder:
  `import Button from '@moscowcss/ui/components/Button'` (see the `exports` map,
  `./components/*`).
- Import styles from the colocated `.css.ts`; import tokens from
  `@moscowcss/design-system`. No inline `style="..."` with literal values.
- Inner padding comes from `vars.padding.*` and gaps from `vars.spacing.*`
  (constant); `vars.layout.inset|gap.*` only where the design grows the value
  with width. No `px` literals in `.css.ts`, and no literal sizes inside `@media`.
- User-facing text is never a literal in a component or section: it comes from
  props (fed by the i18n dictionary or by content), so one component serves both
  languages.
- vanilla-extract runs via `@vanilla-extract/vite-plugin`, wired into both the
  website's `astro.config.mjs` and Storybook's Vite config.
- Add a new component with `pnpm new:component` — do not create the files by
  hand, so structure stays uniform. It also creates the story in
  `apps/storybook/stories/`.
- Every component that changed or appeared with the designer's layout has a story
  with text passed as props: `Button`, `CallToAction` (floating registration
  button), `CardSlider`, `Card`, `BlockTitle`, `NavBar`, `TagPile` (falling topic
  tags; the layout is the pure `pile.ts`, tested by `pnpm --filter @moscowcss/ui
  test`) and `OrganizerCard`. Keep the story in step when the props change.
- Interactive elements follow `vars.size.hitTarget` and the focus ring rule
  (§5); transitions use `vars.motion.*`.

### Props always extend the native element (mandatory)

A component's `Props` **must** extend the underlying element's attributes, and the
element's tag is a **single source of truth** so the type and the markup can never
drift apart. This is exactly what `pnpm new:component` scaffolds:

```astro
---
import type { HTMLAttributes } from 'astro/types';
import { root } from './Thing.css';

// Тег — единственный источник правды: меняешь 'div' на 'span' — тип и разметка
// меняются вместе, рассинхрон невозможен by design.
const Tag = 'div';

interface Props extends HTMLAttributes<typeof Tag> {
  // свои дополнительные пропсы
}

const { class: className, ...attrs } = Astro.props;
---
<Tag class:list={[root, className]} {...attrs}>
  <slot />
</Tag>
```

- `const Tag = 'div'` + `HTMLAttributes<typeof Tag>` + `<Tag>` — the tag string
  drives both the prop type and the rendered element. Change it once (`'div'` →
  `'span'`) and both update; you **cannot** desync them. No ESLint rule needed for
  that — the coupling is structural.
- Use `HTMLAttributes<…>` (from `astro/types`) — **never** a bare DOM lib type
  like `HTMLButtonElement['type']` (that trips `no-undef`, and gives one attribute
  instead of the whole element contract).
- The frontmatter forwards the rest onto the root element — destructure your own
  props + `class`, spread `...attrs`, merge classes with `class:list`. Every
  standard attribute, event, `aria-*` and `data-*` passes through for free; you
  declare **only** your own extra props.
- An **empty body is fine** — the shared ESLint config allows a single-extends
  empty interface.
- Use the `const Tag` pattern **everywhere**, even for a component that is
  conceptually always one tag (e.g. `Button` uses `const Tag = 'button'`) — it
  keeps every component uniform and desync-proof.

### Document every prop (mandatory)

Storybook autodocs derives each control's **description** from the JSDoc comment
on the corresponding member of the component's `Props`. So **every field of a
UI component's `Props` type MUST carry a short, self-contained JSDoc comment**
describing what it does. This is the one place doc-comments are *required* — it
is not "useless commenting" (§14), it is the source of the Storybook docs table.

Rules:

- Use a `/** … */` JSDoc block **directly above** each prop — a line `//`
  comment is **not** picked up by autodocs.
- One line, terse, describes the prop's *purpose* (not its type — the type is
  already visible). Written in **Russian**, like all other repo comments (§14).
- Applies to every member, including optional ones. When a `Props` extends a
  native type (e.g. `HTMLAttributes<'button'>`), document the props **you** add;
  the inherited ones are documented upstream.

```astro
---
import type { HTMLAttributes } from 'astro/types';
import { button } from './Button.css';

const Tag = 'button';

// `type`, `disabled`, `aria-*` и т.п. приходят из HTMLAttributes<typeof Tag> —
// объявляем и документируем только свои пропсы (здесь `variant`).
interface Props extends HTMLAttributes<typeof Tag> {
  /** Визуальный вариант: акцентная или второстепенная */
  variant?: 'primary' | 'secondary';
}

const { variant = 'primary', class: className, ...attrs } = Astro.props;
---
<Tag class:list={[button, className]} {...attrs}>
  <slot />
</Tag>
```

---

## 7. `packages/icons` — SVGO + generated Astro components

The "SVGR for Astro" of this repo. Source SVGs are cleaned with **SVGO** and
compiled into ready-to-import `.astro` icon components at build time — no
runtime cost, props forwarded to the root `<svg>`.

Pipeline:

1. Drop raw icons into `packages/icons/src/svg/<name>.svg`.
2. `pnpm --filter @moscowcss/icons build` (or the root `build`, which depends on it)
   runs `scripts/generate.mjs`:
   - optimizes each SVG with SVGO using `svgo.config.mjs`
     (strips fixed width/height so size is controllable, normalizes colours to
     `currentColor` for monochrome icons, and **keeps `fill="none"`** so
     stroke/outline icons don't get filled);
   - emits `src/generated/<PascalName>.astro`, each rendering `<svg>` with
     `width/height` defaulting to `1em`, the root **`fill` taken from the source
     `<svg>`** (`currentColor` by default; `none` for stroke/outline icons),
     `aria-hidden="true"`, and **all extra props spread onto the `<svg>`**;
   - regenerates `src/generated/index.ts` (a barrel re-exporting every icon).
3. Consume:

   ```astro
   ---
   import { ArrowLong } from '@moscowcss/icons';
   ---
   <ArrowLong size="24" class="text-success" />
   ```

`src/generated/` is produced output — treat it as build artifact (git-ignored;
regenerate rather than edit).

---

## 8. `packages/fonts`

- `index.css` holds the `@font-face` declarations; font files sit alongside it.
- Consumers `import '@moscowcss/fonts'` (or `@moscowcss/fonts/index.css`) once, at the app
  root. Font *family names* referenced by the design tokens must match the
  `@font-face` `font-family` values here.
- Montserrat Regular/SemiBold/Bold also ship as **TTF**, exported from
  `package.json`, for `@moscowcss/og`: satori cannot read WOFF2. They come from
  the official Montserrat repository under the same OFL (see
  `packages/fonts/README.md`). Do not copy them elsewhere.
- The designer's layout adds **Jost** 400 (`jost/`, `fontFamily.logo`), **Golos
  Text** 400 (`golos/`, `fontFamily.text`) and **JetBrains Mono** 300
  (`jetbrains/`, for the light header lines). All are Cyrillic + Latin `woff2`
  subsets with their `LICENSE.txt` beside the files. Outside those subsets
  (e.g. latin-ext) the 300 weight falls back to 400.

---

## 9. `apps/website`, `packages/content`, `packages/og`

- Astro site, **static output**. Depends on `@moscowcss/content`, `@moscowcss/og`,
  `@moscowcss/ui`, `@moscowcss/icons`, `@moscowcss/fonts` and
  `@moscowcss/design-system`. `astro.config.mjs` registers the vanilla-extract
  Vite plugin and the `markdownSafety` integration, sets `site:
  'https://css.moscow'`, `trailingSlash: 'always'` and the i18n routing.
- **Languages.** `ru` is the default and has no URL prefix; `en` lives under
  `/en/`. The list of locales is in `src/i18n/config.ts` and in
  `astro.config.mjs` — keep them in sync. UI strings live in the dictionary
  `src/i18n/ui.ts` (`ru` is the source, other locales must cover every key);
  everything else comes from content. No literal user-facing text in `.astro`
  files. Every page gets a language switcher to the same page in the other
  language and absolute `hreflang` links (`ru`, `en`, `x-default`) from
  `BaseLayout`.
- **Content is a package.** All text is `.md` (frontmatter + Markdown body) in
  `@moscowcss/content`, one folder per language: `src/<collection>/<lang>/<name>.md`.
  Collections: `pages`, `events`, `talks`, `speakers`, `partners`, `faq`,
  `organizers`, `documents`.
  Relations live only in the talk (`event`, `speakers`); reverse lists and the
  event schedule are built at build time in `apps/website/src/content/catalog.ts`.
  Language-independent fields are duplicated in the translation and checked
  against `ru`. The build fails with the file and the field. Details:
  `adr/001-content-model-md-relations.md` and the package README (for editors).
- **Organizers.** `organizers/<lang>/<name>.md`, photos in `organizers/assets/`
  (optional; portraits use an empty `alt`, because the name stands next to them). `status: current | past` is required and must match
  between languages; `contacts.telegram|channel|github|website` are optional `https`
  URLs and must match too. The home page shows only `current` entries after the FAQ,
  in a self-playing looped `CardSlider` shuffled on every load (`OrganizersSection`, card `OrganizerCard`); `organizersByStatus` and
  `contactsOf` in `src/content/organizers.ts` are the pure selectors, so a future
  about-page can list `past` ones from the same collection. Create with
  `pnpm new:organizer <name>`; a new entry needs no code change.
- **Meetup topics.** A meetup's optional `tags` (translated, not checked against
  `ru`) feed the falling `TagPile` in the Hero together with the meetup modes.
  The floating `CallToAction` renders only for an upcoming meetup that has a
  `registrationUrl`; check it with `BUILD_NOW` set to a date before that meetup.
- **Content rules** enforced at build time: a meetup's date is `date` (a day,
  `2026-07-09`) plus `time` (`"18:00"`, Moscow time); links in content are
  `https` only; bodies are Markdown only. The check is a hast plugin,
  `src/content/markdown-safety.ts`, wired in through `astro.config.mjs`: raw
  HTML and any `href`/`src` that is not `https:`/`mailto:` after URL resolution
  fail the build. Do not weaken it with regexes over the source text. Drafts
  (`draft: true`) are excluded from the site.
- **Pages.** Home (`/`, `/en/`: nearest future meetup, or the last past one
  without registration; list of past meetups), `/events/<n>/`, `/talks/<name>/`,
  `/speakers/<name>/`, the lists `/events/`, `/talks/`, `/speakers/` (newest first,
  with a client-side filter; spec 007), `/search/` (Pagefind, `noindex`). The
  list of public pages for SEO is `src/seo/pages.ts`.
- **SEO and OG.** `BaseLayout` writes `description`, `canonical`, `hreflang`,
  16 `og:*`/`twitter:*` tags. Cards come from `@moscowcss/og`
  (`renderCard({ title, kicker, meta, size })`: 1200×630 for OpenGraph,
  1200×600 for Twitter) and are served from `pages/og/[...path].ts`; what goes
  on a card is decided in `src/seo/og.ts`. `pnpm --filter website check:seo`
  checks the built `dist` (tags, image files and their sizes, `og:locale` vs
  `<html lang>`) and exits 1 on the first violation.
- **Search.** `pnpm build` runs `astro build && pagefind --site dist`. The index
  is per language; there is no index in dev mode.
- **Tests.** vitest, `pnpm test` from the root (also `pnpm --filter website test`).
  Logic you add — content validation, relations, nearest meetup, i18n coverage,
  SEO checks, scale resolver, card generator — needs tests; the repo does not
  accept untested logic as the norm. Content tests use fixtures from
  `src/test/fixtures.ts`, not the real content.
- **CI and deploy.** `.github/workflows/deploy.yml` runs lint, test, build,
  `check:seo` and `build:storybook` on push to `main`, on pull requests and every
  night, plus lint, test and build on Windows and macOS; deploy to GitHub Pages happens only outside pull requests. The nightly run
  exists because the next meetup is decided at build time. pnpm and Node
  versions come from `packageManager` and `.nvmrc`, not from the YAML. One-off
  GitHub/DNS setup: `docs/deploy.md`. The husky `pre-commit` hook runs
  `pnpm lint && pnpm test && pnpm build`.
- **Visual regression.** `tools/visual` (not a workspace package) captures the
  homepage sections and every Storybook story at five widths into `.visual/`
  (git-ignored) and compares two captures. Use `compare.mjs --exact` for
  refactors that must not move a pixel, `--ignore <prefix>` for snapshots whose
  change is intended. A reference capture is `.visual/baseline` (taken from
  `dad0413`, before the architecture change; its `manifest.json` says which code
  it came from) and `.visual/hero-09`. Capture with `BUILD_NOW` pinned.
  See `tools/visual/README.md`. `tools/visual/check-targets.mjs` is a separate
  gate: it opens the built site (`astro preview --host 127.0.0.1`) at 375 and 1440
  and fails (exit 1) when a link or button of the header, menu, slider, language
  switcher or footer is smaller than 42×42 or has no `:focus-visible` outline in
  `rgb(56, 69, 207)` of at least 1px. On Windows set `CHROMIUM_PATH`.

---

## 10. `apps/storybook`

- Uses **`@storybook-astro/framework`** (community framework). Requirements:
  Node **20.16+**, **Storybook 10**, **Astro 5.5.3+** (the repo currently runs
  **Astro 7**), **Vite 6+**.
- `.storybook/main.ts` sets `framework: { name: '@storybook-astro/framework' }`
  and, in `viteFinal`, adds the **vanilla-extract Vite plugin** so component
  styles resolve identically to the website.
- Stories live in `apps/storybook/stories/*.stories.ts` (created by
  `pnpm new:component`); Storybook's `stories` glob points there.
- `npm create storybook` does **not** recognise Astro — set it up manually per
  the framework docs. Install with `pnpm add`, latest versions.

---

## 11. Shared configs — extend, don't fork

`@moscowcss/typescript-config` exports:
- `base.json` — strict TS base.
- `astro.json` — extends base + Astro's `strictest` tsconfig.

`@moscowcss/eslint-config` exports a **flat config** (`eslint.config.js` style):
- base = `typescript-eslint` + `eslint-plugin-astro` + Prettier compat.
Each package's own `eslint.config.js` imports and spreads this, adding local
rules **only** when unavoidable. Same for tsconfig via `extends`.

---

## 12. Definition of done

Before declaring any task complete:

```bash
pnpm install        # if deps changed — lockfile updated, exact versions
pnpm lint           # zero errors (warnings acceptable if agreed)
pnpm test           # every vitest suite
pnpm build          # website builds, content validates, Pagefind index is built
pnpm --filter website check:seo  # after the build, if you touched pages, layouts, content or og
pnpm check:a11y     # after the build, if you touched anything visible
pnpm build:storybook  # if you touched components/stories
```

Then sanity-check the token rule: search your diff for raw hex colours
(`#`), literal `px` in `.css.ts`, literal sizes inside a component's `@media`,
and any use of the primitive palette inside a component. All are red flags.
If you changed how a component or section looks (or touched the scale), compare
screenshots with `tools/visual`.

---

## 13. Do NOT

- ❌ `npm`/`yarn`, editing lockfiles, or committing `node_modules`.
- ❌ version ranges (`^`, `~`) or hand-typed/remembered versions.
- ❌ raw hex/px/breakpoints inside components — go through tokens.
- ❌ referencing the primitive palette from a component (semantic layer only).
- ❌ duplicating ESLint/TS rules in a package instead of extending the shared config.
- ❌ skipping what the `new:*` generators guarantee (story, JSDoc, draft flag,
  both languages) when you create a component or a content file by hand.
- ❌ user-facing text literals in `.astro` files — dictionary or content.
- ❌ raw HTML or non-`https` links in content Markdown; `.mdx`/`.yml`/`.json` content.
- ❌ writing a relation in both directions, or making a required content field
  optional to "ease editing".
- ❌ setting `BUILD_NOW` for a real build, or caching the website build.
- ❌ editing `packages/icons/src/generated/**` — regenerate it.
- ❌ downgrading a recommendation for being "just a demo".
- ❌ useless/obvious comments (see §14).

---

## 14. Code comments

- **No useless comments.** Do not restate what the code already says. Most code
  should carry no comments at all.
- **Comment only genuinely non-obvious spots** — a real gotcha, invariant, or
  reason that isn't clear from the code itself. If nothing is unclear, write
  nothing.
- **Such comments are written in Russian and kept short** (one line where
  possible). They explain the *why*, not the *what*.
- **English only in Markdown.** Only Markdown docs (`CLAUDE.md`, `AGENTS.md`, and
  any `*.md`) stay in English. **Every other file uses Russian comments** — that
  includes configuration (`*.config.*`, `.storybook/*`, `eslint.config.js`,
  tsconfig, `pnpm-workspace.yaml`, `turbo.json`, build scripts, etc.), which are
  code like everything else.
- **Exception — required doc-comments:** members of a UI component's `Props`
  type are the source of Storybook's prop descriptions and **must** each carry a
  short Russian JSDoc comment (§6). This overrides "most code carries no
  comments" for that specific case.
