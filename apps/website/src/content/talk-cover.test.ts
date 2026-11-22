import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { event, speaker, talk } from '../test/fixtures';
import { frontmatterFileOf, talkCoverPath, talkCoverSourceOf } from './talk-cover';

vi.mock('astro:content', () => ({ getCollection: vi.fn() }));

describe('frontmatterFileOf', () => {
  it('находит фото спикера по имени поля', () => {
    const source = '---\nname: "Анна"\nphoto: ../assets/anna.jpg\n---\n';
    expect(frontmatterFileOf({ filePath: 'packages/content/src/speakers/ru/anna.md' }, 'photo', () => source)).toBe(
      resolve('packages/content/src/speakers/assets/anna.jpg'),
    );
  });
});

describe('обложка доклада', () => {
  it('адрес по языку и имени файла', () => {
    expect(talkCoverPath({ id: 'en/svg' })).toBe('/covers/en/svg.png');
  });

  it('метка митапа, спикеры языка доклада и фото первого спикера с фото', () => {
    const catalog = {
      events: [event('ru/7'), event('ru/online-2021', { date: new Date('2021-03-01') })],
      speakers: [
        speaker('ru/no-photo', { name: 'Без Фото' }),
        { ...speaker('ru/with-photo', { name: 'С Фото', photo: { src: '/x.jpg', width: 1, height: 1, format: 'jpg' } }), filePath: 'packages/content/src/speakers/ru/with-photo.md' },
        speaker('en/with-photo', { name: 'With Photo' }),
      ],
    };
    const read = () => 'photo: ../assets/with-photo.jpg\n';
    const source = talkCoverSourceOf(talk('ru/x', { event: '7', speakers: ['no-photo', 'with-photo'], title: 'Доклад' }), catalog, read);
    expect(source).toEqual({
      label: 'MOSCOWCSS_7',
      title: 'Доклад',
      speakers: 'Без Фото, С Фото',
      photoFile: resolve('packages/content/src/speakers/assets/with-photo.jpg'),
    });
    expect(talkCoverSourceOf(talk('ru/y', { event: 'online-2021', speakers: ['no-photo'] }), catalog, read).label).toBe('MOSCOWCSS_2021');
  });

  it('название типографировано: предлог держится за следующее слово', () => {
    const catalog = { events: [event('ru/7')], speakers: [] };
    const source = talkCoverSourceOf(talk('ru/x', { event: '7', speakers: [], title: 'Гиперссылки в музыке: кто у кого украл' }), catalog, () => '');
    expect(source.title).toBe('Гиперссылки в музыке: кто у кого украл');
  });
});
