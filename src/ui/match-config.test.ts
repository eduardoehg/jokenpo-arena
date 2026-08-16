import { describe, expect, it } from 'vitest';
import { ENTITY_TYPES } from '../core/rules';
import {
  bumpPopulation,
  defaultMatchConfig,
  ENTITY_RADIUS,
  MAX_POPULATION,
  MAX_SPEED_LEVEL,
  MIN_POPULATION,
  MIN_SPEED_LEVEL,
  setSpeedLevel,
  speedFor,
  toSpawnConfig,
  totalPopulation,
} from './match-config';

const ARENA = { width: 1000, height: 1000 };

describe('defaultMatchConfig', () => {
  it('começa com 30 de cada e velocidade 5', () => {
    const config = defaultMatchConfig();

    expect(config.counts).toEqual({ paper: 30, rock: 30, scissors: 30 });
    expect(config.speedLevel).toBe(5);
    expect(totalPopulation(config)).toBe(90);
  });

  it('devolve um objeto novo a cada chamada', () => {
    const first = defaultMatchConfig();
    first.counts.paper = 99;

    expect(defaultMatchConfig().counts.paper).toBe(30);
  });
});

describe('bumpPopulation', () => {
  it('soma e subtrai o passo pedido', () => {
    const config = defaultMatchConfig();

    expect(bumpPopulation(config, 'rock', 5).counts.rock).toBe(35);
    expect(bumpPopulation(config, 'rock', -5).counts.rock).toBe(25);
  });

  it('não mexe nos outros tipos', () => {
    const next = bumpPopulation(defaultMatchConfig(), 'rock', 5);

    expect(next.counts.paper).toBe(30);
    expect(next.counts.scissors).toBe(30);
  });

  it('trava no mínimo e no máximo', () => {
    const low = { ...defaultMatchConfig(), counts: { paper: MIN_POPULATION, rock: 30, scissors: 30 } };
    const high = { ...defaultMatchConfig(), counts: { paper: MAX_POPULATION, rock: 30, scissors: 30 } };

    expect(bumpPopulation(low, 'paper', -5).counts.paper).toBe(MIN_POPULATION);
    expect(bumpPopulation(high, 'paper', 5).counts.paper).toBe(MAX_POPULATION);
  });

  it('trava mesmo com um passo que ultrapassa o limite de longe', () => {
    const config = defaultMatchConfig();

    expect(bumpPopulation(config, 'paper', -999).counts.paper).toBe(MIN_POPULATION);
    expect(bumpPopulation(config, 'paper', 999).counts.paper).toBe(MAX_POPULATION);
  });

  it('não muta a config recebida', () => {
    const config = defaultMatchConfig();
    bumpPopulation(config, 'rock', 5);

    expect(config.counts.rock).toBe(30);
  });
});

describe('setSpeedLevel', () => {
  it('aceita os níveis válidos', () => {
    for (let level = MIN_SPEED_LEVEL; level <= MAX_SPEED_LEVEL; level++) {
      expect(setSpeedLevel(defaultMatchConfig(), level).speedLevel).toBe(level);
    }
  });

  it('trava fora da faixa', () => {
    expect(setSpeedLevel(defaultMatchConfig(), 0).speedLevel).toBe(MIN_SPEED_LEVEL);
    expect(setSpeedLevel(defaultMatchConfig(), 50).speedLevel).toBe(MAX_SPEED_LEVEL);
  });

  it('não muta a config recebida', () => {
    const config = defaultMatchConfig();
    setSpeedLevel(config, 9);

    expect(config.speedLevel).toBe(5);
  });
});

describe('speedFor', () => {
  it('cresce com o nível', () => {
    let previous = 0;
    for (let level = MIN_SPEED_LEVEL; level <= MAX_SPEED_LEVEL; level++) {
      const speed = speedFor(level, ARENA.width);
      expect(speed).toBeGreaterThan(previous);
      previous = speed;
    }
  });

  it('segue a fórmula 0.035 + nível · 0.011 da arena por segundo', () => {
    expect(speedFor(5, 1000)).toBeCloseTo(90);
    expect(speedFor(1, 1000)).toBeCloseTo(46);
    expect(speedFor(10, 1000)).toBeCloseTo(145);
  });

  it('escala com a largura da arena, mantendo o ritmo relativo', () => {
    expect(speedFor(5, 2000)).toBeCloseTo(speedFor(5, 1000) * 2);
  });
});

describe('toSpawnConfig', () => {
  it('traduz a escolha do jogador no formato do core', () => {
    const config = { counts: { paper: 20, rock: 45, scissors: 10 }, speedLevel: 7 };
    const spawn = toSpawnConfig(config, ARENA);

    expect(spawn.arena).toBe(ARENA);
    expect(spawn.counts).toEqual({ paper: 20, rock: 45, scissors: 10 });
    expect(spawn.speed).toBeCloseTo(speedFor(7, ARENA.width));
    expect(spawn.radius).toBe(ENTITY_RADIUS);
  });

  it('copia as populações, sem alias com a config', () => {
    const config = defaultMatchConfig();
    const spawn = toSpawnConfig(config, ARENA);

    spawn.counts.paper = 1;
    expect(config.counts.paper).toBe(30);
  });

  it('cobre todos os tipos', () => {
    const spawn = toSpawnConfig(defaultMatchConfig(), ARENA);

    for (const type of ENTITY_TYPES) {
      expect(spawn.counts[type]).toBeGreaterThan(0);
    }
  });
});
