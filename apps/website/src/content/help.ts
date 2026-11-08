import { localeOf, type Catalog } from './catalog';

// Режим «только онлайн» в обоих языках: у такой встречи нет площадки, только трансляция.
const ONLINE_MODES = new Set(['онлайн', 'online']);

/** Площадки, где проходили митапы языка: новые первыми, каждая один раз, без встреч только онлайн. */
export function venuesOf(events: Catalog['events'], locale: string): string[] {
  const names = events
    .filter((event) => localeOf(event) === locale && !event.data.draft)
    .filter((event) => event.data.modes.some((mode) => !ONLINE_MODES.has(mode.toLowerCase())))
    .sort((a, b) => b.data.date.getTime() - a.data.date.getTime())
    .map((event) => event.data.venue.name.trim());
  return [...new Set(names)];
}
