import { heightFromMessage, MEASURE_COMMAND, THEME_COMMAND, themeForForm } from './networkly';
import { tabIndexAfterKey } from './tabs';

const INITIALIZED = 'data-registration-dialog-initialized';
const TIMEPAD_LOADER = 'https://timepad.ru/js/tpwf/loader/min/loader.js';
const POLL_MS = 250;
// Виджет Timepad сначала вставляет пустой фрейм и дорисовывает форму позже: готов, когда фрейм вырос.
const READY_FRAME_HEIGHT = 100;

type PanelState = 'idle' | 'loading' | 'ready' | 'failed';

function setState(panel: HTMLElement, state: PanelState) {
  panel.dataset['state'] = state;
}

function loadNetworkly(panel: HTMLElement, embed: HTMLElement, done: () => void) {
  const frame = document.createElement('iframe');
  const src = panel.dataset['networklySrc'] ?? '';
  const origin = new URL(src).origin;
  frame.src = src;
  frame.title = panel.dataset['networklyTitle'] ?? '';
  const post = (message: unknown) => frame.contentWindow?.postMessage(message, origin);
  const sendTheme = () => post({ command: THEME_COMMAND, data: themeForForm(document.documentElement.dataset['theme']) });
  const measure = () => post({ command: MEASURE_COMMAND });
  let shown = false;

  // Фрейм, запрещённый площадкой, тоже даёт `load`, поэтому готовность — только ответ формы с высотой.
  // Слушаем всё время: форма меняет высоту между шагами, а опоздавший ответ снимает «не загрузилась».
  const onMessage = (event: MessageEvent) => {
    if (event.source !== frame.contentWindow || event.origin !== origin) return;
    const height = heightFromMessage(event.data);
    if (height === undefined) return;
    frame.style.height = `${height}px`;
    done();
    if (!shown) {
      shown = true;
      // Первый ответ форма даёт, пока её место скрыто, и он занижен: переспрашиваем, когда её видно.
      requestAnimationFrame(measure);
    }
  };
  window.addEventListener('message', onMessage);
  // Высота формы зависит от ширины окна.
  window.addEventListener('resize', measure);
  frame.addEventListener('load', () => {
    sendTheme();
    measure();
  });
  const themeWatch = new MutationObserver(sendTheme);
  themeWatch.observe(document.documentElement, { attributeFilter: ['data-theme'] });
  embed.append(frame);
}

function loadTimepad(panel: HTMLElement, embed: HTMLElement, done: () => void): () => void {
  const script = document.createElement('script');
  script.async = true;
  script.charset = 'UTF-8';
  script.src = TIMEPAD_LOADER;
  script.setAttribute('data-timepad-customized', panel.dataset['timepadCustomized'] ?? '');
  script.setAttribute('data-twf2s-event--id', panel.dataset['timepadEvent'] ?? '');
  script.setAttribute('data-timepad-widget-v2', 'event_register');
  // Загрузчик ставит форму рядом со своим тегом, поэтому тег кладём в место для формы.
  embed.append(script);
  const poll = window.setInterval(() => {
    const ready = [...embed.querySelectorAll('iframe')].some((frame) => frame.offsetHeight >= READY_FRAME_HEIGHT);
    if (ready) {
      window.clearInterval(poll);
      done();
    }
  }, POLL_MS);
  return () => window.clearInterval(poll);
}

function load(panel: HTMLElement, timeoutMs: number) {
  if (panel.dataset['state'] !== 'idle') return;
  const embed = panel.querySelector<HTMLElement>('[data-registration-embed]');
  if (!embed) return;
  setState(panel, 'loading');

  let stop = () => {};
  const timer = window.setTimeout(() => {
    stop();
    if (panel.dataset['state'] === 'loading') setState(panel, 'failed');
  }, timeoutMs);
  const done = () => {
    window.clearTimeout(timer);
    setState(panel, 'ready');
  };

  if (panel.dataset['networklySrc']) loadNetworkly(panel, embed, done);
  else if (panel.dataset['timepadEvent']) stop = loadTimepad(panel, embed, done);
  else done();
}

export function setupRegistrationDialog(dialog: HTMLDialogElement) {
  if (dialog.hasAttribute(INITIALIZED)) return;
  dialog.setAttribute(INITIALIZED, '');

  const tabs = [...dialog.querySelectorAll<HTMLButtonElement>('[data-registration-tab]')];
  const panels = [...dialog.querySelectorAll<HTMLElement>('[data-registration-panel]')];
  const timeoutMs = Number(dialog.dataset['timeout']) || 15000;
  let current = 0;

  const select = (index: number, focus: boolean) => {
    current = index;
    tabs.forEach((tab, i) => {
      tab.setAttribute('aria-selected', String(i === index));
      tab.tabIndex = i === index ? 0 : -1;
    });
    panels.forEach((panel, i) => {
      panel.hidden = i !== index;
    });
    if (focus) tabs[index]?.focus();
    const panel = panels[index];
    // Форму грузим только когда её вкладку открыли: до этого страница не обращается к площадкам.
    if (panel && dialog.open) load(panel, timeoutMs);
  };

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => select(index, false));
    tab.addEventListener('keydown', (event) => {
      const next = tabIndexAfterKey(event.key, index, tabs.length);
      if (next === undefined) return;
      event.preventDefault();
      select(next, true);
    });
  });

  // Без скрипта кнопка остаётся обычной ссылкой на регистрацию.
  document.querySelectorAll<HTMLElement>(`[data-registration-open="${dialog.id}"]`).forEach((opener) => {
    opener.setAttribute('aria-haspopup', 'dialog');
    opener.addEventListener('click', (event) => {
      event.preventDefault();
      dialog.showModal();
      select(current, false);
    });
  });

  // Окно, открытое атрибутом `open` (стори), грузит первую форму сразу.
  if (dialog.open) select(current, false);

  dialog.querySelector('[data-registration-close]')?.addEventListener('click', () => dialog.close());

  // Нажатие по затемнению приходит на сам dialog: всё содержимое лежит во внутренней обёртке.
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
}
