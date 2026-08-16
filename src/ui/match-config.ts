import type { Arena } from '../core/physics';
import { ENTITY_TYPES, type EntityType } from '../core/rules';
import type { SpawnConfig } from '../core/spawn';

export const MIN_POPULATION = 5;
export const MAX_POPULATION = 80;
export const POPULATION_STEP = 5;

export const MIN_SPEED_LEVEL = 1;
export const MAX_SPEED_LEVEL = 10;

/** Raio de colisão em unidades da arena. Casa com o sprite de 7 células. */
export const ENTITY_RADIUS = 16;

/**
 * Velocidade base: `0.035 + nível · 0.011`, em frações da arena por segundo.
 *
 * Expressa em fração e não em pixels para que trocar o tamanho lógico da arena
 * não mude o ritmo da partida.
 */
const SPEED_BASE = 0.035;
const SPEED_PER_LEVEL = 0.011;

export interface MatchConfig {
  counts: Record<EntityType, number>;
  /** Nível de 1 a 10 escolhido na barra de velocidade. */
  speedLevel: number;
}

export function defaultMatchConfig(): MatchConfig {
  return {
    counts: { paper: 30, rock: 30, scissors: 30 },
    speedLevel: 5,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Aplica um passo do stepper, respeitando os limites. Devolve config nova. */
export function bumpPopulation(
  config: MatchConfig,
  type: EntityType,
  delta: number,
): MatchConfig {
  const next = clamp(
    config.counts[type] + delta,
    MIN_POPULATION,
    MAX_POPULATION,
  );

  return { ...config, counts: { ...config.counts, [type]: next } };
}

export function setSpeedLevel(
  config: MatchConfig,
  level: number,
): MatchConfig {
  return {
    ...config,
    speedLevel: clamp(Math.round(level), MIN_SPEED_LEVEL, MAX_SPEED_LEVEL),
  };
}

/** Velocidade em px/s para um nível, dada a largura lógica da arena. */
export function speedFor(level: number, arenaWidth: number): number {
  const clamped = clamp(level, MIN_SPEED_LEVEL, MAX_SPEED_LEVEL);
  return (SPEED_BASE + clamped * SPEED_PER_LEVEL) * arenaWidth;
}

/** Traduz a escolha do jogador no que o `core/` precisa para semear a arena. */
export function toSpawnConfig(
  config: MatchConfig,
  arena: Arena,
): SpawnConfig {
  return {
    arena,
    counts: { ...config.counts },
    speed: speedFor(config.speedLevel, arena.width),
    radius: ENTITY_RADIUS,
  };
}

/** População total da partida. */
export function totalPopulation(config: MatchConfig): number {
  return ENTITY_TYPES.reduce((sum, type) => sum + config.counts[type], 0);
}
