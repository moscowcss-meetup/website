import { describe, expect, it, vi } from 'vitest';
import { event, faq, organizer, page, partner, speaker, talk, twoMeetupsCatalog } from '../test/fixtures';
import {
  CatalogError,
  checkEventDays,
  EVENT_DURATION_MS,
  pastEvents,
  scheduleOf,
  talksOfEvent,
  talksOfSpeaker,
  upcomingEvent,
  validateCatalog,
} from './catalog';

vi.mock('astro:content', () => ({ getCollection: vi.fn() }));

const messageOf = (run: () => void): string => {
  try {
    run();
  } catch (error) {
    expect(error).toBeInstanceOf(CatalogError);
    return (error as Error).message;
  }
  throw new Error('validateCatalog не бросил ошибку');
};

describe('validateCatalog', () => {
  it('пропускает согласованный каталог', () => {
    expect(() => validateCatalog(twoMeetupsCatalog())).not.toThrow();
  });

  it('пустое тело доклада: путь файла в сообщении', () => {
    const catalog = twoMeetupsCatalog();
    catalog.talks[0] = { ...catalog.talks[0]!, body: '  \n' };
    expect(messageOf(() => validateCatalog(catalog))).toContain('talks/ru/css-nesting.md: текст файла пуст');
  });

  it('текст есть, а рендера нет (ошибка рендера из кэша) — ошибка с путём', () => {
    const catalog = twoMeetupsCatalog();
    for (const entry of catalog.talks) entry.rendered = { html: '<p>Описание доклада.</p>' };
    expect(() => validateCatalog(catalog, { requireRendered: true })).not.toThrow();
    catalog.talks[0] = { ...catalog.talks[0]!, rendered: undefined };
    expect(messageOf(() => validateCatalog(catalog, { requireRendered: true }))).toContain(
      'talks/ru/css-nesting.md: текст файла не отрендерился',
    );
  });

  it('опубликованный митап ссылается на партнёра-черновика', () => {
    const catalog = twoMeetupsCatalog();
    catalog.events[0] = event('ru/10', { date: new Date('2024-03-14T18:00:00+03:00'), partner: 'zvuk' });
    catalog.partners = [{ ...partner('ru/zvuk'), data: { ...partner('ru/zvuk').data, draft: true } }];
    expect(messageOf(() => validateCatalog(catalog))).toContain('партнёр «zvuk» — черновик');
  });

  it('расхождение photosUrl в переводе митапа', () => {
    const catalog = twoMeetupsCatalog();
    catalog.events[0] = event('ru/10', {
      date: new Date('2024-03-14T18:00:00+03:00'),
      photosUrl: 'https://example.com/photos',
    });
    expect(messageOf(() => validateCatalog(catalog))).toContain('events/en/10.md: поле photosUrl');
  });

  it('расхождение passportRequired в переводе митапа', () => {
    const catalog = twoMeetupsCatalog();
    catalog.events[2] = event('en/10', { date: new Date('2024-03-14T18:00:00+03:00'), passportRequired: true });
    expect(messageOf(() => validateCatalog(catalog))).toContain('events/en/10.md: поле passportRequired');
  });

  it('несуществующий спикер: путь файла доклада и имя в сообщении', () => {
    const catalog = twoMeetupsCatalog();
    catalog.talks[0] = talk('ru/css-nesting', { event: '10', speakers: ['nobody'] });
    const message = messageOf(() => validateCatalog(catalog));
    expect(message).toContain('packages/content/src/talks/ru/css-nesting.md');
    expect(message).toContain('nobody');
    expect(message).toContain('speakers/ru');
  });

  it('черновик доклада может ссылаться на ещё не заведённых спикера и митап', () => {
    const catalog = twoMeetupsCatalog();
    catalog.talks.push(talk('ru/future', { event: '99', speakers: ['someone'], draft: true }));
    catalog.talks.push(talk('en/future', { event: '99', speakers: ['someone'], draft: true }));
    expect(() => validateCatalog(catalog)).not.toThrow();
  });

  it('спикер есть только в другом языке: в своём языке это ошибка', () => {
    const catalog = twoMeetupsCatalog();
    catalog.speakers = [speaker('en/daria-egorova')];
    const message = messageOf(() => validateCatalog(catalog));
    expect(message).toContain('talks/ru/css-nesting.md');
    expect(message).toContain('daria-egorova');
  });

  it('несуществующий митап в своём языке', () => {
    const catalog = twoMeetupsCatalog();
    catalog.talks[1] = talk('ru/anchor-positioning', { event: '99' });
    const message = messageOf(() => validateCatalog(catalog));
    expect(message).toContain('talks/ru/anchor-positioning.md');
    expect(message).toContain('«99»');
  });

  it('несуществующий партнёр митапа', () => {
    const catalog = twoMeetupsCatalog();
    catalog.events[0] = event('ru/10', { partner: 'zvuk' });
    expect(messageOf(() => validateCatalog(catalog))).toContain('«zvuk»');
    catalog.partners = [partner('ru/zvuk')];
    catalog.events[2] = event('en/10', { partner: 'zvuk' });
    catalog.partners.push(partner('en/zvuk'));
    expect(() => validateCatalog(catalog)).not.toThrow();
  });

  it('расхождение time в en: путь файла и поле time', () => {
    const catalog = twoMeetupsCatalog();
    catalog.talks[2] = talk('en/css-nesting', { event: '10', time: '19:35' });
    const message = messageOf(() => validateCatalog(catalog));
    expect(message).toContain('packages/content/src/talks/en/css-nesting.md');
    expect(message).toContain('поле time отличается от ru/css-nesting');
  });

  it('ролик в VK Видео есть только в ru — расхождение перевода', () => {
    const catalog = twoMeetupsCatalog();
    catalog.talks[0] = talk('ru/css-nesting', { event: '10', vkVideoUrl: 'https://vkvideo.ru/video-1_2' });
    expect(messageOf(() => validateCatalog(catalog))).toContain('поле vkVideoUrl отличается от ru/css-nesting');
  });

  it('расхождение даты митапа и времени в schedule', () => {
    const catalog = twoMeetupsCatalog();
    const schedule = [{ time: '19:40—20:00', title: 'Перерыв', kind: 'break' as const }];
    catalog.events[0] = event('ru/10', { date: catalog.events[0]!.data.date, schedule });
    catalog.events[2] = event('en/10', {
      date: new Date('2024-03-15T18:00:00+03:00'),
      schedule: [{ time: '19:45—20:00', title: 'Break', kind: 'break' }],
    });
    const message = messageOf(() => validateCatalog(catalog));
    expect(message).toContain('events/en/10.md: поле date');
    expect(message).toContain('events/en/10.md: поле schedule[].time');
    expect(message).not.toContain('schedule[].kind');
  });

  it('перевод спикера: расхождение фото и ссылок', () => {
    const catalog = twoMeetupsCatalog();
    catalog.speakers[1] = speaker('en/daria-egorova', {
      photo: { src: '/other.jpg', width: 1, height: 1, format: 'jpg' },
      links: [{ label: 'Site', url: 'https://example.com' }],
    });
    const message = messageOf(() => validateCatalog(catalog));
    expect(message).toContain('поле photo');
    expect(message).toContain('поле links');
  });

  it('организатор: расхождение status между языками — файл и поле в сообщении', () => {
    const catalog = twoMeetupsCatalog();
    catalog.organizers = [
      organizer('ru/roman-troitsky', { status: 'current' }),
      organizer('en/roman-troitsky', { status: 'past' }),
    ];
    expect(messageOf(() => validateCatalog(catalog))).toContain(
      'organizers/en/roman-troitsky.md: поле status отличается от ru/roman-troitsky',
    );
  });

  it('организатор: расхождение contacts между языками, порядка и фото', () => {
    const catalog = twoMeetupsCatalog();
    catalog.organizers = [
      organizer('ru/roman-troitsky'),
      organizer('en/roman-troitsky', {
        contacts: { telegram: 'https://t.me/DreamShaded' },
        photo: { src: '/other.png', width: 1, height: 1, format: 'png' },
      }),
    ];
    const message = messageOf(() => validateCatalog(catalog));
    expect(message).toContain('organizers/en/roman-troitsky.md: поле contacts');
    expect(message).toContain('поле photo');
    expect(message).not.toContain('поле status');
  });

  it('организатор: согласованные переводы и разное имя — без ошибок', () => {
    const catalog = twoMeetupsCatalog();
    catalog.organizers = [
      organizer('ru/roman-troitsky'),
      organizer('en/roman-troitsky', { name: 'Roman Troitsky' }),
    ];
    expect(() => validateCatalog(catalog)).not.toThrow();
  });

  it('перевод без оригинала', () => {
    const catalog = twoMeetupsCatalog();
    catalog.talks.push(talk('en/orphan', { event: '10' }));
    expect(messageOf(() => validateCatalog(catalog))).toContain('talks/en/orphan.md: нет оригинала ru/orphan');
  });

  it('опубликованный доклад в черновом митапе', () => {
    const catalog = twoMeetupsCatalog();
    catalog.events[0] = event('ru/10', { date: catalog.events[0]!.data.date, draft: true });
    const message = messageOf(() => validateCatalog(catalog));
    expect(message).toContain('talks/ru/css-nesting.md');
    expect(message).toContain('черновик');
  });

  it('черновой доклад в черновом митапе допустим', () => {
    const catalog = twoMeetupsCatalog();
    catalog.events[0] = event('ru/10', { date: catalog.events[0]!.data.date, draft: true });
    catalog.talks[0] = talk('ru/css-nesting', { event: '10', time: '19:30', draft: true });
    expect(() => validateCatalog(catalog)).not.toThrow();
  });

  it('собирает все ошибки в одно сообщение', () => {
    const catalog = twoMeetupsCatalog();
    catalog.talks[0] = talk('ru/css-nesting', { event: '10', speakers: ['nobody'] });
    catalog.talks[1] = talk('ru/anchor-positioning', { event: '99' });
    const error = (() => {
      try {
        validateCatalog(catalog);
      } catch (caught) {
        return caught as CatalogError;
      }
      throw new Error('нет ошибки');
    })();
    expect(error.problems.length).toBeGreaterThanOrEqual(2);
  });
});

describe('тег вопросов спикерам', () => {
  const withFaq = (ruBody: string, enTag = '#вопрос_спикеру') => {
    const catalog = twoMeetupsCatalog();
    const en = page('en/index');
    catalog.pages = [page('ru/index'), { ...en, data: { ...en.data, questionTag: enTag } }];
    catalog.faq = [faq('ru/questions', ruBody), faq('en/questions', 'Ask with #вопрос_спикеру')];
    return catalog;
  };

  it('тег в FAQ совпадает с questionTag — ошибки нет', () => {
    expect(() => validateCatalog(withFaq('Пишите с тегом #вопрос_спикеру'))).not.toThrow();
  });

  it('старый тег в FAQ — ошибка с путём и правильным тегом', () => {
    expect(messageOf(() => validateCatalog(withFaq('Пишите с тегом #moscowcss_questions')))).toContain(
      'faq/ru/questions.md: в тексте тег #moscowcss_questions, а в pages/ru/index.md questionTag — #вопрос_спикеру',
    );
  });

  it('ссылка на якорь этой же страницы тегом не считается', () => {
    expect(() => validateCatalog(withFaq('[Напиши оргам](#organizers)'))).not.toThrow();
  });

  it('якорь ссылки и заголовок Markdown тегом не считаются', () => {
    const body = '## Вопросы\n\n[Регистрация](https://x.ru/event/1/#register), тег #вопрос_спикеру';
    expect(() => validateCatalog(withFaq(body))).not.toThrow();
  });

  it('тег в переводе главной отличается — расхождение перевода', () => {
    expect(messageOf(() => validateCatalog(withFaq('#вопрос_спикеру', '#question')))).toContain(
      'pages/en/index.md: поле questionTag',
    );
  });
});

describe('связи', () => {
  const catalog = twoMeetupsCatalog();
  const meetup10 = catalog.events[0]!;

  it('talksOfEvent: доклады своего митапа и языка по времени', () => {
    const talks = [
      talk('ru/late', { event: '10', time: '21:00' }),
      talk('ru/early', { event: '10', time: '19:10' }),
      talk('ru/other', { event: '15' }),
      talk('en/early', { event: '10', time: '19:10' }),
      talk('ru/hidden', { event: '10', draft: true }),
    ];
    expect(talksOfEvent(meetup10, talks).map((t) => t.id)).toEqual(['ru/early', 'ru/late']);
  });

  it('talksOfEvent: доклады без времени идут после докладов со временем, между собой по имени файла', () => {
    const untimed = (id: string) => {
      const entry = talk(id, { event: '10' });
      delete entry.data.time;
      return entry;
    };
    const talks = [
      untimed('ru/b-untimed'),
      talk('ru/late', { event: '10', time: '21:00' }),
      untimed('ru/a-untimed'),
      talk('ru/early', { event: '10', time: '19:10' }),
    ];
    expect(talksOfEvent(meetup10, talks).map((t) => t.id)).toEqual([
      'ru/early',
      'ru/late',
      'ru/a-untimed',
      'ru/b-untimed',
    ]);
  });

  it('scheduleOf: без расписания сперва доклады по имени файла, затем пункты в порядке файла', () => {
    const planned = event('ru/32', {
      schedule: [
        { title: 'Секрет 1', kind: 'activity' },
        { title: 'Секрет 2', kind: 'activity' },
      ],
    });
    const talks = [talk('ru/b-talk', { event: '32', time: undefined, title: 'Второй' }), talk('ru/a-talk', { event: '32', time: undefined, title: 'Первый' })];
    expect(scheduleOf(planned, talks).map((item) => item.title)).toEqual(['Первый', 'Второй', 'Секрет 1', 'Секрет 2']);
  });

  it('scheduleOf: доклад без времени идёт после перерывов и докладов со временем', () => {
    const untimed = talk('ru/untimed', { event: '10', title: 'Без времени' });
    delete untimed.data.time;
    const withBreak = event('ru/10', { schedule: [{ time: '20:00—20:15', title: 'ПЕРЕРЫВ', kind: 'break' }] });
    const talks = [untimed, talk('ru/timed', { event: '10', time: '19:10', title: 'Со временем' })];
    expect(scheduleOf(withBreak, talks).map((item) => item.title)).toEqual([
      'Со временем',
      'ПЕРЕРЫВ',
      'Без времени',
    ]);
  });

  it('talksOfSpeaker: на одном митапе доклады без времени идут после докладов со временем', () => {
    const untimed = talk('ru/a-untimed', { event: '10' });
    delete untimed.data.time;
    const talks = [untimed, talk('ru/timed', { event: '10', time: '19:10' })];
    const result = talksOfSpeaker(catalog.speakers[0]!, talks, [event('ru/10')]);
    expect(result.map((r) => r.talk.id)).toEqual(['ru/timed', 'ru/a-untimed']);
  });

  it('talksOfSpeaker: доклады на митапах 10 и 15, каждый со своим митапом', () => {
    const result = talksOfSpeaker(catalog.speakers[0]!, catalog.talks, catalog.events);
    expect(result.map((r) => [r.talk.id, r.event.id])).toEqual([
      ['ru/anchor-positioning', 'ru/15'],
      ['ru/css-nesting', 'ru/10'],
    ]);
  });

  it('talksOfSpeaker: чужие, черновые доклады и доклады чернового митапа не попадают', () => {
    const talks = [
      talk('ru/mine', { event: '10' }),
      talk('ru/theirs', { event: '10', speakers: ['someone'] }),
      talk('ru/draft', { event: '10', draft: true }),
      talk('ru/in-draft-event', { event: '15' }),
    ];
    const events = [event('ru/10'), event('ru/15', { draft: true })];
    const result = talksOfSpeaker(catalog.speakers[0]!, talks, events);
    expect(result.map((r) => r.talk.id)).toEqual(['ru/mine']);
  });

  it('scheduleOf: доклады, перерыв и активность сливаются по времени', () => {
    const withBreaks = event('ru/10', {
      schedule: [
        { time: '20:00—20:15', title: 'ПЕРЕРЫВ', kind: 'break' },
        { time: '19:40—20:00', title: 'АКТИВНОСТЬ', kind: 'activity' },
      ],
    });
    const talks = [
      talk('ru/last', { event: '10', time: '21:00', title: 'Третий' }),
      talk('ru/first', { event: '10', time: '19:10', title: 'Первый' }),
      talk('ru/second', { event: '10', time: '20:15', title: 'Второй' }),
    ];
    expect(scheduleOf(withBreaks, talks).map((item) => [item.kind, item.title])).toEqual([
      ['talk', 'Первый'],
      ['activity', 'АКТИВНОСТЬ'],
      ['break', 'ПЕРЕРЫВ'],
      ['talk', 'Второй'],
      ['talk', 'Третий'],
    ]);
  });
});

describe('checkEventDays', () => {
  it('несуществующая дата (YAML перенёс 30 февраля на 2 марта) — ошибка с путём; верная — нет', () => {
    const rolled = event('ru/32', { date: new Date('2026-03-02T18:00:00+03:00') });
    const fine = event('ru/31');
    const sources: Record<string, string> = {
      [rolled.filePath ?? '']: '---\ndate: 2026-02-30\ntime: "18:00"\n---\n',
      [fine.filePath ?? '']: '---\ndate: 2026-07-09\ntime: "18:00"\n---\n',
    };
    const problems: string[] = [];
    checkEventDays([rolled, fine], (path) => sources[path] ?? '', problems);
    expect(problems).toEqual(['packages/content/src/events/ru/32.md: date 2026-02-30 — такой даты нет в календаре']);
  });
});

describe('upcomingEvent / pastEvents', () => {
  it('идущий митап (меньше EVENT_DURATION_MS после начала) ещё не прошедший', () => {
    const live = event('ru/31');
    const start = live.data.date.getTime();
    expect(upcomingEvent([live], new Date(start + 60 * 60 * 1000))).toEqual({ event: live, past: false });
    expect(pastEvents([live], new Date(start + 60 * 60 * 1000))).toEqual([]);
    expect(upcomingEvent([live], new Date(start + EVENT_DURATION_MS + 1))?.past).toBe(true);
  });

  const e10 = event('ru/10', { date: new Date('2024-03-14T15:00:00Z') });
  const e15 = event('ru/15', { date: new Date('2025-02-20T15:00:00Z') });
  const e20 = event('ru/20', { date: new Date('2026-06-01T15:00:00Z') });
  const e25 = event('ru/25', { date: new Date('2026-09-01T15:00:00Z') });
  const draft = event('ru/26', { date: new Date('2026-08-01T15:00:00Z'), draft: true });

  it('будущих нет: последний прошедший с past: true', () => {
    const result = upcomingEvent([e15, e10, e20], new Date('2027-01-01T00:00:00Z'));
    expect(result?.event.id).toBe('ru/20');
    expect(result?.past).toBe(true);
  });

  it('два будущих: ближайший, без past', () => {
    const result = upcomingEvent([e25, e20, e10], new Date('2026-05-01T00:00:00Z'));
    expect(result?.event.id).toBe('ru/20');
    expect(result?.past).toBe(false);
  });

  it('митап ровно в момент now считается предстоящим', () => {
    const result = upcomingEvent([e10, e15], e15.data.date);
    expect(result).toEqual({ event: e15, past: false });
  });

  it('черновики исключены', () => {
    expect(upcomingEvent([draft, e25], new Date('2026-07-01T00:00:00Z'))?.event.id).toBe('ru/25');
    expect(upcomingEvent([draft], new Date('2026-07-01T00:00:00Z'))).toBeUndefined();
  });

  it('пустой список: undefined', () => {
    expect(upcomingEvent([], new Date('2026-07-01T00:00:00Z'))).toBeUndefined();
  });

  it('pastEvents: прошедшие, новые выше, без черновиков и будущих', () => {
    const past = pastEvents([e10, e25, draft, e20, e15], new Date('2026-07-01T00:00:00Z'));
    expect(past.map((e) => e.id)).toEqual(['ru/20', 'ru/15', 'ru/10']);
  });
});
