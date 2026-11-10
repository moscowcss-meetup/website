// Обмен сообщениями с формой Networkly — тот же, что в их registration-widget.js: на `measure` форма
// отвечает своей высотой, `setTheme` переключает её тему. Свой код вместо их скрипта: чужой JS не
// исполняется на нашем домене, а ответ с высотой — надёжный знак, что форма загрузилась.
export const MEASURE_COMMAND = 'networkly:registration:measure';
const HEIGHT_COMMAND = 'networkly:registration:height';
export const THEME_COMMAND = 'setTheme';

/** Высота формы из сообщения фрейма, в пикселях; для чужих и битых сообщений — `undefined`. */
export function heightFromMessage(data: unknown): number | undefined {
  if (typeof data !== 'object' || data === null) return undefined;
  const { command, height } = data as { command?: unknown; height?: unknown };
  if (command !== HEIGHT_COMMAND || typeof height !== 'number') return undefined;
  if (!Number.isFinite(height) || height <= 0) return undefined;
  return Math.ceil(height);
}

/** Тема для формы: выбранная на сайте, а без выбора — системная (`auto`). */
export function themeForForm(siteTheme: string | undefined): 'light' | 'dark' | 'auto' {
  return siteTheme === 'light' || siteTheme === 'dark' ? siteTheme : 'auto';
}
