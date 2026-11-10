import { describe, expect, it } from 'vitest';
import { heightFromMessage, themeForForm } from './networkly';

describe('heightFromMessage', () => {
  it('берёт высоту из ответа формы и округляет вверх', () => {
    expect(heightFromMessage({ command: 'networkly:registration:height', height: 812.2 })).toBe(813);
  });

  it('пропускает чужие команды и битую высоту', () => {
    expect(heightFromMessage({ command: 'networkly:registration:escape' })).toBeUndefined();
    expect(heightFromMessage({ command: 'networkly:registration:height', height: 0 })).toBeUndefined();
    expect(heightFromMessage({ command: 'networkly:registration:height', height: -5 })).toBeUndefined();
    expect(heightFromMessage({ command: 'networkly:registration:height', height: Number.NaN })).toBeUndefined();
    expect(heightFromMessage({ command: 'networkly:registration:height', height: '500' })).toBeUndefined();
    expect(heightFromMessage('networkly:registration:height')).toBeUndefined();
    expect(heightFromMessage(null)).toBeUndefined();
  });
});

describe('themeForForm', () => {
  it('явная тема сайта уходит в форму, без выбора — auto', () => {
    expect(themeForForm('light')).toBe('light');
    expect(themeForForm('dark')).toBe('dark');
    expect(themeForForm(undefined)).toBe('auto');
    expect(themeForForm('sepia')).toBe('auto');
  });
});
