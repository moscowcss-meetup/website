import { describe, expect, it, vi } from 'vitest';
import { useTranslations } from '../i18n';
import { copyrightOf, footerLinksOf } from './footer';

vi.mock('astro:i18n', () => ({
  getRelativeLocaleUrl: (locale: string, path = '') =>
    `/${locale === 'ru' ? '' : `${locale}/`}${path === '' ? '' : `${path}/`}`,
}));

describe('copyrightOf', () => {
  it('годы от основания сообщества до года сборки', () => {
    expect(copyrightOf(useTranslations('ru'), new Date('2026-11-05T12:00:00+03:00'))).toBe('© 2015–2026 Moscow CSS');
  });

  it('новый год наступает по Москве, а не по UTC', () => {
    expect(copyrightOf(useTranslations('en'), new Date('2026-12-31T21:30:00Z'))).toBe('© 2015–2027 Moscow CSS');
    expect(copyrightOf(useTranslations('en'), new Date('2026-12-31T20:30:00Z'))).toBe('© 2015–2026 Moscow CSS');
  });
});

describe('footerLinksOf', () => {
  it('правила своего языка и внешняя ссылка на Telegram', () => {
    const telegram = 'https://t.me/moscowcss';
    expect(footerLinksOf('en', useTranslations('en'), telegram)).toEqual([
      { href: '/en/help/', label: 'How to help' },
      { href: '/en/speaker-guide/', label: 'Speaker guide', external: true },
      { href: '/en/privacy/', label: 'Policy and rules' },
      { href: telegram, label: 'Telegram', external: true },
    ]);
    expect(footerLinksOf('ru', useTranslations('ru'), telegram)[2]).toEqual({ href: '/privacy/', label: 'Политика и правила' });
  });
});
