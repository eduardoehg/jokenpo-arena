import { describe, expect, it } from 'vitest';
import { createEntity, type Entity } from './entity';
import { stepAll, stepEntity, type Arena } from './physics';

const ARENA: Arena = { width: 200, height: 100 };
const RADIUS = 10;

function entityAt(over: Partial<Entity> = {}): Entity {
  return createEntity({
    x: 100,
    y: 50,
    vx: 0,
    vy: 0,
    type: 'rock',
    radius: RADIUS,
    ...over,
  });
}

const speedOf = (e: Entity): number => Math.hypot(e.vx, e.vy);

describe('stepEntity — movimento', () => {
  it('desloca proporcionalmente ao delta time', () => {
    const moved = stepEntity(entityAt({ vx: 100, vy: -40 }), 0.5, ARENA);

    expect(moved.x).toBeCloseTo(150);
    expect(moved.y).toBeCloseTo(30);
  });

  it('não move nada com dt zero', () => {
    const start = entityAt({ vx: 500, vy: -500 });
    const moved = stepEntity(start, 0, ARENA);

    expect(moved.x).toBe(start.x);
    expect(moved.y).toBe(start.y);
  });

  it('preserva tipo e raio', () => {
    const moved = stepEntity(entityAt({ type: 'scissors', vx: 30 }), 1, ARENA);

    expect(moved.type).toBe('scissors');
    expect(moved.radius).toBe(RADIUS);
  });

  it('não muta a entidade original', () => {
    const start = entityAt({ vx: 100, vy: 100 });
    stepEntity(start, 1, ARENA);

    expect(start.x).toBe(100);
    expect(start.y).toBe(50);
    expect(start.vx).toBe(100);
  });
});

describe('stepEntity — independência de FPS', () => {
  // O requisito central do CLAUDE.md: o resultado não pode depender do FPS.
  it('um passo de 1/30s equivale a dois de 1/60s em campo aberto', () => {
    const start = entityAt({ x: 60, y: 40, vx: 120, vy: -75 });

    const single = stepEntity(start, 1 / 30, ARENA);
    const double = stepEntity(stepEntity(start, 1 / 60, ARENA), 1 / 60, ARENA);

    expect(double.x).toBeCloseTo(single.x, 10);
    expect(double.y).toBeCloseTo(single.y, 10);
  });

  it('a equivalência se mantém quando o passo atravessa uma parede', () => {
    // Chega em x=190 (parede direita menos o raio) no meio do passo cheio.
    const start = entityAt({ x: 180, y: 50, vx: 600, vy: 0 });

    const single = stepEntity(start, 1 / 30, ARENA);
    const double = stepEntity(stepEntity(start, 1 / 60, ARENA), 1 / 60, ARENA);

    expect(double.x).toBeCloseTo(single.x, 10);
    expect(double.vx).toBe(single.vx);
    expect(single.vx).toBeLessThan(0);
  });
});

describe('stepEntity — reflexão nas paredes', () => {
  it('quica na parede direita invertendo apenas vx', () => {
    const moved = stepEntity(entityAt({ x: 185, vx: 100, vy: 40 }), 0.1, ARENA);

    expect(moved.vx).toBe(-100);
    expect(moved.vy).toBe(40);
    expect(moved.x).toBeCloseTo(185); // 195 ultrapassa 190, reflete para 185
  });

  it('quica na parede esquerda invertendo apenas vx', () => {
    const moved = stepEntity(entityAt({ x: 15, vx: -100, vy: 40 }), 0.1, ARENA);

    expect(moved.vx).toBe(100);
    expect(moved.vy).toBe(40);
    expect(moved.x).toBeCloseTo(15);
  });

  it('quica no topo invertendo apenas vy', () => {
    const moved = stepEntity(entityAt({ y: 15, vx: 40, vy: -100 }), 0.1, ARENA);

    expect(moved.vy).toBe(100);
    expect(moved.vx).toBe(40);
    expect(moved.y).toBeCloseTo(15);
  });

  it('quica embaixo invertendo apenas vy', () => {
    const moved = stepEntity(entityAt({ y: 85, vx: 40, vy: 100 }), 0.1, ARENA);

    expect(moved.vy).toBe(-100);
    expect(moved.vx).toBe(40);
    expect(moved.y).toBeCloseTo(85);
  });

  it('inverte os dois eixos ao bater num canto', () => {
    const moved = stepEntity(entityAt({ x: 185, y: 85, vx: 100, vy: 100 }), 0.1, ARENA);

    expect(moved.vx).toBe(-100);
    expect(moved.vy).toBe(-100);
  });

  it('conserva o módulo da velocidade após quicar', () => {
    const start = entityAt({ x: 185, y: 85, vx: 300, vy: 400 });
    const moved = stepEntity(start, 0.5, ARENA);

    expect(speedOf(moved)).toBeCloseTo(speedOf(start));
  });
});

describe('stepEntity — confinamento', () => {
  const inBounds = (e: Entity): boolean =>
    e.x >= e.radius - 1e-9 &&
    e.x <= ARENA.width - e.radius + 1e-9 &&
    e.y >= e.radius - 1e-9 &&
    e.y <= ARENA.height - e.radius + 1e-9;

  it('mantém a entidade dentro da arena ao longo de muitos passos', () => {
    let entity = entityAt({ x: 50, y: 30, vx: 733, vy: -417 });

    for (let i = 0; i < 500; i++) {
      entity = stepEntity(entity, 1 / 60, ARENA);
      expect(inBounds(entity)).toBe(true);
    }
  });

  it('não deixa escapar mesmo com um dt absurdo (sem tunelamento)', () => {
    const moved = stepEntity(entityAt({ vx: 5000, vy: -3000 }), 120, ARENA);

    expect(inBounds(moved)).toBe(true);
  });

  it('estaciona no centro quando a arena é menor que a entidade', () => {
    const tiny: Arena = { width: 5, height: 5 };
    const moved = stepEntity(entityAt({ vx: 100, vy: 100 }), 1, tiny);

    expect(moved.x).toBeCloseTo(2.5);
    expect(moved.y).toBeCloseTo(2.5);
    expect(moved.vx).toBe(0);
    expect(moved.vy).toBe(0);
  });
});

describe('stepAll', () => {
  it('avança todas as entidades e devolve um array novo', () => {
    const entities = [
      entityAt({ x: 50, vx: 100 }),
      entityAt({ x: 150, vx: -100, type: 'paper' }),
    ];
    const moved = stepAll(entities, 0.1, ARENA);

    expect(moved).not.toBe(entities);
    expect(moved).toHaveLength(2);
    expect(moved[0].x).toBeCloseTo(60);
    expect(moved[1].x).toBeCloseTo(140);
    expect(entities[0].x).toBe(50); // originais intactas
  });

  it('lida com lista vazia', () => {
    expect(stepAll([], 1 / 60, ARENA)).toEqual([]);
  });
});
