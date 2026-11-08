import { describe, expect, it } from 'vitest';
import { z } from 'astro/zod';
import { EventSchema, PageSchema, createOrganizerSchema, createTalkSchema } from '@moscowcss/content/schema';

const event = (patch: Record<string, unknown> = {}) => ({
  date: '2026-07-09',
  time: '18:00',
  tagline: 'Митап',
  venue: { name: 'Звук', address: 'Москва' },
  modes: ['оффлайн'],
  passportRequired: true,
  ...patch,
});

const talk = (patch: Record<string, unknown> = {}) => ({
  event: '31',
  speakers: ['daria-egorova'],
  time: '19:10',
  title: 'Доклад',
  ...patch,
});

describe('EventSchema', () => {
  it('день и московское время дают момент начала в UTC+3', () => {
    expect(EventSchema.parse(event()).date.toISOString()).toBe('2026-07-09T15:00:00.000Z');
  });

  it('митап 2017 года без времени и адреса: дата — начало суток по Москве', () => {
    const archive = event({ time: undefined, venue: { name: 'Яндекс' } });
    const parsed = EventSchema.parse(archive);
    expect(parsed.date.toISOString()).toBe('2026-07-08T21:00:00.000Z');
    expect(parsed.time).toBeUndefined();
    expect(parsed.venue.address).toBeUndefined();
  });

  it('YAML-дата (Date в полночь UTC) принимается так же, как строка', () => {
    expect(EventSchema.parse(event({ date: new Date('2026-07-09') })).date.toISOString()).toBe(
      '2026-07-09T15:00:00.000Z',
    );
  });

  it('дата со временем отклоняется: время пишется только в поле time', () => {
    expect(EventSchema.safeParse(event({ date: new Date('2026-07-09T18:00:00') })).success).toBe(false);
    expect(EventSchema.safeParse(event({ date: '2026-07-09T18:00:00+03:00' })).success).toBe(false);
  });

  it('ссылка не https (javascript:, data:, http:) отклоняется', () => {
    for (const registrationUrl of ['javascript:alert(1)', 'data:text/html,x', 'http://example.com']) {
      expect(EventSchema.safeParse(event({ registrationUrl })).success, registrationUrl).toBe(false);
    }
    expect(EventSchema.safeParse(event({ registrationUrl: 'https://example.com' })).success).toBe(true);
  });

  it('интервал в расписании: 24:00 и «наоборот» отклоняются', () => {
    const at = (time: string) => event({ schedule: [{ time, title: 'Перерыв', kind: 'break' }] });
    expect(EventSchema.safeParse(at('20:00—20:15')).success).toBe(true);
    expect(EventSchema.safeParse(at('20:00—19:00')).success).toBe(false);
    expect(EventSchema.safeParse(at('24:00')).success).toBe(false);
  });
});

const TalkSchema = createTalkSchema(() => z.string());

describe('TalkSchema', () => {
  it('время 99:99 отклоняется', () => {
    expect(TalkSchema.safeParse(talk({ time: '99:99' })).success).toBe(false);
  });

  it('ролик в VK Видео: vk.com, vk.ru и vkvideo.ru, в том числе с www и m', () => {
    for (const vkVideoUrl of [
      'https://vkvideo.ru/video-167479002_456239487',
      'https://vk.com/video-225485687_456239017',
      'https://m.vk.ru/video-1_2',
      'https://www.vk.com/video-1_2',
    ]) {
      expect(TalkSchema.safeParse(talk({ vkVideoUrl })).success, vkVideoUrl).toBe(true);
    }
  });

  it('в поле VK Видео не проходит YouTube и не-https', () => {
    expect(TalkSchema.safeParse(talk({ vkVideoUrl: 'https://www.youtube.com/watch?v=x' })).success).toBe(false);
    expect(TalkSchema.safeParse(talk({ vkVideoUrl: 'http://vk.com/video-1_2' })).success).toBe(false);
    expect(TalkSchema.safeParse(talk({ vkVideoUrl: 'https://notvk.com/video-1_2' })).success).toBe(false);
  });
});

describe('PageSchema', () => {
  it('description короче 50 символов отклоняется', () => {
    const page = { title: 'Moscow CSS', telegramUrl: 'https://t.me/moscowcss', questionTag: '#вопрос' };
    expect(PageSchema.safeParse({ ...page, description: 'коротко' }).success).toBe(false);
    expect(PageSchema.safeParse({ ...page, description: 'д'.repeat(60) }).success).toBe(true);
  });
});

describe('createOrganizerSchema', () => {
  // Картинка в схеме — `image()`, здесь достаточно строки пути.
  const schema = createOrganizerSchema(() => z.string());
  const organizer = (patch: Record<string, unknown> = {}) => ({ name: 'Роман Троицкий', status: 'current', ...patch });

  it('минимальная запись: имя и статус, остальное необязательно', () => {
    const parsed = schema.parse(organizer());
    expect(parsed.draft).toBe(false);
    expect(parsed.contacts).toBeUndefined();
  });

  it('статус обязателен и принимает только current и past', () => {
    expect(schema.safeParse({ name: 'Имя' }).success).toBe(false);
    expect(schema.safeParse(organizer({ status: 'former' })).success).toBe(false);
    expect(schema.safeParse(organizer({ status: 'past' })).success).toBe(true);
  });

  it('контакты: только https, любой набор полей', () => {
    expect(schema.safeParse(organizer({ contacts: { telegram: 'https://t.me/x' } })).success).toBe(true);
    expect(schema.safeParse(organizer({ contacts: {} })).success).toBe(true);
    expect(schema.safeParse(organizer({ contacts: { website: 'http://vzhyx.io' } })).success).toBe(false);
    expect(schema.safeParse(organizer({ contacts: { github: 'javascript:alert(1)' } })).success).toBe(false);
    for (const telegram of ['https://t.me/', 'https://t.me/joinchat/abc', 'https://vzhyx.io']) {
      expect(schema.safeParse(organizer({ contacts: { telegram } })).success, telegram).toBe(false);
    }
    for (const github of ['https://github.com', 'https://github.com/a/b', 'https://vzhyx.io/a']) {
      expect(schema.safeParse(organizer({ contacts: { github } })).success, github).toBe(false);
    }
    expect(schema.safeParse(organizer({ contacts: { github: 'https://github.com/vzhyx/' } })).success).toBe(true);
  });

  it('фото не требует описания: имя стоит рядом с ним', () => {
    expect(schema.safeParse(organizer({ photo: 'photo.png' })).success).toBe(true);
  });
});
