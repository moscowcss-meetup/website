import { globalStyle } from '@vanilla-extract/css';
import { vars } from '@moscowcss/design-system';

globalStyle('*, *::before, *::after', {
  boxSizing: 'border-box',
});

globalStyle('body', {
  // На короткой странице подвал прижат к низу окна.
  display: vars.display.flex,
  flexDirection: vars.flexDirection.column,
  minHeight: '100svh',
  margin: 0,
  color: vars.color.text,
  background: vars.color.background,
  font: vars.font.shorthand.body,
});

// Ширина задана явно: у страниц с max-width и margin: auto флекс иначе сжал бы main по содержимому.
globalStyle('body > main', {
  flexGrow: 1,
  width: '100%',
});
