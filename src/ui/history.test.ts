import { describe, expect, it } from 'vitest';
import type { EntityType } from '../core/rules';
import {
  formatSetup,
  HISTORY_LIMIT,
  pushMatch,
  type MatchRecord,
} from './history';

const match = (winner: EntityType, elapsed = 60): Omit<MatchRecord, 'number'> => ({
  winner,
  elapsed,
  conversions: 100,
  setup: { paper: 30, rock: 30, scissors: 30 },
});

describe('pushMatch', () => {
  it('coloca a partida mais recente no topo', () => {
    let history = pushMatch([], match('rock'));
    history = pushMatch(history, match('paper'));

    expect(history[0].winner).toBe('paper');
    expect(history[1].winner).toBe('rock');
  });

  it('numera na ordem em que as partidas aconteceram', () => {
    let history: MatchRecord[] = [];
    for (let i = 0; i < 4; i++) history = pushMatch(history, match('rock'));

    expect(history.map((record) => record.number)).toEqual([4, 3, 2, 1]);
  });

  it('guarda no máximo seis partidas', () => {
    let history: MatchRecord[] = [];
    for (let i = 0; i < 20; i++) history = pushMatch(history, match('rock'));

    expect(history).toHaveLength(HISTORY_LIMIT);
  });

  it('continua numerando depois que partidas saem da janela', () => {
    let history: MatchRecord[] = [];
    for (let i = 0; i < 20; i++) history = pushMatch(history, match('rock'));

    // A vigésima partida é a #20, mesmo com só seis na lista.
    expect(history[0].number).toBe(20);
    expect(history[5].number).toBe(15);
  });

  it('não muta o histórico recebido', () => {
    const history = pushMatch([], match('rock'));
    pushMatch(history, match('paper'));

    expect(history).toHaveLength(1);
    expect(history[0].winner).toBe('rock');
  });

  it('preserva os dados da partida', () => {
    const history = pushMatch([], {
      winner: 'scissors',
      elapsed: 84.5,
      conversions: 1424,
      setup: { paper: 20, rock: 45, scissors: 10 },
    });

    expect(history[0]).toEqual({
      number: 1,
      winner: 'scissors',
      elapsed: 84.5,
      conversions: 1424,
      setup: { paper: 20, rock: 45, scissors: 10 },
    });
  });
});

describe('formatSetup', () => {
  it('usa a ordem visual papel/pedra/tesoura', () => {
    expect(formatSetup({ paper: 20, rock: 45, scissors: 10 })).toBe('20/45/10');
  });

  it('não preenche com zeros', () => {
    expect(formatSetup({ paper: 5, rock: 5, scissors: 5 })).toBe('5/5/5');
  });
});
