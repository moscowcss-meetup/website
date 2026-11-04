import { z } from "astro/zod";
import type { ImageFunction } from "astro/content/config";

// Слаг — короткое имя файла без языка и расширения: `31`, `daria-egorova`.
// Связи пишутся слагом, а не полным id, чтобы их было удобно набирать с телефона.
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const slug = z
  .string()
  .regex(
    SLUG_PATTERN,
    "слаг: латиница в нижнем регистре, цифры и дефисы, например daria-egorova",
  );

const HH_MM = "(?:[01]\\d|2[0-3]):[0-5]\\d";

// Начало: `19:10`; перерыв и активность — интервал `19:40—20:00` (дефис, en- или em-dash).
const clockTime = z
  .string()
  .regex(
    new RegExp(`^${HH_MM}$`),
    "время в формате ЧЧ:ММ от 00:00 до 23:59, например 19:10",
  );
const timeRange = z
  .string()
  .regex(
    new RegExp(`^${HH_MM}(?:[—–-]${HH_MM})?$`),
    "время ЧЧ:ММ или интервал ЧЧ:ММ—ЧЧ:ММ",
  )
  .refine((value) => {
    const [start, end] = value.split(/[—–-]/);
    return end === undefined || (start ?? "") < end;
  }, "интервал должен заканчиваться позже, чем начинается");

// Только https: адрес уходит в href, а `javascript:` и `data:` там исполнились бы.
const url = z
  .string()
  .url()
  .refine(
    (value) => new URL(value).protocol === "https:",
    "ссылка должна начинаться с https://",
  );

// Митапы проходят в Москве: время пишется местным, пояс фиксирован (+03:00, в России нет
// перехода на летнее время с 2014 года). Дата и время — разные поля: YAML читает время без пояса
// как UTC молча, и после разбора уже не понять, был пояс указан или нет.
export const MOSCOW_UTC_OFFSET_HOURS = 3;
const day = z.coerce
  .date()
  .refine(
    (value) => value.getUTCHours() === 0 && value.getUTCMinutes() === 0,
    "date — только день ГГГГ-ММ-ДД; время начала пишется в поле time",
  );

export const PageSchema = z.object({
  title: z.string().min(1).max(70),
  description: z.string().min(50).max(160),
  telegramUrl: url,
  // Что падает по сайту: зимой пружинки меняются на снежинки одной строкой.
  decor: z.enum(["springs", "snow"]).default("springs"),
  // Тег вопросов спикерам: подсказка программы берёт его отсюда, а тексты FAQ сверяются с ним.
  questionTag: z
    .string()
    .regex(/^#[\p{L}\p{N}_]+$/u, "тег — решётка и буквы, цифры или _ без пробелов: #вопрос_спикеру"),
});

const ScheduleItemSchema = z.object({
  time: timeRange,
  title: z.string().min(1),
  kind: z.enum(["break", "activity"]),
});

const EventFields = z.object({
  // День митапа `2026-07-09` и начало по Москве `"18:00"`; на выходе `date` — момент начала.
  date: day,
  // Нет только у архивных митапов, чьи источники не сохранили время начала. Тогда `date` —
  // начало суток по Москве, а сайт показывает одну дату.
  time: clockTime.optional(),
  tagline: z.string().min(1),
  venue: z.object({
    name: z.string().min(1),
    // Нет только у архивных митапов: в источниках есть площадка, но не адрес.
    address: z.string().min(1).optional(),
    mapUrl: url.optional(),
    // Точка на карте-заглушке; одинакова во всех языках.
    coordinates: z
      .object({
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
        zoom: z.number().int().positive(),
      })
      .optional(),
  }),
  modes: z.array(z.string().min(1)).min(1),
  // Темы митапа для плашек в Hero. Переводятся вместе с текстом, поэтому не сверяются с `ru`.
  tags: z.array(z.string().min(1)).default([]),
  passportRequired: z.boolean(),
  registrationUrl: url.optional(),
  streamUrl: url.optional(),
  recordingUrl: url.optional(),
  // Альбом с фотографиями митапа (VK, Яндекс Диск): сами фотографии на сайт не копируются.
  photosUrl: url.optional(),
  partner: slug.optional(),
  // Перерывы и активности без спикера: у них нет своей страницы, доклады идут отдельными файлами.
  schedule: z.array(ScheduleItemSchema).default([]),
  draft: z.boolean().default(false),
});

export const EventSchema = EventFields.transform((event) => {
  const [hours = 0, minutes = 0] = (event.time ?? "00:00").split(":").map(Number);
  const { date } = event;
  return {
    ...event,
    date: new Date(
      Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate(),
        hours - MOSCOW_UTC_OFFSET_HOURS,
        minutes,
      ),
    ),
  };
});

export const TalkSchema = z.object({
  event: slug,
  speakers: z.array(slug).min(1),
  // Необязательно только потому, что у архивных митапов (до 31-го) время докладов не сохранилось.
  time: clockTime.optional(),
  title: z.string().min(1),
  slidesUrl: url.optional(),
  videoUrl: url.optional(),
  draft: z.boolean().default(false),
});

// `image()` доступна только в схеме-функции, поэтому схема спикера — фабрика.
export const createSpeakerSchema = (image: ImageFunction) =>
  z
    .object({
      name: z.string().min(1),
      // Необязательна только потому, что у спикеров первых митапов должность не сохранилась.
      role: z.string().min(1).optional(),
      // Фото необязательно: без него сайт рисует аватар с инициалами на сборке.
      photo: image().optional(),
      photoAlt: z.string().min(1).optional(),
      links: z.array(z.object({ label: z.string().min(1), url })).optional(),
      draft: z.boolean().default(false),
    })
    .refine(
      (speaker) =>
        speaker.photo === undefined || speaker.photoAlt !== undefined,
      {
        message: "у фото нужно описание photoAlt: что на нём видно",
        path: ["photoAlt"],
      },
    );

// Статус и контакты одинаковы во всех языках, текст переводится. Контакты — именованные поля,
// а не список `links` как у спикеров: подпись и порядок едины для всех карточек.
export const createOrganizerSchema = (image: ImageFunction) =>
  z
    .object({
      name: z.string().min(1),
      status: z.enum(["current", "past"]),
      // Без фото блок фото на карточке не выводится.
      photo: image().optional(),
      photoAlt: z.string().min(1).optional(),
      contacts: z
        .object({
          telegram: url
            .refine((value) => /^https:\/\/t\.me\/\w+\/?$/.test(value), {
              message: "контакт Telegram: https://t.me/<имя>",
            })
            .optional(),
          github: url
            .refine((value) => /^https:\/\/github\.com\/[\w-]+\/?$/.test(value), {
              message: "контакт GitHub: https://github.com/<имя>",
            })
            .optional(),
          website: url.optional(),
        })
        .optional(),
      draft: z.boolean().default(false),
    })
    .refine(
      (organizer) => organizer.photo === undefined || organizer.photoAlt !== undefined,
      {
        message: "у фото нужно описание photoAlt: что на нём видно",
        path: ["photoAlt"],
      },
    );

// Логотип и QR у каждого партнёра свои: логотип — файл в partners/assets, QR сайт рисует из qrUrl.
export const createPartnerSchema = (image: ImageFunction) =>
  z.object({
    name: z.string().min(1),
    handle: z.string().min(1),
    url: url.optional(),
    // Без логотипа на месте логотипа выводится название партнёра.
    logo: image().optional(),
    // Адрес, который кодирует QR-код под логотипом; без него QR не показывается.
    qrUrl: url.optional(),
    tagline: z.string().min(1),
    features: z
      .array(
        z.object({
          title: z.string().min(1),
          description: z.string().min(1),
          footnote: z.string().min(1).optional(),
        }),
      )
      .min(1),
    draft: z.boolean().default(false),
  });

export const FaqSchema = z.object({
  title: z.string().min(1),
  // Порядок карточек: меньше — левее.
  order: z.number().int().nonnegative(),
  draft: z.boolean().default(false),
});

// Служебный документ без привязки к митапам: политика обработки персональных данных.
export const DocumentSchema = z.object({
  title: z.string().min(1).max(70),
  description: z.string().min(50).max(160),
  draft: z.boolean().default(false),
});
