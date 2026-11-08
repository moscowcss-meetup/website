import type { EventEntry, TalkEntry } from './catalog';
import type { EventLink } from './event-links';

export interface TalkLinkLabels {
  slides: string;
  video: string;
  vkVideo: string;
  recording: string;
}

/**
 * Материалы доклада. Без своей нарезки доклад ведёт на запись всего митапа: смотреть его можно,
 * но подпись честно говорит, что это запись встречи целиком. Ролик в VK Видео — отдельная кнопка рядом.
 */
export function talkLinksOf(talk: TalkEntry, event: EventEntry, labels: TalkLinkLabels): EventLink[] {
  const { slidesUrl, videoUrl, vkVideoUrl } = talk.data;
  const { recordingUrl } = event.data;
  const video = videoUrl
    ? { href: videoUrl, label: labels.video }
    : recordingUrl
      ? { href: recordingUrl, label: labels.recording }
      : undefined;
  return [
    slidesUrl ? { href: slidesUrl, label: labels.slides } : undefined,
    video,
    vkVideoUrl ? { href: vkVideoUrl, label: labels.vkVideo } : undefined,
  ].filter(
    (link): link is EventLink => link !== undefined,
  );
}
