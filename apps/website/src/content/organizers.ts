import { domainToUnicode } from 'node:url';
import type { OrganizerEntry } from './catalog';

export type OrganizerStatus = OrganizerEntry['data']['status'];

export type ContactKind = 'telegram' | 'github' | 'website';

export interface Contact {
  kind: ContactKind;
  href: string;
  /** Короткий текст из адреса: `@DreamShaded`, `vzhyx`, `vzhyx.io` */
  text: string;
}

export interface OrganizerContacts {
  telegram?: string | undefined;
  github?: string | undefined;
  website?: string | undefined;
}

/**
 * Опубликованные организаторы одного языка с нужным статусом, по id: страница показывает их в случайном порядке, а это порядок без скрипта.
 * Список одного языка отдаёт вызывающий: так выборкой пользуются и главная, и страница о митапе.
 */
export function organizersByStatus<T extends Pick<OrganizerEntry, 'id' | 'data'>>(
  entries: readonly T[],
  status: OrganizerStatus,
): T[] {
  return entries
    .filter((entry) => !entry.data.draft && entry.data.status === status)
    .sort((a, b) => a.id.localeCompare(b.id));
}

const pathOf = (url: URL): string => url.pathname.replace(/^\/+|\/+$/g, '');

const TEXT_OF: Record<ContactKind, (url: URL) => string> = {
  telegram: (url) => `@${pathOf(url)}`,
  github: pathOf,
  // Для показа: URL хранит кириллицу как punycode и percent-кодирование.
  website: (url) =>
    [domainToUnicode(url.host).replace(/^www\./, ''), decodeURI(pathOf(url))].filter(Boolean).join('/'),
};

// Порядок вывода на карточке.
const KINDS: readonly ContactKind[] = ['telegram', 'github', 'website'];

/** Заполненные контакты в порядке telegram, github, website; без контактов — пустой список. */
export function contactsOf(contacts: OrganizerContacts | undefined): Contact[] {
  const result: Contact[] = [];
  for (const kind of KINDS) {
    const href = contacts?.[kind];
    if (href) result.push({ kind, href, text: TEXT_OF[kind](new URL(href)) });
  }
  return result;
}
