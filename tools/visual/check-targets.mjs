import { launchBrowser } from './browser.mjs';

// Адрес берём из аргумента, иначе из SITE_URL, иначе локальный `astro preview`.
const SITE_URL = process.argv[2] ?? process.env.SITE_URL ?? 'http://localhost:4321/';

const WIDTHS = [375, 1440];
const VIEWPORT_HEIGHT = 900;
const PAGE_TIMEOUT_MS = 30_000;

// Ниже этой ширины навигация живёт в меню за бургером: перед обходом его открываем.
const MENU_MAX_WIDTH = 767;

const SELECTORS = ['[data-navbar] a', '[data-navbar] button', '[data-card-slider] button', 'a[hreflang]', 'body > footer a'];
const MIN_SIZE = 42;
const SIZE_EPSILON = 0.01;
const FOCUS_COLOR = 'rgb(56, 69, 207)';
const MIN_OUTLINE_WIDTH = 1;
const TARGET_ATTR = 'data-check-target';

const violations = [];
const violate = (width, message) => {
  violations.push(`[${width}] ${message}`);
  console.error(`ОШИБКА [${width}] ${message}`);
};

const browser = await launchBrowser().catch((error) => {
  console.error(`ОШИБКА: ${error.message}`);
  process.exit(2);
});

// Выполняется внутри страницы: помечает видимые цели атрибутом и возвращает их размеры.
function collectTargets({ selectors, attr }) {
  const describe = (el) => {
    const name = el.getAttribute('aria-label') ?? el.textContent?.trim().replace(/\s+/g, ' ').slice(0, 40) ?? '';
    const href = el.getAttribute('href');
    return `<${el.tagName.toLowerCase()}${el.className ? `.${String(el.className).split(/\s+/)[0]}` : ''}>` +
      `${name ? ` «${name}»` : ''}${href ? ` href=${href}` : ''}`;
  };
  const found = [];
  const seen = new Set();
  for (const el of document.querySelectorAll(selectors.join(', '))) {
    if (seen.has(el)) continue;
    seen.add(el);
    // Элементы за закрытым меню и в скрытых блоках целями не считаются.
    if (el.closest('[hidden], [inert]')) continue;
    if (!el.checkVisibility({ checkVisibilityCSS: true })) continue;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;
    const id = String(found.length);
    el.setAttribute(attr, id);
    found.push({
      id,
      label: describe(el),
      matched: selectors.filter((selector) => el.matches(selector)),
      width: rect.width,
      height: rect.height,
      disabled: el.matches(':disabled') || el.getAttribute('aria-disabled') === 'true',
    });
  }
  return found;
}

// Выполняется внутри страницы: фокус, полученный от клавиши Tab, и контур, который браузер при этом нарисовал.
function readFocus(attr) {
  const el = document.activeElement;
  if (!el || el === document.body) return null;
  const id = el.getAttribute(attr);
  if (id === null) return { id: null };
  const style = getComputedStyle(el);
  return {
    id,
    focusVisible: el.matches(':focus-visible'),
    outlineStyle: style.outlineStyle,
    outlineWidth: Number.parseFloat(style.outlineWidth),
    outlineColor: style.outlineColor,
  };
}

async function checkWidth(width) {
  const context = await browser.newContext({
    reducedMotion: 'reduce',
    deviceScaleFactor: 1,
    viewport: { width, height: VIEWPORT_HEIGHT },
  });
  // Чужие origin (Яндекс.Карты) режем: страница грузится быстрее и одинаково от запуска к запуску.
  const ownOrigin = new URL(SITE_URL).origin;
  await context.route('**/*', (route) => {
    const request = route.request();
    const { protocol, origin } = new URL(request.url());
    if (protocol === 'data:' || protocol === 'blob:' || origin === ownOrigin) return route.continue();
    if (request.resourceType() === 'document') {
      return route.fulfill({ status: 200, contentType: 'text/html', body: '' });
    }
    return route.abort();
  });
  const page = await context.newPage();
  try {
    try {
      await page.goto(SITE_URL, { waitUntil: 'load', timeout: PAGE_TIMEOUT_MS });
    } catch (error) {
      throw new Error(`сайт недоступен по ${SITE_URL} (запущен ли astro preview?): ${error.message}`);
    }
    await page.evaluate(() => document.fonts.ready);
    await page.waitForLoadState('networkidle').catch(() => {});

    if (width <= MENU_MAX_WIDTH) {
      const toggle = page.locator('[data-nav-toggle]').first();
      if ((await toggle.count()) === 0 || !(await toggle.isVisible())) {
        throw new Error('на узкой ширине нет видимой кнопки меню [data-nav-toggle]');
      }
      await toggle.click();
      await page.waitForSelector('[data-nav-menu]:not([hidden])', { timeout: PAGE_TIMEOUT_MS });
    }

    const targets = await page.evaluate(collectTargets, { selectors: SELECTORS, attr: TARGET_ATTR });
    if (targets.length === 0) throw new Error('не найдено ни одного видимого элемента для проверки');
    console.log(`[${width}] целей: ${targets.length}`);

    for (const target of targets) {
      if (target.width < MIN_SIZE - SIZE_EPSILON || target.height < MIN_SIZE - SIZE_EPSILON) {
        violate(
          width,
          `зона ${target.width.toFixed(2)}x${target.height.toFixed(2)} меньше ${MIN_SIZE}x${MIN_SIZE}: ${target.label}`,
        );
      }
    }

    // Обход настоящей клавишей Tab, чтобы браузер сам применил :focus-visible.
    // Отключённые кнопки (крайний слайд) фокуса получить не могут по определению.
    const pending = new Map(targets.filter((target) => !target.disabled).map((target) => [target.id, target]));
    const tabbable = await page.evaluate(
      () => document.querySelectorAll('a[href], button, input, select, textarea, [tabindex]').length,
    );
    const maxPresses = tabbable * 2 + 20;
    for (let press = 0; press < maxPresses && pending.size > 0; press += 1) {
      await page.keyboard.press('Tab');
      const focus = await page.evaluate(readFocus, TARGET_ATTR);
      if (!focus || focus.id === null || !pending.has(focus.id)) continue;
      const target = pending.get(focus.id);
      pending.delete(focus.id);
      if (!focus.focusVisible) {
        violate(width, `после Tab не сработал :focus-visible: ${target.label}`);
      }
      if (focus.outlineStyle === 'none' || focus.outlineWidth < MIN_OUTLINE_WIDTH) {
        violate(width, `контур фокуса ${focus.outlineStyle} ${focus.outlineWidth}px тоньше ${MIN_OUTLINE_WIDTH}px: ${target.label}`);
      } else if (focus.outlineColor !== FOCUS_COLOR) {
        violate(width, `цвет контура ${focus.outlineColor}, ожидается ${FOCUS_COLOR}: ${target.label}`);
      }
    }
    for (const target of pending.values()) {
      violate(width, `фокус с клавиатуры не дошёл до элемента: ${target.label}`);
    }
    for (const target of targets.filter((item) => item.disabled)) {
      console.log(`[${width}] без проверки фокуса (отключён): ${target.label}`);
    }
  } finally {
    await context.close();
  }
}

try {
  for (const width of WIDTHS) await checkWidth(width);
} catch (error) {
  console.error(`ОШИБКА: ${error.message}`);
  await browser.close();
  process.exit(2);
}
await browser.close();

if (violations.length > 0) {
  console.error(`\nИтого нарушений: ${violations.length}`);
  process.exit(1);
}
console.log('Все цели не меньше 42x42, контур фокуса на месте.');
