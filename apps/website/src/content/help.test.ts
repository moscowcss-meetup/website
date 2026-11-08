import { describe, expect, it, vi } from 'vitest';
import { event } from '../test/fixtures';
import { venuesOf } from './help';

vi.mock('astro:content', () => ({ getCollection: vi.fn() }));

const at = (id: string, date: string, name: string, modes = ['оффлайн']) =>
  event(id, { date: new Date(`${date}T18:00:00+03:00`), venue: { name }, modes });

describe('venuesOf', () => {
  it('новые первыми, повтор площадки — один раз', () => {
    const events = [at('ru/1', '2017-03-02', 'Яндекс'), at('ru/26', '2024-06-19', 'Звук'), at('ru/6', '2017-12-07', 'Яндекс')];
    expect(venuesOf(events, 'ru')).toEqual(['Звук', 'Яндекс']);
  });

  it('встреча только онлайн площадкой не считается, гибридная — считается', () => {
    const events = [
      at('ru/online-2021', '2021-12-21', 'Онлайн', ['онлайн']),
      at('en/online-2021', '2021-12-21', 'Online', ['online']),
      at('ru/22', '2023-07-06', 'Лекторий Skillbox', ['оффлайн', 'онлайн']),
    ];
    expect(venuesOf(events, 'ru')).toEqual(['Лекторий Skillbox']);
    expect(venuesOf(events, 'en')).toEqual([]);
  });

  it('черновик и другой язык не попадают', () => {
    const events = [at('ru/32', '2026-11-26', 'Школа 21'), at('en/31', '2026-07-09', 'Zvuk')];
    events[0] = event('ru/32', { ...events[0]!.data, draft: true });
    expect(venuesOf(events, 'ru')).toEqual([]);
  });
});
