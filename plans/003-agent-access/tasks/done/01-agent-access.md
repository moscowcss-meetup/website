---
id: "01"
title: agent-access
spec: "003"
criteria: ["AC-1", "AC-2", "AC-3", "AC-4", "AC-5", "AC-6", "AC-7", "AC-8", "AC-9"]
status: done
depends_on: []
owns: ["apps/website/src/agents/**", "apps/website/src/pages/**", "apps/website/src/seo/**", "apps/website/src/layouts/**", "apps/website/scripts/**", "packages/content/src/documents/**", ".github/workflows/deploy.yml"]
model: opus
risk: contract
attempts: 0
---

## Goal
Агент читает css.moscow без браузера: Markdown-версии страниц, `llms.txt`, skill, ARD-каталог, `robots.txt` с сигналами, страницы «О сообществе» и «Контакты», WebMCP.

## Context
- Выполнено одним заходом в `001f279` (PR moscowcss-meetup/website#7) и `d38d73d` (#8, `llms-full.txt` и `/privacy/`); очередь задач оформлена задним числом, чтобы статус спеки сходился с фактами.

## Steps
1. Markdown-версии и ссылки на них, `llms.txt` и `llms-full.txt`.
2. Skill, ARD, `robots.txt`, JSON-LD `Organization`, документы `about`, `contact`, `privacy`.
3. WebMCP и проверки `check:seo`.

## Done when
- [x] `pnpm build && pnpm --filter website check:seo` зелёные, у каждой страницы `index.md`: AC-1.
- [x] Тесты `markdown.test.ts`, `discovery.test.ts`, `jsonld.test.ts`, `webmcp.test.ts` зелёные: AC-2, AC-3, AC-4, AC-5, AC-7, AC-8.
- [x] `dist/about/index.html` и английская версия собраны (контакты — раздел страницы), в `<head>` — `rel="privacy-policy"`: AC-6.
- [x] `pnpm lint`, `pnpm test`, `pnpm build`, `build:storybook` зелёные, `curl` по живому сайту отдаёт файлы: AC-9.

## Must not
- имитировать заголовки ответа мета-тегами или класть пустые файлы ради баллов сканера.
