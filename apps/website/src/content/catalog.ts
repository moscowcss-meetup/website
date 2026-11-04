import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { getCollection } from 'astro:content';
import type { z } from 'astro/zod';
import type {
  DocumentSchema,
  EventSchema,
  FaqSchema,
  PageSchema,
  createOrganizerSchema,
  createPartnerSchema,
  TalkSchema,
  createSpeakerSchema,
} from '@moscowcss/content/schema';

// Запись коллекции в минимальной форме: функции каталога не зависят от `astro:content`,
// поэтому тестируются на обычных объектах. `CollectionEntry` этой форме удовлетворяет.
export interface CatalogEntry<D> {
  /** `ru/31`, `en/daria-egorova`: язык и имя файла без расширения */
  id: string;
  /** Путь файла для сообщений об ошибках; в тестах может отсутствовать */
  filePath?: string | undefined;
  /** Markdown-тело файла; у записей без тела — пусто */
  body?: string | undefined;
  /** Результат рендера тела; нет при ошибке рендера (её загрузчик Astro только логирует) */
  rendered?: { html: string } | undefined;
  data: D;
}

export type EventData = z.output<typeof EventSchema>;
export type TalkData = z.output<typeof TalkSchema>;
export type SpeakerData = z.output<ReturnType<typeof createSpeakerSchema>>;
export type PartnerData = z.output<ReturnType<typeof createPartnerSchema>>;
export type OrganizerData = z.output<ReturnType<typeof createOrganizerSchema>>;
export type PageData = z.output<typeof PageSchema>;
export type FaqData = z.output<typeof FaqSchema>;
export type DocumentData = z.output<typeof DocumentSchema>;

export type EventEntry = CatalogEntry<EventData>;
export type TalkEntry = CatalogEntry<TalkData>;
export type SpeakerEntry = CatalogEntry<SpeakerData>;
export type PartnerEntry = CatalogEntry<PartnerData>;
export type OrganizerEntry = CatalogEntry<OrganizerData>;
export type PageEntry = CatalogEntry<PageData>;
export type FaqEntry = CatalogEntry<FaqData>;
export type DocumentEntry = CatalogEntry<DocumentData>;

export interface Catalog {
  events: EventEntry[];
  talks: TalkEntry[];
  speakers: SpeakerEntry[];
  partners: PartnerEntry[];
  organizers: OrganizerEntry[];
  pages: PageEntry[];
  faq: FaqEntry[];
  documents: DocumentEntry[];
}

// Язык-источник: перевод сверяется с ним (ADR 001).
const SOURCE_LOCALE = 'ru';

// Поля, одинаковые во всех языках. `[]` в пути — «у каждого элемента массива».
const INVARIANTS = {
  events: [
    'date',
    'time',
    'passportRequired',
    'venue.mapUrl',
    'venue.coordinates',
    'registrationUrl',
    'streamUrl',
    'recordingUrl',
    'photosUrl',
    'partner',
    'schedule[].time',
    'schedule[].kind',
  ],
  talks: ['event', 'speakers', 'time', 'slidesUrl', 'videoUrl'],
  speakers: ['photo', 'links'],
  partners: ['url', 'handle', 'logo', 'qrUrl'],
  organizers: ['status', 'photo', 'contacts'],
  faq: ['order'],
  documents: [],
  pages: ['telegramUrl', 'questionTag', 'decor'],
} as const;

// Тело обязательно там, где оно и есть содержание страницы или карточки.
const BODY_REQUIRED = ['pages', 'talks', 'faq', 'documents'] as const;


/** Язык записи: первый сегмент id. */
export const localeOf = (entry: { id: string }): string => entry.id.split('/')[0] ?? '';

/** Имя файла без языка и расширения: `ru/31` → `31`. Именно его пишут в связях. */
export const slugOf = (entry: { id: string }): string => entry.id.split('/').slice(1).join('/');

const whereOf = (entry: CatalogEntry<unknown>): string => entry.filePath ?? entry.id;

/** Ошибка каталога: все найденные проблемы разом, чтобы редактор не чинил по одной за сборку. */
export class CatalogError extends Error {
  readonly problems: readonly string[];

  constructor(problems: readonly string[]) {
    super(
      `Контент: ошибок — ${String(problems.length)}\n${problems.map((problem) => `  - ${problem}`).join('\n')}`,
    );
    this.name = 'CatalogError';
    this.problems = problems;
  }
}

// Значение по частям пути; для `schedule[]` дальше идёт каждый элемент массива.
function valueAt(data: unknown, parts: readonly string[]): unknown {
  const [head, ...rest] = parts;
  if (head === undefined) return data;
  const each = head.endsWith('[]');
  const next = (data as Record<string, unknown> | undefined)?.[each ? head.slice(0, -2) : head];
  if (!each) return valueAt(next, rest);
  return Array.isArray(next) ? next.map((item: unknown) => valueAt(item, rest)) : undefined;
}

// Дата сравнивается по моменту времени, остальное — по структуре.
const fingerprint = (value: unknown): string =>
  JSON.stringify(value, (_key, item: unknown) => (item instanceof Date ? item.toISOString() : item));

const isPublished = (entry: { data: { draft: boolean } }): boolean => !entry.data.draft;

function checkTranslations<D>(
  collection: keyof typeof INVARIANTS,
  entries: readonly CatalogEntry<D>[],
  problems: string[],
): void {
  const source = new Map(
    entries.filter((entry) => localeOf(entry) === SOURCE_LOCALE).map((entry) => [slugOf(entry), entry]),
  );
  for (const entry of entries) {
    if (localeOf(entry) === SOURCE_LOCALE) continue;
    const original = source.get(slugOf(entry));
    if (!original) {
      problems.push(
        `${whereOf(entry)}: нет оригинала ${SOURCE_LOCALE}/${slugOf(entry)} в ${collection}/${SOURCE_LOCALE}`,
      );
      continue;
    }
    for (const path of INVARIANTS[collection]) {
      const parts = path.split('.');
      if (fingerprint(valueAt(entry.data, parts)) !== fingerprint(valueAt(original.data, parts))) {
        problems.push(`${whereOf(entry)}: поле ${path} отличается от ${original.id}`);
      }
    }
  }
}

/**
 * Проверяет связи и переводы. Бросает `CatalogError`, в каждой строке которого путь файла и
 * поле: ошибка контента должна ронять сборку, а не терять страницу молча.
 */
export function validateCatalog(
  catalog: Catalog,
  {
    requireRendered = false,
    readSource,
  }: {
    requireRendered?: boolean;
    /** Исходный текст файла по пути: нужен, чтобы поймать несуществующую дату (см. checkEventDays) */
    readSource?: (filePath: string) => string;
  } = {},
): void {
  const problems: string[] = [];
  const events = new Map(catalog.events.map((entry) => [entry.id, entry]));
  const speakers = new Map(catalog.speakers.map((entry) => [entry.id, entry]));
  const partners = new Map(catalog.partners.map((entry) => [entry.id, entry]));

  for (const event of catalog.events) {
    const { partner } = event.data;
    if (!partner) continue;
    const found = partners.get(`${localeOf(event)}/${partner}`);
    if (!found) {
      problems.push(
        `${whereOf(event)}: partner → нет записи «${partner}» в partners/${localeOf(event)}`,
      );
    } else if (isPublished(event) && !isPublished(found)) {
      problems.push(`${whereOf(event)}: partner → партнёр «${partner}» — черновик, а митап опубликован`);
    }
  }

  for (const talk of catalog.talks) {
    const locale = localeOf(talk);
    const event = events.get(`${locale}/${talk.data.event}`);
    // Черновик может ссылаться на ещё не заведённые записи: доклад заводят раньше спикера.
    // Опубликованный — нет: тогда опечатка в имени уехала бы на сайт.
    if (!event && isPublished(talk)) {
      problems.push(`${whereOf(talk)}: event → нет записи «${talk.data.event}» в events/${locale}`);
    } else if (event && isPublished(talk) && !isPublished(event)) {
      problems.push(
        `${whereOf(talk)}: event → митап «${talk.data.event}» — черновик, а доклад опубликован`,
      );
    }
    for (const name of talk.data.speakers) {
      const speaker = speakers.get(`${locale}/${name}`);
      if (!speaker) {
        if (isPublished(talk)) {
          problems.push(`${whereOf(talk)}: speakers → нет записи «${name}» в speakers/${locale}`);
        }
      } else if (isPublished(talk) && !isPublished(speaker)) {
        problems.push(
          `${whereOf(talk)}: speakers → спикер «${name}» — черновик, а доклад опубликован`,
        );
      }
    }
  }

  if (readSource) checkEventDays(catalog.events, readSource, problems);
  checkTranslations('events', catalog.events, problems);
  checkTranslations('talks', catalog.talks, problems);
  checkTranslations('speakers', catalog.speakers, problems);
  checkTranslations('partners', catalog.partners, problems);
  checkTranslations('organizers', catalog.organizers, problems);
  checkTranslations('faq', catalog.faq, problems);
  checkTranslations('pages', catalog.pages, problems);
  checkTranslations('documents', catalog.documents, problems);

  const bodies: [string, readonly CatalogEntry<unknown>[]][] = [
    ['pages', catalog.pages],
    ['events', catalog.events],
    ['talks', catalog.talks],
    ['speakers', catalog.speakers],
    ['partners', catalog.partners],
    ['organizers', catalog.organizers],
    ['faq', catalog.faq],
    ['documents', catalog.documents],
  ];
  for (const [collection, entries] of bodies) {
    for (const entry of entries) {
      const body = entry.body ?? '';
      if ((BODY_REQUIRED as readonly string[]).includes(collection) && body.trim() === '') {
        problems.push(`${whereOf(entry)}: текст файла пуст — у ${collection} он обязателен`);
      }
      // Ошибка рендера (например, небезопасная ссылка) у загрузчика — только [ERROR] в логе, а из
      // кэша следующей сборки запись приходит без тела. Текст есть, а HTML нет — значит, он потерян.
      if (requireRendered && body.trim() !== '' && !entry.rendered?.html) {
        problems.push(`${whereOf(entry)}: текст файла не отрендерился — см. [ERROR] выше в логе сборки`);
      }
    }
  }

  checkQuestionTags(catalog, problems);

  if (problems.length > 0) throw new CatalogError(problems);
}

// Хештег в тексте: решётка не после буквы, `/` или `&` — иначе это якорь ссылки или сущность.
const HASHTAG = /(?<![\p{L}\p{N}_/&#])#[\p{L}_][\p{L}\p{N}_]*/gu;

/**
 * В Markdown переменную не подставить, поэтому тег вопросов в текстах FAQ и главной сверяется с
 * `questionTag` главной: сменили тег в одном месте — сборка покажет, где ещё старый. Доклады и
 * митапы не проверяются: там `#fff` — цвет, а не тег.
 */
function checkQuestionTags(catalog: Pick<Catalog, 'pages' | 'faq'>, problems: string[]): void {
  const tagOf = new Map(
    catalog.pages
      .filter((entry) => slugOf(entry) === 'index')
      .map((entry) => [localeOf(entry), entry.data.questionTag]),
  );
  for (const entry of [...catalog.pages, ...catalog.faq]) {
    const tag = tagOf.get(localeOf(entry));
    if (tag === undefined) continue;
    for (const [found] of (entry.body ?? '').matchAll(HASHTAG)) {
      if (found !== tag) {
        problems.push(
          `${whereOf(entry)}: в тексте тег ${found}, а в pages/${localeOf(entry)}/index.md questionTag — ${tag}`,
        );
      }
    }
  }
}

// День в поясе митапа: `date` в данных — уже момент начала по Москве.
const moscowDay = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Moscow',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const DATE_LINE = /^date:\s*["']?(\d{4}-\d{2}-\d{2})/m;

/**
 * YAML превращает `2026-02-30` в 2 марта ещё до схемы, и после разбора опечатку не видно. Поэтому
 * день из исходного текста сверяется с днём, который получился: разошлись — даты не существует.
 */
export function checkEventDays(
  events: readonly EventEntry[],
  readSource: (filePath: string) => string,
  problems: string[],
): void {
  for (const event of events) {
    if (!event.filePath) continue;
    const written = DATE_LINE.exec(readSource(event.filePath))?.[1];
    if (written && written !== moscowDay.format(event.data.date)) {
      problems.push(`${whereOf(event)}: date ${written} — такой даты нет в календаре`);
    }
  }
}

/**
 * Весь контент с проверенными связями. Единственное место с `getCollection`: ошибка схемы
 * приходит от Astro (с путём файла), ошибка связей и переводов — от `validateCatalog`.
 */
export async function loadCatalog(): Promise<Catalog> {
  const [pages, events, talks, speakers, partners, organizers, faq, documents] = await Promise.all([
    getCollection('pages'),
    getCollection('events'),
    getCollection('talks'),
    getCollection('speakers'),
    getCollection('partners'),
    getCollection('organizers'),
    getCollection('faq'),
    getCollection('documents'),
  ]);
  const catalog = { events, talks, speakers, partners, organizers, pages, faq, documents };
  validateCatalog(catalog, {
    requireRendered: true,
    // filePath у записей Astro — относительно корня проекта, а сборка идёт из него же.
    readSource: (filePath) => readFileSync(resolve(filePath), 'utf8'),
  });
  return catalog;
}

// Начало интервала: `19:40—20:00` → `19:40`, `19:10` → `19:10`.
const startOf = (time: string): string => time.slice(0, 5);

// Время начала: отсутствующее (архивный митап) считается позже любого. Сентинел-строкой это не
// сделать: localeCompare ставит знаки препинания раньше цифр.
const compareTimes = (a: string | undefined, b: string | undefined): number => {
  if (a === undefined || b === undefined) return Number(a === undefined) - Number(b === undefined);
  return a.localeCompare(b);
};

// Между докладами без времени порядок — по имени файла, чтобы он не зависел от порядка загрузчика.
const byTime = (a: TalkEntry, b: TalkEntry): number =>
  compareTimes(a.data.time, b.data.time) || slugOf(a).localeCompare(slugOf(b));

/** Опубликованные доклады митапа в его языке, по времени начала. */
export function talksOfEvent<T extends TalkEntry>(event: EventEntry, talks: readonly T[]): T[] {
  return talks
    .filter(
      (talk) =>
        localeOf(talk) === localeOf(event) && talk.data.event === slugOf(event) && isPublished(talk),
    )
    .sort(byTime);
}

export type ScheduleItem<T extends TalkEntry = TalkEntry> =
  | { kind: 'talk'; time: string | undefined; title: string; talk: T }
  | { kind: 'break' | 'activity'; time: string; title: string };

/** Расписание митапа: доклады и перерывы с активностями вперемешку по началу. */
export function scheduleOf<T extends TalkEntry>(
  event: EventEntry,
  talks: readonly T[],
): ScheduleItem<T>[] {
  const items: ScheduleItem<T>[] = [
    ...talksOfEvent(event, talks).map(
      (talk): ScheduleItem<T> => ({ kind: 'talk', time: talk.data.time, title: talk.data.title, talk }),
    ),
    ...event.data.schedule.map(
      (item): ScheduleItem<T> => ({ kind: item.kind, time: item.time, title: item.title }),
    ),
  ];
  // sort стабилен: при равном начале доклады остаются выше остального.
  return items.sort((a, b) =>
    compareTimes(a.time && startOf(a.time), b.time && startOf(b.time)),
  );
}

/** Доклады спикера на всех опубликованных митапах его языка, новые митапы выше. */
export function talksOfSpeaker<T extends TalkEntry, E extends EventEntry>(
  speaker: SpeakerEntry,
  talks: readonly T[],
  events: readonly E[],
): { talk: T; event: E }[] {
  const locale = localeOf(speaker);
  const eventBySlug = new Map(
    events.filter((event) => localeOf(event) === locale).map((event) => [slugOf(event), event]),
  );
  const result: { talk: T; event: E }[] = [];
  for (const talk of talks) {
    if (
      localeOf(talk) !== locale ||
      !isPublished(talk) ||
      !talk.data.speakers.includes(slugOf(speaker))
    ) {
      continue;
    }
    const event = eventBySlug.get(talk.data.event);
    if (event && isPublished(event)) result.push({ talk, event });
  }
  return result.sort(
    (a, b) =>
      b.event.data.date.getTime() - a.event.data.date.getTime() || byTime(a.talk, b.talk),
  );
}

const byDateAsc = (a: EventEntry, b: EventEntry): number =>
  a.data.date.getTime() - b.data.date.getTime();

// Митап считается идущим ещё столько после начала: пуш во время митапа (ссылка на трансляцию)
// не должен пометить его прошедшим.
export const EVENT_DURATION_MS = 4 * 60 * 60 * 1000;

const endOf = (event: EventEntry): number => event.data.date.getTime() + EVENT_DURATION_MS;

/** Митап закончился: начало + `EVENT_DURATION_MS` раньше `now`. */
export const isPastEvent = (event: EventEntry, now: Date): boolean => endOf(event) < now.getTime();

/**
 * Митап для главной: ближайший, который ещё не закончился (начало + `EVENT_DURATION_MS` не раньше
 * `now`); таких нет — последний прошедший с `past: true`. Черновики не участвуют. `now` приходит
 * аргументом, чтобы результат не зависел от часов. Список — одного языка.
 */
export function upcomingEvent<E extends EventEntry>(
  events: readonly E[],
  now: Date,
): { event: E; past: boolean } | undefined {
  const published = events.filter(isPublished).sort(byDateAsc);
  const next = published.find((event) => endOf(event) >= now.getTime());
  if (next) return { event: next, past: false };
  const last = published.at(-1);
  return last ? { event: last, past: true } : undefined;
}

/** Прошедшие опубликованные митапы, новые выше. */
export function pastEvents<E extends EventEntry>(events: readonly E[], now: Date): E[] {
  return events
    .filter((event) => isPublished(event) && isPastEvent(event, now))
    .sort((a, b) => byDateAsc(b, a));
}
