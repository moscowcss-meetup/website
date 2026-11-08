import { readFile, stat, mkdir, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { extname, join, normalize, resolve } from 'node:path';
import { launchBrowser } from './browser.mjs';

// Сервер свой, а не `astro preview`: не занимает порты запущенного `pnpm dev` и не оставляет дочерних процессов.
const DIST = resolve(import.meta.dirname, '../../apps/website/dist');
const OUT = resolve(import.meta.dirname, '../../.visual/a11y');
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const THEMES = ['light', 'dark'];
const WIDTHS = [375, 1440];
const REFLOW_WIDTH = 320;
const MIN_OUTLINE_PX = 1;
// Страниц бывает много длинных списков ссылок: столько Tab хватает на всю шапку и основные блоки.
const MAX_TABS = 400;
const LIVE_TAB_PAUSE_MS = 250;
const SETTLE_MS = 60;
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.woff2': 'font/woff2',
  '.json': 'application/json',
  '.wasm': 'application/wasm',
  '.ico': 'image/x-icon',
};

const axeSource = await readFile(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');

const server = createServer(async (request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, 'http://x').pathname);
  const relative = normalize(pathname).replace(/^([/\\]|\.\.)+/, '');
  const candidates = [join(DIST, relative), join(DIST, relative, 'index.html')];
  for (const path of candidates) {
    const info = await stat(path).catch(() => null);
    if (info?.isFile()) {
      response.writeHead(200, { 'content-type': MIME[extname(path)] ?? 'application/octet-stream' });
      response.end(await readFile(path));
      return;
    }
  }
  response.writeHead(404, { 'content-type': MIME['.html'] });
  response.end(await readFile(join(DIST, '404.html')).catch(() => 'not found'));
});
await new Promise((done) => server.listen(0, '127.0.0.1', done));
const origin = `http://127.0.0.1:${server.address().port}`;

const violations = [];
const review = new Map();
const report = (where, rule, detail) => {
  violations.push({ where, rule, detail });
  console.error(`ОШИБКА ${where} · ${rule}: ${detail}`);
};

const browser = await launchBrowser().catch((error) => {
  console.error(`ОШИБКА: ${error.message}`);
  process.exit(2);
});

// Анимацию и падающие фигуры выключаем: они перекрывают текст и дают axe ложные сомнения в контрасте.
const newPage = async (theme, width, { reducedMotion = 'reduce', height = 900 } = {}) => {
  const context = await browser.newContext({ viewport: { width, height }, reducedMotion });
  await context.addInitScript((value) => {
    localStorage.setItem('moscowcss-theme', value);
    localStorage.setItem('moscowcss-decor-off', '1');
  }, theme);
  // Чужие карты в проверке не нужны: сеть замедляет прогон и делает его нестабильным.
  await context.route(/yandex\.ru\/map-widget/, (route) => route.abort());
  return { context, page: await context.newPage() };
};

const open = async (page, path) => {
  await page.goto(origin + path, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
};

async function discoverPages() {
  const { context, page } = await newPage('light', 1440);
  await open(page, '/events/31/');
  const firstLink = (prefix) =>
    page.evaluate(
      (value) => [...document.querySelectorAll(`main a[href^="${value}"]`)].map((link) => link.getAttribute('href')).find((href) => href !== value),
      prefix,
    );
  const talk = await firstLink('/talks/');
  const speaker = await firstLink('/speakers/');
  await context.close();
  // Списки (спека 007) — с фильтром, раскрытым скриптом страницы.
  const lists = ['/events/', '/talks/', '/speakers/', '/en/speakers/'];
  // Стены языка нет, пока на нём нет опубликованных отзывов (спека 008).
  const walls = ['/reviews/', '/en/reviews/'];
  const found = await Promise.all(walls.map(async (path) => (await fetch(origin + path)).ok));
  const reviews = walls.filter((_, index) => found[index]);
  return ['/', '/en/', '/events/31/', talk, speaker, ...lists, ...reviews, '/search/', '/privacy/', '/about/', '/help/', '/en/help/', '/en/events/31/', '/404.html'].filter(Boolean);
}

async function checkAxe(page, where) {
  await page.addScriptTag({ content: axeSource });
  const result = await page.evaluate(
    (tags) => globalThis.axe.run(document, { runOnly: { type: 'tag', values: tags } }),
    AXE_TAGS,
  );
  for (const item of result.violations) {
    for (const node of item.nodes) {
      report(where, `axe:${item.id}`, `${node.target.join(' ')} — ${node.failureSummary?.split('\n')[1]?.trim() ?? item.help}`);
    }
  }
  for (const item of result.incomplete) {
    review.set(item.id, (review.get(item.id) ?? 0) + item.nodes.length);
  }
}

async function checkStructure(page, where) {
  const facts = await page.evaluate(() => ({
    lang: document.documentElement.lang,
    title: document.title,
    h1: document.querySelectorAll('h1').length,
    main: document.querySelectorAll('main').length,
    levels: [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')]
      .filter((heading) => heading.getClientRects().length > 0)
      .map((heading) => Number(heading.tagName[1])),
  }));
  if (!facts.lang) report(where, 'lang', 'нет языка страницы');
  if (!facts.title) report(where, 'title', 'нет заголовка страницы');
  if (facts.h1 !== 1) report(where, 'h1', `h1 на странице: ${facts.h1}`);
  if (facts.main !== 1) report(where, 'main', `main на странице: ${facts.main}`);
  facts.levels.forEach((level, index) => {
    const previous = facts.levels[index - 1];
    if (previous !== undefined && level > previous + 1) report(where, 'headings', `пропуск уровня: h${previous} → h${level}`);
  });
}

async function checkKeyboard(page, where) {
  await page.keyboard.press('Tab');
  const first = await page.evaluate(() => {
    const element = document.activeElement;
    return { skip: element?.hasAttribute('data-skip-link') ?? false, target: element?.getAttribute('href') };
  });
  if (!first.skip) {
    report(where, 'skip-link', 'первый Tab не ведёт на ссылку пропуска навигации');
  } else if (first.target && !(await page.evaluate((id) => Boolean(document.querySelector(id)), first.target))) {
    report(where, 'skip-link', `цель ${first.target} не найдена`);
  } else {
    await page.keyboard.press('Enter');
    const moved = await page.evaluate(() => document.activeElement?.tagName === 'MAIN');
    if (!moved) report(where, 'skip-link', 'после Enter фокус не перешёл на main');
    await page.goto(page.url().split('#')[0], { waitUntil: 'load' });
    await page.keyboard.press('Tab');
  }

  const seen = new Set();
  for (let step = 0; step < MAX_TABS; step += 1) {
    // Лента подъезжает к карточке в следующем кадре.
    await page.waitForTimeout(SETTLE_MS);
    const state = await page.evaluate(() => {
      const element = document.activeElement;
      if (!element || element === document.body) return null;
      const name = (element.getAttribute('aria-label') ?? element.textContent ?? element.tagName).trim().slice(0, 40);
      const index = [...document.querySelectorAll('*')].indexOf(element);
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      const ringStyle = getComputedStyle(element, '::before');
      // Фигурная плавающая кнопка рисует кольцо слоем-подложкой, а не outline.
      const ring = style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) >= 1;
      const layerRing = style.outlineStyle === 'none' && ringStyle.content !== 'none' && ringStyle.opacity === '1';
      const x = Math.min(Math.max(rect.left + rect.width / 2, 0), innerWidth - 1);
      const y = Math.min(Math.max(rect.top + rect.height / 2, 0), innerHeight - 1);
      const onTop = document.elementFromPoint(x, y);
      const covered = onTop && !element.contains(onTop) && !onTop.contains(element);
      const visible = rect.width > 0 && rect.height > 0;
      const inView = rect.bottom > 0 && rect.top < innerHeight && rect.right > 0 && rect.left < innerWidth;
      return { key: index, name, ring: ring || layerRing, covered: Boolean(covered), visible, inView, coveredBy: covered ? onTop.tagName : '' };
    });
    if (state) {
      if (seen.has(state.key)) break;
      seen.add(state.key);
      if (!state.visible) report(where, 'focus-hidden', `фокус на невидимом элементе «${state.name}»`);
      else if (!state.inView) report(where, 'focus-offscreen', `фокус вне экрана «${state.name}»`);
      else if (state.covered) report(where, 'focus-obscured', `«${state.name}» перекрыт ${state.coveredBy}`);
      if (!state.ring) report(where, 'focus-ring', `нет кольца у «${state.name}»`);
    } else if (step > 0) {
      break;
    }
    await page.keyboard.press('Tab');
  }
}

async function checkMenu(page, where) {
  const burger = page.locator('[data-nav-toggle]');
  if (!(await burger.isVisible())) return;
  await burger.focus();
  await page.keyboard.press('Enter');
  const opened = await page.locator('[data-nav-menu]').isVisible();
  if (!opened) {
    report(where, 'menu', 'меню не открывается с клавиатуры');
    return;
  }
  for (let step = 0; step < 30; step += 1) {
    await page.keyboard.press('Tab');
    const inside = await page.evaluate(() => Boolean(document.activeElement?.closest('[data-navbar]')) || document.activeElement === document.body);
    if (!inside) {
      report(where, 'menu', 'Tab вышел за пределы открытого меню');
      break;
    }
  }
  await page.keyboard.press('Escape');
  const state = await page.evaluate(() => ({
    closed: document.querySelector('[data-nav-menu]')?.hidden,
    onBurger: document.activeElement?.hasAttribute('data-nav-toggle'),
  }));
  if (!state.closed) report(where, 'menu', 'Esc не закрывает меню');
  else if (!state.onBurger) report(where, 'menu', 'после закрытия фокус не вернулся на бургер');
}

async function checkReflow(path, theme) {
  const { context, page } = await newPage(theme, REFLOW_WIDTH);
  await open(page, path);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (overflow > 0) report(`${path} ${theme} ${REFLOW_WIDTH}`, 'reflow', `горизонтальная прокрутка на ${overflow}px`);
  await context.close();
}

// WCAG 1.4.4: текст вдвое крупнее. Корневой размер ставим сами, браузерный зум сменил бы и ширину окна.
async function checkTextResize(path, theme) {
  const { context, page } = await newPage(theme, 1280);
  await open(page, path);
  await page.addStyleTag({ content: 'html { font-size: 200% !important; }' });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (overflow > 0) report(`${path} ${theme} текст 200%`, 'resize-text', `горизонтальная прокрутка на ${overflow}px`);
  await context.close();
}

// WCAG 1.4.12: интервалы, которые человек может задать своей таблицей стилей, не должны терять текст.
async function checkTextSpacing(path, theme) {
  const { context, page } = await newPage(theme, 375);
  await open(page, path);
  await page.addStyleTag({
    content: '* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; } p { margin-bottom: 2em !important; }',
  });
  const facts = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    clipped: [...document.querySelectorAll('main h1,main h2,main h3,main p,main li,main a')]
      .filter((element) => {
        const style = getComputedStyle(element);
        return style.overflow === 'hidden' && element.getClientRects().length > 0 && element.scrollHeight > element.clientHeight + 1;
      })
      .map((element) => element.textContent.trim().slice(0, 30)),
  }));
  if (facts.overflow > 0) report(`${path} ${theme} интервалы`, 'text-spacing', `горизонтальная прокрутка на ${facts.overflow}px`);
  for (const text of facts.clipped) report(`${path} ${theme} интервалы`, 'text-spacing', `текст обрезан: «${text}»`);
  await context.close();
}

// С живой анимацией: при reduce лента не движется, и уехавшая за край карточка не видна проверке.
async function checkLiveSlider(width) {
  const { context, page } = await newPage('light', width, { reducedMotion: 'no-preference' });
  await open(page, '/');
  for (let step = 0; step < MAX_TABS; step += 1) {
    await page.keyboard.press('Tab');
    await page.waitForTimeout(LIVE_TAB_PAUSE_MS);
    const state = await page.evaluate(() => {
      const element = document.activeElement;
      if (!element || element === document.body) return { done: true };
      const slider = element.closest('[data-card-slider]');
      if (!slider) return {};
      const rect = element.getBoundingClientRect();
      let shifted = 0;
      for (let node = slider; node; node = node.parentElement) shifted = Math.max(shifted, node.scrollLeft);
      return {
        inSlider: true,
        name: (element.getAttribute('aria-label') ?? element.textContent).trim().slice(0, 30),
        offscreen: rect.right <= 0 || rect.left >= innerWidth,
        shifted,
      };
    });
    if (state.done) break;
    if (state.inSlider && state.offscreen) report(`/ ${width} живая лента`, 'slider-focus', `фокус за экраном: «${state.name}»`);
    if (state.inSlider && state.shifted > 0) report(`/ ${width} живая лента`, 'slider-shift', `секция сдвинута на ${state.shifted}px: «${state.name}»`);
  }
  await context.close();
}

// Модальное окно карты: открытие с клавиатуры, фокус, запрет фона и главное — страница не прыгает.
async function checkMapDialog(theme, width) {
  const where = `/ ${theme} ${width} окно карты`;
  const { context, page } = await newPage(theme, width);
  await open(page, '/');
  const trigger = page.locator('[data-map-open]');
  if ((await trigger.count()) === 0) {
    await context.close();
    return;
  }
  if ((await page.locator('[data-map-frame] iframe').count()) > 0) report(where, 'map-lazy', 'чужая карта загружена до открытия окна');
  await trigger.scrollIntoViewIfNeeded();
  await trigger.focus();
  const position = () =>
    page.evaluate(() => {
      const box = document.querySelector('[data-map-open]').getBoundingClientRect();
      return { scroll: Math.round(scrollY), left: box.left, top: box.top, width: document.documentElement.clientWidth };
    });
  const before = await position();
  await page.keyboard.press('Enter');
  const opened = await position();
  const facts = await page.evaluate(() => {
    const dialog = document.querySelector('[data-map-dialog] dialog');
    const frame = dialog.querySelector('iframe');
    return {
      modal: dialog.matches(':modal'),
      focusInside: dialog.contains(document.activeElement),
      labelled: Boolean(document.getElementById(dialog.getAttribute('aria-labelledby'))?.textContent.trim()),
      frameTitle: frame?.title,
      links: dialog.querySelectorAll('a[href^="https://"]').length,
    };
  });
  if (!facts.modal) report(where, 'dialog', 'окно не модальное');
  if (!facts.focusInside) report(where, 'dialog', 'фокус не перешёл в окно');
  if (!facts.labelled) report(where, 'dialog', 'у окна нет названия');
  if (!facts.frameTitle) report(where, 'dialog', 'у карты нет названия');
  if (facts.links < 3) report(where, 'dialog', `ссылок на сервисы: ${facts.links}`);
  if (JSON.stringify(before) !== JSON.stringify(opened)) report(where, 'dialog-jump', `страница сдвинулась при открытии: ${JSON.stringify(before)} → ${JSON.stringify(opened)}`);
  await checkAxe(page, where);
  await page.keyboard.press('Escape');
  const closed = await position();
  const after = await page.evaluate(() => ({
    open: document.querySelector('[data-map-dialog] dialog').open,
    onTrigger: document.activeElement?.hasAttribute('data-map-open'),
  }));
  if (after.open) report(where, 'dialog', 'Esc не закрывает окно');
  if (!after.onTrigger) report(where, 'dialog', 'после закрытия фокус не вернулся на кнопку');
  if (JSON.stringify(before) !== JSON.stringify(closed)) report(where, 'dialog-jump', `страница сдвинулась при закрытии: ${JSON.stringify(before)} → ${JSON.stringify(closed)}`);
  await context.close();
}

async function checkReviewDialog(theme, width) {
  const where = `/reviews/ ${theme} ${width} окно отзыва`;
  const { context, page } = await newPage(theme, width);
  await open(page, '/reviews/');
  const sticker = page.locator('[data-review-sticker]').first();
  if ((await sticker.count()) === 0) {
    await context.close();
    return;
  }
  const slug = await sticker.getAttribute('data-review-sticker');
  await sticker.focus();
  await page.keyboard.press('Enter');
  const facts = await page.evaluate((name) => {
    const dialog = document.querySelector(`dialog[data-review-dialog="${name}"]`);
    return {
      modal: dialog.matches(':modal'),
      focusInside: dialog.contains(document.activeElement),
      labelled: Boolean(document.getElementById(dialog.getAttribute('aria-labelledby'))?.textContent.trim()),
      param: new URLSearchParams(location.search).get('review'),
    };
  }, slug);
  if (!facts.modal) report(where, 'dialog', 'окно не модальное');
  if (!facts.focusInside) report(where, 'dialog', 'фокус не перешёл в окно');
  if (!facts.labelled) report(where, 'dialog', 'у окна нет названия');
  if (facts.param !== slug) report(where, 'dialog-url', `в адресе ${facts.param}, а открыт ${slug}`);
  await checkAxe(page, where);
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !new URLSearchParams(location.search).has('review'));
  const after = await page.evaluate((name) => document.activeElement?.getAttribute('data-review-sticker') === name, slug);
  if (!after) report(where, 'dialog', 'после закрытия фокус не вернулся на стикер');
  await context.close();
}

async function checkPauseControls() {
  const { context, page } = await newPage('light', 1440, { reducedMotion: 'no-preference' });
  await context.addInitScript(() => localStorage.removeItem('moscowcss-decor-off'));
  await open(page, '/');
  const facts = await page.evaluate(() => ({
    autoplay: Boolean(document.querySelector('[data-card-slider-autoplay]')),
    pause: Boolean(document.querySelector('[data-card-slider-pause]')),
    decor: document.querySelectorAll('[data-falling-item]').length,
    decorToggle: Boolean(document.querySelector('[data-decor-toggle]:not([hidden])')),
  }));
  if (facts.autoplay && !facts.pause) report('/', 'pause-slider', 'у автопрокрутки нет кнопки паузы (WCAG 2.2.2)');
  if (facts.decor > 0 && !facts.decorToggle) report('/', 'pause-decor', 'падающие фигуры нельзя выключить (WCAG 2.2.2)');
  await context.close();
}

try {
  const pages = await discoverPages();
  console.log(`Страницы: ${pages.join(', ')}`);
  for (const path of pages) {
    for (const theme of THEMES) {
      for (const width of WIDTHS) {
        const where = `${path} ${theme} ${width}`;
        const { context, page } = await newPage(theme, width);
        await open(page, path);
        await checkAxe(page, where);
        await checkStructure(page, where);
        await open(page, path);
        await checkKeyboard(page, where);
        await open(page, path);
        await checkMenu(page, where);
        await context.close();
      }
      await checkReflow(path, theme);
      await checkTextResize(path, theme);
      await checkTextSpacing(path, theme);
    }
  }
  await checkPauseControls();
  for (const width of WIDTHS) {
    await checkLiveSlider(width);
    for (const theme of THEMES) {
      await checkMapDialog(theme, width);
      await checkReviewDialog(theme, width);
    }
  }
} finally {
  await browser.close();
  server.close();
}

await mkdir(OUT, { recursive: true });
await writeFile(join(OUT, 'results.json'), JSON.stringify({ violations, review: Object.fromEntries(review) }, null, 2));

if (review.size > 0) {
  console.log(`Сомнения axe, нужен ручной просмотр: ${[...review].map(([id, count]) => `${id} (${String(count)})`).join(', ')}`);
}
if (violations.length > 0) {
  console.error(`Нарушений: ${violations.length}. Подробности: .visual/a11y/results.json`);
  process.exit(1);
}
console.log('Нарушений WCAG 2.2 A и AA автоматика не нашла. Это не заменяет ручную проверку.');
