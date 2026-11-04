import { describe, expect, it } from 'vitest';
import { organizer } from '../test/fixtures';
import { contactsOf, organizersByStatus } from './organizers';

describe('organizersByStatus', () => {
  const entries = [
    organizer('ru/anna', { status: 'past' }),
    organizer('ru/boris', { status: 'current' }),
    organizer('ru/roman', { status: 'current' }),
    organizer('ru/draft', { status: 'current', draft: true }),
    organizer('ru/clara', { status: 'current' }),
  ];

  it('current: без прошлых и черновика, по имени файла', () => {
    expect(organizersByStatus(entries, 'current').map((entry) => entry.id)).toEqual([
      'ru/boris',
      'ru/clara',
      'ru/roman',
    ]);
  });

  it('past: только прошлые', () => {
    expect(organizersByStatus(entries, 'past').map((entry) => entry.id)).toEqual(['ru/anna']);
  });

  it('черновик не попадает ни в один из статусов', () => {
    const drafts = [organizer('ru/x', { status: 'past', draft: true })];
    expect(organizersByStatus(drafts, 'current')).toEqual([]);
    expect(organizersByStatus(drafts, 'past')).toEqual([]);
  });

  it('пустой список — пустой результат, исходный массив не меняется', () => {
    expect(organizersByStatus([], 'current')).toEqual([]);
    const before = entries.map((entry) => entry.id);
    organizersByStatus(entries, 'current');
    expect(entries.map((entry) => entry.id)).toEqual(before);
  });
});

describe('contactsOf', () => {
  it('все три контакта в порядке telegram, github, website независимо от порядка полей', () => {
    expect(
      contactsOf({
        website: 'https://vzhyx.io',
        github: 'https://github.com/vzhyx',
        telegram: 'https://t.me/DreamShaded',
      }),
    ).toEqual([
      { kind: 'telegram', href: 'https://t.me/DreamShaded', text: '@DreamShaded' },
      { kind: 'github', href: 'https://github.com/vzhyx', text: 'vzhyx' },
      { kind: 'website', href: 'https://vzhyx.io', text: 'vzhyx.io' },
    ]);
  });

  it('часть контактов: как у Романа — телеграм и сайт, без GitHub', () => {
    const contacts = contactsOf({ telegram: 'https://t.me/DreamShaded', website: 'https://vzhyx.io' });
    expect(contacts.map((contact) => contact.kind)).toEqual(['telegram', 'website']);
    expect(contacts.map((contact) => contact.text)).toEqual(['@DreamShaded', 'vzhyx.io']);
  });

  it('ни одного контакта: пустой список и для отсутствующего объекта, и для пустого', () => {
    expect(contactsOf(undefined)).toEqual([]);
    expect(contactsOf({})).toEqual([]);
  });

  it('сайт: кириллица в адресе показывается читаемо', () => {
    const [site] = contactsOf({ website: 'https://сайт.рф/блог' });
    expect(site?.text).toBe('сайт.рф/блог');
  });

  it('сайт: без www., без последнего слэша, путь сохраняется, запрос и якорь отбрасываются', () => {
    const text = (website: string): string | undefined => contactsOf({ website })[0]?.text;
    expect(text('https://www.vzhyx.io/')).toBe('vzhyx.io');
    expect(text('https://example.com/blog/')).toBe('example.com/blog');
    expect(text('https://example.com/a?x=1#top')).toBe('example.com/a');
  });

  it('телеграм и GitHub: слэш в конце не попадает в текст', () => {
    expect(contactsOf({ telegram: 'https://t.me/DreamShaded/' })[0]?.text).toBe('@DreamShaded');
    expect(contactsOf({ github: 'https://github.com/vzhyx/' })[0]?.text).toBe('vzhyx');
  });
});
