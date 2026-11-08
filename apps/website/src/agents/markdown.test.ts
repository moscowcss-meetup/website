import { describe, expect, it, vi } from 'vitest';
import { document, event, page, speaker, talk, twoMeetupsCatalog } from '../test/fixtures';
import { publicPagesOf } from '../seo/pages';
import { markdownOf, markdownPathOf } from './markdown';

vi.mock('astro:content', () => ({ getCollection: vi.fn() }));
vi.mock('astro:i18n', () => ({
  getRelativeLocaleUrl: (locale: string, path = '') =>
    `/${locale === 'ru' ? '' : `${locale}/`}${path === '' ? '' : `${path}/`}`,
}));

const site = new URL('https://css.moscow');
const now = new Date('2026-01-01T12:00:00+03:00');

function catalog() {
  const base = twoMeetupsCatalog();
  return {
    ...base,
    events: [
      ...base.events,
      event('ru/16', {
        date: new Date('2026-03-01T19:00:00+03:00'),
        tagline: 'Шестнадцатый [весенний] митап',
        registrationUrl: 'https://timepad.ru/e/16',
        vkPhotosUrl: 'https://vk.com/album-1_16',
        diskPhotosUrl: 'https://disk.yandex.ru/d/16',
      }),
    ],
    talks: [...base.talks, talk('ru/spring-talk', { event: '16', time: '19:30', title: 'Весенний доклад' })],
    pages: [page('ru/index', 'Сообщество фронтендеров.')],
    documents: [document('ru/about')],
  };
}

const markdownAt = (path: string, data = catalog()) => {
  const target = publicPagesOf(data).find((item) => item.path === path);
  if (!target) throw new Error(path);
  return markdownOf(target, data, { site, now });
};

describe('markdownPathOf', () => {
  it('файл лежит в папке страницы', () => {
    expect(markdownPathOf('/')).toBe('/index.md');
    expect(markdownPathOf('/en/events/31/')).toBe('/en/events/31/index.md');
  });
});

describe('markdownOf', () => {
  it('главная: текст, ближайший митап, прошедшие и ссылки — всё абсолютными адресами', () => {
    const text = markdownAt('/');
    expect(text).toMatch(/^# Moscow CSS\n\nСообщество фронтендеров\.\n/);
    expect(text).toContain('## Ближайший митап\n\n[Шестнадцатый \\[весенний\\] митап](https://css.moscow/events/16/): 1 марта 2026 в 19:00');
    expect(text).toContain('## Прошедшие митапы\n\n- [Митап](https://css.moscow/events/15/), 20 февраля 2025');
    expect(text).toContain('[RSS](https://css.moscow/rss.xml)');
  });

  it('митап: дата, программа со ссылками на доклад и спикера; регистрация у будущего митапа есть', () => {
    const text = markdownAt('/events/16/');
    expect(text).toContain('1 марта 2026 в 19:00, Звук, Москва.');
    expect(text).toContain(
      '- 19:30 — [Весенний доклад](https://css.moscow/talks/spring-talk/), [Дарья Егорова](https://css.moscow/speakers/daria-egorova/)',
    );
    expect(text).toContain('- [Регистрация](https://timepad.ru/e/16)');
    expect(text).toContain('- [Фото в ВК](https://vk.com/album-1_16)\n- [Фото на Яндекс Диске](https://disk.yandex.ru/d/16)');
  });

  it('прошедший митап: ссылки на регистрацию нет, как и на странице', () => {
    const data = catalog();
    data.events[0] = event('ru/10', { date: new Date('2024-03-14T18:00:00+03:00'), registrationUrl: 'https://timepad.ru/e/10' });
    expect(markdownAt('/events/10/', data)).not.toContain('timepad');
  });

  it('доклад: спикеры, митап и описание', () => {
    const text = markdownAt('/talks/css-nesting/');
    expect(text).toContain('# Доклад');
    expect(text).toContain('Спикеры: [Дарья Егорова](https://css.moscow/speakers/daria-egorova/).');
    expect(text).toContain('Митап: [Митап](https://css.moscow/events/10/), 14 марта 2024.');
    expect(text).toContain('Описание доклада.');
  });

  it('спикер: все доклады на всех митапах, новые выше', () => {
    const text = markdownAt('/speakers/daria-egorova/');
    expect(text.indexOf('events/16/')).toBeLessThan(text.indexOf('events/10/'));
    expect(text.match(/^- /gm)).toHaveLength(3);
  });

  it('спикер без должности — без пустой строки вместо неё', () => {
    const data = catalog();
    data.speakers[0] = speaker('ru/daria-egorova', { role: undefined });
    expect(markdownAt('/speakers/daria-egorova/', data)).toMatch(/^# Дарья Егорова\n\n## Доклады/);
  });

  it('документ: заголовок и текст; файл заканчивается одним переводом строки', () => {
    const text = markdownAt('/about/');
    expect(text.startsWith('# ')).toBe(true);
    expect(text.endsWith('\n')).toBe(true);
    expect(text.endsWith('\n\n')).toBe(false);
  });
});
