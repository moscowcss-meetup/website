import { style } from '@vanilla-extract/css';
import { vars } from '@moscowcss/design-system';

const line = `${vars.border.width.thin} ${vars.border.style.solid} ${vars.color.border}`;

export const root = style({
  display: vars.display.flex,
  flexWrap: 'wrap',
  alignItems: 'flex-end',
  gap: vars.spacing.xl,
  minWidth: 0,
  color: vars.color.text,
  selectors: {
    '&[hidden]': { display: vars.display.none },
  },
});

export const field = style({
  display: vars.display.flex,
  flexDirection: vars.flexDirection.column,
  gap: vars.spacing.s,
  flex: `1 1 ${vars.size.archiveFieldMin}`,
  minWidth: 0,
  selectors: {
    '&:has(select)': { flex: '0 1 auto' },
  },
});

export const label = style({
  font: vars.font.shorthand.caption,
});

// Поле, выбор года, флажок и кнопка одной высоты: иначе подписи над ними встают на разную линию.
export const input = style({
  boxSizing: 'border-box',
  inlineSize: '100%',
  blockSize: vars.size.archiveControl,
  paddingBlock: 0,
  paddingInline: vars.padding.l,
  border: line,
  borderRadius: 0,
  background: vars.color.background,
  color: vars.color.text,
  font: vars.font.shorthand.body,
});

export const select = style({
  cursor: 'pointer',
});

export const check = style({
  display: vars.display.inlineFlex,
  alignItems: vars.alignItems.center,
  gap: vars.spacing.s,
  blockSize: vars.size.archiveControl,
  font: vars.font.shorthand.body,
  cursor: 'pointer',
});

export const checkbox = style({
  inlineSize: vars.size.decorCheckbox,
  blockSize: vars.size.decorCheckbox,
  margin: 0,
  accentColor: vars.color.text,
  cursor: 'pointer',
});

export const reset = style({
  boxSizing: 'border-box',
  minWidth: vars.size.hitTarget,
  blockSize: vars.size.archiveControl,
  paddingBlock: 0,
  paddingInline: vars.padding.l,
  border: line,
  borderRadius: 0,
  background: 'transparent',
  color: vars.color.text,
  font: vars.font.shorthand.ui,
  cursor: 'pointer',
  selectors: {
    '&:hover': { background: vars.color.buttonHover, color: vars.color.onButtonHover },
  },
});

export const status = style({
  flexBasis: '100%',
  margin: 0,
  font: vars.font.shorthand.caption,
  selectors: {
    '&:empty': { display: vars.display.none },
  },
});
