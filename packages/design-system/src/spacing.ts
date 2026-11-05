import { space, type SpaceStep } from './scale';

// Пространственный масштаб (t-shirt, значения в scale.ts) — один набор ступеней для двух
// семантических групп: `padding` (внутренние отступы) и `spacing` (промежутки между
// элементами, gap/margin). Ступени постоянны на всех ширинах; растущие величины — это
// `layout.inset` и `layout.gap`. Радиусы — отдельная ось.
const scaleKeys = () =>
  Object.fromEntries(Object.keys(space).map((k) => [k, null])) as Record<SpaceStep, null>;

const contract = {
  padding: scaleKeys(),
  spacing: scaleKeys(),
  radius: {
    small: null,
    medium: null,
    large: null,
  },
  size: {
    burgerIcon: null,
    mapDialogWidth: null,
    mapDialogMinHeight: null,
    cardPaddingBlock: null,
    cardSliderArrow: null,
    speakerAvatar: null,
    speakerAvatarLaptop: null,
    programTimeColumn: null,
    programTitleColumnMin: null,
    programTitleColumnMax: null,
    programDescriptionColumnMin: null,
    partnerQrCodeWidth: null,
    partnerLogoWidth: null,
    partnerLogoHeight: null,
    partnerLogoOffsetTop: null,
    programHintMaxWidth: null,
    hitTarget: null,
    decorCheckbox: null,
    sliderHeadWidth: null,
    organizerPhoto: null,
    organizerPadding: null,
    archiveCardMin: null,
    archiveFieldMin: null,
    archivePhoto: null,
    archiveControl: null,
  },
} as const;

// От темы не зависят — задаются один раз (тема отвечает только за цвет).
const values = {
  padding: { ...space },
  spacing: { ...space },
  radius: {
    small: '0.25rem', // 4px
    medium: '0.5rem', // 8px
    large: '0.625rem', // 10px
  },
  size: {
    burgerIcon: '1.5rem', // 24px
    mapDialogWidth: '60rem', // 960px
    mapDialogMinHeight: '16rem', // 256px
    cardPaddingBlock: '2.5rem', // 40px
    cardSliderArrow: '3.9375rem', // 63px
    speakerAvatar: '10.5rem', // 168px
    speakerAvatarLaptop: '12.5rem', // 200px
    programTimeColumn: '12.5rem', // 200px
    programTitleColumnMin: '16rem', // 256px
    programTitleColumnMax: '26rem', // 416px
    programDescriptionColumnMin: '24rem', // 384px
    partnerQrCodeWidth: '12.9375rem',
    partnerLogoWidth: '51.1875rem',
    partnerLogoHeight: '14.125rem',
    partnerLogoOffsetTop: '10.146875rem',
    programHintMaxWidth: '36rem', // 576px
    hitTarget: '2.625rem', // 42px — минимальная зона нажатия
    decorCheckbox: '1rem', // 16px
    sliderHeadWidth: '26.5625rem', // 425px
    organizerPhoto: '15.577rem', // 249.23px
    organizerPadding: '2rem', // 32px
    archiveCardMin: '17rem', // 272px — уже карточка спикера не становится
    archiveFieldMin: '16rem', // 256px — поле фильтра
    archivePhoto: '8rem', // 128px — фото в карточке спикера
    archiveControl: '2.75rem', // 44px — общая высота полей и кнопки фильтра, не меньше hitTarget
  },
};

export const spacing = { contract, values };
