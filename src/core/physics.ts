import type { Entity } from './entity';

/** A arena quadrada onde tudo acontece. Dimensões em pixels. */
export interface Arena {
  width: number;
  height: number;
}

interface AxisState {
  pos: number;
  vel: number;
}

/**
 * Reflete uma coordenada dentro de `[min, max]`, invertendo a velocidade se
 * houve batida.
 *
 * Usa aritmética modular (onda triangular) em vez de um laço de dobras: o custo
 * é constante mesmo que a entidade ultrapasse a arena muitas vezes num único
 * tick. Isso é o que impede tunelamento com `dt` grande — um frame perdido não
 * deixa ninguém escapar.
 */
function reflect(pos: number, vel: number, min: number, max: number): AxisState {
  const span = max - min;

  // Arena menor que a própria entidade: não há posição válida. Estaciona no
  // centro em vez de oscilar para sempre.
  if (span <= 0) return { pos: (min + max) / 2, vel: 0 };

  const period = 2 * span;
  let offset = (pos - min) % period;
  if (offset < 0) offset += period;

  // Na segunda metade do período a entidade está no trecho de volta.
  const bounced = offset > span;

  return {
    pos: bounced ? min + (period - offset) : min + offset,
    vel: bounced ? -vel : vel,
  };
}

/**
 * Avança uma entidade por `dt` **segundos**, refletindo nas paredes.
 *
 * Devolve uma entidade nova; a original não é tocada. Como o deslocamento é
 * `v * dt`, o resultado depende só do tempo decorrido — nunca do FPS.
 */
export function stepEntity(entity: Entity, dt: number, arena: Arena): Entity {
  const r = entity.radius;
  const x = reflect(entity.x + entity.vx * dt, entity.vx, r, arena.width - r);
  const y = reflect(entity.y + entity.vy * dt, entity.vy, r, arena.height - r);

  return { ...entity, x: x.pos, y: y.pos, vx: x.vel, vy: y.vel };
}

function clampAxis(value: number, min: number, max: number): number {
  if (max <= min) return (min + max) / 2;
  return Math.min(Math.max(value, min), max);
}

/**
 * Traz a entidade para dentro da arena sem mexer na velocidade.
 *
 * Diferente de `stepEntity`, aqui não há quique: serve para corrigir a posição
 * depois da separação de colisão, que pode empurrar alguém através da parede.
 * Inverter a velocidade nesse caso seria errado — a entidade não bateu na
 * parede, foi empurrada por outra.
 */
export function clampInside(entity: Entity, arena: Arena): Entity {
  const r = entity.radius;
  const x = clampAxis(entity.x, r, arena.width - r);
  const y = clampAxis(entity.y, r, arena.height - r);

  if (x === entity.x && y === entity.y) return entity;
  return { ...entity, x, y };
}

/** Avança todas as entidades por `dt` segundos. */
export function stepAll(
  entities: readonly Entity[],
  dt: number,
  arena: Arena,
): Entity[] {
  return entities.map((entity) => stepEntity(entity, dt, arena));
}
