import { createGlobalTheme, globalStyle } from '@vanilla-extract/css';
import { vars } from '../contract';
import { motion } from '../motion';

createGlobalTheme(':root', vars.motion, motion.values.motion);

// Сниженная анимация: обнуляем только длительности, кривые остаются.
globalStyle(':root', {
  '@media': {
    '(prefers-reduced-motion: reduce)': {
      vars: {
        [vars.motion.duration.fast]: '0ms',
        [vars.motion.duration.base]: '0ms',
        [vars.motion.duration.fall]: '0ms',
        [vars.motion.duration.spin]: '0ms',
      },
    },
  },
});
