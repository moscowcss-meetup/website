import { createRandom } from '../TagPile/pile';
import { fallingCount, fallingItems, overlapsAny, readDecorOff, writeDecorOff, type DecorKind } from './falling';
import { helixBox, helixPaths, helixShapes, type HelixShape } from './helix';

const INITIALIZED = 'data-falling-decor-initialized';
// Шапка и открытое меню лежат выше слоя и закрывают фигуры сами, поэтому их тексты не считаем.
const TEXT_BLOCKS =
  ':is(h1, h2, h3, h4, h5, h6, p, li, dt, dd, blockquote, figcaption, td, th, label, a, button, input):not([data-navbar] *)';
// Фигуры движутся медленно: чаще проверять незачем, а реже будет заметно, что цвет запаздывает.
const CHECK_INTERVAL_MS = 150;
// Вращение медленное: 30 кадров в секунду на глаз не отличить от 60, а считать вдвое меньше.
const FRAME_MS = 1000 / 30;
const SVG_NS = 'http://www.w3.org/2000/svg';
const TAU = Math.PI * 2;

interface DecorClasses {
  fall: string;
  spring: string;
  springBack: string;
  snow: string;
  muted: string;
  springTones: string[];
  snowTones: string[];
}

interface Spinner {
  fall: HTMLElement;
  shape: HelixShape;
  front: SVGPathElement;
  back: SVGPathElement;
  radiansPerMs: number;
  phase: number;
  onScreen: boolean;
}

// Хранилище может быть запрещено настройками браузера уже на чтении свойства.
function storageOf(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

function drawSpinner(spinner: Spinner): void {
  const { front, back } = helixPaths(spinner.shape, spinner.phase);
  spinner.front.setAttribute('d', front);
  spinner.back.setAttribute('d', back);
}

export function setupFallingDecor(root: HTMLElement) {
  if (root.hasAttribute(INITIALIZED)) return;
  root.setAttribute(INITIALIZED, '');

  const classes = JSON.parse(root.dataset['classes'] ?? '{}') as DecorClasses;
  const kind: DecorKind = root.dataset['kind'] === 'snow' ? 'snow' : 'springs';
  const snowShape = root.querySelector('template')?.content.firstElementChild ?? null;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const offInputs = Array.from(document.querySelectorAll<HTMLInputElement>('[data-decor-off]'));
  const toggles = Array.from(document.querySelectorAll<HTMLElement>('[data-decor-toggle]'));
  let off = readDecorOff(storageOf());
  let spinners: Spinner[] = [];

  // Список собираем заново при каждой проверке: лента ЧАВО листается, а результаты поиска появляются позже.
  const muteOverText = () => {
    const blocks = Array.from(document.querySelectorAll(TEXT_BLOCKS), (element) => element.getBoundingClientRect());
    root.querySelectorAll<HTMLElement>('[data-falling-item]').forEach((item) => {
      item.firstElementChild?.classList.toggle(classes.muted, overlapsAny(item.getBoundingClientRect(), blocks));
    });
    for (const spinner of spinners) {
      const box = spinner.fall.getBoundingClientRect();
      spinner.onScreen = box.bottom > 0 && box.top < window.innerHeight;
    }
  };

  let checkTimer: number | undefined;
  let frameRequest: number | undefined;
  let lastFrame = 0;

  const animate = (now: number) => {
    frameRequest = window.requestAnimationFrame(animate);
    const elapsed = now - lastFrame;
    if (elapsed < FRAME_MS) return;
    lastFrame = now;
    for (const spinner of spinners) {
      spinner.phase = (spinner.phase + spinner.radiansPerMs * elapsed) % TAU;
      if (spinner.onScreen) drawSpinner(spinner);
    }
  };

  const stop = () => {
    window.clearInterval(checkTimer);
    checkTimer = undefined;
    if (frameRequest !== undefined) window.cancelAnimationFrame(frameRequest);
    frameRequest = undefined;
  };

  const start = () => {
    stop();
    muteOverText();
    checkTimer = window.setInterval(muteOverText, CHECK_INTERVAL_MS);
    if (spinners.length > 0) {
      lastFrame = performance.now();
      frameRequest = window.requestAnimationFrame(animate);
    }
  };

  const clear = () => {
    stop();
    spinners = [];
    root.querySelectorAll('[data-falling-item]').forEach((item) => {
      item.remove();
    });
  };

  const isDrawn = () => root.querySelector('[data-falling-item]') !== null;

  const appendSpring = (holder: HTMLElement, fall: HTMLElement, shape: HelixShape, radiansPerMs: number) => {
    const { width, height } = helixBox(shape);
    holder.style.aspectRatio = `${String(width)} / ${String(height)}`;

    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${String(width)} ${String(height)}`);
    svg.setAttribute('fill', 'none');
    const back = document.createElementNS(SVG_NS, 'path');
    back.setAttribute('class', classes.springBack);
    const front = document.createElementNS(SVG_NS, 'path');
    svg.append(back, front);
    holder.append(svg);

    const spinner: Spinner = { fall, shape, front, back, radiansPerMs, phase: Math.random() * TAU, onScreen: true };
    drawSpinner(spinner);
    spinners.push(spinner);
  };

  const draw = () => {
    clear();
    if (off || reducedMotion.matches) return;

    const random = createRandom(Math.floor(Math.random() * 2 ** 32));
    const isSnow = kind === 'snow';
    const tones = isSnow ? classes.snowTones : classes.springTones;

    for (const item of fallingItems(fallingCount(window.innerWidth), random)) {
      const fall = document.createElement('div');
      fall.setAttribute('data-falling-item', '');
      fall.className = classes.fall;
      fall.style.left = `${String(item.leftPercent)}%`;
      fall.style.animationDuration = `${String(item.fallMs)}ms`;
      fall.style.animationDelay = `${String(item.delayMs)}ms`;

      const holder = document.createElement('div');
      holder.style.scale = String(item.scale);
      if (isSnow) {
        holder.className = [classes.snow, tones[Math.floor(item.pick * tones.length)] ?? ''].join(' ');
        const flake = snowShape?.cloneNode(true) as SVGElement | undefined;
        if (flake) {
          flake.style.animationDuration = `${String(item.spinMs)}ms`;
          holder.append(flake);
        }
      } else {
        // Цвет закреплён за формой, как в макете.
        const shapeIndex = Math.floor(item.pick * helixShapes.length);
        const shape = helixShapes[shapeIndex];
        holder.className = [classes.spring, tones[shapeIndex] ?? ''].join(' ');
        if (shape) appendSpring(holder, fall, shape, ((item.clockwise ? 1 : -1) * TAU) / item.spinMs);
      }
      fall.append(holder);
      root.append(fall);
    }
    // Первая проверка до отрисовки кадра: фигура не должна мелькнуть яркой поверх текста.
    if (!document.hidden) start();
  };

  const syncInputs = () => {
    for (const input of offInputs) input.checked = off;
    // Без скрипта и при сниженной анимации падать нечему, и переключатель не нужен.
    for (const toggle of toggles) toggle.hidden = reducedMotion.matches;
  };

  for (const input of offInputs) {
    input.addEventListener('change', () => {
      off = input.checked;
      writeDecorOff(storageOf(), off);
      syncInputs();
      draw();
    });
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else if (isDrawn()) start();
  });

  reducedMotion.addEventListener('change', () => {
    syncInputs();
    draw();
  });

  syncInputs();
  draw();
}
