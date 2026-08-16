import { describe, expect, it } from 'vitest';
import { createEntity, DEFAULT_RADIUS, type EntityInit } from './entity';

const BASE: EntityInit = { x: 10, y: 20, vx: 30, vy: -40, type: 'rock' };

describe('createEntity', () => {
  it('preserva todos os campos informados', () => {
    expect(createEntity({ ...BASE, radius: 5 })).toEqual({
      x: 10,
      y: 20,
      vx: 30,
      vy: -40,
      type: 'rock',
      radius: 5,
    });
  });

  it('aplica o raio padrão quando omitido', () => {
    expect(createEntity(BASE).radius).toBe(DEFAULT_RADIUS);
  });

  it('respeita raio explícito diferente do padrão', () => {
    expect(createEntity({ ...BASE, radius: 12 }).radius).toBe(12);
  });

  it('aceita velocidade zero e negativa sem tratar como ausente', () => {
    const stopped = createEntity({ ...BASE, vx: 0, vy: 0 });
    expect(stopped.vx).toBe(0);
    expect(stopped.vy).toBe(0);
  });

  it('devolve um objeto novo, desacoplado do input', () => {
    const init: EntityInit = { ...BASE };
    const entity = createEntity(init);

    expect(entity).not.toBe(init);

    init.x = 999;
    expect(entity.x).toBe(10);
  });
});
