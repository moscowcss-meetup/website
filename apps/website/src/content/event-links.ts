import { isPastEvent, type EventEntry } from './catalog';

export interface EventLink {
  href: string;
  label: string;
}

export interface EventLinkLabels {
  registration: string;
  stream: string;
  recording: string;
  vkPhotos: string;
  diskPhotos: string;
  map: string;
}

/**
 * Ссылки страницы митапа. Регистрация есть только у не прошедшего митапа: в архиве она
 * закрыта, и ссылка на неё вводила бы в заблуждение.
 */
export function eventLinksOf(event: EventEntry, now: Date, labels: EventLinkLabels): EventLink[] {
  const { registrationUrl, streamUrl, recordingUrl, vkPhotosUrl, diskPhotosUrl, venue } = event.data;
  const links: (EventLink | undefined)[] = [
    registrationUrl && !isPastEvent(event, now) ? { href: registrationUrl, label: labels.registration } : undefined,
    streamUrl ? { href: streamUrl, label: labels.stream } : undefined,
    recordingUrl ? { href: recordingUrl, label: labels.recording } : undefined,
    vkPhotosUrl ? { href: vkPhotosUrl, label: labels.vkPhotos } : undefined,
    diskPhotosUrl ? { href: diskPhotosUrl, label: labels.diskPhotos } : undefined,
    venue.mapUrl ? { href: venue.mapUrl, label: labels.map } : undefined,
  ];
  return links.filter((link): link is EventLink => link !== undefined);
}
