import type { EntityType } from './rules';

/**
 * Uma entidade da arena.
 *
 * Posição e raio em pixels. Velocidade em **pixels por segundo**, nunca por
 * frame: é o que permite ao loop usar delta time sem que o resultado dependa do
 * FPS da máquina.
 */
export interface Entity {
  x: number;
  y: number;
  vx: number;
  vy: number;
  type: EntityType;
  radius: number;
}

export const DEFAULT_RADIUS = 8;

/** Parâmetros de construção: `radius` cai no padrão quando omitido. */
export type EntityInit = Omit<Entity, 'radius'> & { radius?: number };

/** Cria uma entidade nova, desacoplada do objeto de entrada. */
export function createEntity(init: EntityInit): Entity {
  return {
    x: init.x,
    y: init.y,
    vx: init.vx,
    vy: init.vy,
    type: init.type,
    radius: init.radius ?? DEFAULT_RADIUS,
  };
}
