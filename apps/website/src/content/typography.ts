import { fileURLToPath } from 'node:url';
import type { AstroIntegration } from 'astro';
import Typograf from 'typograf';

export type ContentLocale = 'ru' | 'en';

// Правила, которые на сайте про CSS портят смысл: `1.5` → `1,5`, `16/9` → `⁹⁄₁₆`, `+-` → `±`, ISO-даты
// и телефоны переформатируются, «исправление раскладки» трогает латиницу в названиях вроде reWorked.
// trimLeft/trimRight выключены, потому что на вход идёт кусок абзаца: пробел на краю отделяет его от ссылки.
const DISABLED_RULES = [
  'common/space/trimLeft',
  'common/space/trimRight',
  'common/number/fraction',
  'common/number/mathSigns',
  'common/number/times',
  'common/symbols/copy',
  'common/symbols/cf',
  'ru/number/comma',
  'ru/date/fromISO',
  'ru/other/phone-number',
  'ru/typo/switchingKeyboardLayout',
];

function createTypograf(locale: string[]): Typograf {
  const typograf = new Typograf({ locale });
  typograf.disableRule(DISABLED_RULES);
  return typograf;
}

const typografs: Record<ContentLocale, Typograf> = {
  // Английские слова внутри русского текста тоже получают свои правила.
  ru: createTypograf(['ru', 'en-US']),
  en: createTypograf(['en-US']),
};

const LOCALE_DIR = /[\\/](ru|en)[\\/][^\\/]+\.md$/;

/** Язык файла контента по папке: `…/talks/ru/x.md` → ru; вне `ru`/`en` — undefined. */
export function localeOfContentFile(path: string): ContentLocale | undefined {
  return LOCALE_DIR.exec(path)?.[1] as ContentLocale | undefined;
}

/**
 * Типографирует один текстовый узел абзаца. Узел — кусок фразы между ссылками и выделением,
 * поэтому пробелы по краям сохраняются, а одинокие кавычки, которые smartypants уже развернул
 * в нужную сторону по всему абзацу, в русском тексте становятся ёлочками.
 */
export function typographText(text: string, locale: ContentLocale): string {
  const result = typografs[locale].execute(text);
  // „ — признак вложенных кавычек: внутри них “ закрывающая, её не трогаем.
  if (locale === 'ru' && !result.includes('„')) return result.replaceAll('“', '«').replaceAll('”', '»');
  return result;
}

// Текст внутри них — код и ввод: типограф заменил бы `--` на тире, а `"` на ёлочки.
const SKIP_TAGS: ReadonlySet<string> = new Set(['code', 'pre', 'kbd', 'samp', 'script', 'style']);

interface TextNode {
  readonly type: 'text';
  readonly value: string;
}

interface VisitorContext {
  readonly fileURL: URL | undefined;
  parent(node: Readonly<TextNode>): { readonly type: string; readonly tagName?: string } | undefined;
  replaceNode(node: Readonly<TextNode>, newNode: TextNode): void;
}

/** hast-плагин процессора satteri: типографика текста Markdown на языке файла. */
export const markdownTypographyPlugin = {
  name: 'moscowcss-markdown-typography',
  text(node: Readonly<TextNode>, ctx: VisitorContext): void {
    if (!ctx.fileURL) return;
    const locale = localeOfContentFile(fileURLToPath(ctx.fileURL));
    if (!locale) return;
    const tagName = ctx.parent(node)?.tagName;
    if (tagName && SKIP_TAGS.has(tagName)) return;
    const value = typographText(node.value, locale);
    if (value !== node.value) ctx.replaceNode(node, { type: 'text', value });
  },
};

interface ProcessorOptions {
  hastPlugins?: unknown[];
}

/** Подключает плагин к процессору Markdown, который Astro создал по умолчанию (как markdown-safety). */
export const markdownTypography: AstroIntegration = {
  name: 'moscowcss-markdown-typography',
  hooks: {
    'astro:config:setup': ({ config }) => {
      const options = (config.markdown.processor as { options?: ProcessorOptions } | undefined)?.options;
      if (!options?.hastPlugins) {
        throw new Error('markdown-typography: процессор Markdown без hastPlugins — типограф не подключён');
      }
      options.hastPlugins.push(markdownTypographyPlugin);
    },
  },
};
