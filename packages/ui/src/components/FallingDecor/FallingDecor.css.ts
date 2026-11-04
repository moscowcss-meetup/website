import { globalStyle, keyframes, style } from '@vanilla-extract/css';
import { vars } from '@moscowcss/design-system';

// Слой над контентом, но без событий мыши: кнопки и ссылки под фигурами работают как обычно.
export const root = style({
  position: vars.position.fixed,
  inset: vars.inset.zero,
  zIndex: vars.zIndex.decor,
  overflow: 'hidden',
  pointerEvents: 'none',
  contain: 'strict',
});

const fallDown = keyframes({
  from: { transform: 'translateY(-25vh)' },
  to: { transform: 'translateY(115vh)' },
});

const spinFlat = keyframes({
  from: { transform: 'rotate(0deg)' },
  to: { transform: 'rotate(360deg)' },
});

// Длительность и задержку у каждой фигуры задаёт скрипт: они случайные.
export const fall = style({
  position: vars.position.absolute,
  top: 0,
  animationName: fallDown,
  animationTimingFunction: vars.motion.easing.linear,
  animationIterationCount: 'infinite',
  willChange: 'transform',
});

const shapeBase = {
  display: vars.display.block,
  transitionProperty: 'color, opacity',
  transitionDuration: vars.motion.duration.base,
  transitionTimingFunction: vars.motion.easing.standard,
} as const;

// Контур пружинки каждый кадр считает скрипт: так она по-настоящему вращается вокруг своей оси.
export const spring = style({
  ...shapeBase,
  height: vars.adaptive.decorSpringHeight,
});

globalStyle(`${spring} svg`, {
  display: vars.display.block,
  width: '100%',
  height: '100%',
  overflow: 'visible',
});

// Формы в макете разного размера, а линия у всех одной толщины.
globalStyle(`${spring} path`, {
  stroke: 'currentColor',
  strokeWidth: vars.border.width.medium,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  vectorEffect: 'non-scaling-stroke',
});

// Витки за осью бледнее: глаз читает это как глубину.
export const springBack = style({
  opacity: 0.45,
});

export const snow = style({
  ...shapeBase,
  width: vars.adaptive.decorSnowSize,
  height: vars.adaptive.decorSnowSize,
});

globalStyle(`${snow} svg`, {
  display: vars.display.block,
  width: '100%',
  height: '100%',
  animationName: spinFlat,
  animationTimingFunction: vars.motion.easing.linear,
  animationIterationCount: 'infinite',
  willChange: 'transform',
});

const tone = (color: string) => style({ color });

// Порядок совпадает с формами в helix.ts.
export const springTones = [tone(vars.color.tagSky), tone(vars.color.tagOrange), tone(vars.color.tagBlue)];

export const snowTones = [
  tone(vars.color.tagSky),
  tone(vars.color.tagBlue),
  tone(vars.color.tagYellow),
  tone(vars.color.tagRed),
  tone(vars.color.tagOrange),
];

// Над текстом фигура почти исчезает, чтобы не мешать читать. Правило идёт после цветов и перебивает их.
export const muted = style({
  color: vars.color.decorMuted,
  opacity: 0.2,
});
