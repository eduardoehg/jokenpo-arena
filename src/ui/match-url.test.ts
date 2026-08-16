import { describe, expect, it } from 'vitest';
import { formatSeed, MAX_SEED } from '../core/rng';
import { decodeMatch, encodeMatch, readSharedMatch, shareUrl } from './match-url';
import {
  defaultMatchConfig,
  MAX_POPULATION,
  MIN_POPULATION,
  type MatchConfig,
} from './match-config';

const CONFIG: MatchConfig = {
  counts: { paper: 20, rock: 45, scissors: 10 },
  speedLevel: 7,
};

describe('encodeMatch', () => {
  it('carrega seed, as três populações e a velocidade', () => {
    const params = new URLSearchParams(encodeMatch(CONFIG, 12_345));

    expect(params.get('seed')).toBe(formatSeed(12_345));
    expect(params.get('p')).toBe('20');
    expect(params.get('r')).toBe('45');
    expect(params.get('s')).toBe('10');
    expect(params.get('v')).toBe('7');
  });

  it('começa com ? para ser concatenável', () => {
    expect(encodeMatch(CONFIG, 1).startsWith('?')).toBe(true);
  });

  it('gera link curto o bastante para colar em conversa', () => {
    expect(encodeMatch(CONFIG, MAX_SEED).length).toBeLessThan(50);
  });
});

describe('decodeMatch — volta completa', () => {
  it('recupera exatamente o que foi codificado', () => {
    for (const seed of [0, 1, 999, MAX_SEED]) {
      expect(decodeMatch(encodeMatch(CONFIG, seed))).toEqual({
        config: CONFIG,
        seed,
      });
    }
  });

  it('funciona com a configuração padrão', () => {
    const config = defaultMatchConfig();

    expect(decodeMatch(encodeMatch(config, 42))).toEqual({ config, seed: 42 });
  });

  it('aceita a query com ou sem o ? inicial', () => {
    const query = encodeMatch(CONFIG, 7);

    expect(decodeMatch(query)).toEqual(decodeMatch(query.slice(1)));
  });
});

describe('decodeMatch — entrada inválida', () => {
  const valid = encodeMatch(CONFIG, 500);

  it('devolve null sem seed', () => {
    expect(decodeMatch('')).toBeNull();
    expect(decodeMatch('?p=20&r=45&s=10&v=7')).toBeNull();
  });

  it('devolve null com seed malformada', () => {
    expect(decodeMatch('?seed=!!&p=20&r=45&s=10&v=7')).toBeNull();
    expect(decodeMatch('?seed=&p=20&r=45&s=10&v=7')).toBeNull();
  });

  it('devolve null faltando qualquer população', () => {
    for (const param of ['p', 'r', 's', 'v']) {
      const params = new URLSearchParams(valid);
      params.delete(param);

      expect(decodeMatch(params.toString())).toBeNull();
    }
  });

  it('rejeita população fora dos limites do jogo', () => {
    for (const value of [MIN_POPULATION - 1, MAX_POPULATION + 1, -30, 0]) {
      const params = new URLSearchParams(valid);
      params.set('p', String(value));

      expect(decodeMatch(params.toString())).toBeNull();
    }
  });

  it('rejeita velocidade fora da faixa', () => {
    for (const value of [0, 11, -3]) {
      const params = new URLSearchParams(valid);
      params.set('v', String(value));

      expect(decodeMatch(params.toString())).toBeNull();
    }
  });

  it('rejeita valor não inteiro', () => {
    for (const value of ['20.5', 'abc', '', '1e2']) {
      const params = new URLSearchParams(valid);
      params.set('r', value);

      expect(decodeMatch(params.toString())).toBeNull();
    }
  });

  it('ignora parâmetros desconhecidos em vez de falhar', () => {
    expect(decodeMatch(`${valid}&utm_source=twitter&x=1`)).toEqual({
      config: CONFIG,
      seed: 500,
    });
  });
});

describe('readSharedMatch', () => {
  it('devolve a partida quando a URL descreve uma', () => {
    const shared = readSharedMatch(encodeMatch(CONFIG, 77));

    expect(shared.config).toEqual(CONFIG);
    expect(shared.seed).toBe(77);
  });

  it('sorteia uma seed e não impõe configuração quando não há link', () => {
    const shared = readSharedMatch('');

    expect(shared.config).toBeNull();
    expect(shared.seed).toBeGreaterThanOrEqual(0);
    expect(shared.seed).toBeLessThanOrEqual(MAX_SEED);
  });

  it('cai no padrão quando a URL está corrompida', () => {
    expect(readSharedMatch('?seed=abc&p=999').config).toBeNull();
  });
});

describe('shareUrl', () => {
  it('monta a URL absoluta que reproduz a partida', () => {
    const url = shareUrl(
      'https://eduardoehg.github.io',
      '/jokenpo-arena/',
      CONFIG,
      42,
    );

    expect(url.startsWith('https://eduardoehg.github.io/jokenpo-arena/?')).toBe(
      true,
    );
    expect(decodeMatch(new URL(url).search)).toEqual({ config: CONFIG, seed: 42 });
  });
});
