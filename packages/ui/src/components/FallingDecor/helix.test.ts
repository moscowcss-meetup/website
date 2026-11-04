import { describe, expect, it } from 'vitest';
import { helixBox, helixPaths, helixShapes } from './helix';

const pointsOf = (path: string): number[][] =>
  [...path.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)].map((match) => [Number(match[1]), Number(match[2])]);

const shape = helixShapes[0]!;

describe('helixPaths', () => {
  it('при любой фазе спираль остаётся в своём кадре', () => {
    for (const candidate of helixShapes) {
      const box = helixBox(candidate);
      for (const phase of [0, 1, 2, 3, 4, 5, 6]) {
        const { front, back } = helixPaths(candidate, phase);
        for (const [x, y] of pointsOf(front + back)) {
          expect(x).toBeGreaterThanOrEqual(0);
          expect(x).toBeLessThanOrEqual(box.width);
          expect(y).toBeGreaterThanOrEqual(0);
          expect(y).toBeLessThanOrEqual(box.height);
        }
      }
    }
  });

  it('вращение двигает концы пружинки: это поворот, а не сдвиг витков', () => {
    const first = (phase: number) => pointsOf(helixPaths(shape, phase).front + helixPaths(shape, phase).back);
    const startOf = (phase: number) => {
      const { front, back } = helixPaths(shape, phase);
      return pointsOf(Math.sin(phase) >= 0 ? front : back)[0];
    };
    expect(first(0)).not.toEqual(first(1));
    expect(startOf(0)?.[0]).toBeGreaterThan(startOf(Math.PI)?.[0] ?? Infinity);
  });

  it('полный оборот возвращает ту же форму', () => {
    expect(helixPaths(shape, 0.5)).toEqual(helixPaths(shape, 0.5 + Math.PI * 2));
  });

  it('спираль делится на переднюю и заднюю части', () => {
    const { front, back } = helixPaths(shape, 0);
    expect(pointsOf(front).length).toBeGreaterThan(10);
    expect(pointsOf(back).length).toBeGreaterThan(10);
  });

  it('высота кадра растёт с числом витков', () => {
    expect(helixBox({ ...shape, turns: 10 }).height).toBeGreaterThan(helixBox(shape).height);
  });
});
