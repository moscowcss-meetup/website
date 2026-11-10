import { globalStyle, keyframes, style } from '@vanilla-extract/css';
import { vars } from '@moscowcss/design-system';

export const dialog = style({
  boxSizing: 'border-box',
  width: `min(100% - ${vars.spacing.l}, ${vars.size.registrationDialogWidth})`,
  maxWidth: 'none',
  maxHeight: `calc(100dvh - ${vars.spacing.l})`,
  padding: 0,
  border: 'none',
  borderRadius: vars.radius.large,
  overflow: 'auto',
  color: vars.color.text,
  background: vars.color.background,
  boxShadow: `inset 0 0 0 ${vars.border.width.thin} ${vars.color.surfaceDarkEdge}`,
  vars: { [vars.color.focus]: vars.color.link },
  selectors: {
    '&::backdrop': {
      background: vars.color.backdrop,
    },
  },
});

export const content = style({
  display: vars.display.flex,
  flexDirection: vars.flexDirection.column,
  gap: vars.spacing.m,
  padding: vars.padding.l,
});

export const head = style({
  display: vars.display.flex,
  alignItems: 'flex-start',
  justifyContent: vars.justifyContent.spaceBetween,
  gap: vars.spacing.m,
});

export const title = style({
  margin: 0,
  font: vars.font.shorthand.h3,
});

export const closeButton = style({
  flexShrink: 0,
  display: vars.display.inlineFlex,
  alignItems: vars.alignItems.center,
  justifyContent: vars.justifyContent.center,
  minWidth: vars.size.hitTarget,
  minHeight: vars.size.hitTarget,
  padding: 0,
  border: 'none',
  background: 'transparent',
  color: 'inherit',
  cursor: 'pointer',
});

globalStyle(`${closeButton} svg`, {
  display: vars.display.block,
  width: vars.size.burgerIcon,
  height: vars.size.burgerIcon,
});

export const tabList = style({
  display: vars.display.flex,
  flexWrap: 'wrap',
  gap: vars.spacing.s,
  borderBottom: `${vars.border.width.thin} ${vars.border.style.solid} ${vars.color.border}`,
});

export const tab = style({
  minHeight: vars.size.hitTarget,
  paddingInline: vars.padding.m,
  border: 'none',
  borderBottom: `${vars.border.width.medium} ${vars.border.style.solid} transparent`,
  background: 'transparent',
  color: 'inherit',
  font: vars.font.shorthand.ui,
  cursor: 'pointer',
  transitionProperty: 'border-color',
  transitionDuration: vars.motion.duration.fast,
  transitionTimingFunction: vars.motion.easing.standard,
  selectors: {
    '&[aria-selected="true"]': {
      borderBottomColor: 'currentColor',
    },
    '&:hover': {
      color: vars.color.link,
    },
  },
});

export const panel = style({
  display: vars.display.flex,
  flexDirection: vars.flexDirection.column,
  gap: vars.spacing.m,
  selectors: {
    '&[hidden]': {
      display: vars.display.none,
    },
  },
});

export const status = style({
  display: vars.display.none,
  alignItems: vars.alignItems.center,
  gap: vars.spacing.s,
  font: vars.font.shorthand.caption,
  selectors: {
    [`${panel}[data-state="loading"] &, ${panel}[data-state="failed"] &`]: {
      display: vars.display.flex,
    },
  },
});

const spin = keyframes({
  to: { transform: 'rotate(1turn)' },
});

// Без движения (prefers-reduced-motion) кольцо стоит, состояние передаёт текст рядом.
export const spinner = style({
  flexShrink: 0,
  boxSizing: 'border-box',
  width: vars.size.loader,
  height: vars.size.loader,
  border: `${vars.border.width.thick} ${vars.border.style.solid} ${vars.color.border}`,
  borderTopColor: vars.color.link,
  borderRadius: vars.radius.pill,
  animationName: spin,
  animationDuration: vars.motion.duration.spin,
  animationTimingFunction: vars.motion.easing.linear,
  animationIterationCount: 'infinite',
  selectors: {
    [`${panel}[data-state="failed"] &`]: {
      display: vars.display.none,
    },
  },
});

export const loading = style({
  selectors: {
    [`${panel}[data-state="failed"] &`]: {
      display: vars.display.none,
    },
  },
});

export const failed = style({
  display: vars.display.none,
  selectors: {
    [`${panel}[data-state="failed"] &`]: {
      display: 'inline',
    },
  },
});

export const embed = style({
  selectors: {
    [`${panel}[data-state="idle"] &, ${panel}[data-state="failed"] &`]: {
      display: vars.display.none,
    },
  },
});

globalStyle(`${embed} > iframe`, {
  display: vars.display.block,
  width: '100%',
  height: vars.size.registrationFrameHeight,
  border: 'none',
});

export const fallback = style({
  margin: 0,
  font: vars.font.shorthand.caption,
});

export const fallbackLink = style({
  color: vars.color.link,
});
