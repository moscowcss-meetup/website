import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import { localeOfContentFile, markdownTypographyPlugin, typographText } from './typography';

const NBSP = '\u00a0';

describe('localeOfContentFile', () => {
  it('язык берётся из папки файла', () => {
    expect(localeOfContentFile(resolve('/repo/packages/content/src/talks/ru/x.md'))).toBe('ru');
    expect(localeOfContentFile('C:\\repo\\packages\\content\\src\\reviews\\en\\y.md')).toBe('en');
  });

  it('вне папок ru/en языка нет', () => {
    expect(localeOfContentFile(resolve('/repo/README.md'))).toBeUndefined();
    expect(localeOfContentFile(resolve('/repo/packages/content/src/talks/de/x.md'))).toBeUndefined();
  });
});

describe('typographText', () => {
  it('русский: тире, ёлочки, многоточие, неразрывный пробел после короткого слова', () => {
    expect(typographText('Мы в Москве - и это "наш" митап...', 'ru')).toBe(`Мы${NBSP}в${NBSP}Москве${NBSP}— и${NBSP}это «наш» митап…`);
  });

  it('кавычки smartypants в русском становятся ёлочками', () => {
    expect(typographText('“Школа 21” рядом', 'ru')).toBe('«Школа 21» рядом');
  });

  it('одинокие кавычки вокруг ссылки: направление от smartypants, вид — ёлочки', () => {
    expect(typographText('см. “', 'ru')).toBe('см. «');
    expect(typographText('” — доклад', 'ru')).toBe(`»${NBSP}— доклад`);
  });

  it('вложенные кавычки остаются лапками', () => {
    expect(typographText('"Он сказал "привет" нам"', 'ru')).toBe(`«Он${NBSP}сказал „привет“ нам»`);
  });

  it('английский текст получает английские кавычки', () => {
    expect(typographText('He said "hi" - ok...', 'en')).toBe(`He${NBSP}said “hi”${NBSP}— ok…`);
  });

  it('предлог и союз в конце куска перед ссылкой держатся за следующее слово', () => {
    for (const [text, expected] of [
      ['Встреча в ', `Встреча в${NBSP}`],
      ['Доклад про ', `Доклад про${NBSP}`],
      [' и ', ` и${NBSP}`],
    ]) {
      expect(typographText(text, 'ru'), text).toBe(expected);
    }
  });

  it('пробелы по краям куска абзаца сохраняются', () => {
    expect(typographText(' текст ', 'ru')).toBe(' текст ');
  });

  it('числа, даты, телефоны, дроби и латиница в названиях не меняются', () => {
    for (const text of ['Node 22.1 и 1.5rem', '2026-07-09', '+7 999 123-45-67', 'aspect-ratio 16/9', '1/2', '+-', '(c)', 'reWorked']) {
      expect(typographText(text, 'ru').replaceAll(NBSP, ' '), text).toBe(text);
    }
  });
});

describe('markdownTypographyPlugin', () => {
  const run = (path: string, value: string, parentTag = 'p') => {
    const replaced: string[] = [];
    markdownTypographyPlugin.text({ type: 'text', value }, {
      fileURL: pathToFileURL(resolve(path)),
      parent: () => ({ type: 'element', tagName: parentTag }),
      replaceNode: (_node, next) => {
        replaced.push(next.value);
      },
    });
    return replaced;
  };

  it('типографирует текст файла контента', () => {
    expect(run('/repo/packages/content/src/talks/ru/x.md', 'это "наш" митап')).toEqual([`это «наш» митап`]);
  });

  it('код и текст без изменений не трогает', () => {
    expect(run('/repo/packages/content/src/talks/ru/x.md', 'a -- "b"', 'code')).toEqual([]);
    expect(run('/repo/packages/content/src/talks/ru/x.md', 'текст')).toEqual([]);
  });

  it('файл вне ru/en не трогает', () => {
    expect(run('/repo/README.md', 'это "наш" митап')).toEqual([]);
  });
});
