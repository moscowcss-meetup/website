import { publishedReviews } from '../content/reviews';
import {
  localeOf,
  scheduleOf,
  slugOf,
  talksOfSpeaker,
  upcomingEvent,
  pastEvents,
  type Catalog,
  type EventEntry, type ReviewEntry,
} from '../content/catalog';
import { archiveOf, SPEAKER_EVENT_LABELS } from '../content/archive';
import { eventLinksOf } from '../content/event-links';
import { talkLinksOf } from '../content/talk-links';
import { eventDateParts, eventWhen, fillTemplate, venueLine } from '../content/format';
import { localizePath, useTranslations } from '../i18n';
import { feedPath } from '../rss/feed';
import type { PublicPage } from '../seo/pages';

import { markdownPathOf } from './paths';

// Markdown-версия страницы для агентов: та же страница без разметки и скриптов. Строится из того же
// каталога и словаря, что и HTML, поэтому не расходится с ним; ссылки абсолютные — файл читают вне сайта.

export { markdownPathOf };

export interface MarkdownContext {
  site: URL;
  now: Date;
}

type MarkdownCatalog = Pick<Catalog, 'events' | 'talks' | 'speakers'> & { reviews?: ReviewEntry[] };

// Квадратные скобки в тексте ссылки закрыли бы её раньше времени.
const linkText = (text: string): string => text.replace(/[[\]]/g, '\\$&');
const link = (text: string, url: string): string => `[${linkText(text)}](${url})`;
const section = (title: string, lines: readonly string[]): string[] =>
  lines.length > 0 ? [`## ${title}`, '', ...lines, ''] : [];

function document(lines: readonly (string | undefined)[]): string {
  const text = lines.filter((line): line is string => line !== undefined).join('\n');
  return `${text.replace(/\n{3,}/g, '\n\n').trim()}\n`;
}

/** Markdown публичной страницы сайта. */
export function markdownOf(page: PublicPage, catalog: MarkdownCatalog, context: MarkdownContext): string {
  const { locale } = page;
  const t = useTranslations(locale);
  const abs = (path: string): string => new URL(path, context.site).href;
  const inLocale = <T extends { id: string }>(entries: readonly T[]): T[] =>
    entries.filter((entry) => localeOf(entry) === locale);
  const when = (event: EventEntry): string =>
    eventWhen(event.data, locale, { withTime: t('hero.dateTime'), dateOnly: t('date.long') });
  const day = (event: EventEntry): string => fillTemplate(t('date.long'), eventDateParts(event.data.date, locale));
  const eventUrl = (event: EventEntry): string => abs(localizePath(locale, `events/${slugOf(event)}`));
  const speakerName = (slug: string): string | undefined =>
    inLocale(catalog.speakers).find((speaker) => slugOf(speaker) === slug)?.data.name;
  const speakerLinks = (slugs: readonly string[]): string =>
    slugs
      .flatMap((slug) => {
        const name = speakerName(slug);
        return name ? [link(name, abs(localizePath(locale, `speakers/${slug}`)))] : [];
      })
      .join(', ');

  switch (page.kind) {
    case 'home': {
      const events = inLocale(catalog.events);
      const featured = upcomingEvent(events, context.now);
      return document([
        `# ${page.entry.data.title}`,
        '',
        page.entry.body?.trim(),
        '',
        ...(featured
          ? section(t(featured.past ? 'agents.lastMeetup' : 'agents.nextMeetup'), [
              `${link(featured.event.data.tagline, eventUrl(featured.event))}: ${when(featured.event)}, ${venueLine(featured.event.data.venue)}.`,
            ])
          : []),
        ...section(
          t('events.past'),
          pastEvents(events, context.now).map((event) => `- ${link(event.data.tagline, eventUrl(event))}, ${day(event)}`),
        ),
        ...section(t('agents.more'), [
          `- ${link(t('nav.search'), abs(localizePath(locale, 'search')))}`,
          `- ${link('RSS', abs(feedPath(locale)))}`,
          `- ${link('llms.txt', abs('/llms.txt'))}`,
        ]),
      ]);
    }

    case 'event': {
      const event = page.entry;
      const schedule = scheduleOf(event, inLocale(catalog.talks)).map((item) => {
        const time = item.time ? `${item.time} — ` : '';
        if (item.kind !== 'talk') return `- ${time}${item.title}`;
        const people = speakerLinks(item.talk.data.speakers);
        const title = link(item.title, abs(localizePath(locale, `talks/${slugOf(item.talk)}`)));
        return `- ${time}${title}${people ? `, ${people}` : ''}`;
      });
      const links = eventLinksOf(event, context.now, {
        registration: t('event.registration'),
        stream: t('event.stream'),
        recording: t('event.recording'),
        vkPhotos: t('event.vkPhotos'),
        diskPhotos: t('event.diskPhotos'),
        map: t('event.map'),
      }).map((item) => `- ${link(item.label, item.href)}`);
      return document([
        `# ${event.data.tagline}`,
        '',
        `${when(event)}, ${venueLine(event.data.venue)}.`,
        '',
        event.body?.trim(),
        '',
        ...section(t('event.schedule'), schedule),
        ...section(t('event.links'), links),
      ]);
    }

    case 'talk': {
      const talk = page.entry;
      const event = inLocale(catalog.events).find((item) => slugOf(item) === talk.data.event);
      const materials = event
        ? talkLinksOf(talk, event, {
            slides: t('talk.slides'),
            video: t('talk.video'),
            vkVideo: t('talk.vkVideo'),
            recording: t('event.recording'),
          }).map((item) => `- ${link(item.label, item.href)}`)
        : [];
      return document([
        `# ${talk.data.title}`,
        '',
        `${t('talk.speakers')}: ${speakerLinks(talk.data.speakers)}.`,
        event ? `${t('talk.event')}: ${link(event.data.tagline, eventUrl(event))}, ${day(event)}.` : undefined,
        '',
        talk.body?.trim(),
        '',
        ...section(t('talk.materials'), materials),
      ]);
    }

    case 'speaker': {
      const speaker = page.entry;
      const talks = talksOfSpeaker(speaker, inLocale(catalog.talks), inLocale(catalog.events)).map(
        ({ talk, event }) =>
          `- ${link(talk.data.title, abs(localizePath(locale, `talks/${slugOf(talk)}`)))}, ${link(event.data.tagline, eventUrl(event))}, ${day(event)}`,
      );
      return document([
        `# ${speaker.data.name}`,
        '',
        speaker.data.role,
        '',
        ...section(t('speaker.talks'), talks),
        ...section(
          t('speaker.links'),
          (speaker.data.links ?? []).map((item) => `- ${link(item.label, item.url)}`),
        ),
      ]);
    }

    case 'document':
      return document([
        `# ${page.entry.data.title}`,
        '',
        page.entry.body?.trim(),
        ...(page.entry.data.topics ? ['', `## ${page.entry.data.topics.summary}`, '', ...page.entry.data.topics.items.map((item) => `- ${item}`)] : []),
        ...(page.entry.data.contacts
          ? [
              '',
              `## ${t('about.contacts')}`,
              '',
              page.entry.data.contacts.lead,
              ...page.entry.data.contacts.items.flatMap((item) => ['', `### ${item.title}`, '', item.text, '', ...item.links.map((entry) => `- ${link(entry.label, entry.url)}`)]),
            ]
          : []),
      ]);

    case 'reviews': {
      const { title, description } = page.entry.data;
      const entries = publishedReviews(catalog.reviews ?? [], locale).flatMap((entry) => [
        `## ${[entry.data.name, t(`reviews.category.${entry.data.category}`), entry.data.role].filter(Boolean).join(', ')}`,
        '',
        abs(`${page.path}?review=${slugOf(entry)}`),
        '',
        entry.body?.trim(),
        '',
      ]);
      return document([`# ${title}`, '', description, '', ...entries]);
    }

    case 'list': {
      const { list, title, description } = page.entry.data;
      const archive = archiveOf(catalog, locale);
      const url = (path: string): string => abs(localizePath(locale, path));
      const badges = (items: readonly (string | false)[]): string => {
        const shown = items.filter((item): item is string => Boolean(item));
        return shown.length > 0 ? ` (${shown.join(', ')})` : '';
      };
      const lines =
        list === 'events'
          ? archive.events.map((item) => {
              const event = inLocale(catalog.events).find((entry) => slugOf(entry) === item.slug);
              return `- ${link(item.title, url(`events/${item.slug}`))}, ${event ? day(event) : item.date}, ${item.venue}; ${fillTemplate(t('list.talksCount'), { count: String(item.talks) })}${badges([item.recording && t('badge.recording'), item.photos && t('badge.photos')])}`;
            })
          : list === 'talks'
            ? archive.talks.map((item) => {
                const people = speakerLinks(item.speakers.map((speaker) => speaker.slug));
                return `- ${link(item.title, url(`talks/${item.slug}`))}${people ? `, ${people}` : ''}; ${link(item.event.title, url(`events/${item.event.slug}`))}${badges([item.video && t('badge.video'), item.slides && t('badge.slides')])}`;
              })
            : archive.speakers.map((item) => {
                const labels = item.events.slice(0, SPEAKER_EVENT_LABELS).map((event) => event.label);
                return `- ${link(item.name, url(`speakers/${item.slug}`))}${item.role ? `: ${item.role}` : ''}${labels.length > 0 ? `; ${t('speaker.events')}: ${labels.join(', ')}` : ''}`;
              });
      return document([`# ${title}`, '', description, '', ...lines]);
    }
  }
}
