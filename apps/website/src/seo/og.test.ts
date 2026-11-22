import { describe, expect, it, vi } from 'vitest';
import { document, event, speaker, talk, twoMeetupsCatalog } from '../test/fixtures';
import { cardInputOf, cardParam, cardPath, sizeOfParam } from './og';
import { publicPagesOf } from './pages';

vi.mock('astro:content', () => ({ getCollection: vi.fn() }));
vi.mock('astro:i18n', () => ({
  getRelativeLocaleUrl: (locale: string, path = '') =>
    `/${locale === 'ru' ? '' : `${locale}/`}${path === '' ? '' : `${path}/`}`,
}));

const home = (locale: string) => ({
  id: `${locale}/index`,
  data: { title: 'Главная', description: 'Описание', telegramUrl: 'https://t.me/x' },
});

const catalog = { ...twoMeetupsCatalog(), pages: [home('ru'), home('en')] };
const pages = publicPagesOf(catalog);
const pageAt = (path: string) => {
  const page = pages.find((item) => item.path === path);
  if (!page) throw new Error(path);
  return page;
};

describe('адреса карточек', () => {
  it('главная лежит в index, у английской под /en/', () => {
    expect(cardPath(pageAt('/'), 'og')).toBe('/og/index.png');
    expect(cardPath(pageAt('/en/'), 'twitter')).toBe('/og/en/index.twitter.png');
  });

  it('страницы повторяют свой адрес, у Twitter суффикс', () => {
    expect(cardParam(pageAt('/events/10/'), 'og')).toBe('events/10');
    expect(cardParam(pageAt('/en/events/10/'), 'twitter')).toBe('en/events/10.twitter');
  });

  it('размер читается из параметра', () => {
    expect(sizeOfParam('events/10.twitter')).toBe('twitter');
    expect(sizeOfParam('events/10')).toBe('og');
  });

  it('адреса всех карточек уникальны', () => {
    const all = pages.flatMap((page) => [cardPath(page, 'og'), cardPath(page, 'twitter')]);
    expect(new Set(all).size).toBe(all.length);
  });
});

describe('cardInputOf: документ и спикер без должности', () => {
  it('документ: заголовок и описание, адрес карточки по адресу страницы', () => {
    const data = { ...catalog, documents: [document('ru/personal-data', { title: 'Политика' })] };
    const [page] = publicPagesOf(data).filter((item) => item.kind === 'document');
    expect(page && cardPath(page, 'og')).toBe('/og/personal-data.png');
    expect(page && cardInputOf(page, data)).toMatchObject({ title: 'Политика', kicker: 'Документ' });
  });

  it('спикер без должности: пустая строка, не undefined', () => {
    const bare = speaker('ru/daria-egorova');
    delete bare.data.role;
    const data = { ...catalog, speakers: [bare] };
    const page = publicPagesOf(data).find((item) => item.kind === 'speaker');
    expect(page && cardInputOf(page, data).meta).toBe('');
  });
});

describe('cardInputOf', () => {
  it('митап: номер, московские дата и время, место', () => {
    const data = { ...catalog, events: [event('ru/31', { tagline: 'Митап в Звук' })] };
    const [page] = publicPagesOf({ ...data, talks: [], speakers: [] }).filter((p) => p.kind === 'event');
    if (!page) throw new Error('нет страницы');
    expect(cardInputOf(page, data)).toEqual({
      title: 'Митап в Звук',
      kicker: 'Митап № 31',
      meta: '9 июля 2026 в 18:00 · Звук',
    });
  });

  it('доклад: спикеры и митап; спикер: роль', () => {
    const data = {
      ...catalog,
      events: [event('ru/31', { tagline: 'Митап в Звук' })],
      talks: [talk('ru/css', { title: 'CSS' })],
      speakers: [speaker('ru/daria-egorova')],
    };
    const all = publicPagesOf(data);
    const talkPage = all.find((p) => p.kind === 'talk');
    const speakerPage = all.find((p) => p.kind === 'speaker');
    if (!talkPage || !speakerPage) throw new Error('нет страниц');
    expect(cardInputOf(talkPage, data)).toMatchObject({
      title: 'CSS',
      kicker: 'Доклад',
      meta: 'Дарья Егорова · Митап в Звук',
    });
    expect(cardInputOf(speakerPage, data)).toMatchObject({ title: 'Дарья Егорова', meta: 'Дизайнер' });
  });

  it('типографирует заголовок и подпись: предлог не остаётся в конце строки', () => {
    const data = { ...catalog, events: [event('ru/31', { tagline: 'Митап в Звук' })], talks: [talk('ru/css', { title: 'Гиперссылки в музыке' })], speakers: [] };
    const talkPage = publicPagesOf(data).find((p) => p.kind === 'talk');
    if (!talkPage) throw new Error('нет страницы');
    expect(cardInputOf(talkPage, data).title).toBe('Гиперссылки в музыке');
  });
});
