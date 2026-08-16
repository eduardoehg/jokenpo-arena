import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../test/prng';
import {
  buildGrid,
  cellSizeFor,
  findCollidingPairs,
  resolveCollisions,
  type Pair,
} from './collision';
import { createEntity, type Entity } from './entity';
import { ENTITY_TYPES } from './rules';

function ent(over: Partial<Entity> = {}): Entity {
  return createEntity({
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    type: 'rock',
    radius: 10,
    ...over,
  });
}

/** Referência ingênua O(n²) — a verdade contra a qual a grid é conferida. */
function bruteForcePairs(entities: readonly Entity[]): Pair[] {
  const pairs: Pair[] = [];

  for (let i = 0; i < entities.length; i++) {
    for (let j = i + 1; j < entities.length; j++) {
      const dx = entities[j].x - entities[i].x;
      const dy = entities[j].y - entities[i].y;
      const reach = entities[i].radius + entities[j].radius;
      if (dx * dx + dy * dy < reach * reach) pairs.push([i, j]);
    }
  }

  return pairs;
}

function randomEntities(count: number, seed: number, size = 200): Entity[] {
  const rng = mulberry32(seed);

  return Array.from({ length: count }, () =>
    createEntity({
      x: rng() * size,
      y: rng() * size,
      vx: (rng() - 0.5) * 200,
      vy: (rng() - 0.5) * 200,
      type: ENTITY_TYPES[Math.floor(rng() * 3)],
      // Raios variados exercitam o dimensionamento da célula.
      radius: 6 + rng() * 6,
    }),
  );
}

describe('grid', () => {
  it('dimensiona a célula pelo maior diâmetro presente', () => {
    expect(cellSizeFor([ent({ radius: 4 }), ent({ radius: 11 })])).toBe(22);
  });

  it('nunca usa célula de tamanho zero', () => {
    expect(cellSizeFor([])).toBeGreaterThan(0);
    expect(cellSizeFor([ent({ radius: 0 })])).toBeGreaterThan(0);
  });

  it('indexa todas as entidades, sem perder nem duplicar', () => {
    const entities = randomEntities(50, 1);
    const grid = buildGrid(entities);

    const indexed = [...grid.buckets.values()].flat().sort((a, b) => a - b);

    expect(indexed).toEqual(entities.map((_, i) => i));
  });
});

describe('findCollidingPairs — equivalência com a busca ingênua', () => {
  // O ponto do spatial hash grid é ser mais rápido que O(n²) sem perder par
  // nenhum. Estes casos comparam os dois resultados diretamente.
  for (const seed of [1, 2, 3, 7, 13, 42, 99, 1234]) {
    it(`encontra exatamente os mesmos pares que O(n²) (seed ${seed})`, () => {
      const entities = randomEntities(120, seed);

      expect(findCollidingPairs(entities)).toEqual(bruteForcePairs(entities));
    });
  }

  it('funciona com entidades bem espalhadas (poucas colisões)', () => {
    const entities = randomEntities(120, 5, 5000);

    expect(findCollidingPairs(entities)).toEqual(bruteForcePairs(entities));
  });

  it('funciona com coordenadas negativas e muito grandes', () => {
    const entities = [
      ent({ x: -500, y: -500 }),
      ent({ x: -495, y: -500 }),
      ent({ x: 1e6, y: 1e6 }),
      ent({ x: 1e6 + 5, y: 1e6 }),
      ent({ x: 0, y: 0 }),
    ];

    expect(findCollidingPairs(entities)).toEqual(bruteForcePairs(entities));
  });
});

describe('findCollidingPairs — formato do resultado', () => {
  it('devolve pares em ordem canônica e sem repetição', () => {
    const pairs = findCollidingPairs(randomEntities(120, 3));

    const keys = pairs.map(([i, j]) => `${i}:${j}`);
    expect(new Set(keys).size).toBe(pairs.length);

    for (const [i, j] of pairs) expect(i).toBeLessThan(j);

    const sorted = [...pairs].sort((p, q) => p[0] - q[0] || p[1] - q[1]);
    expect(pairs).toEqual(sorted);
  });

  it('não vê colisão em entidades que apenas se encostam', () => {
    // Distância exatamente igual à soma dos raios.
    expect(findCollidingPairs([ent({ x: 0 }), ent({ x: 20 })])).toEqual([]);
  });

  it('vê colisão com a menor invasão possível', () => {
    expect(findCollidingPairs([ent({ x: 0 }), ent({ x: 19.999 })])).toEqual([
      [0, 1],
    ]);
  });

  it('lida com lista vazia ou de um só elemento', () => {
    expect(findCollidingPairs([])).toEqual([]);
    expect(findCollidingPairs([ent()])).toEqual([]);
  });
});

describe('resolveCollisions — conversão', () => {
  const collide = (a: Entity['type'], b: Entity['type']): Entity[] =>
    resolveCollisions([ent({ x: 0, type: a }), ent({ x: 15, type: b })])
      .entities;

  it('pedra converte tesoura', () => {
    expect(collide('rock', 'scissors').map((e) => e.type)).toEqual([
      'rock',
      'rock',
    ]);
  });

  it('tesoura converte papel', () => {
    expect(collide('scissors', 'paper').map((e) => e.type)).toEqual([
      'scissors',
      'scissors',
    ]);
  });

  it('papel converte pedra', () => {
    expect(collide('paper', 'rock').map((e) => e.type)).toEqual([
      'paper',
      'paper',
    ]);
  });

  it('converte igual independente da ordem dos índices', () => {
    expect(collide('scissors', 'rock').map((e) => e.type)).toEqual([
      'rock',
      'rock',
    ]);
  });

  it('não converte entre iguais', () => {
    expect(collide('paper', 'paper').map((e) => e.type)).toEqual([
      'paper',
      'paper',
    ]);
  });

  it('não converte quem não colidiu', () => {
    const { entities } = resolveCollisions([
      ent({ x: 0, type: 'rock' }),
      ent({ x: 300, type: 'scissors' }),
    ]);

    expect(entities.map((e) => e.type)).toEqual(['rock', 'scissors']);
  });
});

describe('resolveCollisions — eventos de conversão', () => {
  it('relata a entidade convertida, o novo tipo e o ponto de impacto', () => {
    const { conversions } = resolveCollisions([
      ent({ x: 0, y: 40, type: 'rock' }),
      ent({ x: 15, y: 40, type: 'scissors' }),
    ]);

    expect(conversions).toEqual([{ index: 1, to: 'rock', x: 7.5, y: 40 }]);
  });

  it('aponta para o perdedor mesmo quando é o índice menor', () => {
    const { conversions } = resolveCollisions([
      ent({ x: 0, type: 'scissors' }),
      ent({ x: 15, type: 'rock' }),
    ]);

    expect(conversions[0].index).toBe(0);
    expect(conversions[0].to).toBe('rock');
  });

  it('usa o ponto de impacto, não a posição já separada', () => {
    const { entities, conversions } = resolveCollisions([
      ent({ x: 0, type: 'rock' }),
      ent({ x: 15, type: 'scissors' }),
    ]);

    // Depois da separação os centros ficam em -2.5 e 17.5; o impacto foi em 7.5.
    expect(conversions[0].x).toBe(7.5);
    expect(entities[0].x).toBeCloseTo(-2.5);
  });

  it('não gera evento em colisão entre iguais', () => {
    const { conversions } = resolveCollisions([
      ent({ x: 0, type: 'paper' }),
      ent({ x: 15, type: 'paper' }),
    ]);

    expect(conversions).toEqual([]);
  });

  it('não gera evento quando ninguém colide', () => {
    const { conversions } = resolveCollisions([
      ent({ x: 0, type: 'rock' }),
      ent({ x: 300, type: 'paper' }),
    ]);

    expect(conversions).toEqual([]);
  });

  it('relata uma conversão por par convertido', () => {
    const { conversions } = resolveCollisions([
      ent({ x: 0, y: 0, type: 'rock' }),
      ent({ x: 15, y: 0, type: 'scissors' }),
      ent({ x: 0, y: 200, type: 'paper' }),
      ent({ x: 15, y: 200, type: 'rock' }),
    ]);

    expect(conversions).toHaveLength(2);
    expect(conversions.map((c) => c.to)).toEqual(['rock', 'paper']);
  });

  it('o índice relatado corresponde à entidade que mudou', () => {
    const { entities: resolved, conversions } = resolveCollisions(
      randomEntities(150, 21),
    );

    expect(conversions.length).toBeGreaterThan(0);

    // Uma entidade pode ser convertida mais de uma vez no mesmo tick; vale o
    // último evento dela.
    const lastPerIndex = new Map(
      conversions.map((conversion) => [conversion.index, conversion.to]),
    );

    for (const [index, type] of lastPerIndex) {
      expect(resolved[index].type).toBe(type);
    }
  });
});

describe('resolveCollisions — física', () => {
  it('separa a sobreposição', () => {
    const [a, b] = resolveCollisions([ent({ x: 0 }), ent({ x: 15 })]).entities;

    expect(Math.hypot(b.x - a.x, b.y - a.y)).toBeCloseTo(20);
  });

  it('troca as componentes normais num choque frontal', () => {
    const [a, b] = resolveCollisions([
      ent({ x: 0, vx: 10 }),
      ent({ x: 15, vx: -10 }),
    ]).entities;

    expect(a.vx).toBeCloseTo(-10);
    expect(b.vx).toBeCloseTo(10);
  });

  it('preserva a componente tangencial', () => {
    const [a, b] = resolveCollisions([
      ent({ x: 0, vx: 10, vy: 55 }),
      ent({ x: 15, vx: -10, vy: -33 }),
    ]).entities;

    expect(a.vy).toBeCloseTo(55);
    expect(b.vy).toBeCloseTo(-33);
  });

  it('não reinverte quem já está se afastando', () => {
    const [a, b] = resolveCollisions([
      ent({ x: 0, vx: -10 }),
      ent({ x: 15, vx: 10 }),
    ]).entities;

    expect(a.vx).toBe(-10);
    expect(b.vx).toBe(10);
  });

  it('conserva a energia cinética total do par', () => {
    const before = [ent({ x: 0, vx: 30, vy: 40 }), ent({ x: 15, vx: -50, vy: 20 })];
    const after = resolveCollisions(before).entities;

    const energy = (list: readonly Entity[]): number =>
      list.reduce((sum, e) => sum + e.vx * e.vx + e.vy * e.vy, 0);

    expect(energy(after)).toBeCloseTo(energy(before));
  });

  it('separa centros coincidentes sem gerar NaN', () => {
    const [a, b] = resolveCollisions([
      ent({ x: 50, y: 50, type: 'rock' }),
      ent({ x: 50, y: 50, type: 'paper' }),
    ]).entities;

    expect(Number.isFinite(a.x)).toBe(true);
    expect(Number.isFinite(b.x)).toBe(true);
    expect(Math.hypot(b.x - a.x, b.y - a.y)).toBeCloseTo(20);
    expect(a.type).toBe('paper');
  });
});

describe('resolveCollisions — pureza e determinismo', () => {
  it('não muta as entidades recebidas', () => {
    const entities = [ent({ x: 0, vx: 10, type: 'rock' }), ent({ x: 15, vx: -10, type: 'scissors' })];
    const snapshot = structuredClone(entities);

    resolveCollisions(entities);

    expect(entities).toEqual(snapshot);
  });

  it('devolve um array novo, com objetos novos', () => {
    const entities = [ent({ x: 0 }), ent({ x: 300 })];
    const { entities: resolved } = resolveCollisions(entities);

    expect(resolved).not.toBe(entities);
    expect(resolved[0]).not.toBe(entities[0]);
  });

  it('a mesma entrada produz sempre a mesma saída', () => {
    const entities = randomEntities(150, 77);

    expect(resolveCollisions(entities)).toEqual(resolveCollisions(entities));
  });
});
