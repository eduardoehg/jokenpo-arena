import { describe, expect, it } from 'vitest';
import {
  formatSeed,
  MAX_SEED,
  mulberry32,
  parseSeed,
  randomSeed,
  toSeed,
} from './rng';

const draw = (seed: number, count: number): number[] => {
  const rng = mulberry32(seed);
  return Array.from({ length: count }, () => rng());
};

describe('mulberry32 — determinismo', () => {
  it('a mesma seed produz sempre a mesma sequência', () => {
    expect(draw(12345, 50)).toEqual(draw(12345, 50));
  });

  it('seeds diferentes produzem sequências diferentes', () => {
    expect(draw(1, 20)).not.toEqual(draw(2, 20));
  });

  it('sequências de seeds vizinhas não se parecem', () => {
    // Um gerador ruim faria seeds adjacentes começarem com valores próximos, e
    // partidas compartilhadas por links vizinhos ficariam quase idênticas.
    const a = draw(1000, 1)[0];
    const b = draw(1001, 1)[0];

    expect(Math.abs(a - b)).toBeGreaterThan(0.01);
  });

  it('duas instâncias da mesma seed avançam em paralelo', () => {
    const first = mulberry32(7);
    const second = mulberry32(7);

    for (let i = 0; i < 10; i++) expect(first()).toBe(second());
  });
});

describe('mulberry32 — distribuição', () => {
  const sample = draw(2024, 20_000);

  it('fica sempre dentro de [0, 1)', () => {
    for (const value of sample) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('tem média próxima de 0,5', () => {
    const mean = sample.reduce((sum, value) => sum + value, 0) / sample.length;

    expect(mean).toBeGreaterThan(0.48);
    expect(mean).toBeLessThan(0.52);
  });

  it('preenche os dez decis de forma equilibrada', () => {
    const buckets = new Array<number>(10).fill(0);
    for (const value of sample) buckets[Math.floor(value * 10)]++;

    // Esperado 2000 por decil; ±25% é folgado o bastante para não gerar
    // teste instável e apertado o bastante para pegar viés real.
    for (const count of buckets) {
      expect(count).toBeGreaterThan(1500);
      expect(count).toBeLessThan(2500);
    }
  });

  it('não repete valores em série curta', () => {
    expect(new Set(draw(99, 1000)).size).toBe(1000);
  });

  it('funciona com seed zero', () => {
    expect(draw(0, 5)).toHaveLength(5);
    expect(new Set(draw(0, 5)).size).toBe(5);
  });
});

describe('toSeed', () => {
  it('mantém seeds já válidas', () => {
    expect(toSeed(0)).toBe(0);
    expect(toSeed(42)).toBe(42);
    expect(toSeed(MAX_SEED)).toBe(MAX_SEED);
  });

  it('normaliza fração, negativo e estouro', () => {
    expect(toSeed(42.9)).toBe(42);
    expect(toSeed(-42)).toBe(42);
    expect(toSeed(MAX_SEED + 2)).toBe(1);
  });
});

describe('randomSeed', () => {
  it('devolve sempre uma seed válida', () => {
    for (let i = 0; i < 200; i++) {
      const seed = randomSeed();

      expect(Number.isInteger(seed)).toBe(true);
      expect(seed).toBeGreaterThanOrEqual(0);
      expect(seed).toBeLessThanOrEqual(MAX_SEED);
    }
  });

  it('não repete na prática', () => {
    const seeds = new Set(Array.from({ length: 500 }, randomSeed));

    expect(seeds.size).toBeGreaterThan(495);
  });
});

describe('formatSeed e parseSeed', () => {
  it('fazem a volta completa sem perder informação', () => {
    for (const seed of [0, 1, 42, 999_999, MAX_SEED, 3_735_928_559]) {
      expect(parseSeed(formatSeed(seed))).toBe(seed);
    }
  });

  it('fecha o ciclo para seeds sorteadas', () => {
    for (let i = 0; i < 200; i++) {
      const seed = randomSeed();
      expect(parseSeed(formatSeed(seed))).toBe(seed);
    }
  });

  it('produz texto curto o bastante para caber numa URL', () => {
    expect(formatSeed(MAX_SEED).length).toBeLessThanOrEqual(7);
  });

  it('aceita maiúsculas e espaços em volta', () => {
    const text = formatSeed(123_456).toUpperCase();

    expect(parseSeed(`  ${text}  `)).toBe(123_456);
  });

  it('rejeita texto que não é seed', () => {
    for (const invalid of ['', '  ', 'abc-def', 'zzzzzzzz', '!!', '1.5', '-1']) {
      expect(parseSeed(invalid)).toBeNull();
    }
  });

  it('rejeita valor acima do limite de 32 bits', () => {
    expect(parseSeed((MAX_SEED + 1).toString(36))).toBeNull();
  });
});
