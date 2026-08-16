import type { Entity } from './entity';
import { winner, type EntityType } from './rules';

/** Par de índices em colisão, sempre com `a < b`. */
export type Pair = [number, number];

/**
 * Uma conversão ocorrida no tick.
 *
 * O `render/` usa isto para disparar o flash e a explosão no ponto exato do
 * impacto — sem precisar comparar o estado anterior com o novo.
 */
export interface Conversion {
  /** Índice da entidade que mudou de tipo. */
  index: number;
  /** Tipo que passou a valer. */
  to: EntityType;
  /** Ponto de impacto, antes da separação. */
  x: number;
  y: number;
}

export interface CollisionResult {
  entities: Entity[];
  conversions: Conversion[];
}

/** Constantes clássicas de spatial hashing (Teschner et al.). */
const HASH_X = 73_856_093;
const HASH_Y = 19_349_663;

export interface Grid {
  cellSize: number;
  /** Chave da célula → índices das entidades nela. */
  buckets: Map<number, number[]>;
}

function hashCell(cx: number, cy: number): number {
  return ((cx * HASH_X) ^ (cy * HASH_Y)) | 0;
}

/**
 * Lado da célula: o maior diâmetro presente.
 *
 * É o mínimo que garante que duas entidades sobrepostas caiam na mesma célula
 * ou numa vizinha imediata — sem isso a varredura 3×3 perderia pares.
 */
export function cellSizeFor(entities: readonly Entity[]): number {
  let maxRadius = 0;
  for (const entity of entities) {
    if (entity.radius > maxRadius) maxRadius = entity.radius;
  }
  return Math.max(2 * maxRadius, 1);
}

/** Indexa as entidades por célula. O(n). */
export function buildGrid(
  entities: readonly Entity[],
  cellSize: number = cellSizeFor(entities),
): Grid {
  const buckets = new Map<number, number[]>();

  for (let i = 0; i < entities.length; i++) {
    const entity = entities[i];
    const key = hashCell(
      Math.floor(entity.x / cellSize),
      Math.floor(entity.y / cellSize),
    );

    const bucket = buckets.get(key);
    if (bucket) bucket.push(i);
    else buckets.set(key, [i]);
  }

  return { cellSize, buckets };
}

/** Sobreposição estrita: encostar sem invadir não conta como colisão. */
function overlaps(a: Entity, b: Entity): boolean {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const reach = a.radius + b.radius;
  return dx * dx + dy * dy < reach * reach;
}

/**
 * Pares em colisão, em ordem canônica (por `a`, depois por `b`).
 *
 * Broad phase pela grid — cada entidade só compara com as 9 células ao redor,
 * não com as outras 299. Narrow phase pela distância real.
 */
export function findCollidingPairs(entities: readonly Entity[]): Pair[] {
  const pairs: Pair[] = [];
  if (entities.length < 2) return pairs;

  const grid = buildGrid(entities);
  const keys: number[] = [];

  for (let i = 0; i < entities.length; i++) {
    const a = entities[i];
    const cx = Math.floor(a.x / grid.cellSize);
    const cy = Math.floor(a.y / grid.cellSize);

    keys.length = 0;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const key = hashCell(cx + dx, cy + dy);
        // Células distintas podem colidir no hash. Sem esta checagem o mesmo
        // bucket seria varrido duas vezes e o par sairia duplicado.
        if (!keys.includes(key)) keys.push(key);
      }
    }

    for (const key of keys) {
      const bucket = grid.buckets.get(key);
      if (!bucket) continue;

      for (const j of bucket) {
        // `j <= i` já foi tratado quando `j` era o índice externo.
        if (j <= i) continue;
        if (overlaps(a, entities[j])) pairs.push([i, j]);
      }
    }
  }

  return pairs.sort((p, q) => p[0] - q[0] || p[1] - q[1]);
}

/**
 * Resolução física: separa a sobreposição e troca as componentes normais da
 * velocidade (colisão elástica entre massas iguais).
 *
 * Muta os objetos recebidos — são cópias internas de `resolveCollisions`.
 */
function separate(a: Entity, b: Entity): void {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.hypot(dx, dy);

  // Centros exatamente coincidentes: não existe normal. Um eixo fixo mantém o
  // resultado determinístico em vez de gerar NaN.
  const nx = dist === 0 ? 1 : dx / dist;
  const ny = dist === 0 ? 0 : dy / dist;

  const overlap = a.radius + b.radius - dist;
  if (overlap > 0) {
    const shift = overlap / 2;
    a.x -= nx * shift;
    a.y -= ny * shift;
    b.x += nx * shift;
    b.y += ny * shift;
  }

  // Velocidade relativa ao longo da normal. Só inverte quando estão se
  // aproximando: um par já em separação ficaria preso, quicando a cada tick.
  const approach = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
  if (approach > 0) {
    a.vx -= approach * nx;
    a.vy -= approach * ny;
    b.vx += approach * nx;
    b.vy += approach * ny;
  }
}

/**
 * Resolve todas as colisões do tick e devolve entidades novas + as conversões.
 *
 * Os pares são detectados uma vez, sobre as posições de entrada, e resolvidos
 * em sequência na ordem canônica. Uma entidade em vários pares é resolvida
 * várias vezes no mesmo tick — o resultado é determinístico, e o resíduo de
 * sobreposição some no tick seguinte.
 */
export function resolveCollisions(
  entities: readonly Entity[],
): CollisionResult {
  const next = entities.map((entity) => ({ ...entity }));
  const conversions: Conversion[] = [];

  for (const [i, j] of findCollidingPairs(entities)) {
    const a = next[i];
    const b = next[j];

    // Ponto de impacto antes da separação: é onde a explosão precisa nascer.
    const x = (a.x + b.x) / 2;
    const y = (a.y + b.y) / 2;

    separate(a, b);

    const victor = winner(a.type, b.type);
    if (victor === null) continue; // iguais: só física

    const loserIndex = a.type === victor ? j : i;
    next[loserIndex].type = victor;
    conversions.push({ index: loserIndex, to: victor, x, y });
  }

  return { entities: next, conversions };
}
