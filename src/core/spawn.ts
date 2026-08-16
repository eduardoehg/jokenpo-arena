import { createEntity, DEFAULT_RADIUS, type Entity } from './entity';
import type { Arena } from './physics';
import { ENTITY_TYPES, type EntityType } from './rules';

export type Edge = 'top' | 'right' | 'bottom' | 'left';

/**
 * Fonte de números aleatórios em `[0, 1)`.
 *
 * Injetável para que o spawn seja testável de forma determinística — e para que
 * um PRNG com seed possa substituir `Math.random` sem mudar assinatura.
 */
export type Rng = () => number;

/**
 * Um portal por tipo: papel ao Norte, pedra a Oeste, tesoura a Leste.
 *
 * A borda Sul fica livre — é o que dá à arena um lado "aberto" e evita que os
 * três fluxos se encontrem todos no mesmo canto.
 */
export const SPAWN_EDGES: Record<EntityType, Edge> = {
  paper: 'top',
  rock: 'left',
  scissors: 'right',
};

/** Fração da borda ocupada pelo portal. O render desenha a barra com isto. */
export const DEFAULT_PORTAL_SPAN = 0.34;

/** Dispersão angular padrão em torno da direção para dentro, em radianos. */
export const DEFAULT_SPREAD = 0.7;

/**
 * Variação de velocidade por peça: ±30% em torno da base.
 *
 * Sem ela as três ondas avançam em bloco e se encontram numa frente reta. Com
 * ela a formação se desfaz sozinha e a mistura acontece mais cedo.
 */
export const DEFAULT_SPEED_JITTER = 0.3;

/** Fração da menor dimensão da arena usada como profundidade da faixa. */
const DEFAULT_BAND_FRACTION = 0.1;

/** Direção que aponta para dentro da arena a partir de cada borda. */
const INWARD_ANGLE: Record<Edge, number> = {
  top: Math.PI / 2,
  bottom: -Math.PI / 2,
  left: 0,
  right: Math.PI,
};

export interface SpawnConfig {
  arena: Arena;
  /** População inicial de cada tipo. */
  counts: Record<EntityType, number>;
  /** Módulo da velocidade em px/s. */
  speed: number;
  radius?: number;
  /** Profundidade da faixa de spawn a partir da borda, em px. */
  bandDepth?: number;
  /** Fração centralizada da borda por onde as peças entram. */
  portalSpan?: number;
  /** Dispersão angular em torno da direção para dentro, em radianos. */
  spread?: number;
  /** Variação relativa da velocidade por peça, de 0 (nenhuma) a 1. */
  speedJitter?: number;
  edges?: Record<EntityType, Edge>;
}

function lerp(min: number, max: number, t: number): number {
  return min + (max - min) * t;
}

/**
 * Trecho da borda ocupado pelo portal, centralizado e descontando o raio.
 *
 * O spawn e a barra desenhada usam o mesmo `portalSpan`: se as peças nascessem
 * fora da barra, o portal deixaria de ler como portal.
 */
function alongRange(
  length: number,
  radius: number,
  portalSpan: number,
): [number, number] {
  const usable = Math.max(0, length - 2 * radius);
  const span = usable * Math.min(Math.max(portalSpan, 0), 1);
  const min = radius + (usable - span) / 2;
  return [min, min + span];
}

/** Intervalo de distância até a borda: nunca atravessa a parede oposta. */
function depthRange(
  length: number,
  radius: number,
  bandDepth: number,
): [number, number] {
  return [radius, Math.max(radius, Math.min(bandDepth, length - radius))];
}

/**
 * Converte dois sorteios em `[0, 1)` numa posição dentro do portal.
 *
 * `along` corre paralelo à borda, `depth` mede a distância até ela.
 */
function placeOnEdge(
  edge: Edge,
  arena: Arena,
  radius: number,
  bandDepth: number,
  portalSpan: number,
  alongT: number,
  depthT: number,
): { x: number; y: number } {
  const horizontal = edge === 'top' || edge === 'bottom';
  const alongLength = horizontal ? arena.width : arena.height;
  const depthLength = horizontal ? arena.height : arena.width;

  const [alongMin, alongMax] = alongRange(alongLength, radius, portalSpan);
  const [depthMin, depthMax] = depthRange(depthLength, radius, bandDepth);

  const along = lerp(alongMin, alongMax, alongT);
  const depth = lerp(depthMin, depthMax, depthT);

  switch (edge) {
    case 'top':
      return { x: along, y: depth };
    case 'bottom':
      return { x: along, y: depthLength - depth };
    case 'left':
      return { x: depth, y: along };
    case 'right':
      return { x: depthLength - depth, y: along };
  }
}

/**
 * Distribui as entidades pelos três portais, um por tipo.
 *
 * A direção não é livre: sai apontando para dentro da arena, com dispersão de
 * `±spread`. É o que faz as peças jorrarem do portal em vez de metade delas
 * começar quicando na parede de trás.
 *
 * Consome exatamente quatro valores de `rng` por entidade, sempre na mesma
 * ordem (along, depth, ângulo, velocidade): a mesma sequência produz sempre o
 * mesmo spawn.
 */
export function spawnEntities(
  config: SpawnConfig,
  rng: Rng = Math.random,
): Entity[] {
  const { arena, counts, speed } = config;
  const radius = config.radius ?? DEFAULT_RADIUS;
  const edges = config.edges ?? SPAWN_EDGES;
  const spread = config.spread ?? DEFAULT_SPREAD;
  const jitter = config.speedJitter ?? DEFAULT_SPEED_JITTER;
  const portalSpan = config.portalSpan ?? DEFAULT_PORTAL_SPAN;
  const bandDepth =
    config.bandDepth ??
    Math.min(arena.width, arena.height) * DEFAULT_BAND_FRACTION;

  const entities: Entity[] = [];

  for (const type of ENTITY_TYPES) {
    const edge = edges[type];
    const inward = INWARD_ANGLE[edge];

    for (let i = 0; i < counts[type]; i++) {
      const alongT = rng();
      const depthT = rng();
      const angle = inward + (rng() - 0.5) * 2 * spread;
      const pace = speed * (1 + (rng() - 0.5) * 2 * jitter);

      const { x, y } = placeOnEdge(
        edge,
        arena,
        radius,
        bandDepth,
        portalSpan,
        alongT,
        depthT,
      );

      entities.push(
        createEntity({
          x,
          y,
          vx: Math.cos(angle) * pace,
          vy: Math.sin(angle) * pace,
          type,
          radius,
        }),
      );
    }
  }

  return entities;
}
