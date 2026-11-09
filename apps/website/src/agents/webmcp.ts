import {
  filterArchive,
  matchesRelation,
  normalize,
  topicsInArchive,
  RELATION_KINDS,
  type Archive,
  type ArchiveEvent,
  type ArchiveNews,
  type ArchiveNext,
  type ArchiveReview,
  type ArchiveSpeaker,
  type ArchiveTalk,
  type RelationKind,
} from '../content/archive-filter';
import { search, type PagefindModule } from '../search/pagefind';
import { markdownPathOf } from './paths';

// WebMCP: инструменты, которые страница отдаёт агенту браузера (webmachinelearning.github.io/webmcp).
// Только чтение того, что и так публично: поиск, Markdown-версия страницы, списки архива, новостей и отзывов,
// ближайший митап и контакты. Данные списков, митапа и контактов — `archive.json` языка страницы.

export interface ToolResult {
  content: { type: 'text'; text: string }[];
  isError?: boolean;
}

export interface WebMcpTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute: (input: Record<string, unknown>) => Promise<ToolResult>;
}

export interface ModelContext {
  registerTool: (tool: WebMcpTool, options?: { signal?: AbortSignal }) => Promise<unknown> | unknown;
}

export interface ToolEnvironment {
  /** Адрес текущей страницы: от него разрешаются относительные пути */
  location: URL;
  fetch: (url: string) => Promise<{ ok: boolean; status: number; text: () => Promise<string> }>;
  loadPagefind: () => Promise<PagefindModule>;
  /** Адрес `archive.json` языка страницы (из `<link rel="alternate" type="application/json">`) */
  archiveUrl?: string | undefined;
  /** Текущее время: в тесте фиксированное */
  now: () => Date;
}

export const SEARCH_LIMIT_MAX = 20;
export const ARCHIVE_LIMIT_MAX = 100;
const ARCHIVE_LIMIT_DEFAULT = 30;
const text = (value: string, isError = false): ToolResult => ({ content: [{ type: 'text', text: value }], ...(isError && { isError }) });

const flags = (items: readonly (string | false)[]): string => {
  const shown = items.filter((item): item is string => Boolean(item));
  return shown.length > 0 ? ` [${shown.join(', ')}]` : '';
};

// Строка ответа: адрес страницы абсолютный, у её языка — тот же префикс, что у `archive.json`.
function archiveLine(kind: RelationKind, item: Archive[RelationKind][number], base: URL): string {
  const url = (path: string): string => new URL(`${path}/`, base).href;
  switch (kind) {
    case 'events': {
      const event = item as ArchiveEvent;
      const topics = event.tags.length > 0 ? `; topics: ${event.tags.join(', ')}` : '';
      return `- ${event.title}: ${url(`events/${event.slug}`)} — ${event.date}, ${event.venue}, talks: ${String(event.talks)}${topics}${flags([event.recording && 'recording', event.photos && 'photos'])}`;
    }
    case 'talks': {
      const talk = item as ArchiveTalk;
      return `- ${talk.title}: ${url(`talks/${talk.slug}`)} — ${talk.speakers.map((speaker) => speaker.name).join(', ')}; meetup ${talk.event.label} (${String(talk.year)})${flags([talk.video && 'video', talk.slides && 'slides'])}`;
    }
    case 'speakers': {
      const speaker = item as ArchiveSpeaker;
      return `- ${speaker.name}: ${url(`speakers/${speaker.slug}`)}${speaker.role ? ` — ${speaker.role}` : ''}; meetups: ${speaker.events.map((event) => event.label).join(', ') || 'none'}`;
    }
    case 'news': {
      const news = item as ArchiveNews;
      const topics = news.tags.length > 0 ? `; topics: ${news.tags.join(', ')}` : '';
      return `- ${news.title}: ${url(`news/${news.slug}`)} — ${news.date}, ${news.description}${topics}${flags([news.photos && 'photos'])}`;
    }
    case 'reviews': {
      const review = item as ArchiveReview;
      const who = [review.role, review.category].filter(Boolean).join(', ');
      const speaker = review.speaker ? `; speaker page: ${url(`speakers/${review.speaker}`)}` : '';
      return `- ${review.name} (${who}): ${url('reviews')}?review=${encodeURIComponent(review.slug)} — ${review.preview}${speaker}`;
    }
  }
}

/** Ближайший митап текстом: когда, где, как попасть и программа. */
export function nextMeetupText(next: ArchiveNext, base: URL): string {
  const url = (path: string): string => new URL(`${path}/`, base).href;
  const lines = [
    `${next.title}: ${url(`events/${next.slug}`)}`,
    `Starts: ${next.start} (Moscow time).`,
    `Venue: ${[next.venue.name, next.venue.address].filter(Boolean).join(', ')}.`,
    `Format: ${next.modes.join(', ')}.`,
    next.registrationUrl
      ? `Registration: ${next.registrationUrl}`
      : 'Registration is not open yet: it is announced in the Telegram channel https://t.me/moscowcss.',
    next.networklyUrl && `Registration on Networkly: ${next.networklyUrl}`,
    next.streamUrl && `Stream: ${next.streamUrl}`,
    next.tags.length > 0 && `Topics: ${next.tags.join(', ')}.`,
    next.programme.length > 0 && 'Programme:',
    ...next.programme.map((item) => {
      const time = item.time ? `${item.time} ` : '';
      const who = item.speakers.length > 0 ? ` — ${item.speakers.join(', ')}` : '';
      const link = item.talk ? ` (${url(`talks/${item.talk}`)})` : '';
      return `- ${time}${item.title}${who}${link}`;
    }),
  ];
  return lines.filter((line): line is string => Boolean(line)).join('\n');
}

// Как на главной: митап остаётся ближайшим ещё 4 часа после начала.
const MEETUP_LENGTH_MS = 4 * 60 * 60 * 1000;

async function loadArchive(env: ToolEnvironment): Promise<{ archive: Archive; base: URL } | ToolResult> {
  if (!env.archiveUrl) return text('Archive data is unavailable on this page.', true);
  const source = new URL(env.archiveUrl, env.location);
  const response = await env.fetch(source.pathname);
  if (!response.ok) return text(`Archive data is unavailable (HTTP ${String(response.status)}).`, true);
  // Префикс языка — из адреса данных: `/en/archive.json` → страницы под `/en/`.
  return { archive: JSON.parse(await response.text()) as Archive, base: new URL('./', source) };
}

const allWordsIn = (haystack: string, query: string): boolean => {
  const words = normalize(query).split(' ').filter(Boolean);
  const normalized = normalize(haystack);
  return words.every((word) => normalized.includes(word));
};

const optionalText = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;

/** Инструменты сайта. Окружение приходит аргументом: в тесте — фейки, на странице — браузер. */
export function siteTools(env: ToolEnvironment): WebMcpTool[] {
  return [
    {
      name: 'search_site',
      description:
        'Full-text search over MoscowCSS meetups, talks, speakers and news in the language of the current page. Returns titles, URLs and short descriptions.',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search words: a speaker name, a talk topic or a meetup number.' },
          limit: { type: 'integer', minimum: 1, maximum: SEARCH_LIMIT_MAX, description: 'How many results to return (default 10).' },
        },
        required: ['query'],
      },
      async execute(input) {
        const query = typeof input.query === 'string' ? input.query : '';
        const limit = Math.min(Math.max(Number(input.limit) || 10, 1), SEARCH_LIMIT_MAX);
        const outcome = await search(query, env.loadPagefind);
        if (!outcome.indexAvailable) return text('Search index is unavailable.', true);
        if (outcome.hits.length === 0) return text(`Nothing found for "${outcome.query}".`);
        return text(
          outcome.hits
            .slice(0, limit)
            .map((hit) => `- ${hit.title}: ${new URL(hit.url, env.location).href}${hit.description ? ` — ${hit.description}` : ''}`)
            .join('\n'),
        );
      },
    },
    {
      name: 'get_page_markdown',
      description:
        'Get a css.moscow page as Markdown: the meetup with its date, venue and programme, a talk, a speaker, a news item or the home page. Pass a path or a URL of this site.',
      inputSchema: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'A path like /events/31/ or a full https://css.moscow/... URL.' },
        },
        required: ['url'],
      },
      async execute(input) {
        let target: URL;
        try {
          target = new URL(typeof input.url === 'string' ? input.url : '', env.location);
        } catch {
          return text('Not a valid URL.', true);
        }
        // Только свой сайт: инструмент не должен становиться прокси к чужим адресам.
        if (target.origin !== env.location.origin) return text(`Only ${env.location.origin} pages are available.`, true);
        const response = await env.fetch(markdownPathOf(target.pathname));
        if (!response.ok) return text(`No Markdown version of ${target.pathname} (HTTP ${String(response.status)}).`, true);
        return text(await response.text());
      },
    },
    {
      name: 'list_archive',
      description:
        'List MoscowCSS meetups, talks, speakers, news or community reviews in the language of the current page, newest first. Filters: words, year and recording, like the /events/, /talks/ and /speakers/ pages, and exact relations: all talks of a speaker, the programme of a meetup, meetups on a topic, reviews of a category.',
      inputSchema: {
        type: 'object',
        properties: {
          kind: { type: 'string', enum: [...RELATION_KINDS], description: 'What to list: events (meetups), talks, speakers, news or reviews.' },
          query: { type: 'string', description: 'Words that must all match: a title, a speaker name, a venue or a meetup number.' },
          year: { type: 'integer', minimum: 2017, description: 'Only this year (for speakers: spoke that year).' },
          media: { type: 'boolean', description: 'Only talks with a video, meetups with a recording or news with photos.' },
          speaker: {
            type: 'string',
            description: 'A speaker: the file name from a speaker URL (anastasiya-maltseva) or the full name. Gives their talks, the meetups they spoke at, their row or their reviews.',
          },
          event: { type: 'string', description: 'A meetup number or file name (32): its talks, its speakers or the meetup itself.' },
          tag: { type: 'string', description: 'A word from the meetup or news topics, e.g. accessibility or conferences. Meetups and news.' },
          category: {
            type: 'string',
            enum: ['speaker', 'organizer', 'past-organizer', 'guest', 'partner'],
            description: 'Who wrote the review. Reviews only.',
          },
          limit: { type: 'integer', minimum: 1, maximum: ARCHIVE_LIMIT_MAX, description: `How many rows to return (default ${String(ARCHIVE_LIMIT_DEFAULT)}).` },
          offset: { type: 'integer', minimum: 0, description: 'How many matching rows to skip, for the next page.' },
        },
        required: ['kind'],
      },
      async execute(input) {
        const kind = RELATION_KINDS.find((item) => item === input.kind);
        if (!kind) return text(`kind must be one of: ${RELATION_KINDS.join(', ')}.`, true);
        const loaded = await loadArchive(env);
        if ('content' in loaded) return loaded;
        const { archive, base } = loaded;
        const year = Number(input.year);
        const query = typeof input.query === 'string' ? input.query : '';
        const rows: readonly Archive[RelationKind][number][] =
          kind === 'reviews'
            ? archive.reviews.filter((review) => allWordsIn(`${review.name} ${review.role ?? ''} ${review.preview}`, query))
            : filterArchive(kind, archive[kind], {
                query,
                year: Number.isInteger(year) && year > 0 ? year : undefined,
                media: input.media === true,
                topic: undefined,
              });
        const relation = {
          speaker: optionalText(input.speaker),
          event: optionalText(input.event),
          tag: optionalText(input.tag),
          category: optionalText(input.category),
        };
        const matched = rows.filter((item) => matchesRelation(kind, item, relation));
        const limit = Math.min(Math.max(Number(input.limit) || ARCHIVE_LIMIT_DEFAULT, 1), ARCHIVE_LIMIT_MAX);
        const offset = Math.max(Number(input.offset) || 0, 0);
        const page = matched.slice(offset, offset + limit);
        if (page.length === 0) return text(`No ${kind} match (${String(matched.length)} found in total).`);
        return text(
          [
            `${String(matched.length)} ${kind} match; showing ${String(offset + 1)}–${String(offset + page.length)}.`,
            ...page.map((item) => archiveLine(kind, item, base)),
          ].join('\n'),
        );
      },
    },
    {
      name: 'list_news',
      description:
        'List MoscowCSS community news in the language of the current page, newest first: conference stands, new organizers, contests, site updates. Filters like the /news/ page: words, year, topic and photos. Also returns the list of topics.',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Words that must all match the title, the description, the date or a topic.' },
          year: { type: 'integer', minimum: 2015, description: 'Only news of this year.' },
          topic: { type: 'string', description: 'A whole topic as listed in the answer, e.g. Конференции or Conferences.' },
          photos: { type: 'boolean', description: 'Only news with a cover or a gallery.' },
          limit: { type: 'integer', minimum: 1, maximum: ARCHIVE_LIMIT_MAX, description: `How many rows to return (default ${String(ARCHIVE_LIMIT_DEFAULT)}).` },
          offset: { type: 'integer', minimum: 0, description: 'How many matching rows to skip, for the next page.' },
        },
        required: [],
      },
      async execute(input) {
        const loaded = await loadArchive(env);
        if ('content' in loaded) return loaded;
        const { archive, base } = loaded;
        const year = Number(input.year);
        const matched = filterArchive('news', archive.news, {
          query: typeof input.query === 'string' ? input.query : '',
          year: Number.isInteger(year) && year > 0 ? year : undefined,
          media: input.photos === true,
          topic: optionalText(input.topic),
        });
        const topics = topicsInArchive('news', archive.news, base.pathname.startsWith('/en/') ? 'en' : 'ru');
        const limit = Math.min(Math.max(Number(input.limit) || ARCHIVE_LIMIT_DEFAULT, 1), ARCHIVE_LIMIT_MAX);
        const offset = Math.max(Number(input.offset) || 0, 0);
        const page = matched.slice(offset, offset + limit);
        const head = topics.length > 0 ? `Topics: ${topics.join(', ')}.` : 'No topics yet.';
        if (page.length === 0) return text(`No news match (${String(matched.length)} found in total). ${head}`);
        return text(
          [
            `${String(matched.length)} news match; showing ${String(offset + 1)}–${String(offset + page.length)}. ${head}`,
            ...page.map((item) => archiveLine('news', item, base)),
          ].join('\n'),
        );
      },
    },
    {
      name: 'get_news',
      description:
        'One MoscowCSS news item as Markdown: title, date, description, the full text, links and photo descriptions. Pass the file name from list_news (holyjs-2026-spring) or the news URL.',
      inputSchema: {
        type: 'object',
        properties: {
          news: { type: 'string', description: 'The news file name, e.g. new-site, or a /news/... path or URL of this site.' },
        },
        required: ['news'],
      },
      async execute(input) {
        const value = optionalText(input.news);
        if (!value) return text('news is required.', true);
        const loaded = await loadArchive(env);
        if ('content' in loaded) return loaded;
        const { archive, base } = loaded;
        // Имя файла или адрес: из адреса берётся последний сегмент пути после /news/.
        const slug = /\/news\/([^/?#]+)/.exec(value)?.[1] ?? value;
        const found = archive.news.find((item) => item.slug === slug);
        if (!found) return text(`No news "${slug}". Use list_news to see the available ones.`, true);
        const path = new URL(`news/${found.slug}/`, base).pathname;
        const response = await env.fetch(markdownPathOf(path));
        if (!response.ok) return text(`No Markdown version of ${path} (HTTP ${String(response.status)}).`, true);
        return text(await response.text());
      },
    },
    {
      name: 'get_next_meetup',
      description:
        'The next MoscowCSS meetup: date and time in Moscow, venue and address, format (in person, online), registration and stream links, topics and the programme with speakers. Says so when no meetup is announced.',
      inputSchema: { type: 'object', properties: {}, required: [] },
      async execute() {
        const loaded = await loadArchive(env);
        if ('content' in loaded) return loaded;
        const { archive, base } = loaded;
        const { next } = archive;
        // Данные собраны ночью: митап, который уже закончился сегодня, ближайшим не считаем.
        if (!next || Date.parse(next.start) + MEETUP_LENGTH_MS < env.now().getTime()) {
          const last = archive.events.find((event) => Date.parse(event.date) <= env.now().getTime());
          return text(
            [
              'No upcoming meetup is announced yet. Announcements come to the Telegram channel https://t.me/moscowcss.',
              last && `The latest meetup: ${archiveLine('events', last, base).slice(2)}`,
            ]
              .filter(Boolean)
              .join('\n'),
          );
        }
        return text(nextMeetupText(next, base));
      },
    },
    {
      name: 'get_contacts',
      description:
        'How to reach MoscowCSS: the Telegram channel and chat, meetup registration (Timepad, Networkly), the organisers and how to apply to give a talk, with the speaker guide.',
      inputSchema: { type: 'object', properties: {}, required: [] },
      async execute() {
        const loaded = await loadArchive(env);
        if ('content' in loaded) return loaded;
        const { contacts } = loaded.archive;
        if (!contacts) return text('Contacts are unavailable.', true);
        return text(
          [
            contacts.lead,
            ...contacts.items.map(
              (item) => `- ${item.title}: ${item.text} ${item.links.map((link) => `${link.label} ${link.url}`).join(', ')}`,
            ),
          ].join('\n'),
        );
      },
    },
  ];
}

/**
 * Регистрирует инструменты, если браузер поддерживает WebMCP: сначала `document.modelContext`,
 * в старых сборках Chrome — `navigator.modelContext`. Без API ничего не делает.
 */
export async function registerSiteTools(
  context: ModelContext | undefined,
  env: ToolEnvironment,
  signal?: AbortSignal,
): Promise<boolean> {
  if (!context || typeof context.registerTool !== 'function') return false;
  for (const tool of siteTools(env)) await context.registerTool(tool, signal ? { signal } : undefined);
  return true;
}
