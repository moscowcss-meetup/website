// Отчёт «что нужно дополнить» по архиву: фото и записи митапов, видео и слайды докладов.
//
//   pnpm report:content          → docs/todo/meetups.md и docs/todo/talks.md
//
// Читает frontmatter из packages/content/src (ru — язык-источник), черновики и будущие митапы
// пропускает. Номера задач по митапам берёт из docs/todo/issues.json, ручные разделы живут в
// docs/todo/sources.md: оба файла скрипт не трогает.

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { load as parseYaml } from 'js-yaml';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
export const DEFAULT_DIRS = {
  content: join(ROOT, 'packages/content/src'),
  todo: join(ROOT, 'docs/todo'),
};
const SITE = 'https://css.moscow';
const ISSUES = 'https://github.com/moscowcss-meetup/website/issues';

/** Сегодняшний день по Москве: митапы проходят там, и «прошедший» считается по местной дате. */
export function moscowToday(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Moscow' }).format(now);
}

// YAML читает `2026-07-09` без кавычек как Date в полночь UTC, а в кавычках — как строку.
const dayOf = (value) => (value instanceof Date ? value.toISOString().slice(0, 10) : String(value));

/** Frontmatter и тело Markdown-файла. */
export function parseEntry(source) {
  const match = source.replace(/\r\n/g, '\n').match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) throw new Error('нет frontmatter между строками ---');
  return { data: parseYaml(match[1]) ?? {}, body: match[2].trim() };
}

function readCollection(dir, collection, locale) {
  const folder = join(dir, collection, locale);
  return readdirSync(folder)
    .filter((file) => file.endsWith('.md'))
    .map((file) => ({ slug: file.slice(0, -3), ...parseEntry(readFileSync(join(folder, file), 'utf8')) }))
    .filter((entry) => !entry.data.draft);
}

/** Митапы, доклады и спикеры в том виде, который нужен отчёту. */
export function loadArchive(dir, today) {
  const events = readCollection(dir, 'events', 'ru')
    .map(({ slug, data }) => ({
      slug,
      date: dayOf(data.date),
      gallery: (data.gallery ?? []).length,
      vkPhotosUrl: data.vkPhotosUrl,
      diskPhotosUrl: data.diskPhotosUrl,
      recordingUrl: data.recordingUrl,
    }))
    .filter((event) => event.date <= today)
    .sort((a, b) => a.date.localeCompare(b.date) || a.slug.localeCompare(b.slug));
  const known = new Set(events.map((event) => event.slug));
  const speakers = new Map(readCollection(dir, 'speakers', 'ru').map(({ slug, data }) => [slug, data.name ?? slug]));
  const enBodies = new Map(readCollection(dir, 'talks', 'en').map(({ slug, body }) => [slug, body]));
  const talks = readCollection(dir, 'talks', 'ru')
    .filter(({ data }) => known.has(String(data.event)))
    .map(({ slug, data, body }) => ({
      slug,
      event: String(data.event),
      time: data.time ?? '',
      title: data.title,
      speakers: (data.speakers ?? []).map((name) => speakers.get(name) ?? name),
      videoUrl: data.videoUrl,
      vkVideoUrl: data.vkVideoUrl,
      slidesUrl: data.slidesUrl,
      described: Boolean(body) && Boolean(enBodies.get(slug)),
    }))
    .sort((a, b) => String(a.time).localeCompare(String(b.time)) || a.slug.localeCompare(b.slug));
  return { events, talks };
}

/** Идентификатор ролика YouTube из любой формы адреса, иначе undefined. */
export function youtubeId(url) {
  if (!url) return undefined;
  const { hostname, pathname, searchParams } = new URL(url);
  const host = hostname.replace(/^(www|m)\./, '');
  if (host === 'youtu.be') return pathname.slice(1) || undefined;
  if (host !== 'youtube.com') return undefined;
  return searchParams.get('v') ?? pathname.match(/^\/(?:live|embed|shorts)\/([\w-]+)/)?.[1];
}

/**
 * Что у доклада с YouTube: отдельный ролик, таймкод в записи митапа, вся запись онлайн-встречи
 * с одним докладом, только запись митапа без таймкода, запись митапа не на YouTube, ничего.
 */
export function youtubeState(talk, event) {
  const own = youtubeId(talk.videoUrl);
  const meetup = youtubeId(event.recordingUrl);
  if (talk.videoUrl && own && own === meetup) return new URL(talk.videoUrl).searchParams.has('t') ? 'timecode' : 'whole';
  if (talk.videoUrl) return 'cut';
  if (meetup) return 'meetup';
  if (event.recordingUrl) return 'elsewhere';
  return 'none';
}

const YOUTUBE_LABELS = {
  cut: '✅ отдельный ролик',
  whole: '✅ запись онлайн-встречи',
  timecode: '🟡 таймкод в записи митапа',
  meetup: '🟡 только запись митапа',
  elsewhere: '🟡 запись митапа не на YouTube',
  none: '❌',
};
const DONE = new Set(['cut', 'whole']);

const eventName = (slug) => `MoscowCSS ${slug}`;
const page = (path) => `${SITE}/${path}/`;
const cell = (text) => String(text).replace(/\|/g, '\\|');
const issueLink = (issues, slug) => (issues[slug] ? `[#${issues[slug]}](${ISSUES}/${issues[slug]})` : '—');
const generated = (today) =>
  `> Собрано командой \`pnpm report:content\` ${today}. Руками не правьте: поправьте контент и пересоберите.`;

export function renderMeetups({ events, issues, today }) {
  const count = (test) => events.filter(test).length;
  const rows = events.map((event) => {
    const recording = !event.recordingUrl
      ? '❌'
      : youtubeId(event.recordingUrl)
        ? `✅ [YouTube](${event.recordingUrl})`
        : `✅ [запись](${event.recordingUrl})`;
    return [
      `[${eventName(event.slug)}](${page(`events/${event.slug}`)})`,
      event.date,
      event.gallery ? `✅ ${event.gallery}` : '❌',
      event.vkPhotosUrl ? `✅ [альбом](${event.vkPhotosUrl})` : '❌',
      event.diskPhotosUrl ? `✅ [папка](${event.diskPhotosUrl})` : '❌',
      recording,
      issueLink(issues, event.slug),
    ].join(' | ');
  });
  return `# Митапы: фото и записи

${generated(today)}

Цель: у каждого митапа фото на странице и ссылка на альбом в ВК или на Яндекс Диске, лучше оба. Живой список дел — в задаче митапа, последний столбец.

| Митап | Дата | Фото на странице | Альбом ВК | Яндекс Диск | Полная запись | Задача |
| --- | --- | --- | --- | --- | --- | --- |
${rows.map((row) => `| ${row} |`).join('\n')}

## Итого

Прошедших митапов: ${events.length}.

- Фото на странице: ${count((event) => event.gallery > 0)}.
- Альбом ВК: ${count((event) => event.vkPhotosUrl)}, Яндекс Диск: ${count((event) => event.diskPhotosUrl)}, оба: ${count((event) => event.vkPhotosUrl && event.diskPhotosUrl)}, без альбома: ${count((event) => !event.vkPhotosUrl && !event.diskPhotosUrl)}.
- Полная запись: ${count((event) => event.recordingUrl)}, без записи: ${count((event) => !event.recordingUrl)}.
`;
}

export function renderTalks({ events, talks, issues, today }) {
  const eventOf = new Map(events.map((event) => [event.slug, event]));
  const states = talks.map((talk) => youtubeState(talk, eventOf.get(talk.event)));
  const kind = (name) => states.filter((state) => state === name).length;
  const sections = events
    .map((event) => {
      const own = talks.filter((talk) => talk.event === event.slug);
      if (!own.length) return '';
      const rows = own.map((talk) => {
        const state = youtubeState(talk, event);
        const youtube = talk.videoUrl ? `[${YOUTUBE_LABELS[state]}](${talk.videoUrl})` : YOUTUBE_LABELS[state];
        return [
          `[${cell(talk.title)}](${page(`talks/${talk.slug}`)})`,
          cell(talk.speakers.join(', ')),
          youtube,
          talk.vkVideoUrl ? `✅ [VK](${talk.vkVideoUrl})` : '❌',
          talk.slidesUrl ? `✅ [слайды](${talk.slidesUrl})` : '❌',
        ].join(' | ');
      });
      const recording = event.recordingUrl ? ` · [полная запись](${event.recordingUrl})` : '';
      return `### ${eventName(event.slug)} (${event.date})${recording} · задача ${issueLink(issues, event.slug)}

| Доклад | Спикер | YouTube | VK Видео | Слайды |
| --- | --- | --- | --- | --- |
${rows.map((row) => `| ${row} |`).join('\n')}
`;
    })
    .filter(Boolean);
  return `# Доклады: видео и слайды

${generated(today)}

Цель: у каждого доклада отдельный ролик на YouTube, отдельный ролик в VK Видео и ссылка на слайды. Где искать записи — в [sources.md](sources.md).

## Итого

Докладов на прошедших митапах: ${talks.length}.

- YouTube, отдельный ролик или запись онлайн-встречи: ${kind('cut') + kind('whole')}.
- Таймкод в записи митапа: ${kind('timecode')}. Нужен отдельный ролик.
- Только запись всего митапа: ${kind('meetup') + kind('elsewhere')} (из них не на YouTube: ${kind('elsewhere')}). Нужны таймкоды и нарезка.
- Записи нет: ${kind('none')}.
- VK Видео: ${talks.filter((talk) => talk.vkVideoUrl).length}.
- Слайды: ${talks.filter((talk) => talk.slidesUrl).length}.
- Без описания в одном из языков: ${talks.filter((talk) => !talk.described).length}.
- Всё есть (YouTube, VK, слайды): ${talks.filter((talk, i) => DONE.has(states[i]) && talk.vkVideoUrl && talk.slidesUrl).length}.

## По митапам

${sections.join('\n')}`;
}

export function writeReport({ dirs = DEFAULT_DIRS, today = moscowToday() } = {}) {
  const archive = loadArchive(dirs.content, today);
  const issuesFile = join(dirs.todo, 'issues.json');
  const issues = existsSync(issuesFile) ? JSON.parse(readFileSync(issuesFile, 'utf8')) : {};
  writeFileSync(join(dirs.todo, 'meetups.md'), renderMeetups({ ...archive, issues, today }));
  writeFileSync(join(dirs.todo, 'talks.md'), renderTalks({ ...archive, issues, today }));
  return archive;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const { events, talks } = writeReport();
  console.log(`docs/todo: митапов ${events.length}, докладов ${talks.length}`);
}
