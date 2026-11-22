import { CARD_SIZES, type CardInput, type CardSize } from '@moscowcss/og';
import { localeOf, slugOf, type Catalog } from '../content/catalog';
import { eventWhen, fillTemplate } from '../content/format';
import { newsDateText } from '../content/news';
import { typographText } from '../content/typography';
import { useTranslations } from '../i18n';
import { trimTrailingSlashes, type PublicPage } from './pages';

// Карточки OpenGraph и Twitter строит `@moscowcss/og` на сборке. Здесь решается, под какими
// адресами они лежат и из чего собирается их текст; состав страниц берётся из `publicPages()`,
// поэтому мета-теги `BaseLayout` всегда ссылаются на существующий файл.

/** Тип файла карточки: площадки читают его из `og:image:type`. */
export const CARD_TYPE = 'image/png';

/** Размеры OpenGraph-карточки для `og:image:width/height`: те же числа, что у генератора. */
export const OG_SIZE = CARD_SIZES.og;

const TWITTER_SUFFIX = '.twitter';

type Kind = PublicPage['kind'];

/** `og:type`: страница доклада — материал, страница спикера — профиль. */
export const OG_TYPE: Record<Kind, 'website' | 'article' | 'profile'> = {
  home: 'website',
  event: 'website',
  talk: 'article',
  speaker: 'profile',
  document: 'article',
  list: 'website',
  reviews: 'website',
};

/** Параметр маршрута `/og/[...path].png`: адрес без слэшей по краям, у Twitter с суффиксом. */
export function cardParam(page: Pick<PublicPage, 'path' | 'kind'>, size: CardSize): string {
  const base = trimTrailingSlashes(page.path).replace(/^\//, '');
  // У главной нет своего имени: `/og/index.png` и `/og/en/index.png`.
  const name = page.kind === 'home' ? [base, 'index'].filter(Boolean).join('/') : base;
  return size === 'twitter' ? `${name}${TWITTER_SUFFIX}` : name;
}

/** Путь файла карточки от корня сайта: `/og/en/events/31.png`. */
export const cardPath = (page: Pick<PublicPage, 'path' | 'kind'>, size: CardSize): string =>
  `/og/${cardParam(page, size)}.png`;

/** Разбор параметра маршрута: карточка какого размера за ним лежит. */
export const sizeOfParam = (param: string): CardSize =>
  param.endsWith(TWITTER_SUFFIX) ? 'twitter' : 'og';

/** Пути обеих карточек страницы для мета-тегов `BaseLayout`. */
export const cardMetaOf = (page: Pick<PublicPage, 'path' | 'kind'>) => ({
  image: cardPath(page, 'og'),
  twitterImage: cardPath(page, 'twitter'),
});

/**
 * Содержимое карточки без размера, по виду страницы. Дата митапа форматируется так же, как
 * на самой странице: московские день и время на языке страницы.
 */
export function cardInputOf(
  page: Pick<PublicPage, 'kind' | 'entry' | 'locale'>,
  catalog: Pick<Catalog, 'events' | 'speakers'>,
): Omit<CardInput, 'size'> {
  const input = cardTextOf(page, catalog);
  // Строки на картинке переносит satori: неразрывные пробелы типографа держат предлог со словом.
  return { ...input, title: typographText(input.title, page.locale), meta: typographText(input.meta, page.locale) };
}

function cardTextOf(
  page: Pick<PublicPage, 'kind' | 'entry' | 'locale'>,
  catalog: Pick<Catalog, 'events' | 'speakers'>,
): Omit<CardInput, 'size'> {
  const { locale } = page;
  const t = useTranslations(locale);
  const slug = slugOf(page.entry);

  switch (page.kind) {
    case 'home':
      // Имя сообщества уже в шапке карточки: заголовок говорит, о чём митапы, а не повторяет имя.
      return { title: t('og.home.title'), kicker: t('og.kind.home'), meta: t('og.home.meta') };
    case 'event': {
      const { tagline, venue } = page.entry.data;
      const dateTime = eventWhen(page.entry.data, locale, { withTime: t('hero.dateTime'), dateOnly: t('date.long') });
      return {
        title: tagline,
        kicker: fillTemplate(t('og.kicker.event'), { slug }),
        meta: `${dateTime} · ${venue.name}`,
      };
    }
    case 'talk': {
      const { title, event: eventSlug, speakers: speakerSlugs } = page.entry.data;
      const inLocale = <T extends { id: string }>(entries: readonly T[]): T[] =>
        entries.filter((entry) => localeOf(entry) === locale);
      const event = inLocale(catalog.events).find((entry) => slugOf(entry) === eventSlug);
      const names = speakerSlugs.map(
        (name) => inLocale(catalog.speakers).find((entry) => slugOf(entry) === name)?.data.name ?? name,
      );
      return {
        title,
        kicker: t('og.kind.talk'),
        meta: [names.join(', '), event?.data.tagline].filter(Boolean).join(' · '),
      };
    }
    case 'speaker':
      return { title: page.entry.data.name, kicker: t('og.kind.speaker'), meta: page.entry.data.role ?? '' };
    case 'document':
      return { title: page.entry.data.title, kicker: t('og.kind.document'), meta: page.entry.data.description };
    case 'list':
      return { title: page.entry.data.title, kicker: t(page.entry.data.list === 'news' ? 'og.kind.news' : 'og.kind.list'), meta: t('og.home.meta') };
    case 'news':
      return { title: page.entry.data.title, kicker: t('og.kind.news'), meta: newsDateText(page.entry, locale, t('date.long')) };
    case 'reviews':
      return { title: page.entry.data.title, kicker: t('og.kind.reviews'), meta: t('og.home.meta') };
  }
}
