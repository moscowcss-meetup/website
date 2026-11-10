import type { EventEntry } from './catalog';

export interface RegistrationTabData {
  label: string;
  fallbackHref: string;
  fallbackLabel: string;
  networkly?: { src: string; title: string };
  timepad?: { event: number; customized: number };
}

export interface RegistrationLabels {
  networkly: string;
  networklyFrame: string;
  networklyFallback: string;
  timepad: string;
  timepadFallback: string;
}

/**
 * Вкладки окна регистрации: Networkly первой, Timepad второй, только те, у которых есть форма. Запасная
 * ссылка ведёт на страницу события на площадке, а без неё — на саму форму.
 */
export function registrationTabsOf(event: EventEntry, labels: RegistrationLabels): RegistrationTabData[] {
  const { networklyFormUrl, networklyUrl, timepadWidget, registrationUrl } = event.data;
  const tabs: RegistrationTabData[] = [];
  if (networklyFormUrl) {
    tabs.push({
      label: labels.networkly,
      networkly: { src: networklyFormUrl, title: labels.networklyFrame },
      fallbackHref: networklyUrl ?? networklyFormUrl,
      fallbackLabel: labels.networklyFallback,
    });
  }
  if (timepadWidget) {
    tabs.push({
      label: labels.timepad,
      timepad: timepadWidget,
      fallbackHref: registrationUrl ?? `https://timepad.ru/event/${timepadWidget.event}/`,
      fallbackLabel: labels.timepadFallback,
    });
  }
  return tabs;
}
