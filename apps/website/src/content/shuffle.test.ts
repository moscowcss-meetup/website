import { describe, expect, it } from 'vitest';
import { shuffled } from './shuffle';

describe('shuffled', () => {
  it('порядок определяется случайным числом', () => {
    expect(shuffled(['a', 'b', 'c'], () => 0)).toEqual(['b', 'c', 'a']);
    expect(shuffled(['a', 'b', 'c'], () => 0.999)).toEqual(['a', 'b', 'c']);
  });

  it('исходный список не меняется, элементы не теряются', () => {
    const items = ['a', 'b', 'c', 'd'];
    const result = shuffled(items, () => 0.5);
    expect(items).toEqual(['a', 'b', 'c', 'd']);
    expect([...result].sort()).toEqual(items);
  });

  it('встречаются все порядки', () => {
    const orders = new Set<string>();
    for (let run = 0; run < 500; run += 1) orders.add(shuffled(['a', 'b', 'c'], Math.random).join(''));
    expect(orders.size).toBe(6);
  });

  it('пустой список и один элемент', () => {
    expect(shuffled([], Math.random)).toEqual([]);
    expect(shuffled(['a'], Math.random)).toEqual(['a']);
  });
});
