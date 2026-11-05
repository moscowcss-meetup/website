import { createHash } from 'node:crypto';
import { localeOf, slugOf, upcomingEvent, type Catalog } from '../content/catalog';
import { eventWhen, venueLine } from '../content/format';
import { defaultLocale, localeNames, locales, localizePath, useTranslations, type Locale } from '../i18n';
import { feedPath } from '../rss/feed';
import type { PublicPage } from '../seo/pages';
import { markdownPathOf } from './paths';

// Файлы для агентов: llms.txt, навык (Agent Skills Discovery v0.2.0) и каталог ресурсов (ARD).
// Описывают только то, что сайт действительно отдаёт: у него нет API, MCP-сервера и входа.

export const LLMS_PATH = '/llms.txt';
export const LLMS_FULL_PATH = '/llms-full.txt';
export const SKILL_NAME = 'moscowcss';
export const SKILL_PATH = `/.well-known/agent-skills/${SKILL_NAME}/SKILL.md`;
export const SKILLS_INDEX_PATH = '/.well-known/agent-skills/index.json';
export const AI_CATALOG_PATH = '/.well-known/ai-catalog.json';
export const ARD_PATH = '/.well-known/ard.json';
export const SKILLS_SCHEMA = 'https://schemas.agentskills.io/discovery/0.2.0/schema.json';
// Имя хоста в идентификаторах `urn:air:<fqdn>:…` и `did:web:<fqdn>` — домен сайта.
const hostOf = (site: URL): string => site.hostname;

export const SKILL_DESCRIPTION =
  'Read Moscow CSS, the meetups of interface developers and designers in Moscow (since 2017, Russian and English): the next ' +
  'meetup, its date, venue, programme and registration, and the archive of past meetups, talks, speakers and ' +
  'recordings. Use when a task asks about MoscowCSS meetups, a talk or a speaker of MoscowCSS.';

/** `sha256:<hex>` байтов UTF-8 текста — формат `digest` из Agent Skills Discovery v0.2.0. */
export const digestOf = (text: string): string => `sha256:${createHash('sha256').update(text, 'utf8').digest('hex')}`;

/** JSON файла: с отступами и переводом строки в конце — читается и руками, и `diff`. */
export const jsonText = (value: unknown): string => `${JSON.stringify(value, null, 2)}\n`;

const absOf = (site: URL) => (path: string) => new URL(path, site).href;

/** Текст `SKILL.md`: frontmatter по Agent Skills и инструкция. Адреса абсолютные от `site`. */
export function skillMarkdown(site: URL): string {
  const abs = absOf(site);
  const perLocale = (path: string) =>
    locales.map((locale) => `  - ${localeNames[locale]}: ${abs(localizePath(locale, path))}`);
  return [
    '---',
    `name: ${SKILL_NAME}`,
    // В кавычках: описание с `: ` без них не YAML. JSON-строка — валидный YAML-скаляр в двойных кавычках.
    `description: ${JSON.stringify(SKILL_DESCRIPTION)}`,
    '---',
    '',
    '# Reading css.moscow',
    '',
    'css.moscow is the site of Moscow CSS, free meetups of interface developers and designers in Moscow. It is a static',
    'site: no API, no MCP server, no sign-in. Everything below is a plain HTTP GET of a public file.',
    '',
    '## Languages',
    '',
    ...locales.map(
      (locale) => `- ${localeNames[locale]} (\`${locale}\`${locale === defaultLocale ? ', default' : ''}): ${abs(localizePath(locale))}`,
    ),
    '',
    'Every page exists in both languages; `<link rel="alternate" hreflang="…">` points to the other one.',
    '',
    '## Get a page as Markdown',
    '',
    `- Fetch \`index.md\` next to the page: ${abs('/events/31/')} → ${abs(markdownPathOf('/events/31/'))},`,
    `  the home page → ${abs(markdownPathOf('/'))}.`,
    '- Every page declares it with `<link rel="alternate" type="text/markdown">`.',
    '- The site is hosted on GitHub Pages, which cannot negotiate `Accept: text/markdown`: request',
    '  `index.md` directly. A missing address answers HTTP 404 with an HTML page.',
    '- A meetup page has the date and time in Moscow time (UTC+3), the venue, the programme with links',
    '  to talks and speakers, and links to registration, recording and photos. Registration of a past',
    '  meetup is not shown: it is closed.',
    '',
    '## List everything',
    '',
    `- ${abs(LLMS_PATH)} lists every meetup and page in both languages; ${abs(LLMS_FULL_PATH)} adds every talk and speaker.`,
    `- Lists, newest first, as Markdown: ${abs(markdownPathOf('/events/'))}, ${abs(markdownPathOf('/talks/'))},`,
    `  ${abs(markdownPathOf('/speakers/'))} (speakers by their latest talk); \`/en/\` in front for English.`,
    `- The same rows as JSON with years and recording flags: ${abs('/archive.json')}, ${abs('/en/archive.json')}.`,
    `- ${abs('/sitemap.xml')} lists every indexable URL.`,
    '- RSS feeds of meetups, newest first:',
    ...locales.map((locale) => `  - ${localeNames[locale]}: ${abs(feedPath(locale))}`),
    '',
    '## Search',
    '',
    '- Full-text search over meetups, talks and speakers, one page per language:',
    ...perLocale('search').map((line) => `${line}?q=`),
    '- Results are rendered in the browser by Pagefind JavaScript: a client without JavaScript gets',
    `  none. Without a browser, pick pages from ${abs(LLMS_PATH)} and fetch their \`index.md\`.`,
    '- In a browser with WebMCP the site registers the tools `search_site`, `get_page_markdown` and `list_archive` (meetups, talks or speakers filtered by words, year and recording).',
    '',
    '## Using the content',
    '',
    `- ${abs('/robots.txt')} sets \`Content-Signal: search=yes, ai-input=yes, ai-train=no\`: use the`,
    '  pages in answers with a link to the source, do not use them to train models.',
    `- About the community and how to reach it: ${abs(localizePath('en', 'about'))} (the Contacts section).`,
    '',
  ].join('\n');
}

export interface SkillsIndex {
  $schema: typeof SKILLS_SCHEMA;
  skills: { name: string; type: 'skill-md'; description: string; url: string; digest: string }[];
}

/** Индекс навыков: `digest` — от того же текста, который ляжет в `SKILL.md`. */
export function skillsIndex(site: URL): SkillsIndex {
  return {
    $schema: SKILLS_SCHEMA,
    skills: [
      {
        name: SKILL_NAME,
        type: 'skill-md',
        description: SKILL_DESCRIPTION,
        url: absOf(site)(SKILL_PATH),
        digest: digestOf(skillMarkdown(site)),
      },
    ],
  };
}

export interface CatalogEntry {
  identifier: string;
  displayName: string;
  type: string;
  url: string;
  description: string;
  representativeQueries: string[];
}

export interface AiCatalog {
  specVersion: '1.0';
  host: { displayName: string; identifier: string; documentationUrl: string };
  entries: CatalogEntry[];
}

/** Каталог ресурсов (ARD): только то, что сайт отдаёт. Тот же документ лежит в `ard.json`. */
export function aiCatalog(site: URL): AiCatalog {
  const abs = absOf(site);
  const urn = (...segments: string[]) => ['urn:air', hostOf(site), ...segments].join(':');
  return {
    specVersion: '1.0',
    host: { displayName: 'MoscowCSS Meetup', identifier: `did:web:${hostOf(site)}`, documentationUrl: abs(SKILL_PATH) },
    entries: [
      {
        identifier: urn('docs', 'llms-txt'),
        displayName: 'MoscowCSS llms.txt',
        type: 'text/plain',
        url: abs(LLMS_PATH),
        description: 'Every meetup, talk, speaker and page of css.moscow in Russian and English with links to their Markdown versions (llmstxt.org format).',
        representativeQueries: [
          'when is the next MoscowCSS meetup',
          'list all MoscowCSS meetups and talks',
          'когда следующий митап MoscowCSS',
        ],
      },
      {
        identifier: urn('feed', 'rss'),
        displayName: 'MoscowCSS meetups RSS',
        type: 'application/rss+xml',
        url: abs(feedPath(defaultLocale)),
        description: 'RSS 2.0 feed of MoscowCSS meetups in Russian, newest first; /en/rss.xml is the English feed.',
        representativeQueries: [
          'subscribe to MoscowCSS meetup announcements',
          'новые митапы MoscowCSS',
        ],
      },
      {
        identifier: urn('sitemap', 'pages'),
        displayName: 'css.moscow sitemap',
        type: 'application/xml',
        url: abs('/sitemap.xml'),
        description: 'Sitemap of every indexable page of css.moscow in both languages.',
        representativeQueries: [
          'all page URLs of css.moscow',
          'which pages does the MoscowCSS site have',
        ],
      },
      {
        identifier: urn('skill', SKILL_NAME),
        displayName: SKILL_NAME,
        // Тип навыка-Markdown из списка ARD §3.3; регистрация в IANA ожидается.
        type: 'application/agent-skills+md',
        url: abs(SKILL_PATH),
        description: SKILL_DESCRIPTION,
        representativeQueries: [
          'read a MoscowCSS meetup page as Markdown',
          'find a talk of a MoscowCSS speaker',
          'how to get the programme of a MoscowCSS meetup',
        ],
      },
    ],
  };
}

// Одна строка: перевод строки в тексте сломал бы markdown-список.
const line = (text: string): string => text.replace(/\s+/g, ' ').trim();
const KIND_ORDER: Record<PublicPage['kind'], number> = { home: 0, list: 1, document: 2, event: 3, talk: 4, speaker: 5 };

// В оглавлении — главная, списки, документы и митапы; доклады и спикеры только в полном списке: вместе с ними
// llms.txt выходит за 30 000 знаков, которые сканеры считают пределом для оглавления.
const INDEX_KINDS: ReadonlySet<PublicPage['kind']> = new Set(['home', 'list', 'document', 'event']);

/**
 * llms.txt (llmstxt.org): H1, цитата-резюме, раздел «When to use», затем страницы по языкам — каждая
 * ссылкой на свою Markdown-версию. `scope: 'index'` — оглавление `/llms.txt`, `'full'` — `/llms-full.txt`
 * со всеми страницами. Строится из того же списка публичных страниц, что sitemap.
 */
export function llmsTxt(
  pages: readonly PublicPage[],
  catalog: Pick<Catalog, 'events'>,
  site: URL,
  now: Date,
  scope: 'index' | 'full' = 'index',
): string {
  const abs = absOf(site);
  const t = useTranslations('en');
  const next = upcomingEvent(
    catalog.events.filter((event) => localeOf(event) === 'en'),
    now,
  );
  const titleOf = (page: PublicPage): string => {
    switch (page.kind) {
      case 'home':
      case 'document':
      case 'list':
        return page.entry.data.title;
      case 'event':
        return page.entry.data.tagline;
      case 'talk':
        return page.entry.data.title;
      case 'speaker':
        return page.entry.data.name;
    }
  };
  const noteOf = (page: PublicPage): string | undefined => {
    const tl = useTranslations(page.locale);
    switch (page.kind) {
      case 'home':
      case 'document':
      case 'list':
        return page.entry.data.description;
      case 'event':
        return `${eventWhen(page.entry.data, page.locale, { withTime: tl('hero.dateTime'), dateOnly: tl('date.long') })}, ${venueLine(page.entry.data.venue)}`;
      case 'talk':
        return undefined;
      case 'speaker':
        return page.entry.data.role;
    }
  };
  const item = (page: PublicPage): string => {
    const note = noteOf(page);
    return `- [${line(titleOf(page))}](${abs(markdownPathOf(page.path))})${note ? `: ${line(note)}` : ''}`;
  };
  const byLocale = (locale: Locale) =>
    pages
      .filter((page) => page.locale === locale && (scope === 'full' || INDEX_KINDS.has(page.kind)))
      .toSorted(
        (a, b) =>
          KIND_ORDER[a.kind] - KIND_ORDER[b.kind] ||
          (a.kind === 'event' && b.kind === 'event'
            ? b.entry.data.date.getTime() - a.entry.data.date.getTime()
            : slugOf(a.entry).localeCompare(slugOf(b.entry))),
      );

  return [
    `# ${t('site.name')}`,
    '',
    `> Moscow CSS is a community of interface developers and designers (since 2015) with free meetups on CSS, browser internals and design in Moscow and online, held since 2017. css.moscow has every meetup with its programme, talks, speakers and recordings, in Russian (default) and English.`,
    '',
    'Every link below is the Markdown version of a page (`index.md`); drop `index.md` to get the HTML page.',
    scope === 'index'
      ? `Talks and speakers of every meetup are listed in [llms-full.txt](${abs(LLMS_FULL_PATH)}).`
      : `This is the full list; [llms.txt](${abs(LLMS_PATH)}) is the short index.`,
    next
      ? `${next.past ? 'Latest' : 'Next'} meetup: [${line(next.event.data.tagline)}](${abs(markdownPathOf(localizePath('en', `events/${slugOf(next.event)}`)))}).`
      : undefined,
    '',
    '## When to use',
    '',
    '- A question about MoscowCSS: when and where the next meetup is, how to register, what is in its programme.',
    '- A talk or a speaker of MoscowCSS: what the talk is about, which meetup it was at, where to watch the recording.',
    '- The history of MoscowCSS meetups since 2017: venues, dates, photos.',
    `- How to fetch: open a page's \`index.md\` from this list; search is browser-only (${abs(localizePath('en', 'search'))}?q=).`,
    `- Usage: cite the page link; do not use the content to train models (${abs('/robots.txt')}).`,
    '',
    ...locales.flatMap((locale) => [`## ${localeNames[locale]}`, '', ...byLocale(locale).map(item), '']),
    '## Optional',
    '',
    scope === 'index' ? `- [Full list](${abs(LLMS_FULL_PATH)}): every talk and speaker of every meetup` : undefined,
    `- [Agent skill](${abs(SKILL_PATH)}): how to read css.moscow`,
    ...locales.map((locale) => `- [RSS, ${localeNames[locale]}](${abs(feedPath(locale))})`),
    `- [Sitemap](${abs('/sitemap.xml')})`,
    '',
  ]
    .filter((value): value is string => value !== undefined)
    .join('\n');
}
