import type { Archive, ArchiveContacts, ArchiveNext, ArchiveReview, EventRef } from './archive-filter';
import {
  localeOf,
  scheduleOf,
  slugOf,
  talksOfEvent,
  talksOfSpeaker,
  type Catalog,
  type EventEntry,
  type SpeakerEntry,
  type TalkEntry,
  upcomingEvent,
} from './catalog';
import { previewOf, publishedReviews } from './reviews';

// Строки списков митапов, докладов и спикеров (спека 007) из каталога. Одни и те же данные рисует
// страница, пишет Markdown-версия, отдаёт `archive.json` и фильтрует WebMCP, поэтому они не расходятся.

export * from './archive-filter';


const isPublished = (entry: { data: { draft: boolean } }): boolean => !entry.data.draft;

const moscowDay = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Moscow',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const dayOf = (event: EventEntry): string => moscowDay.format(event.data.date);
const yearOf = (event: EventEntry): number => Number(dayOf(event).slice(0, 4));

/** Метка митапа: `22` для `22.md`; у `online-2021` и `19-plus` номера нет — год. */
export function eventLabel(event: EventEntry): string {
  const slug = slugOf(event);
  return /^\d+$/.test(slug) ? slug : String(yearOf(event));
}

/** Опубликованные митапы, новые первыми: будущий стоит выше прошедших. */
export function eventsNewestFirst<E extends EventEntry>(events: readonly E[]): E[] {
  return events.filter(isPublished).sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

/** Доклады от последнего митапа к первому, внутри митапа — по программе. */
export function talksNewestFirst<T extends TalkEntry>(
  talks: readonly T[],
  events: readonly EventEntry[],
): { talk: T; event: EventEntry }[] {
  return eventsNewestFirst(events).flatMap((event) =>
    talksOfEvent(event, talks).map((talk) => ({ talk, event })),
  );
}

const collator = (locale: string) => new Intl.Collator(locale, { sensitivity: 'base' });

/**
 * Спикеры по самому свежему выступлению: каждый следующий доклад поднимает спикера, но в списке он
 * один. Спикеры одного митапа — в порядке программы и порядке имён в докладе. Без опубликованных
 * докладов — в конце, по имени. Все записи — одного языка.
 */
export function speakersByLatestTalk<S extends SpeakerEntry>(
  speakers: readonly S[],
  talks: readonly TalkEntry[],
  events: readonly EventEntry[],
): S[] {
  const published = speakers.filter(isPublished);
  const bySlug = new Map(published.map((speaker) => [slugOf(speaker), speaker]));
  const ordered = new Map<string, S>();
  for (const { talk } of talksNewestFirst(talks, events)) {
    for (const name of talk.data.speakers) {
      const speaker = bySlug.get(name);
      if (speaker && !ordered.has(name)) ordered.set(name, speaker);
    }
  }
  const compare = collator(localeOf(published[0] ?? { id: 'ru/' })).compare;
  const rest = published
    .filter((speaker) => !ordered.has(slugOf(speaker)))
    .sort((a, b) => compare(a.data.name, b.data.name));
  return [...ordered.values(), ...rest];
}

const unique = <T>(items: readonly T[]): T[] => [...new Set(items)];

// Начало в московском времени со смещением: агенту не нужно знать, что даты сайта — по Москве.
const moscowClock = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Moscow', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
const startOf = (event: EventEntry): string =>
  event.data.time === undefined ? dayOf(event) : `${dayOf(event)}T${moscowClock.format(event.data.date)}:00+03:00`;

/** Ближайший митап на `now`, с программой; прошедший или его нет — null. */
export function nextMeetupOf(
  catalog: Pick<Catalog, 'events' | 'talks' | 'speakers'>,
  locale: string,
  now: Date,
): ArchiveNext | null {
  const inLocale = <T extends { id: string }>(entries: readonly T[]): T[] => entries.filter((entry) => localeOf(entry) === locale);
  const found = upcomingEvent(inLocale(catalog.events), now);
  if (!found || found.past) return null;
  const { event } = found;
  const nameOf = new Map(inLocale(catalog.speakers).filter(isPublished).map((speaker) => [slugOf(speaker), speaker.data.name]));
  return {
    slug: slugOf(event),
    label: eventLabel(event),
    title: event.data.tagline,
    start: startOf(event),
    venue: { name: event.data.venue.name, address: event.data.venue.address },
    modes: event.data.modes,
    tags: event.data.tags,
    registrationUrl: event.data.registrationUrl,
    streamUrl: event.data.streamUrl,
    programme: scheduleOf(event, inLocale(catalog.talks)).map((item) =>
      item.kind === 'talk'
        ? {
            kind: 'talk',
            time: item.time,
            title: item.title,
            talk: slugOf(item.talk),
            speakers: item.talk.data.speakers.flatMap((slug) => nameOf.get(slug) ?? []),
          }
        : { kind: item.kind, time: item.time, title: item.title, talk: undefined, speakers: [] },
    ),
  };
}

/** Карточки контактов из документа, у которого они есть (страница «О сообществе»). */
export function contactsOf(documents: readonly Catalog['documents'][number][], locale: string): ArchiveContacts | null {
  const about = documents.find((entry) => localeOf(entry) === locale && !entry.data.draft && entry.data.contacts);
  return about?.data.contacts ?? null;
}

/** Отзывы языка для WebMCP: кто, в какой роли и начало текста. */
export function reviewRowsOf(reviews: readonly Catalog['reviews'][number][], locale: string): ArchiveReview[] {
  return publishedReviews(reviews, locale).map((entry) => ({
    slug: slugOf(entry),
    name: entry.data.name,
    role: entry.data.role,
    category: entry.data.category,
    speaker: entry.data.speaker,
    preview: previewOf(entry.rendered?.html ?? ''),
  }));
}

/**
 * Строки списков одного языка. Отзывы, контакты и ближайший митап — только для `archive.json`:
 * без `reviews`, `documents` и `now` они пустые.
 */
export function archiveOf(
  catalog: Pick<Catalog, 'events' | 'talks' | 'speakers'> & Partial<Pick<Catalog, 'reviews' | 'documents'>>,
  locale: string,
  { now }: { now?: Date } = {},
): Archive {
  const inLocale = <T extends { id: string }>(entries: readonly T[]): T[] =>
    entries.filter((entry) => localeOf(entry) === locale);
  const events = inLocale(catalog.events);
  const talks = inLocale(catalog.talks);
  const speakers = inLocale(catalog.speakers);
  const nameOf = new Map(speakers.filter(isPublished).map((speaker) => [slugOf(speaker), speaker.data.name]));
  const refOf = (event: EventEntry): EventRef => ({ slug: slugOf(event), label: eventLabel(event) });

  return {
    events: eventsNewestFirst(events).map((event) => {
      const own = talksOfEvent(event, talks);
      return {
        ...refOf(event),
        title: event.data.tagline,
        date: dayOf(event),
        year: yearOf(event),
        venue: event.data.venue.name,
        talks: own.length,
        speakers: unique(own.flatMap((talk) => talk.data.speakers)),
        tags: event.data.tags,
        recording: event.data.recordingUrl !== undefined || own.some((talk) => talk.data.videoUrl !== undefined || talk.data.vkVideoUrl !== undefined),
        photos: event.data.vkPhotosUrl !== undefined || event.data.diskPhotosUrl !== undefined,
      };
    }),
    talks: talksNewestFirst(talks, events).map(({ talk, event }) => ({
      slug: slugOf(talk),
      title: talk.data.title,
      year: yearOf(event),
      event: { ...refOf(event), title: event.data.tagline },
      // Спикер-черновик в опубликованном докладе невозможен (validateCatalog), фильтр — для типов.
      speakers: talk.data.speakers.flatMap((slug) => {
        const name = nameOf.get(slug);
        return name === undefined ? [] : [{ slug, name }];
      }),
      video: talk.data.videoUrl !== undefined || talk.data.vkVideoUrl !== undefined,
      slides: talk.data.slidesUrl !== undefined,
    })),
    speakers: speakersByLatestTalk(speakers, talks, events).map((speaker) => {
      const appearances = talksOfSpeaker(speaker, talks, events);
      return {
        slug: slugOf(speaker),
        name: speaker.data.name,
        role: speaker.data.role,
        years: unique(appearances.map(({ event }) => yearOf(event))),
        events: [...new Map(appearances.map(({ event }) => [slugOf(event), refOf(event)])).values()],
      };
    }),
    reviews: reviewRowsOf(catalog.reviews ?? [], locale),
    next: now ? nextMeetupOf(catalog, locale, now) : null,
    contacts: contactsOf(catalog.documents ?? [], locale),
  };
}

