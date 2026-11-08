import { describe, expect, it, vi } from 'vitest';
import { event } from '../test/fixtures';
import { EVENT_DURATION_MS } from './catalog';
import { eventLinksOf } from './event-links';

vi.mock('astro:content', () => ({ getCollection: vi.fn() }));

const labels = { registration: 'Рег', stream: 'Трансляция', recording: 'Запись', vkPhotos: 'ВК', diskPhotos: 'Диск', map: 'Карта' };
const meetup = event('ru/30', {
  registrationUrl: 'https://example.com/reg',
  recordingUrl: 'https://example.com/rec',
  vkPhotosUrl: 'https://vk.com/album-1_2',
  diskPhotosUrl: 'https://disk.yandex.ru/d/x',
  venue: { name: 'Звук', address: 'Москва', mapUrl: 'https://example.com/map' },
});
const start = meetup.data.date.getTime();

describe('eventLinksOf', () => {
  it('будущий митап: регистрация есть', () => {
    const links = eventLinksOf(meetup, new Date(start - 1000), labels);
    expect(links.map((link) => link.label)).toEqual(['Рег', 'Запись', 'ВК', 'Диск', 'Карта']);
  });

  it('идущий митап (до конца EVENT_DURATION_MS): регистрация ещё есть', () => {
    const links = eventLinksOf(meetup, new Date(start + EVENT_DURATION_MS), labels);
    expect(links.map((link) => link.label)).toContain('Рег');
  });

  it('прошедший митап: регистрации нет, оба альбома и запись остаются', () => {
    const links = eventLinksOf(meetup, new Date(start + EVENT_DURATION_MS + 1), labels);
    expect(links).toEqual([
      { href: 'https://example.com/rec', label: 'Запись' },
      { href: 'https://vk.com/album-1_2', label: 'ВК' },
      { href: 'https://disk.yandex.ru/d/x', label: 'Диск' },
      { href: 'https://example.com/map', label: 'Карта' },
    ]);
  });

  it('ссылок нет — список пуст', () => {
    expect(eventLinksOf(event('ru/1'), new Date(), labels)).toEqual([]);
  });
});
