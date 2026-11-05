import { style } from '@vanilla-extract/css';
import { media, vars } from '@moscowcss/design-system';

export const root = style({
  marginTop: vars.layout.gap.xxl,
  paddingInline: vars.adaptive.navPaddingInline,
  paddingBottom: vars.adaptive.navPaddingTop,
  selectors: {
    // Плавающая кнопка регистрации не должна закрывать подвал в конце страницы.
    'body:has([data-floating-cta]) &': {
      paddingBottom: `calc(${vars.adaptive.ctaSize} + ${vars.adaptive.ctaOffsetBlock} + ${vars.spacing.l})`,
    },
  },
});

// Разделитель — как в шапке: тонкая полоса внутри полей, не до краёв окна.
export const inner = style({
  display: vars.display.grid,
  gridTemplateColumns: '1fr auto',
  gridTemplateAreas: '"home copyright" "links links"',
  alignItems: vars.alignItems.center,
  columnGap: vars.adaptive.navActionsGap,
  rowGap: vars.spacing.s,
  paddingTop: vars.adaptive.navGap,
  borderTop: `${vars.border.width.thin} ${vars.border.style.solid} ${vars.color.dividerSoft}`,
  color: vars.color.text,
  font: vars.font.shorthand.navMeta,
  '@media': {
    // Боковые колонки равны, поэтому ссылки стоят точно по центру окна.
    [media.tablet]: {
      gridTemplateColumns: '1fr auto 1fr',
      gridTemplateAreas: '"home links copyright"',
    },
  },
});

export const home = style({
  gridArea: 'home',
  justifySelf: 'start',
  display: vars.display.flex,
  alignItems: vars.alignItems.center,
  minWidth: vars.size.hitTarget,
  minHeight: vars.size.hitTarget,
  color: vars.color.brand,
});

export const logo = style({
  display: vars.display.block,
  width: vars.size.hitTarget,
  height: vars.size.hitTarget,
});

export const links = style({
  gridArea: 'links',
  display: vars.display.flex,
  flexWrap: 'wrap',
  columnGap: vars.adaptive.navLinksGap,
  margin: 0,
  padding: 0,
  listStyle: 'none',
});

export const link = style({
  display: vars.display.flex,
  alignItems: vars.alignItems.center,
  minWidth: vars.size.hitTarget,
  minHeight: vars.size.hitTarget,
  color: vars.color.text,
  textDecoration: 'none',
  opacity: 0.8,
  transitionProperty: 'opacity',
  transitionDuration: vars.motion.duration.base,
  transitionTimingFunction: vars.motion.easing.standard,
  selectors: {
    '&:hover': {
      opacity: 1,
      textDecoration: 'underline',
    },
  },
});

export const copyright = style({
  gridArea: 'copyright',
  justifySelf: 'end',
  margin: 0,
  whiteSpace: 'nowrap',
});
