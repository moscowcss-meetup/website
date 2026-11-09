import { describe, expect, it, vi } from 'vitest';
import { registerSiteTools, siteTools, type ToolEnvironment, type WebMcpTool } from './webmcp';

const pagefind = {
  search: vi.fn(async (query: string) => ({
    results:
      query === 'якорь'
        ? [{ data: async () => ({ url: '/talks/anchor-and-popover/', meta: { title: 'Бросаем якорь', description: 'Anchor Positioning' } }) }]
        : [],
  })),
};

const env = (overrides: Partial<ToolEnvironment> = {}): ToolEnvironment => ({
  location: new URL('https://css.moscow/events/31/'),
  fetch: vi.fn(async (url: string) => ({ ok: url === '/events/31/index.md', status: url === '/events/31/index.md' ? 200 : 404, text: async () => '# 31 митап\n' })),
  loadPagefind: async () => pagefind,
  now: () => new Date('2026-11-20T12:00:00+03:00'),
  ...overrides,
});

const tool = (name: string, environment = env()): WebMcpTool => {
  const found = siteTools(environment).find((item) => item.name === name);
  if (!found) throw new Error(name);
  return found;
};

describe('siteTools', () => {
  it('у каждого инструмента имя, описание и JSON Schema с обязательными полями', () => {
    for (const item of siteTools(env())) {
      expect(item.name).toMatch(/^[a-z_]+$/);
      expect(item.description.length).toBeGreaterThan(30);
      expect(item.inputSchema).toMatchObject({ type: 'object', required: expect.any(Array) });
    }
  });

  it('search_site: абсолютные адреса и описания найденного', async () => {
    const result = await tool('search_site').execute({ query: 'якорь' });
    expect(result.content[0]?.text).toBe('- Бросаем якорь: https://css.moscow/talks/anchor-and-popover/ — Anchor Positioning');
  });

  it('search_site: пусто — понятный ответ, индекс упал — ошибка', async () => {
    expect((await tool('search_site').execute({ query: 'ничего' })).content[0]?.text).toContain('Nothing found');
    const broken = env({ loadPagefind: () => Promise.reject(new Error('404')) });
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect((await tool('search_site', broken).execute({ query: 'якорь' })).isError).toBe(true);
  });

  it('get_page_markdown: путь и полный адрес своего сайта ведут на index.md страницы', async () => {
    expect((await tool('get_page_markdown').execute({ url: '/events/31/' })).content[0]?.text).toBe('# 31 митап\n');
    expect((await tool('get_page_markdown').execute({ url: 'https://css.moscow/events/31/' })).isError).toBeUndefined();
  });

  it('get_page_markdown: чужой сайт не запрашивается — инструмент не прокси', async () => {
    const environment = env();
    const result = await tool('get_page_markdown', environment).execute({ url: 'https://evil.example/x' });
    expect(result.isError).toBe(true);
    expect(environment.fetch).not.toHaveBeenCalled();
  });

  it('get_page_markdown: страницы нет — ошибка с кодом', async () => {
    expect((await tool('get_page_markdown').execute({ url: '/nope/' })).content[0]?.text).toContain('HTTP 404');
  });
});

describe('registerSiteTools', () => {
  it('без WebMCP ничего не делает', async () => {
    expect(await registerSiteTools(undefined, env())).toBe(false);
  });

  it('регистрирует все инструменты и передаёт signal', async () => {
    const registerTool = vi.fn();
    const signal = new AbortController().signal;
    expect(await registerSiteTools({ registerTool }, env(), signal)).toBe(true);
    expect(registerTool.mock.calls.map(([item]) => (item as WebMcpTool).name)).toEqual(['search_site', 'get_page_markdown', 'list_archive', 'list_news', 'get_news', 'get_next_meetup', 'get_contacts']);
    expect(registerTool.mock.calls[0]?.[1]).toEqual({ signal });
  });
});

const archive = {
  events: [
    { slug: '31', label: '31', title: '31 митап', date: '2026-07-09', year: 2026, venue: 'Звук', talks: 2, speakers: ['elkin'], tags: ['Доступность', 'AI'], recording: false, photos: true },
    { slug: '10', label: '10', title: '10 митап', date: '2023-03-14', year: 2023, venue: 'Авито', talks: 3, speakers: ['elkin', 'gridova'], tags: [], recording: true, photos: false },
  ],
  talks: [
    { slug: 'anchor', title: 'Якоря', year: 2026, event: { slug: '31', label: '31', title: '31 митап' }, speakers: [{ slug: 'elkin', name: 'Пётр Ёлкин' }], video: false, slides: true },
    { slug: 'grid', title: 'Гриды', year: 2023, event: { slug: '10', label: '10', title: '10 митап' }, speakers: [{ slug: 'elkin', name: 'Пётр Ёлкин' }], video: true, slides: false },
  ],
  speakers: [
    { slug: 'elkin', name: 'Пётр Ёлкин', role: 'Яндекс', years: [2026, 2023], events: [{ slug: '31', label: '31' }, { slug: '10', label: '10' }] },
    { slug: 'gridova', name: 'Анна Гридова', role: undefined, years: [2023], events: [{ slug: '10', label: '10' }] },
  ],
  news: [
    { slug: 't1-impulse', title: 'Стенд на Импульсе', date: '2026-11-08', year: 2026, description: 'Будем на стенде Импульса Т1.', tags: ['Конференции'], photos: true },
    { slug: 'it-hr-awards', title: 'IT HR Awards', date: '2026-11-08', year: 2026, description: 'Участвуем в конкурсе.', tags: ['Конкурсы'], photos: false },
    { slug: 'holyjs-2025', title: 'Стенд на HolyJS', date: '2025-04-09', year: 2025, description: 'Первый стенд.', tags: ['Конференции'], photos: true },
  ],
  reviews: [
    { slug: 'elkin', name: 'Пётр Ёлкин', role: 'Яндекс', category: 'speaker', speaker: 'elkin', preview: 'Первый доклад был у вас.' },
    { slug: 'guest', name: 'Гость', role: undefined, category: 'guest', speaker: undefined, preview: 'Хожу на каждый митап.' },
  ],
  next: {
    slug: '32',
    label: '32',
    title: '32 митап',
    start: '2026-11-26T19:00:00+03:00',
    venue: { name: 'Школа 21', address: 'Москва, Вятская ул., 27' },
    modes: ['оффлайн', 'онлайн'],
    tags: ['AI'],
    registrationUrl: undefined,
    networklyUrl: undefined,
    streamUrl: undefined,
    programme: [
      { kind: 'talk', time: '19:00', title: 'Якоря', talk: 'anchor', speakers: ['Пётр Ёлкин'] },
      { kind: 'break', time: '19:40', title: 'Перерыв', talk: undefined, speakers: [] },
    ],
  },
  contacts: {
    lead: 'Сообщество живёт в Telegram.',
    items: [{ title: 'Регистрация', text: 'Здесь открывается регистрация.', links: [{ label: 'Timepad', url: 'https://moscowcss.timepad.ru/' }] }],
  },
};
const archiveEnv = (overrides: Partial<ToolEnvironment> = {}) =>
  env({
    location: new URL('https://css.moscow/en/talks/'),
    archiveUrl: 'https://css.moscow/en/archive.json',
    fetch: vi.fn(async (url: string) => ({ ok: url === '/en/archive.json', status: url === '/en/archive.json' ? 200 : 404, text: async () => JSON.stringify(archive) })),
    ...overrides,
  });

describe('list_news', () => {
  it('фильтрует по теме и году, отдаёт список тем и абсолютные адреса языка', async () => {
    const result = await tool('list_news', archiveEnv()).execute({ topic: 'конференции', year: 2026 });
    expect(result.content[0]?.text).toBe(
      '1 news match; showing 1–1. Topics: Конференции, Конкурсы.\n- Стенд на Импульсе: https://css.moscow/en/news/t1-impulse/ — 2026-11-08, Будем на стенде Импульса Т1.; topics: Конференции [photos]',
    );
  });

  it('только с фото и пустой результат с подсказкой тем', async () => {
    expect((await tool('list_news', archiveEnv()).execute({ photos: true })).content[0]?.text).toMatch(/^2 news match/);
    expect((await tool('list_news', archiveEnv()).execute({ query: 'нет такого' })).content[0]?.text).toContain('No news match (0 found in total). Topics:');
  });
});

describe('get_news', () => {
  const newsEnv = () =>
    archiveEnv({
      fetch: vi.fn(async (url: string) =>
        url === '/en/archive.json'
          ? { ok: true, status: 200, text: async () => JSON.stringify(archive) }
          : { ok: url === '/en/news/holyjs-2025/index.md', status: url === '/en/news/holyjs-2025/index.md' ? 200 : 404, text: async () => '# Стенд на HolyJS\n' },
      ),
    });

  it('по имени файла или адресу отдаёт Markdown новости своего языка', async () => {
    expect((await tool('get_news', newsEnv()).execute({ news: 'holyjs-2025' })).content[0]?.text).toBe('# Стенд на HolyJS\n');
    expect((await tool('get_news', newsEnv()).execute({ news: 'https://css.moscow/en/news/holyjs-2025/' })).isError).toBeUndefined();
  });

  it('неизвестная новость — ошибка с подсказкой, без запроса страницы', async () => {
    const environment = newsEnv();
    const result = await tool('get_news', environment).execute({ news: 'nope' });
    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain('list_news');
    expect(environment.fetch).not.toHaveBeenCalledWith('/en/news/nope/index.md');
  });
});

describe('list_archive', () => {
  it('фильтрует той же функцией, что страница: ё, год, видео; адреса — языка данных', async () => {
    const environment = archiveEnv();
    const result = await tool('list_archive', environment).execute({ kind: 'talks', query: 'ёлкин', media: true });
    expect(result.content[0]?.text).toBe(
      '1 talks match; showing 1–1.\n- Гриды: https://css.moscow/en/talks/grid/ — Пётр Ёлкин; meetup 10 (2023) [video]',
    );
    expect(environment.fetch).toHaveBeenCalledWith('/en/archive.json');
  });

  it('митапы и спикеры, лимит и сдвиг', async () => {
    const events = await tool('list_archive', archiveEnv()).execute({ kind: 'events', limit: 1, offset: 1 });
    expect(events.content[0]?.text).toBe(
      '2 events match; showing 2–2.\n- 10 митап: https://css.moscow/en/events/10/ — 2023-03-14, Авито, talks: 3 [recording]',
    );
    const speakers = await tool('list_archive', archiveEnv()).execute({ kind: 'speakers', year: 2023 });
    expect(speakers.content[0]?.text).toContain('- Пётр Ёлкин: https://css.moscow/en/speakers/elkin/ — Яндекс; meetups: 31, 10');
  });

  it('неизвестный вид, нет данных, пустой результат', async () => {
    expect((await tool('list_archive', archiveEnv()).execute({ kind: 'videos' })).isError).toBe(true);
    expect((await tool('list_archive', archiveEnv({ archiveUrl: undefined })).execute({ kind: 'talks' })).isError).toBe(true);
    expect((await tool('list_archive', archiveEnv({ archiveUrl: '/missing.json' })).execute({ kind: 'talks' })).isError).toBe(true);
    expect((await tool('list_archive', archiveEnv()).execute({ kind: 'events', year: 2019 })).content[0]?.text).toBe('No events match (0 found in total).');
  });
});

describe('list_archive: точные связи и отзывы', () => {
  const run = async (input: Record<string, unknown>) =>
    (await tool('list_archive', archiveEnv()).execute(input)).content[0]?.text ?? '';

  it('доклады спикера по имени файла или имени, программа митапа по номеру', async () => {
    expect(await run({ kind: 'talks', speaker: 'elkin' })).toMatch(/^2 talks match/);
    expect(await run({ kind: 'talks', speaker: 'Петр Елкин', event: '31' })).toMatch(/^1 talks match;.*\n- Якоря:/);
    expect(await run({ kind: 'speakers', event: '10' })).toMatch(/^2 speakers match/);
  });

  it('митапы спикера и митапы по теме', async () => {
    expect(await run({ kind: 'events', speaker: 'gridova' })).toContain('- 10 митап:');
    expect(await run({ kind: 'events', tag: 'доступ' })).toBe(
      '1 events match; showing 1–1.\n- 31 митап: https://css.moscow/en/events/31/ — 2026-07-09, Звук, talks: 2; topics: Доступность, AI [photos]',
    );
  });

  it('поле, которого у вида строк нет, ничего не находит', async () => {
    expect(await run({ kind: 'talks', tag: 'AI' })).toBe('No talks match (0 found in total).');
  });

  it('отзывы: категория, автор-спикер и адрес окна отзыва', async () => {
    expect(await run({ kind: 'reviews', category: 'speaker' })).toBe(
      '1 reviews match; showing 1–1.\n- Пётр Ёлкин (Яндекс, speaker): https://css.moscow/en/reviews/?review=elkin — Первый доклад был у вас.; speaker page: https://css.moscow/en/speakers/elkin/',
    );
    expect(await run({ kind: 'reviews', query: 'каждый' })).toContain('- Гость (guest)');
  });
});

describe('get_next_meetup', () => {
  it('когда, где, регистрация и программа со ссылками', async () => {
    const result = (await tool('get_next_meetup', archiveEnv()).execute({})).content[0]?.text ?? '';
    expect(result.split('\n')).toEqual([
      '32 митап: https://css.moscow/en/events/32/',
      'Starts: 2026-11-26T19:00:00+03:00 (Moscow time).',
      'Venue: Школа 21, Москва, Вятская ул., 27.',
      'Format: оффлайн, онлайн.',
      'Registration is not open yet: it is announced in the Telegram channel https://t.me/moscowcss.',
      'Topics: AI.',
      'Programme:',
      '- 19:00 Якоря — Пётр Ёлкин (https://css.moscow/en/talks/anchor/)',
      '- 19:40 Перерыв',
    ]);
  });

  it('митап уже прошёл, а сайт ещё не пересобран — ближайшего нет, есть последний', async () => {
    const late = archiveEnv({ now: () => new Date('2026-11-27T12:00:00+03:00') });
    const result = (await tool('get_next_meetup', late).execute({})).content[0]?.text ?? '';
    expect(result).toContain('No upcoming meetup is announced yet');
    expect(result).toContain('The latest meetup: 31 митап: https://css.moscow/en/events/31/');
  });
});

describe('get_contacts', () => {
  it('вступление и карточки со ссылками', async () => {
    expect((await tool('get_contacts', archiveEnv()).execute({})).content[0]?.text).toBe(
      'Сообщество живёт в Telegram.\n- Регистрация: Здесь открывается регистрация. Timepad https://moscowcss.timepad.ru/',
    );
  });
});
