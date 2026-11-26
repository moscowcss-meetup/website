import { describe, expect, it } from 'vitest';
import { cfpBody, feedbackBody, normalizeFieldKey, questionBody, validateCfp, validateFeedback, validateQuestion } from './payload';

describe('cfp', () => {
  it('требует контакт, название и согласие', () => {
    expect(validateCfp({})).toEqual({ contact: 'required', title: 'required', consent: 'required' });
    expect(validateCfp({ contact: ' @a ', title: 'T', consent: 'true' })).toEqual({});
  });

  it('отвергает чужие значения списков', () => {
    expect(validateCfp({ contact: 'a', title: 'T', consent: 'true', format: 'poem' })).toEqual({ format: 'invalid' });
  });

  it('не отправляет пустые необязательные поля и всегда кладёт пустую приманку', () => {
    expect(cfpBody({ contact: ' @a ', title: ' T ', theses: '  ', consent: 'true', format: 'talk' })).toEqual({
      contact: '@a',
      title: 'T',
      theses: undefined,
      format: 'talk',
      readiness: undefined,
      comment: undefined,
      consent: true,
      website: '',
    });
  });
});

describe('feedback', () => {
  const speakers = [
    { speakerId: '1', rating: '5', comment: ' супер ' },
    { speakerId: '2', rating: undefined, comment: '' },
  ];

  it('оценка площадки обязательна только очно', () => {
    const base = { eventId: '7', attendance: 'online', eventRating: '4' };
    expect(validateFeedback(base, [])).toEqual({});
    expect(validateFeedback({ ...base, attendance: 'offline' }, [])).toEqual({ venueRating: 'required' });
  });

  it('требует оценку каждого докладчика', () => {
    expect(validateFeedback({ eventId: '7', attendance: 'online', eventRating: '4' }, speakers)).toEqual({ 'speakers.1.rating': 'required' });
  });

  it('у онлайн-зрителя блока площадки в запросе нет, даже если он был заполнен раньше', () => {
    const body = feedbackBody({ eventId: '7', attendance: 'online', eventRating: '4', venueRating: '3', venueComment: 'x' }, speakers);
    expect(body.venueRating).toBeUndefined();
    expect(body.venueComment).toBeUndefined();
    expect(body.speakers).toEqual([
      { speakerId: 1, rating: 5, comment: 'супер' },
      { speakerId: 2, rating: undefined, comment: undefined },
    ]);
  });

  it('очно блок площадки уходит', () => {
    const body = feedbackBody({ eventId: '7', attendance: 'offline', eventRating: '4', venueRating: '3', venueComment: ' ок ' }, []);
    expect(body).toMatchObject({ attendance: 'offline', eventRating: 4, venueRating: 3, venueComment: 'ок' });
  });
});

describe('question', () => {
  it('докладчика требуют только при вопросе докладчику', () => {
    expect(validateQuestion({ target: 'organizers', text: 'Привет' })).toEqual({});
    expect(validateQuestion({ target: 'speaker', text: 'Привет' })).toEqual({ speakerId: 'required' });
    expect(validateQuestion({})).toEqual({ target: 'required', text: 'required' });
  });

  it('вопрос организаторам не несёт митап и докладчика', () => {
    expect(questionBody({ target: 'organizers', speakerId: '1', text: 'Привет' }, '7')).toMatchObject({ eventId: undefined, speakerId: undefined });
    expect(questionBody({ target: 'speaker', speakerId: '1', text: 'Привет', contact: ' ' }, '7')).toMatchObject({
      eventId: 7,
      speakerId: 1,
      contact: undefined,
    });
  });
});

describe('normalizeFieldKey', () => {
  it('приводит индексы к точкам', () => {
    expect(normalizeFieldKey('speakers[0].rating')).toBe('speakers.0.rating');
    expect(normalizeFieldKey('speakers.0.rating')).toBe('speakers.0.rating');
    expect(normalizeFieldKey('title')).toBe('title');
  });
});
