import RegistrationDialog from '@moscowcss/ui/components/RegistrationDialog';

// Окно модальное: в стори оно открыто сразу, чтобы было видно вкладки и состояние загрузки.
export default {
  title: 'Components/RegistrationDialog',
  component: RegistrationDialog,
};

const labels = {
  heading: 'Регистрация на митап',
  closeLabel: 'Закрыть регистрацию',
  tabsLabel: 'Где зарегистрироваться',
  loadingLabel: 'Форма загружается…',
  failedLabel: 'Форма не загрузилась.',
};

export const Default = {
  args: {
    ...labels,
    open: true,
    tabs: [
      {
        label: 'Networkly',
        fallbackHref: 'https://networkly.app/event/7143',
        fallbackLabel: 'Не открывается форма? Зарегистрируйтесь на сайте Networkly',
      },
      {
        label: 'Timepad',
        fallbackHref: 'https://moscowcss.timepad.ru/event/4291445/',
        fallbackLabel: 'Не открывается форма? Зарегистрируйтесь на сайте Timepad',
      },
    ],
  },
};

export const SingleTab = {
  args: {
    ...labels,
    open: true,
    tabs: [
      {
        label: 'Timepad',
        fallbackHref: 'https://moscowcss.timepad.ru/event/4291445/',
        fallbackLabel: 'Не открывается форма? Зарегистрируйтесь на сайте Timepad',
      },
    ],
  },
};
