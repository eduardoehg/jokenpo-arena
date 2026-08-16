import { describe, expect, it } from 'vitest';
import { beats, ENTITY_TYPES, winner, type EntityType } from './rules';

interface Matchup {
  a: EntityType;
  b: EntityType;
  expected: EntityType | null;
}

/** As nove combinações de confronto possíveis. */
const MATCHUPS: Matchup[] = [
  { a: 'rock', b: 'rock', expected: null },
  { a: 'rock', b: 'paper', expected: 'paper' },
  { a: 'rock', b: 'scissors', expected: 'rock' },
  { a: 'paper', b: 'rock', expected: 'paper' },
  { a: 'paper', b: 'paper', expected: null },
  { a: 'paper', b: 'scissors', expected: 'scissors' },
  { a: 'scissors', b: 'rock', expected: 'rock' },
  { a: 'scissors', b: 'paper', expected: 'scissors' },
  { a: 'scissors', b: 'scissors', expected: null },
];

describe('tabela de confrontos', () => {
  it('cobre as nove combinações, sem repetir nenhuma', () => {
    expect(MATCHUPS).toHaveLength(9);
    expect(new Set(MATCHUPS.map((m) => `${m.a}:${m.b}`)).size).toBe(9);
  });
});

describe('winner', () => {
  it.each(MATCHUPS)('$a vs $b -> $expected', ({ a, b, expected }) => {
    expect(winner(a, b)).toBe(expected);
  });
});

describe('beats', () => {
  // Verdadeiro exatamente quando o vencedor da tabela é o próprio `a`.
  // Nos empates `expected` é null, então o resultado esperado é false.
  it.each(MATCHUPS)('beats($a, $b)', ({ a, b, expected }) => {
    expect(beats(a, b)).toBe(expected === a);
  });
});

describe('propriedades das regras', () => {
  it('nenhum tipo vence a si mesmo', () => {
    for (const type of ENTITY_TYPES) {
      expect(beats(type, type)).toBe(false);
      expect(winner(type, type)).toBeNull();
    }
  });

  it('cada tipo vence exatamente um e perde para exatamente um', () => {
    for (const type of ENTITY_TYPES) {
      expect(ENTITY_TYPES.filter((other) => beats(type, other))).toHaveLength(1);
      expect(ENTITY_TYPES.filter((other) => beats(other, type))).toHaveLength(1);
    }
  });

  it('é antissimétrico: se a vence b, então b não vence a', () => {
    for (const a of ENTITY_TYPES) {
      for (const b of ENTITY_TYPES) {
        if (beats(a, b)) expect(beats(b, a)).toBe(false);
      }
    }
  });

  it('winner é comutativo: a ordem dos argumentos não muda o vencedor', () => {
    for (const a of ENTITY_TYPES) {
      for (const b of ENTITY_TYPES) {
        expect(winner(a, b)).toBe(winner(b, a));
      }
    }
  });

  it('winner devolve um dos dois tipos, ou null no empate', () => {
    for (const a of ENTITY_TYPES) {
      for (const b of ENTITY_TYPES) {
        const result = winner(a, b);
        if (a === b) expect(result).toBeNull();
        else expect([a, b]).toContain(result);
      }
    }
  });
});
