import { style } from '@vanilla-extract/css';
import { vars, media } from '@moscowcss/design-system';

// Зона нажатия до hitTarget за счёт полей с компенсирующим отрицательным отступом: вёрстка не едет.
const hitInset = `max(calc(${vars.size.hitTarget} * 0), calc((${vars.size.hitTarget} - 1lh) / 2))`;

// Вся строка — ссылка, как карточка спикера: псевдоэлемент ссылки растянут на строку, заголовок
// остаётся единственным доступным именем ссылки.
export const root = style({
  boxSizing: 'border-box',
  position: vars.position.relative,
  blockSize: '100%',
  display: vars.display.grid,
  gridTemplateColumns: '1fr',
  gridTemplateAreas: '"title" "meta" "badges"',
  columnGap: vars.spacing.xxl,
  rowGap: vars.spacing.s,
  padding: vars.padding.xxl,
  color: vars.color.text,
  transition: `background-color ${vars.motion.duration.fast} ${vars.motion.easing.standard}`,
  selectors: {
    '&:hover': { background: vars.color.dividerSoft },
  },
  '@media': {
    [media.tablet]: {
      gridTemplateColumns: '1fr auto',
      gridTemplateAreas: '"title badges" "meta badges"',
    },
  },
});

export const title = style({
  gridArea: 'title',
  margin: 0,
  font: vars.font.shorthand.h4,
  letterSpacing: vars.font.letterSpacing.heading,
  overflowWrap: 'anywhere',
});

export const link = style({
  display: vars.display.inlineFlex,
  alignItems: vars.alignItems.center,
  minWidth: vars.size.hitTarget,
  paddingBlock: hitInset,
  marginBlock: `calc(-1 * ${hitInset})`,
  color: vars.color.text,
  textDecorationThickness: vars.border.width.thin,
  textUnderlineOffset: '0.15em',
  selectors: {
    '&::after': { content: '""', position: vars.position.absolute, inset: vars.inset.zero },
    [`${root}:hover &`]: { textDecorationThickness: vars.border.width.medium },
  },
});

export const meta = style({
  gridArea: 'meta',
  margin: 0,
  font: vars.font.shorthand.caption,
});

export const badges = style({
  gridArea: 'badges',
  display: vars.display.flex,
  flexWrap: 'wrap',
  alignContent: 'flex-start',
  gap: vars.spacing.s,
  margin: 0,
  padding: 0,
  listStyle: 'none',
  '@media': {
    [media.tablet]: { justifyContent: 'flex-end' },
  },
});

export const badge = style({
  paddingBlock: vars.padding.xs,
  paddingInline: vars.padding.s,
  border: `${vars.border.width.thin} ${vars.border.style.solid} ${vars.color.border}`,
  font: vars.font.shorthand.ui,
  whiteSpace: 'nowrap',
});
