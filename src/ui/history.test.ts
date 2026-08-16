import { describe, expect, it } from 'vitest';
import type { EntityType } from '../core/rules';
import {
  formatSetup,
  HISTORY_LIMIT,
  parseHistory,
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

describe('parseHistory', () => {
  const valid = (): MatchRecord => ({
    number: 3,
    winner: 'rock',
    elapsed: 84.5,
    conversions: 1424,
    setup: { paper: 20, rock: 45, scissors: 10 },
  });

  it('aceita histórico bem formado, na ordem', () => {
    const history = [valid(), { ...valid(), number: 2, winner: 'paper' as const }];

    expect(parseHistory(history)).toEqual(history);
  });

  it('faz a volta completa por JSON', () => {
    const history = [valid()];

    expect(parseHistory(JSON.parse(JSON.stringify(history)))).toEqual(history);
  });

  it('devolve vazio para qualquer coisa que não seja lista', () => {
    for (const value of [null, undefined, 42, 'texto', {}, true]) {
      expect(parseHistory(value)).toEqual([]);
    }
  });

  it('descarta só o registro estragado, preservando os bons', () => {
    const parsed = parseHistory([valid(), { winner: 'rock' }, null, valid()]);

    expect(parsed).toHaveLength(2);
  });

  it('rejeita vencedor que não é um tipo do jogo', () => {
    expect(parseHistory([{ ...valid(), winner: 'lizard' }])).toEqual([]);
    expect(parseHistory([{ ...valid(), winner: 3 }])).toEqual([]);
  });

  it('rejeita campo numérico ausente, textual ou NaN', () => {
    for (const field of ['number', 'elapsed', 'conversions']) {
      expect(parseHistory([{ ...valid(), [field]: undefined }])).toEqual([]);
      expect(parseHistory([{ ...valid(), [field]: '10' }])).toEqual([]);
      expect(parseHistory([{ ...valid(), [field]: Number.NaN }])).toEqual([]);
    }
  });

  it('rejeita setup incompleto ou malformado', () => {
    expect(parseHistory([{ ...valid(), setup: { paper: 30, rock: 30 } }])).toEqual([]);
    expect(parseHistory([{ ...valid(), setup: null }])).toEqual([]);
    expect(parseHistory([{ ...valid(), setup: 'x' }])).toEqual([]);
  });

  it('trunca no limite mesmo se o armazenamento tiver mais', () => {
    const many = Array.from({ length: 30 }, () => valid());

    expect(parseHistory(many)).toHaveLength(HISTORY_LIMIT);
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
