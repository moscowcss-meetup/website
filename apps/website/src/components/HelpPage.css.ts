import { globalStyle, style } from '@vanilla-extract/css';
import { vars, media } from '@moscowcss/design-system';
import { action } from './DetailPage.css';

// «Как помочь митапу»: язык страницы «О сообществе» — пунктирные клетки, крупные синие цифры,
// таблетки ссылок, — плюс куча площадок, как темы в Hero, и чёрный блок-приглашение в конце.

export const intro = style({
  margin: 0,
  maxWidth: vars.size.reviewDialogWidth,
  font: vars.font.shorthand.heroLead,
});

globalStyle(`${intro} p`, { margin: 0 });

const grid = style({
  display: vars.display.grid,
  gap: vars.layout.gap.l,
  margin: 0,
  padding: 0,
  listStyle: 'none',
});

// Три просьбы в ряд на широком экране, столбиком на узком.
export const needs = style([
  grid,
  {
    '@media': {
      [media.laptop]: { gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' },
    },
  },
]);

export const need = style({
  display: vars.display.flex,
  flexDirection: vars.flexDirection.column,
  alignItems: 'flex-start',
  gap: vars.spacing.m,
  height: '100%',
  boxSizing: 'border-box',
  padding: vars.padding.xxl,
  border: `${vars.border.width.thin} ${vars.border.style.dashed} ${vars.color.border}`,
});

// Порядковый номер — контуром фирменного синего: украшение, читалке он не нужен.
export const needNumber = style({
  font: vars.font.shorthand.websiteTitle,
  letterSpacing: vars.font.letterSpacing.heading,
  color: 'transparent',
  WebkitTextStroke: `${vars.border.width.thin} ${vars.color.info}`,
});

export const needTitle = style({
  margin: 0,
  font: vars.font.shorthand.h3,
  letterSpacing: vars.font.letterSpacing.heading,
});

export const needText = style({
  margin: 0,
  flexGrow: 1,
  font: vars.font.shorthand.body,
});

export const sectionLead = style({
  margin: 0,
  maxWidth: vars.size.reviewDialogWidth,
  font: vars.font.shorthand.heroLead,
});

export const numbers = style([
  grid,
  {
    gap: vars.spacing.s,
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 16rem), 1fr))',
  },
]);

export const number = style({
  display: vars.display.flex,
  flexDirection: vars.flexDirection.column,
  gap: vars.spacing.xs,
  minWidth: 0,
  padding: vars.padding.xxl,
  border: `${vars.border.width.thin} ${vars.border.style.dashed} ${vars.color.border}`,
});

export const numberValue = style({
  font: vars.font.shorthand.websiteTitle,
  letterSpacing: vars.font.letterSpacing.heading,
  color: vars.color.info,
});

// Цифры, которые сайт считает сам из архива, — тем же размером, но цветом текста.
export const numberValueArchive = style({
  color: vars.color.text,
});

export const numberLabel = style({
  font: vars.font.shorthand.heroMeta,
  textTransform: 'uppercase',
  overflowWrap: 'anywhere',
});

export const numberNote = style({
  font: vars.font.shorthand.caption,
});

// Что даём — список со стрелкой-кавычкой, как пункты в карточке организатора.
export const offer = style({
  margin: 0,
  padding: 0,
  listStyle: 'none',
  borderTop: `${vars.border.width.thin} ${vars.border.style.dashed} ${vars.color.border}`,
});

export const offerItem = style({
  display: vars.display.flex,
  gap: vars.spacing.m,
  paddingBlock: vars.padding.l,
  borderBottom: `${vars.border.width.thin} ${vars.border.style.dashed} ${vars.color.border}`,
  font: vars.font.shorthand.heroLead,
  selectors: {
    '&::before': {
      content: '">"',
      color: vars.color.info,
      font: vars.font.shorthand.ui,
      lineHeight: 'inherit',
    },
  },
});

export const venues = style({
  display: vars.display.flex,
  flexDirection: vars.flexDirection.column,
  gap: vars.layout.gap.l,
  '@media': {
    [media.laptop]: {
      display: vars.display.grid,
      gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 3fr)',
      alignItems: 'end',
    },
  },
});

export const venuesText = style({
  display: vars.display.flex,
  flexDirection: vars.flexDirection.column,
  alignItems: 'flex-start',
  gap: vars.layout.gap.l,
});

export const pile = style({
  width: '100%',
});

// Площадок втрое больше, чем тем в Hero: на узком экране куче нужна зона выше, иначе названия не читаются.
// Два класса перебивают высоту из TagPile при той же паре «класс + атрибут».
globalStyle(`${pile}${pile}`, {
  minHeight: `calc(${vars.adaptive.heroTagsHeight} * 2)`,
  '@media': {
    [media.laptop]: { minHeight: `calc(${vars.adaptive.heroTagsHeight} * 1.25)` },
  },
});

globalStyle(`${pile}${pile}[data-pile]`, {
  height: `calc(${vars.adaptive.heroTagsHeight} * 2)`,
  '@media': {
    [media.laptop]: { height: `calc(${vars.adaptive.heroTagsHeight} * 1.25)` },
  },
});

// Приглашение: чёрный блок, как партнёрский на главной, в обеих темах.
export const contact = style({
  display: vars.display.flex,
  flexDirection: vars.flexDirection.column,
  alignItems: 'flex-start',
  gap: vars.layout.gap.l,
  padding: vars.layout.inset.xxl,
  color: vars.color.onSurfaceDark,
  background: vars.color.surfaceDark,
  border: `${vars.border.width.thin} ${vars.border.style.solid} ${vars.color.surfaceDarkEdge}`,
  scrollMarginTop: vars.layout.gap.xxl,
  vars: { [vars.color.focus]: vars.color.focusOnInverse },
});

export const contactTitle = style({
  margin: 0,
  font: vars.font.shorthand.websiteTitle,
  letterSpacing: vars.font.letterSpacing.heading,
  overflowWrap: 'anywhere',
});

export const contactText = style({
  margin: 0,
  maxWidth: vars.size.reviewDialogWidth,
  font: vars.font.shorthand.heroLead,
});

// Порядок CSS разных файлов в сборке не гарантирован, поэтому цвет на чёрном берём через блок: так он сильнее `action`.
export const contactAction = style([
  action,
  {
    selectors: {
      [`${contact} &`]: { color: vars.color.onSurfaceDark, borderColor: vars.color.borderOnDark },
      [`${contact} &:hover`]: {
        color: vars.color.onButtonHover,
        background: vars.color.buttonHover,
        borderColor: vars.color.buttonHover,
      },
    },
  },
]);
