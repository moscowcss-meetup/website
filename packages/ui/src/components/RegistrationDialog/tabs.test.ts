import { describe, expect, it } from 'vitest';
import { tabIndexAfterKey } from './tabs';

describe('tabIndexAfterKey', () => {
  it('стрелки идут по кругу', () => {
    expect(tabIndexAfterKey('ArrowRight', 0, 2)).toBe(1);
    expect(tabIndexAfterKey('ArrowRight', 1, 2)).toBe(0);
    expect(tabIndexAfterKey('ArrowLeft', 0, 2)).toBe(1);
    expect(tabIndexAfterKey('ArrowLeft', 1, 2)).toBe(0);
  });

  it('Home и End ведут к краям', () => {
    expect(tabIndexAfterKey('Home', 2, 3)).toBe(0);
    expect(tabIndexAfterKey('End', 0, 3)).toBe(2);
  });

  it('одна вкладка остаётся на месте', () => {
    expect(tabIndexAfterKey('ArrowRight', 0, 1)).toBe(0);
    expect(tabIndexAfterKey('ArrowLeft', 0, 1)).toBe(0);
  });

  it('прочие клавиши и пустой список не обрабатываются', () => {
    expect(tabIndexAfterKey('Enter', 0, 2)).toBeUndefined();
    expect(tabIndexAfterKey('ArrowDown', 0, 2)).toBeUndefined();
    expect(tabIndexAfterKey('ArrowRight', 0, 0)).toBeUndefined();
  });
});
