import NavBar from '@moscowcss/ui/components/NavBar';
import { setupNavBar } from '../../../packages/ui/src/components/NavBar/NavBar.client';
// Стили вложенной кнопки в серверном рендере Storybook сами не подключаются.
import '../../../packages/ui/src/components/Button/Button.css';

export default {
  title: 'Components/NavBar',
  component: NavBar,
  // Панель меню закреплена на весь экран: поля канваса сдвинули бы шапку относительно неё.
  parameters: { layout: 'fullscreen' },
};

const args = {
  links: [
    { href: '#registration', label: 'Регистрация' },
    { href: '#program', label: 'Программа' },
    { href: '#partners', label: 'Партнеры' },
    { href: '#address', label: 'Адрес' },
    { href: '#events', label: 'История' },
    { href: '#search', label: 'Поиск' },
  ],
  telegramHref: 'https://t.me/moscowcss',
  telegramButtonLabel: 'Канал в Telegram',
  decorOffLabel: 'Выключить пружинки',
  menuLabel: 'Меню',
  closeLabel: 'Закрыть меню',
  homeHref: '/',
  homeLabel: 'Moscow CSS: на главную',
  homeText: 'Moscow CSS',
  addressLine: 'Москва, Тверская ул., 7',
};

const setup = async ({ canvasElement }: { canvasElement: HTMLElement }) => {
  canvasElement.querySelectorAll<HTMLElement>('[data-navbar]').forEach(setupNavBar);
};

const openMenu = async ({ canvasElement }: { canvasElement: HTMLElement }) => {
  await setup({ canvasElement });
  canvasElement.querySelector<HTMLButtonElement>('[data-nav-toggle]')?.click();
};

/** Широкая шапка от 1440: пункты строкой, кнопка Telegram и строка с адресом под разделителем. */
export const Wide = {
  args,
  globals: { viewport: { value: 'desktop', isRotated: false } },
  play: setup,
};

/** Узкая шапка: логотип, язык и бургер. */
export const Narrow = {
  args,
  globals: { viewport: { value: 'mobile1', isRotated: false } },
  play: setup,
};

/** Меню открыто: крестик на месте бургера, пункты со стрелками, внизу кнопка, адрес и Telegram. */
export const MenuOpen = {
  args,
  globals: { viewport: { value: 'mobile1', isRotated: false } },
  play: openMenu,
};

/** Без адреса митапа строка показывает только Telegram. */
export const WithoutAddress = {
  args: { ...args, addressLine: undefined },
  globals: { viewport: { value: 'desktop', isRotated: false } },
  play: setup,
};
