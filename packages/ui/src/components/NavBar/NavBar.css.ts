import { globalStyle, style } from '@vanilla-extract/css';
import { dimensions, vars, media } from '@moscowcss/design-system';

const focusRing = {
  outline: `${vars.border.width.thin} ${vars.border.style.solid} ${vars.color.focus}`,
  outlineOffset: vars.spacing.xs,
} as const;

const fade = {
  transitionProperty: 'opacity, color',
  transitionDuration: vars.motion.duration.base,
  transitionTimingFunction: vars.motion.easing.standard,
} as const;

export const root = style({
  position: vars.position.sticky,
  top: vars.inset.zero,
  zIndex: vars.zIndex.navBar,
  boxSizing: 'border-box',
  width: '100%',
  paddingTop: vars.adaptive.navPaddingTop,
  paddingInline: vars.adaptive.navPaddingInline,
  background: vars.color.background,
});

// Разделитель лежит внутри полей корня, поэтому не доходит до краёв окна.
export const bar = style({
  position: vars.position.relative,
  zIndex: vars.zIndex.navBar,
  display: vars.display.flex,
  alignItems: vars.alignItems.center,
  justifyContent: vars.justifyContent.spaceBetween,
  gap: `min(${vars.adaptive.navActionsGap}, ${dimensions.fit.navGap})`,
  paddingBottom: vars.adaptive.navGap,
  borderBottom: `${vars.border.width.thin} ${vars.border.style.solid} ${vars.color.dividerSoft}`,
  selectors: {
    // Над прокручиваемой панелью полоса закрывает пункты вместе с верхним полем.
    '[data-nav-open] &': {
      marginTop: `calc(-1 * ${vars.adaptive.navPaddingTop})`,
      paddingTop: vars.adaptive.navPaddingTop,
      background: vars.color.background,
    },
  },
});

export const home = style({
  flexShrink: 0,
  display: vars.display.flex,
  alignItems: vars.alignItems.center,
  minHeight: vars.size.hitTarget,
  color: vars.color.link,
  font: vars.font.shorthand.navLogo,
  fontSize: `min(${vars.font.size.navLogo}, ${dimensions.fit.navLogoFont})`,
  letterSpacing: vars.font.letterSpacing.navLogo,
  textDecoration: 'none',
  textTransform: 'uppercase',
  whiteSpace: 'nowrap',
  selectors: {
    '&:focus-visible': focusRing,
  },
});

export const links = style({
  display: vars.display.none,
  // Вся высота шапки, которую задаёт кнопка Telegram, и промежутки между пунктами кликабельны.
  alignSelf: vars.alignItems.stretch,
  margin: '0 auto',
  padding: 0,
  listStyle: 'none',
  '@media': {
    [media.wide]: {
      display: vars.display.flex,
    },
  },
});

globalStyle(`${links} > li`, {
  display: vars.display.flex,
});

export const link = style({
  display: vars.display.flex,
  alignItems: vars.alignItems.center,
  minWidth: vars.size.hitTarget,
  minHeight: vars.size.hitTarget,
  paddingInline: `calc(${vars.adaptive.navLinksGap} / 2)`,
  color: vars.color.text,
  font: vars.font.shorthand.navMeta,
  textDecoration: 'none',
  opacity: 0.8,
  ...fade,
  selectors: {
    '&:hover': {
      opacity: 1,
      textDecoration: 'underline',
    },
    '&:focus-visible': focusRing,
  },
});

export const actions = style({
  flexShrink: 0,
  display: vars.display.flex,
  alignItems: vars.alignItems.center,
  gap: `min(${vars.adaptive.navActionsGap}, ${dimensions.fit.navGap})`,
});

// Иконка встаёт ровно на край полей, а не глубже на половину разницы с зоной нажатия.
const iconEdgeOffset = `calc((${vars.size.burgerIcon} - ${vars.size.hitTarget}) / 2)`;

// Ниже `wide` пункты спрятаны за бургером; при открытом меню на его месте стоит крестик.
export const burger = style({
  display: vars.display.block,
  marginInlineEnd: iconEdgeOffset,
  selectors: {
    '[data-nav-open] &': {
      display: vars.display.none,
    },
  },
  '@media': {
    [media.wide]: {
      display: vars.display.none,
    },
  },
});

export const closeButton = style({
  boxSizing: 'border-box',
  display: vars.display.none,
  alignItems: vars.alignItems.center,
  justifyContent: vars.justifyContent.center,
  minWidth: vars.size.hitTarget,
  minHeight: vars.size.hitTarget,
  marginInlineEnd: iconEdgeOffset,
  padding: 0,
  border: 0,
  background: 'transparent',
  color: vars.color.text,
  cursor: 'pointer',
  selectors: {
    '[data-nav-open] &': {
      display: vars.display.inlineFlex,
    },
    '&:focus-visible': focusRing,
  },
  '@media': {
    [media.wide]: {
      display: vars.display.none,
    },
  },
});

export const closeIcon = style({
  display: vars.display.block,
  width: vars.size.burgerIcon,
  height: vars.size.burgerIcon,
  flexShrink: 0,
});

export const telegram = style({
  display: vars.display.none,
  '@media': {
    [media.wide]: {
      display: vars.display.block,
    },
  },
});

// Строка лежит вне прилипшего корня и уезжает при прокрутке.
export const meta = style({
  display: vars.display.none,
  alignItems: vars.alignItems.center,
  justifyContent: vars.justifyContent.spaceBetween,
  gap: vars.adaptive.navActionsGap,
  boxSizing: 'border-box',
  paddingBlock: vars.padding.s,
  paddingInline: vars.adaptive.navPaddingInline,
  color: vars.color.text,
  font: vars.font.shorthand.navMeta,
  '@media': {
    [media.wide]: {
      display: vars.display.flex,
    },
  },
});

export const metaAddress = style({
  margin: 0,
});

export const metaToggle = style({
  marginInlineStart: 'auto',
});

// Шапка остаётся над панелью, поэтому панель отступает на высоту полосы: поля, зона нажатия, промежуток, разделитель.
export const overlay = style({
  position: vars.position.fixed,
  inset: vars.inset.zero,
  zIndex: vars.zIndex.navOverlay,
  display: vars.display.flex,
  flexDirection: vars.flexDirection.column,
  alignItems: vars.alignItems.stretch,
  boxSizing: 'border-box',
  overflowY: 'auto',
  overscrollBehavior: 'contain',
  paddingTop: `calc(${vars.adaptive.navPaddingTop} + ${vars.size.hitTarget} + ${vars.adaptive.navGap} + ${vars.border.width.thin})`,
  background: vars.color.background,
  selectors: {
    '&[hidden]': {
      display: vars.display.none,
    },
  },
  '@media': {
    [media.wide]: {
      display: vars.display.none,
    },
  },
});

export const overlayLinks = style({
  display: vars.display.block,
  margin: 0,
  paddingBlock: 0,
  paddingTop: vars.padding.s,
  paddingInline: vars.padding.l,
  listStyle: 'none',
});

export const overlayLink = style({
  boxSizing: 'border-box',
  display: vars.display.flex,
  alignItems: vars.alignItems.center,
  justifyContent: vars.justifyContent.spaceBetween,
  minHeight: vars.size.hitTarget,
  // 18px макета: такой ступени нет в шкале, собираем из 16 и половины 4.
  paddingBlock: `calc(${vars.padding.l} + ${vars.padding.xs} / 2)`,
  borderBottom: `${vars.border.width.thin} ${vars.border.style.solid} ${vars.color.dividerSoft}`,
  color: vars.color.text,
  font: vars.font.shorthand.menuLink,
  letterSpacing: vars.font.letterSpacing.menuLink,
  textDecoration: 'none',
  textTransform: 'uppercase',
  ...fade,
  selectors: {
    '&::after': {
      content: '"→"',
      opacity: 0.4,
      ...fade,
    },
    '&:hover': {
      color: vars.color.link,
    },
    '&:hover::after': {
      opacity: 1,
    },
    '&:focus-visible': focusRing,
  },
});

export const overlayFooter = style({
  display: vars.display.flex,
  flexDirection: vars.flexDirection.column,
  gap: vars.spacing.l,
  marginTop: 'auto',
  paddingTop: vars.padding.xxl,
  paddingInline: vars.padding.l,
  paddingBottom: vars.padding.xxxl,
  font: vars.font.shorthand.navMeta,
});

export const overlayAddress = style({
  margin: 0,
});
