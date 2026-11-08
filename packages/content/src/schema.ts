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

// Ролик в VK Видео: проверяем хост, чтобы сюда по ошибке не попала ссылка на YouTube.
const VK_VIDEO_HOSTS = new Set(["vk.com", "vk.ru", "vkvideo.ru"]);
const vkVideoUrl = url.refine(
  (value) => VK_VIDEO_HOSTS.has(new URL(value).hostname.replace(/^(www|m)\./, "")),
  "нужна ссылка на VK Видео: vk.com, vk.ru или vkvideo.ru",
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

// Времени нет, пока расписание будущего митапа не готово: порядок задаёт сам список, придумывать часы нельзя.
const ScheduleItemSchema = z.object({
  time: timeRange.optional(),
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
  // Снимки со встречи для галереи на странице митапа: файлы одинаковы в языках, описание переводится.
  gallery: z.array(z.object({ image: z.string().min(1), alt: z.string().min(1) })).default([]),
  // Перерывы и активности без спикера: у них нет своей страницы, доклады идут отдельными файлами.
  schedule: z.array(ScheduleItemSchema).default([]),
  draft: z.boolean().default(false),
});

const withMoment = <T extends { date: Date; time?: string | undefined }>(event: T): T => {
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
};

export const EventSchema = EventFields.transform(withMoment);

// `image()` доступна только в схеме-функции: с ней галерея митапа получает настоящие картинки.
export const createEventSchema = (image: ImageFunction) =>
  EventFields.extend({ gallery: z.array(z.object({ image: image(), alt: z.string().min(1) })).default([]) }).transform(withMoment);

// `image()` доступна только в схеме-функции, поэтому схема доклада — фабрика, как у спикера.
export const createTalkSchema = (image: ImageFunction) =>
  z.object({
    event: slug,
    speakers: z.array(slug).min(1),
    // Нет у архивных митапов (до 31-го), где время не сохранилось, и у будущего, пока расписание не готово.
    time: clockTime.optional(),
    title: z.string().min(1),
    slidesUrl: url.optional(),
    videoUrl: url.optional(),
    vkVideoUrl: vkVideoUrl.optional(),
    // Карточка анонса доклада; без неё страница показывает общую заглушку TBD.
    cover: image().optional(),
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
      links: z.array(z.object({ label: z.string().min(1), url })).optional(),
      // Основатель сообщества: плашка «Основатель» и свой цвет на странице спикера и у его отзыва.
      founder: z.boolean().default(false),
      draft: z.boolean().default(false),
    });

// Статус и контакты одинаковы во всех языках, текст переводится. Контакты — именованные поля,
// а не список `links` как у спикеров: подпись и порядок едины для всех карточек.
export const createOrganizerSchema = (image: ImageFunction) =>
  z
    .object({
      name: z.string().min(1),
      status: z.enum(["current", "past"]),
      // Без фото блок фото на карточке не выводится.
      photo: image().optional(),
      contacts: z
        .object({
          telegram: url
            .refine((value) => /^https:\/\/t\.me\/\w+\/?$/.test(value), {
              message: "контакт Telegram: https://t.me/<имя>",
            })
            .optional(),
          channel: url
            .refine((value) => /^https:\/\/t\.me\/\w+\/?$/.test(value), {
              message: "контакт канал Telegram: https://t.me/<имя>",
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
    });

// Кто оставил отзыв: порядок здесь — порядок кнопок фильтра на стене.
export const REVIEW_CATEGORIES = ['speaker', 'organizer', 'past-organizer', 'guest', 'partner'] as const;

// Отзыв о сообществе: тело обязательно. `photo` — портрет на стикере, `gallery` — снимки в окне отзыва.
export const createReviewSchema = (image: ImageFunction) =>
  z.object({
    name: z.string().min(1),
    category: z.enum(REVIEW_CATEGORIES),
    // Имя файла спикера: шапка окна отзыва ведёт на его страницу.
    speaker: slug.optional(),
    role: z.string().min(1).optional(),
    // Без фото сайт рисует аватар с инициалами.
    photo: image().optional(),
    gallery: z.array(z.object({ image: image(), alt: z.string().min(1) })).default([]),
    draft: z.boolean().default(false),
  });

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
    // Как оформлен блок партнёра: обычный или в цветах партнёра.
    look: z.enum(["default", "school21"]).default("default"),
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
  // Раскрывающийся список в конце документа, например примеры тем в памятке спикеру.
  topics: z
    .object({
      summary: z.string().min(1),
      items: z.array(z.string().min(1)).min(1),
    })
    .optional(),
  // Факты через слеш под заголовком и карточки контактов: с ними документ свёрстан как страница «О сообществе».
  facts: z.array(z.string().min(1)).optional(),
  contacts: z
    .object({
      lead: z.string().min(1),
      items: z
        .array(
          z.object({
            title: z.string().min(1),
            text: z.string().min(1),
            links: z.array(z.object({ label: z.string().min(1), url })).min(1),
          }),
        )
        .min(1),
    })
    .optional(),
  draft: z.boolean().default(false),
});
