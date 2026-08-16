import { describe, expect, it } from 'vitest';
import { formatClock, pad } from './format';

describe('pad', () => {
  it('preenche até a largura pedida', () => {
    expect(pad(7)).toBe('007');
    expect(pad(42)).toBe('042');
    expect(pad(300)).toBe('300');
    expect(pad(7, 4)).toBe('0007');
    expect(pad(9, 2)).toBe('09');
  });

  it('não corta números maiores que a largura', () => {
    expect(pad(1234, 3)).toBe('1234');
  });

  it('trunca fração e trata negativo como zero', () => {
    expect(pad(12.9)).toBe('012');
    expect(pad(-5)).toBe('000');
  });
});

describe('formatClock', () => {
  it('formata segundos como T+MM:SS', () => {
    expect(formatClock(0)).toBe('T+00:00');
    expect(formatClock(9)).toBe('T+00:09');
    expect(formatClock(84)).toBe('T+01:24');
    expect(formatClock(600)).toBe('T+10:00');
  });

  it('descarta a fração de segundo', () => {
    expect(formatClock(59.99)).toBe('T+00:59');
  });

  it('trata tempo negativo como zero', () => {
    expect(formatClock(-3)).toBe('T+00:00');
  });

  it('satura em T+99:59 em vez de estourar a largura', () => {
    expect(formatClock(99 * 60 + 59)).toBe('T+99:59');
    expect(formatClock(500_000)).toBe('T+99:59');
  });
});
