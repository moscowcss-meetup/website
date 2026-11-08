import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadArchive, moscowToday, parseEntry, renderMeetups, renderTalks, writeReport, youtubeId, youtubeState } from './content-report.mjs';

const REC = 'https://www.youtube.com/watch?v=meetup18';

describe('youtubeId', () => {
  it('watch, youtu.be, live и чужой хост', () => {
    expect(youtubeId('https://www.youtube.com/watch?v=abc&t=10s')).toBe('abc');
    expect(youtubeId('https://youtu.be/abc')).toBe('abc');
    expect(youtubeId('https://www.youtube.com/live/abc')).toBe('abc');
    expect(youtubeId('https://vkvideo.ru/video-1_2')).toBeUndefined();
    expect(youtubeId(undefined)).toBeUndefined();
  });
});

describe('youtubeState', () => {
  const recorded = { recordingUrl: REC };
  it('отдельный ролик, таймкод и вся запись онлайн-встречи различаются', () => {
    expect(youtubeState({ videoUrl: 'https://youtu.be/own' }, recorded)).toBe('cut');
    expect(youtubeState({ videoUrl: `${REC}&t=1000s` }, recorded)).toBe('timecode');
    expect(youtubeState({ videoUrl: REC }, recorded)).toBe('whole');
  });
  it('без ролика: запись митапа на YouTube, в другом месте или ничего', () => {
    expect(youtubeState({}, recorded)).toBe('meetup');
    expect(youtubeState({}, { recordingUrl: 'https://vkvideo.ru/video-1_2' })).toBe('elsewhere');
    expect(youtubeState({}, {})).toBe('none');
  });
});

describe('moscowToday', () => {
  it('день по Москве, а не по UTC', () => {
    expect(moscowToday(new Date('2026-07-08T22:30:00Z'))).toBe('2026-07-09');
  });
});

describe('parseEntry', () => {
  it('frontmatter с CRLF и тело', () => {
    expect(parseEntry('---\r\ntitle: "Доклад"\r\n---\r\n\r\nТекст\r\n')).toEqual({ data: { title: 'Доклад' }, body: 'Текст' });
  });
  it('без frontmatter — ошибка', () => {
    expect(() => parseEntry('Текст')).toThrow('frontmatter');
  });
});

describe('отчёт по папке контента', () => {
  let dir;
  const put = (path, text) => {
    mkdirSync(join(dir, path, '..'), { recursive: true });
    writeFileSync(join(dir, path), text);
  };

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'content-report-'));
    put('src/events/ru/18.md', `---\ndate: 2022-09-22\nrecordingUrl: "${REC}"\nphotosUrl: "https://vk.com/album-1_2"\ngallery:\n  - image: ../assets/18-1.jpg\n    alt: "Сцена"\n---\n`);
    put('src/events/ru/19.md', '---\ndate: "2022-12-20"\nphotosUrl: "https://disk.yandex.ru/d/x"\n---\n');
    put('src/events/ru/40.md', '---\ndate: 2030-01-01\n---\n');
    put('src/events/ru/41.md', '---\ndate: 2020-01-01\ndraft: true\n---\n');
    put('src/speakers/ru/anna.md', '---\nname: "Анна | Блок"\n---\n');
    put('src/talks/ru/units.md', `---\nevent: "18"\nspeakers:\n  - anna\ntitle: "Единицы"\nvideoUrl: "${REC}&t=1530s"\nvkVideoUrl: "https://vkvideo.ru/video-1_2"\n---\n\nО единицах.\n`);
    put('src/talks/en/units.md', '---\nevent: "18"\n---\n\nAbout units.\n');
    put('src/talks/ru/future.md', '---\nevent: "40"\nspeakers:\n  - anna\ntitle: "Будущее"\n---\n\nТекст.\n');
    put('src/talks/en/future.md', '---\nevent: "40"\n---\n\nText.\n');
    put('todo/issues.json', '{ "18": 36 }');
  });

  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('пропускает черновики и будущие митапы; дата в кавычках и без читается одинаково', () => {
    const { events, talks } = loadArchive(join(dir, 'src'), '2026-11-08');
    expect(events.map((event) => [event.slug, event.date, event.gallery])).toEqual([
      ['18', '2022-09-22', 1],
      ['19', '2022-12-20', 0],
    ]);
    expect(talks.map((talk) => [talk.slug, talk.speakers, talk.described])).toEqual([['units', ['Анна | Блок'], true]]);
  });

  it('пишет обе таблицы со ссылкой на задачу и экранирует | в ячейке', () => {
    writeReport({ dirs: { content: join(dir, 'src'), todo: join(dir, 'todo') }, today: '2026-11-08' });
    const meetups = readFileSync(join(dir, 'todo/meetups.md'), 'utf8');
    const talks = readFileSync(join(dir, 'todo/talks.md'), 'utf8');
    expect(meetups).toContain('pnpm report:content` 2026-11-08');
    expect(meetups).toContain('✅ [альбом](https://vk.com/album-1_2) | ❌ |');
    expect(meetups).toContain('[#36](https://github.com/moscowcss-meetup/website/issues/36)');
    expect(meetups).toContain('Альбом ВК: 1, Яндекс Диск: 1, без альбома: 0.');
    expect(talks).toContain('Анна \\| Блок');
    expect(talks).toContain('🟡 таймкод в записи митапа');
    expect(talks).toContain('✅ [VK](https://vkvideo.ru/video-1_2)');
    expect(talks).toContain('- VK Видео: 1.');
  });

  it('без issues.json задача — прочерк', () => {
    const archive = loadArchive(join(dir, 'src'), '2026-11-08');
    expect(renderMeetups({ ...archive, issues: {}, today: '2026-11-08' })).toContain('| ❌ | ✅ [YouTube]');
    expect(renderTalks({ ...archive, issues: {}, today: '2026-11-08' })).toContain('задача —');
  });
});
