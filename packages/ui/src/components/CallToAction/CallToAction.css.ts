import { globalStyle, style } from '@vanilla-extract/css';
import { vars, dimensions } from '@moscowcss/design-system';

// Один и тот же силуэт на грани и на кольце фокуса — кольцо точно повторяет форму.
const shapeMask = {
  maskImage: dimensions.octagonRoundedMask,
  maskSize: '100% 100%',
  maskRepeat: 'no-repeat',
} as const;

// mix-blend-mode смешивает элемент с тем, что под ним, только если сам элемент закреплён
// в корневом контексте наложения, поэтому режим стоит на корне, а не на грани.
export const root = style({
  position: vars.position.fixed,
  insetInlineEnd: vars.adaptive.ctaOffsetInline,
  insetBlockEnd: vars.adaptive.ctaOffsetBlock,
  zIndex: vars.zIndex.floatingCta,
  display: vars.display.inlineFlex,
  width: vars.adaptive.ctaSize,
  height: vars.adaptive.ctaSize,
  padding: 0,
  border: 'none',
  background: 'none',
  color: 'inherit',
  textDecoration: 'none',
  cursor: 'pointer',
  mixBlendMode: 'difference',
  selectors: {
    '&:hover, &:focus-visible': {
      mixBlendMode: 'normal',
    },
    '&:focus-visible': {
      outline: 'none',
    },
    '&::before': {
      content: '""',
      position: vars.position.absolute,
      inset: `calc(${vars.spacing.xs} * -1)`,
      zIndex: vars.zIndex.ring,
      background: vars.color.focus,
      opacity: 0,
      pointerEvents: 'none',
      ...shapeMask,
    },
    '&:focus-visible::before': {
      opacity: 1,
    },
  },
});

// Кнопка висит над контентом: без отступа снизу ссылка, к которой браузер прокрутил фокус, оказывается под ней.
globalStyle(`html:has(${root})`, {
  scrollPaddingBlockEnd: `calc(${vars.adaptive.ctaOffsetBlock} + ${vars.adaptive.ctaSize} + ${vars.spacing.s})`,
});

export const face = style({
  position: vars.position.relative,
  zIndex: vars.zIndex.content,
  display: vars.display.flex,
  alignItems: vars.alignItems.center,
  justifyContent: vars.justifyContent.center,
  width: '100%',
  height: '100%',
  padding: vars.padding.s,
  background: vars.color.white,
  color: vars.color.blackText,
  font: vars.font.shorthand.ctaFloating,
  letterSpacing: vars.font.letterSpacing.ctaFloating,
  textAlign: 'center',
  transitionProperty: 'background-color, color',
  transitionDuration: vars.motion.duration.fast,
  transitionTimingFunction: vars.motion.easing.standard,
  ...shapeMask,
  selectors: {
    [`${root}:hover &, ${root}:focus-visible &`]: {
      background: vars.color.buttonHover,
      color: vars.color.onButtonHover,
    },
  },
});
