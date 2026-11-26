export type FormKind = 'cfp' | 'feedback' | 'question';

/** Значения полей одной формы как строки; флажок — `'true'`, а не отмеченный не попадает в запись. */
export type FieldValues = Record<string, string | undefined>;

export interface SpeakerValues {
  speakerId: string;
  rating: string | undefined;
  comment: string | undefined;
}

/** Ошибки по ключам полей; `required` — поле пустое, `invalid` — значение вне допустимого. */
export type FieldErrors = Record<string, 'required' | 'invalid'>;

const clean = (value: string | undefined): string => (value ?? '').trim();

// Пустой необязательный ответ в запрос не попадает: бот отличает «не заполнено» от пустой строки.
const optional = (value: string | undefined): string | undefined => {
  const text = clean(value);
  return text === '' ? undefined : text;
};

// Бот принимает id митапа и докладчика только целым числом
const idOf = (value: string | undefined): number | undefined => {
  const text = clean(value);
  return /^[1-9]\d*$/.test(text) ? Number(text) : undefined;
};

const RATINGS = ['1', '2', '3', '4', '5'];
const ratingOf = (value: string | undefined): number | undefined => (value !== undefined && RATINGS.includes(value) ? Number(value) : undefined);

const check = (errors: FieldErrors, key: string, value: string | undefined, allowed?: readonly string[]) => {
  const text = clean(value);
  if (text === '') errors[key] = 'required';
  else if (allowed && !allowed.includes(text)) errors[key] = 'invalid';
};

export const CFP_FORMATS = ['talk', 'standup', 'workshop', 'other'] as const;
export const CFP_READINESS = ['idea', 'theses', 'slides', 'presented'] as const;

export function validateCfp(values: FieldValues): FieldErrors {
  const errors: FieldErrors = {};
  check(errors, 'contact', values['contact']);
  check(errors, 'title', values['title']);
  if (optional(values['format']) !== undefined) check(errors, 'format', values['format'], CFP_FORMATS);
  if (optional(values['readiness']) !== undefined) check(errors, 'readiness', values['readiness'], CFP_READINESS);
  if (values['consent'] !== 'true') errors['consent'] = 'required';
  return errors;
}

export function cfpBody(values: FieldValues) {
  return {
    contact: clean(values['contact']),
    title: clean(values['title']),
    theses: optional(values['theses']),
    format: optional(values['format']),
    readiness: optional(values['readiness']),
    comment: optional(values['comment']),
    consent: values['consent'] === 'true',
    website: values['website'] ?? '',
  };
}

export const isOffline = (values: FieldValues): boolean => clean(values['attendance']) === 'offline';

export function validateFeedback(values: FieldValues, speakers: readonly SpeakerValues[]): FieldErrors {
  const errors: FieldErrors = {};
  check(errors, 'eventId', values['eventId']);
  if (!errors['eventId'] && idOf(values['eventId']) === undefined) errors['eventId'] = 'invalid';
  check(errors, 'attendance', values['attendance'], ['online', 'offline']);
  check(errors, 'eventRating', values['eventRating'], RATINGS);
  if (isOffline(values)) check(errors, 'venueRating', values['venueRating'], RATINGS);
  speakers.forEach((speaker, index) => check(errors, `speakers.${index}.rating`, speaker.rating, RATINGS));
  return errors;
}

export function feedbackBody(values: FieldValues, speakers: readonly SpeakerValues[]) {
  const offline = isOffline(values);
  return {
    eventId: idOf(values['eventId']),
    attendance: clean(values['attendance']),
    eventRating: ratingOf(values['eventRating']),
    eventComment: optional(values['eventComment']),
    // Блок площадки относится только к очному посещению: у онлайн-зрителя его в запросе нет
    venueRating: offline ? ratingOf(values['venueRating']) : undefined,
    venueComment: offline ? optional(values['venueComment']) : undefined,
    speakers: speakers.map((speaker) => ({
      speakerId: idOf(speaker.speakerId),
      rating: ratingOf(speaker.rating),
      comment: optional(speaker.comment),
    })),
    website: values['website'] ?? '',
  };
}

export function validateQuestion(values: FieldValues): FieldErrors {
  const errors: FieldErrors = {};
  check(errors, 'target', values['target'], ['speaker', 'organizers']);
  if (clean(values['target']) === 'speaker') check(errors, 'speakerId', values['speakerId']);
  check(errors, 'text', values['text']);
  return errors;
}

export function questionBody(values: FieldValues, eventId: string | undefined) {
  const toSpeaker = clean(values['target']) === 'speaker';
  return {
    target: clean(values['target']),
    eventId: toSpeaker ? idOf(eventId) : undefined,
    speakerId: toSpeaker ? idOf(values['speakerId']) : undefined,
    text: clean(values['text']),
    contact: optional(values['contact']),
    website: values['website'] ?? '',
  };
}

/** Приводит ключ поля из ответа 422 к ключу формы: `speakers[0].rating` и `speakers.0.rating` — одно и то же. */
export function normalizeFieldKey(key: string): string {
  return key.replace(/\[(\d+)\]/g, '.$1').replace(/^\./, '');
}
