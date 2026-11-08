import { describe, expect, it, vi } from 'vitest';
import { document, event, review, speaker, talk } from '../test/fixtures';
import {
  archiveOf,
  contactsOf,
  nextMeetupOf,
  reviewRowsOf,
  EMPTY_FILTER,
  eventLabel,
  filterArchive,
  filterFromSearch,
  normalize,
  searchOfFilter,
  speakersByLatestTalk,
  talksNewestFirst,
  yearsInArchive,
} from './archive';
import { slugOf } from './catalog';

vi.mock('astro:content', () => ({ getCollection: vi.fn() }));

// Ёлкин выступал на 10-м и 31-м, Анна и Борис — только на 15-м, Вера без докладов.
const catalog = {
  events: [
    event('ru/10', { date: new Date('2023-03-14T18:00:00+03:00'), tagline: 'Десятый', venue: { name: 'Авито' }, recordingUrl: 'https://youtu.be/a' }),
    event('ru/15', { date: new Date('2024-02-20T18:00:00+03:00'), tagline: 'Пятнадцатый', venue: { name: 'Звук' } }),
    event('ru/31', { date: new Date('2026-07-09T18:00:00+03:00'), tagline: 'Тридцать первый', photosUrl: 'https://disk/x' }),
    event('ru/online-2021', { date: new Date('2021-12-21T19:00:00+03:00'), tagline: 'Онлайн' }),
    event('ru/32', { date: new Date('2026-09-01T18:00:00+03:00'), draft: true }),
    event('en/10', { date: new Date('2023-03-14T18:00:00+03:00') }),
  ],
  talks: [
    talk('ru/grid', { event: '10', time: '19:00', title: 'Гриды', speakers: ['elkin'] }),
    talk('ru/subgrid', { event: '15', time: '19:40', title: 'Сабгрид', speakers: ['boris'], videoUrl: 'https://youtu.be/b' }),
    talk('ru/has', { event: '15', time: '19:00', title: ':has()', speakers: ['anna', 'elkin-draft'], vkVideoUrl: 'https://vkvideo.ru/video-1_2' }),
    talk('ru/anchor', { event: '31', time: '19:00', title: 'Якоря', speakers: ['elkin'], slidesUrl: 'https://s/x' }),
    talk('ru/hidden', { event: '31', time: '20:00', title: 'Черновик', speakers: ['vera'], draft: true }),
    talk('ru/online', { event: 'online-2021', title: 'Онлайн-доклад', speakers: ['anna'] }),
    talk('en/grid', { event: '10', speakers: ['elkin'] }),
  ],
  speakers: [
    speaker('ru/anna', { name: 'Анна' }),
    speaker('ru/boris', { name: 'Борис' }),
    speaker('ru/elkin', { name: 'Пётр Ёлкин', role: 'Яндекс' }),
    speaker('ru/vera', { name: 'Вера' }),
    speaker('ru/alla', { name: 'Алла' }),
    speaker('en/elkin', { name: 'Petr Yolkin' }),
  ],
};

const ru = <T extends { id: string }>(entries: T[]): T[] => entries.filter((entry) => entry.id.startsWith('ru/'));
const archive = archiveOf(catalog, 'ru');

describe('порядок', () => {
  it('митапы — от нового к старому, без черновиков и чужого языка', () => {
    expect(archive.events.map((item) => item.slug)).toEqual(['31', '15', '10', 'online-2021']);
  });

  it('доклады — от последнего митапа к первому, внутри митапа по программе', () => {
    expect(talksNewestFirst(ru(catalog.talks), ru(catalog.events)).map(({ talk: item }) => slugOf(item))).toEqual([
      'anchor',
      'has',
      'subgrid',
      'grid',
      'online',
    ]);
  });

  it('спикер поднимается по самому свежему докладу и не повторяется; без докладов — в конце по имени', () => {
    const order = speakersByLatestTalk(ru(catalog.speakers), ru(catalog.talks), ru(catalog.events)).map(slugOf);
    expect(order).toEqual(['elkin', 'anna', 'boris', 'alla', 'vera']);
  });
});

describe('строки', () => {
  it('метка — номер, у нечислового имени — год', () => {
    expect(eventLabel(catalog.events[0]!)).toBe('10');
    expect(eventLabel(catalog.events[3]!)).toBe('2021');
  });

  it('митап: дата по Москве, площадка, число докладов, запись и фото', () => {
    expect(archive.events[0]).toMatchObject({ date: '2026-07-09', year: 2026, talks: 1, recording: false, photos: true });
    expect(archive.events.find((item) => item.slug === '15')).toMatchObject({ venue: 'Звук', talks: 2, recording: true });
    expect(archive.events.find((item) => item.slug === '10')?.recording).toBe(true);
    expect(archive.talks.find((item) => item.slug === 'has')?.video).toBe(true);
  });

  it('доклад: митап с меткой, спикеры по именам, видео и слайды', () => {
    expect(archive.talks[0]).toMatchObject({
      slug: 'anchor',
      event: { slug: '31', label: '31', title: 'Тридцать первый' },
      speakers: [{ slug: 'elkin', name: 'Пётр Ёлкин' }],
      video: false,
      slides: true,
    });
    expect(archive.talks.find((item) => item.slug === 'has')?.speakers).toEqual([{ slug: 'anna', name: 'Анна' }]);
  });

  it('спикер: митапы и годы, новые первыми', () => {
    const elkin = archive.speakers[0]!;
    expect(elkin.events).toEqual([{ slug: '31', label: '31' }, { slug: '10', label: '10' }]);
    expect(elkin.years).toEqual([2026, 2023]);
    expect(archive.speakers.find((item) => item.slug === 'anna')?.events.map((item) => item.label)).toEqual(['15', '2021']);
    expect(archive.speakers.find((item) => item.slug === 'vera')?.events).toEqual([]);
  });
});

describe('фильтр', () => {
  const titles = <T extends { title: string }>(items: T[]): string[] => items.map((item) => item.title);

  it('пустой фильтр пропускает всё', () => {
    expect(filterArchive('talks', archive.talks, EMPTY_FILTER)).toHaveLength(archive.talks.length);
  });

  it('регистр и ё не важны, нужны все слова', () => {
    expect(filterArchive('speakers', archive.speakers, { ...EMPTY_FILTER, query: 'ЕЛКИН' }).map((s) => s.slug)).toEqual(['elkin']);
    expect(titles(filterArchive('talks', archive.talks, { ...EMPTY_FILTER, query: 'ёлкин гриды' }))).toEqual(['Гриды']);
    expect(filterArchive('talks', archive.talks, { ...EMPTY_FILTER, query: 'ёлкин сабгрид' })).toEqual([]);
  });

  it('ищет по площадке, метке митапа и должности', () => {
    expect(titles(filterArchive('events', archive.events, { ...EMPTY_FILTER, query: 'авито' }))).toEqual(['Десятый']);
    expect(titles(filterArchive('talks', archive.talks, { ...EMPTY_FILTER, query: '15' }))).toEqual([':has()', 'Сабгрид']);
    expect(filterArchive('speakers', archive.speakers, { ...EMPTY_FILTER, query: 'яндекс' })).toHaveLength(1);
  });

  it('год и запись вместе с текстом; год без митапов — пусто', () => {
    expect(titles(filterArchive('talks', archive.talks, { query: '', year: 2024, media: true }))).toEqual([':has()', 'Сабгрид']);
    expect(titles(filterArchive('events', archive.events, { query: '', year: undefined, media: true }))).toEqual(['Пятнадцатый', 'Десятый']);
    expect(filterArchive('events', archive.events, { ...EMPTY_FILTER, year: 2019 })).toEqual([]);
    expect(filterArchive('speakers', archive.speakers, { ...EMPTY_FILTER, year: 2023 }).map((s) => s.slug)).toEqual(['elkin']);
  });

  it('годы для выбора — только встречающиеся, новые первыми', () => {
    expect(yearsInArchive('events', archive.events)).toEqual([2026, 2024, 2023, 2021]);
  });

  it('normalize схлопывает пробелы', () => {
    expect(normalize('  Ёж   и\tЁлка ')).toBe('еж и елка');
  });
});

describe('состояние в адресе', () => {
  it('разбор: мусорный год и флаг игнорируются', () => {
    expect(filterFromSearch(new URLSearchParams('q=grid&year=2023&media=1'))).toEqual({ query: 'grid', year: 2023, media: true });
    expect(filterFromSearch(new URLSearchParams('year=20x3&media=yes'))).toEqual(EMPTY_FILTER);
  });

  it('сборка обратна разбору, пустой фильтр — пустая строка', () => {
    const filter = { query: 'якоря css', year: 2026, media: false };
    expect(filterFromSearch(new URLSearchParams(searchOfFilter(filter)))).toEqual(filter);
    expect(searchOfFilter(EMPTY_FILTER)).toBe('');
    expect(searchOfFilter({ ...EMPTY_FILTER, query: '   ' })).toBe('');
  });
});

describe('nextMeetupOf', () => {
  it('ближайший опубликованный митап с программой по времени и московским началом', () => {
    const next = nextMeetupOf(catalog, 'ru', new Date('2026-07-01T12:00:00+03:00'));
    expect(next).toMatchObject({ slug: '31', start: '2026-07-09T18:00:00+03:00', registrationUrl: undefined });
    expect(next?.programme).toEqual([{ kind: 'talk', time: '19:00', title: 'Якоря', talk: 'anchor', speakers: ['Пётр Ёлкин'] }]);
  });

  it('после последнего митапа ближайшего нет: прошедший не выдаётся за будущий', () => {
    expect(nextMeetupOf(catalog, 'ru', new Date('2026-07-10T12:00:00+03:00'))).toBeNull();
  });

  it('archiveOf без now ближайший митап не считает', () => {
    expect(archive.next).toBeNull();
    expect(archiveOf(catalog, 'ru', { now: new Date('2026-07-01T12:00:00+03:00') }).next?.slug).toBe('31');
  });
});

describe('reviewRowsOf и contactsOf', () => {
  it('отзывы языка без черновиков, с началом текста и спикером', () => {
    const rows = reviewRowsOf(
      [review('ru/anna', { name: 'Анна', category: 'speaker', speaker: 'anna' }), review('ru/draft', { draft: true }), review('en/anna')],
      'ru',
    );
    expect(rows).toEqual([{ slug: 'anna', name: 'Анна', role: undefined, category: 'speaker', speaker: 'anna', preview: 'Первый абзац.' }]);
  });

  it('контакты — из документа языка, у которого они есть', () => {
    const contacts = { lead: 'Пишите в Telegram.', items: [{ title: 'Канал', text: 'Анонсы.', links: [{ label: '@moscowcss', url: 'https://t.me/moscowcss' }] }] };
    expect(contactsOf([document('ru/privacy'), document('ru/about', { contacts }), document('en/about')], 'ru')).toEqual(contacts);
    expect(contactsOf([document('ru/privacy')], 'ru')).toBeNull();
  });
});
