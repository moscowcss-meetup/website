import { style } from '@vanilla-extract/css';
import { vars } from '@moscowcss/design-system';
import { inner as layoutInner, sectionPadding } from '../sections/sectionLayout.css';

export const main = style([
  sectionPadding,
  {
    color: vars.color.text,
    background: vars.color.background,
  },
]);

export const inner = style([
  layoutInner,
  {
    display: vars.display.flex,
    flexDirection: vars.flexDirection.column,
    gap: vars.layout.gap.xxl,
  },
]);

export const head = style({
  display: vars.display.flex,
  flexDirection: vars.flexDirection.column,
  gap: vars.layout.gap.m,
});

export const empty = style({
  display: vars.display.flex,
  flexWrap: 'wrap',
  alignItems: vars.alignItems.center,
  gap: vars.spacing.l,
  selectors: {
    '&[hidden]': { display: vars.display.none },
  },
});

export const resetButton = style({
  boxSizing: 'border-box',
  minWidth: vars.size.hitTarget,
  minHeight: vars.size.hitTarget,
  paddingInline: vars.padding.l,
  border: `${vars.border.width.thin} ${vars.border.style.solid} ${vars.color.border}`,
  background: 'transparent',
  color: vars.color.text,
  font: vars.font.shorthand.ui,
  cursor: 'pointer',
});
