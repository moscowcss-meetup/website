import { dirname, resolve } from 'node:path';
import { eventLabel } from './archive';
import { localeOf, slugOf, type Catalog, type TalkEntry } from './catalog';
import { typographText } from './typography';

// Обложку каждого доклада рисует `@moscowcss/og` на сборке, в одном стиле для всех: `/covers/<язык>/<доклад>.png`.
// Карточки анонсов из Telegram (поле `cover`) были вразнобой и больше не показываются.

/** Адрес сгенерированной обложки доклада. */
export const talkCoverPath = (talk: { id: string }): string => `/covers/${localeOf(talk)}/${slugOf(talk)}.png`;

/**
 * Путь файла из поля frontmatter (`cover`, `photo`) на диске. После схемы поле — метаданные картинки без
 * пути к исходнику, поэтому путь берётся из текста файла и разрешается от него, как это делает Astro.
 */
export function frontmatterFileOf(
  entry: { filePath?: string | undefined },
  field: string,
  readSource: (path: string) => string,
): string | undefined {
  if (!entry.filePath) return undefined;
  const line = new RegExp(`^${field}:\\s*["']?([^"'\\n]+?)["']?\\s*$`, 'm');
  const written = line.exec(readSource(entry.filePath))?.[1];
  return written === undefined ? undefined : resolve(dirname(resolve(entry.filePath)), written);
}

export interface TalkCoverSource {
  label: string;
  title: string;
  speakers: string;
  /** Файл фото первого спикера, у которого оно есть */
  photoFile: string | undefined;
}

/** Что рисовать на обложке доклада: метка митапа, название, спикеры языка доклада и фото. */
export function talkCoverSourceOf(
  talk: TalkEntry,
  catalog: Pick<Catalog, 'events' | 'speakers'>,
  readSource: (path: string) => string,
): TalkCoverSource {
  const locale = localeOf(talk);
  const event = catalog.events.find((item) => localeOf(item) === locale && slugOf(item) === talk.data.event);
  const people = talk.data.speakers.flatMap((slug) => {
    const speaker = catalog.speakers.find((item) => localeOf(item) === locale && slugOf(item) === slug);
    return speaker ? [speaker] : [];
  });
  const withPhoto = people.find((speaker) => speaker.data.photo !== undefined);
  return {
    label: `MOSCOWCSS_${(event ? eventLabel(event) : talk.data.event).toUpperCase()}`,
    // На картинке строки переносит satori: без неразрывных пробелов предлог остаётся в конце строки.
    title: typographText(talk.data.title, locale),
    speakers: people.map((speaker) => speaker.data.name).join(', '),
    photoFile: withPhoto ? frontmatterFileOf(withPhoto, 'photo', readSource) : undefined,
  };
}
