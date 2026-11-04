import type {
  DocumentEntry,
  EventData,
  EventEntry,
  FaqEntry,
  OrganizerData,
  OrganizerEntry,
  PageEntry,
  PartnerEntry,
  SpeakerData,
  SpeakerEntry,
  TalkData,
  TalkEntry,
} from '../content/catalog';

const filePathOf = (collection: string, id: string): string =>
  `packages/content/src/${collection}/${id}.md`;

export function event(id: string, data: Partial<EventData> = {}): EventEntry {
  return {
    id,
    filePath: filePathOf('events', id),
    data: {
      date: new Date('2026-07-09T18:00:00+03:00'),
      time: '18:00',
      tagline: 'Митап',
      venue: { name: 'Звук', address: 'Москва' },
      modes: ['оффлайн'],
      passportRequired: false,
      schedule: [],
      draft: false,
      ...data,
    },
  };
}

export function talk(id: string, data: Partial<TalkData> = {}): TalkEntry {
  return {
    id,
    filePath: filePathOf('talks', id),
    body: 'Описание доклада.',
    data: {
      event: '31',
      speakers: ['daria-egorova'],
      time: '19:10',
      title: 'Доклад',
      draft: false,
      ...data,
    },
  };
}

export function speaker(id: string, data: Partial<SpeakerData> = {}): SpeakerEntry {
  return {
    id,
    filePath: filePathOf('speakers', id),
    data: {
      name: 'Дарья Егорова',
      role: 'Дизайнер',
      photo: { src: '/daria.jpg', width: 1, height: 1, format: 'jpg' },
      photoAlt: 'Дарья Егорова',
      draft: false,
      ...data,
    },
  };
}

export function partner(id: string): PartnerEntry {
  return {
    id,
    filePath: filePathOf('partners', id),
    data: {
      name: 'Звук',
      handle: '@ZVUK_JOBS',
      tagline: 'Партнёр',
      features: [{ title: 'Вакансии', description: 'Описание' }],
      draft: false,
    },
  };
}

export function organizer(id: string, data: Partial<OrganizerData> = {}): OrganizerEntry {
  return {
    id,
    filePath: filePathOf('organizers', id),
    data: {
      name: 'Роман Троицкий',
      status: 'current',
      contacts: { telegram: 'https://t.me/DreamShaded', website: 'https://vzhyx.io' },
      draft: false,
      ...data,
    },
  };
}

export function page(id: string, body = 'О митапе.'): PageEntry {
  return {
    id,
    filePath: filePathOf('pages', id),
    body,
    data: {
      title: 'Moscow CSS',
      description: 'Описание',
      telegramUrl: 'https://t.me/moscowcss',
      questionTag: '#вопрос_спикеру',
      decor: 'springs',
    },
  };
}

export function document(id: string, data: Partial<DocumentEntry['data']> = {}): DocumentEntry {
  return {
    id,
    filePath: filePathOf('documents', id),
    body: 'Текст документа.',
    data: {
      title: 'Политика',
      description: 'Описание документа, которое достаточно длинное для схемы: не меньше пятидесяти знаков.',
      draft: false,
      ...data,
    },
  };
}

export function faq(id: string, body: string): FaqEntry {
  return { id, filePath: filePathOf('faq', id), body, data: { title: 'Вопросы', order: 1, draft: false } };
}

// Спикер с докладами на митапах 10 и 15 в русской и английской версиях.
export function twoMeetupsCatalog() {
  return {
    events: [
      event('ru/10', { date: new Date('2024-03-14T18:00:00+03:00') }),
      event('ru/15', { date: new Date('2025-02-20T18:00:00+03:00') }),
      event('en/10', { date: new Date('2024-03-14T18:00:00+03:00') }),
      event('en/15', { date: new Date('2025-02-20T18:00:00+03:00') }),
    ],
    talks: [
      talk('ru/css-nesting', { event: '10', time: '19:30' }),
      talk('ru/anchor-positioning', { event: '15', time: '19:10' }),
      talk('en/css-nesting', { event: '10', time: '19:30' }),
      talk('en/anchor-positioning', { event: '15', time: '19:10' }),
    ],
    speakers: [speaker('ru/daria-egorova'), speaker('en/daria-egorova')],
    partners: [] as PartnerEntry[],
    organizers: [] as OrganizerEntry[],
    pages: [] as PageEntry[],
    faq: [] as FaqEntry[],
    documents: [] as DocumentEntry[],
  };
}
