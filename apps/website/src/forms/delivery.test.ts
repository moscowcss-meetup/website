import { describe, expect, it, vi } from 'vitest';
import { createKeyKeeper, fetchCurrentEvent, outcomeOf, submitForm } from './delivery';

const json = (status: number, body: unknown = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const bases = ['https://cf.test', 'https://direct.test'] as const;
const keyOf = (call: unknown[]) => ((call[1] as RequestInit).headers as Record<string, string>)['idempotency-key'];

describe('outcomeOf', () => {
  it('разбирает коды контракта', async () => {
    expect(await outcomeOf(json(201, { id: 'a' }))).toEqual({ kind: 'accepted', duplicate: false });
    expect(await outcomeOf(json(200, { id: 'a', duplicate: true }))).toEqual({ kind: 'accepted', duplicate: true });
    expect(await outcomeOf(json(202, { ok: true }))).toEqual({ kind: 'accepted', duplicate: false });
    expect(await outcomeOf(json(422, { error: 'validation', fields: { title: 'Слишком длинное', bad: 5 } }))).toEqual({
      kind: 'validation',
      fields: { title: 'Слишком длинное' },
    });
    expect(await outcomeOf(json(429, { error: 'rate_limited' }))).toEqual({ kind: 'rate_limited' });
    expect(await outcomeOf(json(403, { error: 'captcha_failed' }))).toEqual({ kind: 'captcha_failed' });
    expect(await outcomeOf(json(403, { error: 'blocked' }))).toEqual({ kind: 'blocked' });
    expect(await outcomeOf(json(400))).toEqual({ kind: 'rejected' });
    expect(await outcomeOf(json(503))).toBeUndefined();
  });

  it('переживает тело, которое не JSON', async () => {
    expect(await outcomeOf(new Response('oops', { status: 422 }))).toEqual({ kind: 'validation', fields: {} });
  });
});

describe('submitForm', () => {
  it('отправляет на первый адрес один раз и с ключом', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(json(201, { id: 'x' }));
    const outcome = await submitForm('cfp', { a: 1 }, 'key-1', { bases, fetchImpl });
    expect(outcome).toEqual({ kind: 'accepted', duplicate: false });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://cf.test/forms/cfp');
    expect(init.method).toBe('POST');
    expect(keyOf(fetchImpl.mock.calls[0] as unknown[])).toBe('key-1');
    expect(init.body).toBe('{"a":1}');
  });

  it.each([
    ['сетевая ошибка', () => Promise.reject(new TypeError('network'))],
    ['5xx', () => Promise.resolve(json(502))],
    ['таймаут', () => Promise.reject(new DOMException('timeout', 'TimeoutError'))],
  ])('при %s повторяет на прямом адресе с тем же ключом', async (_name, first) => {
    const fetchImpl = vi.fn().mockImplementationOnce(first).mockResolvedValueOnce(json(201, { id: 'x' }));
    const outcome = await submitForm('feedback', {}, 'same-key', { bases, fetchImpl });
    expect(outcome).toEqual({ kind: 'accepted', duplicate: false });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(fetchImpl.mock.calls.map((call) => keyOf(call as unknown[]))).toEqual(['same-key', 'same-key']);
    expect((fetchImpl.mock.calls[1] as [string])[0]).toBe('https://direct.test/forms/feedback');
  });

  it.each([400, 403, 422, 429])('не повторяет ответ %i', async (status) => {
    const fetchImpl = vi.fn().mockResolvedValue(json(status, { error: 'x' }));
    await submitForm('question', {}, 'k', { bases, fetchImpl });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('когда не ответил ни один адрес, возвращает unavailable', async () => {
    const down = vi.fn().mockRejectedValue(new TypeError('network'));
    expect(await submitForm('cfp', {}, 'k', { bases, fetchImpl: down })).toEqual({ kind: 'unavailable' });
    expect(down).toHaveBeenCalledTimes(2);
    const failing = vi.fn().mockResolvedValue(json(500));
    expect(await submitForm('cfp', {}, 'k', { bases, fetchImpl: failing })).toEqual({ kind: 'unavailable' });
  });
});

describe('fetchCurrentEvent', () => {
  // Так отвечает бот: id — числа из базы
  const event = {
    id: 1,
    title: 'Митап',
    startsAt: '2026-12-01T15:00:00.000Z',
    venue: 'Офис',
    speakers: [{ id: 3, name: 'Анна', talkTitle: 'Grid' }],
  };

  it('возвращает митап с id строками для DOM', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(json(200, event));
    expect(await fetchCurrentEvent({ bases, fetchImpl })).toEqual({
      kind: 'found',
      event: { ...event, id: '1', speakers: [{ id: '3', name: 'Анна', talkTitle: 'Grid' }] },
    });
  });

  it('404 — митапа нет, без повтора', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(json(404));
    expect(await fetchCurrentEvent({ bases, fetchImpl })).toEqual({ kind: 'none' });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('5xx на первом адресе берёт ответ второго', async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(json(500)).mockResolvedValueOnce(json(200, event));
    expect(await fetchCurrentEvent({ bases, fetchImpl })).toMatchObject({ kind: 'found' });
  });

  it('ответ не по контракту — unavailable', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(json(200, { id: 1 }));
    expect(await fetchCurrentEvent({ bases, fetchImpl })).toEqual({ kind: 'unavailable' });
    const stringIds = vi.fn().mockResolvedValue(json(200, { ...event, id: 'e1' }));
    expect(await fetchCurrentEvent({ bases, fetchImpl: stringIds })).toEqual({ kind: 'unavailable' });
  });
});

describe('createKeyKeeper', () => {
  it('держит ключ при повторе того же содержимого и меняет при правке', () => {
    let n = 0;
    const keeper = createKeyKeeper(() => `k${(n += 1)}`);
    expect(keeper.keyFor({ a: 1 })).toBe('k1');
    expect(keeper.keyFor({ a: 1 })).toBe('k1');
    expect(keeper.keyFor({ a: 2 })).toBe('k2');
    keeper.reset();
    expect(keeper.keyFor({ a: 2 })).toBe('k3');
  });
});
