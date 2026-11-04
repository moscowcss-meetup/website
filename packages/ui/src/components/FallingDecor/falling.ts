import type { Random } from '../TagPile/pile';

/** Что падает. Выбирают редакторы в контенте, человек может только выключить. */
export type DecorKind = 'springs' | 'snow';

const STORAGE_KEY = 'moscowcss-decor-off';

type DecorStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/** Выключил ли человек падающие фигуры. Хранилище может быть недоступно: тогда они включены. */
export function readDecorOff(storage: DecorStorage | undefined): boolean {
  try {
    return storage?.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function writeDecorOff(storage: DecorStorage | undefined, off: boolean): void {
  try {
    if (off) storage?.setItem(STORAGE_KEY, '1');
    else storage?.removeItem(STORAGE_KEY);
  } catch {
    // В приватном режиме запись может быть запрещена: выбор просто не переживёт перезагрузку.
  }
}

const minCount = 6;
const maxCount = 24;
const widthPerItemPx = 120;

/** Сколько фигур падает при такой ширине окна. */
export function fallingCount(widthPx: number): number {
  return Math.min(maxCount, Math.max(minCount, Math.round(widthPx / widthPerItemPx)));
}

export interface FallingItem {
  /** Положение по горизонтали, проценты ширины окна */
  leftPercent: number;
  /** Время одного падения сверху вниз, мс */
  fallMs: number;
  /** Отрицательная задержка: фигуры с первой секунды уже разбросаны по высоте */
  delayMs: number;
  /** Время одного оборота вокруг своей оси, мс */
  spinMs: number;
  /** Куда вращается */
  clockwise: boolean;
  /** Масштаб фигуры */
  scale: number;
  /** Случайное число для выбора фигуры и цвета */
  pick: number;
}

const between = (low: number, high: number, random: Random): number => low + random() * (high - low);

/** Случайные параметры падения. Столбцы равной ширины, чтобы фигуры не сбивались в кучу. */
export function fallingItems(count: number, random: Random): FallingItem[] {
  return Array.from({ length: count }, (_, index) => {
    const fallMs = between(20000, 40000, random);
    return {
      leftPercent: ((index + random()) / count) * 100,
      fallMs,
      delayMs: -random() * fallMs,
      spinMs: between(3000, 6000, random),
      clockwise: random() < 0.5,
      scale: between(0.7, 1.2, random),
      pick: random(),
    };
  });
}

export interface Box {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/** Задевает ли фигура хотя бы один блок текста; пустые блоки (скрытые элементы) не считаются. */
export function overlapsAny(box: Box, blocks: readonly Box[]): boolean {
  return blocks.some(
    (block) =>
      block.right > block.left &&
      block.bottom > block.top &&
      box.left < block.right &&
      box.right > block.left &&
      box.top < block.bottom &&
      box.bottom > block.top,
  );
}
