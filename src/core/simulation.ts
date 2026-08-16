import { resolveCollisions, type Conversion } from './collision';
import type { Entity } from './entity';
import { clampInside, stepAll, type Arena } from './physics';
import { ENTITY_TYPES, type EntityType } from './rules';
import { spawnEntities, type Rng, type SpawnConfig } from './spawn';

/**
 * Teto para o passo de tempo, em segundos.
 *
 * Uma aba em segundo plano devolve um `dt` de vários segundos no primeiro
 * frame. Sem o teto, todo mundo atravessaria a arena de uma vez e a partida
 * seria decidida num quadro só.
 */
export const MAX_DT = 0.05;

export interface SimulationState {
  readonly entities: readonly Entity[];
  readonly arena: Arena;
  /** Tempo simulado acumulado, em segundos. */
  readonly elapsed: number;
  /** Tipo sobrevivente quando só resta um; `null` enquanto a partida corre. */
  readonly winner: EntityType | null;
  /** Conversões ocorridas neste tick — insumo dos efeitos visuais. */
  readonly conversions: readonly Conversion[];
  /** Total acumulado de conversões desde o início da partida. */
  readonly totalConversions: number;
}

/** Quantas entidades de cada tipo existem agora. */
export function countByType(
  entities: readonly Entity[],
): Record<EntityType, number> {
  const counts: Record<EntityType, number> = { rock: 0, paper: 0, scissors: 0 };
  for (const entity of entities) counts[entity.type]++;
  return counts;
}

/** O único tipo restante, ou `null` se ainda há mais de um (ou nenhum). */
export function survivingType(entities: readonly Entity[]): EntityType | null {
  const counts = countByType(entities);
  const alive = ENTITY_TYPES.filter((type) => counts[type] > 0);
  return alive.length === 1 ? alive[0] : null;
}

/** Estado inicial: entidades nos três portais, relógio zerado. */
export function createSimulation(
  config: SpawnConfig,
  rng: Rng = Math.random,
): SimulationState {
  const entities = spawnEntities(config, rng);

  return {
    entities,
    arena: config.arena,
    elapsed: 0,
    winner: survivingType(entities),
    conversions: [],
    totalConversions: 0,
  };
}

/**
 * Um tick: move, resolve colisões, corrige posições e reavalia o vencedor.
 *
 * Recebe `dt` em segundos e devolve um estado novo — o anterior fica intacto.
 * A ordem importa: mover antes de colidir é o que faz as entidades se
 * encontrarem; corrigir depois de colidir é o que impede que a separação
 * empurre alguém para fora da arena.
 */
export function tick(state: SimulationState, dt: number): SimulationState {
  const step = Math.min(Math.max(dt, 0), MAX_DT);

  const moved = stepAll(state.entities, step, state.arena);
  const { entities: resolved, conversions } = resolveCollisions(moved);
  const clamped = resolved.map((entity) => clampInside(entity, state.arena));

  return {
    ...state,
    entities: clamped,
    elapsed: state.elapsed + step,
    winner: survivingType(clamped),
    conversions,
    totalConversions: state.totalConversions + conversions.length,
  };
}
