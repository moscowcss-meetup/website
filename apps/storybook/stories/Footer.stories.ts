import Footer from '@moscowcss/ui/components/Footer';

export default {
  title: 'Components/Footer',
  component: Footer,
  parameters: { layout: 'fullscreen' },
};

const args = {
  homeHref: '/',
  homeLabel: 'Moscow CSS: на главную',
  links: [
    { href: '/privacy/', label: 'Политика и правила' },
    { href: 'https://t.me/moscowcss', label: 'Telegram', external: true },
  ],
  copyright: '© 2015–2026 Moscow CSS',
};

/** Знак, ссылки по центру и копирайт в одну строку; ниже планшета ссылки уходят второй строкой. */
export const Default = { args };

export const Narrow = {
  args,
  globals: { viewport: { value: 'mobile1', isRotated: false } },
};
