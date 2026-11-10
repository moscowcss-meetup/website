import { describe, expect, it, vi } from 'vitest';
import { event } from '../test/fixtures';
import { registrationTabsOf } from './registration';

vi.mock('astro:content', () => ({ getCollection: vi.fn() }));

const labels = {
  networkly: 'Networkly',
  networklyFrame: 'Форма Networkly',
  networklyFallback: 'На сайт Networkly',
  timepad: 'Timepad',
  timepadFallback: 'На сайт Timepad',
};

describe('registrationTabsOf', () => {
  it('Networkly первой, Timepad второй; запасные ссылки — на страницы события', () => {
    const tabs = registrationTabsOf(
      event('ru/32', {
        registrationUrl: 'https://moscowcss.timepad.ru/event/4291445/',
        networklyUrl: 'https://networkly.app/event/7143',
        networklyFormUrl: 'https://networkly.app/register/263/embedded',
        timepadWidget: { event: 4291445, customized: 48793 },
      }),
      labels,
    );
    expect(tabs).toEqual([
      {
        label: 'Networkly',
        frameSrc: 'https://networkly.app/register/263/embedded',
        frameTitle: 'Форма Networkly',
        fallbackHref: 'https://networkly.app/event/7143',
        fallbackLabel: 'На сайт Networkly',
      },
      {
        label: 'Timepad',
        timepad: { event: 4291445, customized: 48793 },
        fallbackHref: 'https://moscowcss.timepad.ru/event/4291445/',
        fallbackLabel: 'На сайт Timepad',
      },
    ]);
  });

  it('без страницы события запасная ссылка ведёт на форму или на событие Timepad', () => {
    const tabs = registrationTabsOf(
      event('ru/32', {
        networklyFormUrl: 'https://networkly.app/register/263/embedded',
        timepadWidget: { event: 1, customized: 2 },
      }),
      labels,
    );
    expect(tabs.map((tab) => tab.fallbackHref)).toEqual([
      'https://networkly.app/register/263/embedded',
      'https://timepad.ru/event/1/',
    ]);
  });

  it('только одна форма — одна вкладка; без форм — пусто', () => {
    expect(registrationTabsOf(event('ru/32', { timepadWidget: { event: 1, customized: 2 } }), labels)).toHaveLength(1);
    expect(registrationTabsOf(event('ru/32', { registrationUrl: 'https://example.com' }), labels)).toEqual([]);
  });
});
