import { describe, expect, it } from 'vitest';
import type { Entity } from './entity';
import type { Arena } from './physics';
import { ENTITY_TYPES, type EntityType } from './rules';
import {
  DEFAULT_PORTAL_SPAN,
  SPAWN_EDGES,
  spawnEntities,
  type Edge,
  type Rng,
  type SpawnConfig,
} from './spawn';

const ARENA: Arena = { width: 400, height: 300 };
const RADIUS = 10;
const SPEED = 120;

// bandDepth padrão = min(400, 300) * 0.1
const BAND_DEPTH = 30;

const uniform = (n: number): Record<EntityType, number> => ({
  rock: n,
  paper: n,
  scissors: n,
});

const BASE: SpawnConfig = {
  arena: ARENA,
  counts: uniform(5),
  speed: SPEED,
  radius: RADIUS,
};

/** Rng determinístico que percorre uma lista fixa, em ciclo. */
function sequence(values: number[]): Rng {
  let i = 0;
  return () => values[i++ % values.length];
}

const ofType = (entities: Entity[], type: EntityType): Entity[] =>
  entities.filter((e) => e.type === type);

const insideArena = (e: Entity, arena: Arena): boolean =>
  e.x >= e.radius - 1e-9 &&
  e.x <= arena.width - e.radius + 1e-9 &&
  e.y >= e.radius - 1e-9 &&
  e.y <= arena.height - e.radius + 1e-9;

describe('spawnEntities — quantidades', () => {
  it('cria a população pedida de cada tipo', () => {
    const entities = spawnEntities(BASE, sequence([0.3, 0.7, 0.1]));

    expect(entities).toHaveLength(15);
    expect(ofType(entities, 'rock')).toHaveLength(5);
    expect(ofType(entities, 'paper')).toHaveLength(5);
    expect(ofType(entities, 'scissors')).toHaveLength(5);
  });

  it('aceita populações diferentes por tipo', () => {
    const entities = spawnEntities({
      ...BASE,
      counts: { rock: 30, paper: 45, scissors: 20 },
    });

    expect(entities).toHaveLength(95);
    expect(ofType(entities, 'rock')).toHaveLength(30);
    expect(ofType(entities, 'paper')).toHaveLength(45);
    expect(ofType(entities, 'scissors')).toHaveLength(20);
  });

  it('aceita um tipo zerado', () => {
    const entities = spawnEntities({
      ...BASE,
      counts: { rock: 4, paper: 0, scissors: 4 },
    });

    expect(ofType(entities, 'paper')).toHaveLength(0);
    expect(entities).toHaveLength(8);
  });

  it('devolve lista vazia quando tudo é zero', () => {
    expect(spawnEntities({ ...BASE, counts: uniform(0) })).toEqual([]);
  });

  it('consome exatamente três sorteios por entidade', () => {
    let calls = 0;
    const counting: Rng = () => {
      calls++;
      return 0.5;
    };

    spawnEntities({ ...BASE, counts: uniform(4) }, counting);

    expect(calls).toBe(3 * 4 * 3);
  });
});

describe('spawnEntities — portais', () => {
  const entities = spawnEntities({ ...BASE, counts: uniform(40) });

  it('usa três bordas distintas, uma por tipo', () => {
    expect(new Set(Object.values(SPAWN_EDGES)).size).toBe(3);
    expect(SPAWN_EDGES).toEqual({
      paper: 'top',
      rock: 'left',
      scissors: 'right',
    });
  });

  it('papel nasce no portal Norte', () => {
    for (const e of ofType(entities, 'paper')) {
      expect(e.y).toBeGreaterThanOrEqual(RADIUS);
      expect(e.y).toBeLessThanOrEqual(BAND_DEPTH);
    }
  });

  it('pedra nasce no portal Oeste', () => {
    for (const e of ofType(entities, 'rock')) {
      expect(e.x).toBeGreaterThanOrEqual(RADIUS);
      expect(e.x).toBeLessThanOrEqual(BAND_DEPTH);
    }
  });

  it('tesoura nasce no portal Leste', () => {
    for (const e of ofType(entities, 'scissors')) {
      expect(e.x).toBeGreaterThanOrEqual(ARENA.width - BAND_DEPTH);
      expect(e.x).toBeLessThanOrEqual(ARENA.width - RADIUS);
    }
  });

  it('confina o spawn ao trecho central do portal', () => {
    // O portal cobre `portalSpan` da borda útil, centralizado — é a mesma
    // fração que o render usa para desenhar a barra.
    const usable = ARENA.width - 2 * RADIUS;
    const span = usable * DEFAULT_PORTAL_SPAN;
    const min = RADIUS + (usable - span) / 2;

    for (const e of ofType(entities, 'paper')) {
      expect(e.x).toBeGreaterThanOrEqual(min - 1e-9);
      expect(e.x).toBeLessThanOrEqual(min + span + 1e-9);
    }
  });

  it('respeita um portalSpan customizado', () => {
    const wide = spawnEntities({
      ...BASE,
      counts: uniform(40),
      portalSpan: 1,
    });
    const narrow = spawnEntities({
      ...BASE,
      counts: uniform(40),
      portalSpan: 0.05,
    });

    const spreadOf = (list: Entity[]): number => {
      const xs = list.map((e) => e.x);
      return Math.max(...xs) - Math.min(...xs);
    };

    expect(spreadOf(ofType(wide, 'paper'))).toBeGreaterThan(
      spreadOf(ofType(narrow, 'paper')),
    );
  });

  it('respeita um mapeamento de bordas customizado', () => {
    const edges: Record<EntityType, Edge> = {
      rock: 'bottom',
      paper: 'left',
      scissors: 'top',
    };
    const custom = spawnEntities({ ...BASE, counts: uniform(20), edges });

    for (const e of ofType(custom, 'rock')) {
      expect(e.y).toBeGreaterThanOrEqual(ARENA.height - BAND_DEPTH);
    }
    for (const e of ofType(custom, 'paper')) {
      expect(e.x).toBeLessThanOrEqual(BAND_DEPTH);
    }
  });
});

describe('spawnEntities — posição válida', () => {
  it('nasce inteiramente dentro da arena', () => {
    const entities = spawnEntities({ ...BASE, counts: uniform(100) });

    for (const e of entities) {
      expect(insideArena(e, ARENA)).toBe(true);
    }
  });

  it('continua dentro nos extremos do sorteio', () => {
    for (const value of [0, 0.999999]) {
      const entities = spawnEntities(
        { ...BASE, counts: uniform(3) },
        sequence([value]),
      );

      for (const e of entities) {
        expect(insideArena(e, ARENA)).toBe(true);
      }
    }
  });

  it('não deixa faixa maior que a arena empurrar ninguém para fora', () => {
    const entities = spawnEntities(
      { ...BASE, counts: uniform(20), bandDepth: 10_000 },
      sequence([0.9, 0.99, 0.4]),
    );

    for (const e of entities) {
      expect(insideArena(e, ARENA)).toBe(true);
    }
  });

  it('aplica o raio informado', () => {
    const entities = spawnEntities({ ...BASE, counts: uniform(2), radius: 3 });

    for (const e of entities) {
      expect(e.radius).toBe(3);
    }
  });
});

describe('spawnEntities — direção', () => {
  it('todas saem com o módulo de velocidade pedido', () => {
    const entities = spawnEntities({ ...BASE, counts: uniform(50) });

    for (const e of entities) {
      expect(Math.hypot(e.vx, e.vy)).toBeCloseTo(SPEED);
    }
  });

  it('sai apontando para dentro da arena, nunca para a parede de trás', () => {
    const entities = spawnEntities({ ...BASE, counts: uniform(100) });

    // Papel entra pelo Norte: desce. Pedra pelo Oeste: vai para leste.
    // Tesoura pelo Leste: vai para oeste.
    for (const e of ofType(entities, 'paper')) expect(e.vy).toBeGreaterThan(0);
    for (const e of ofType(entities, 'rock')) expect(e.vx).toBeGreaterThan(0);
    for (const e of ofType(entities, 'scissors')) {
      expect(e.vx).toBeLessThan(0);
    }
  });

  it('respeita a dispersão de ±spread em torno da direção para dentro', () => {
    const spread = 0.4;
    const entities = spawnEntities({ ...BASE, counts: uniform(80), spread });

    for (const e of ofType(entities, 'rock')) {
      // Portal Oeste: direção para dentro é o ângulo 0.
      const angle = Math.atan2(e.vy, e.vx);
      expect(Math.abs(angle)).toBeLessThanOrEqual(spread + 1e-9);
    }
  });

  it('spread zero produz um feixe perfeitamente reto', () => {
    const entities = spawnEntities({ ...BASE, counts: uniform(10), spread: 0 });

    for (const e of ofType(entities, 'rock')) {
      expect(e.vy).toBeCloseTo(0);
      expect(e.vx).toBeCloseTo(SPEED);
    }
  });

  it('mapeia os extremos do sorteio nos limites da dispersão', () => {
    const spread = 0.5;
    // Por entidade a ordem é: along, depth, ângulo.
    const atMin = spawnEntities(
      { ...BASE, counts: { rock: 1, paper: 0, scissors: 0 }, spread },
      sequence([0.5, 0.5, 0]),
    );
    const atMax = spawnEntities(
      { ...BASE, counts: { rock: 1, paper: 0, scissors: 0 }, spread },
      sequence([0.5, 0.5, 1]),
    );

    expect(Math.atan2(atMin[0].vy, atMin[0].vx)).toBeCloseTo(-spread);
    expect(Math.atan2(atMax[0].vy, atMax[0].vx)).toBeCloseTo(spread);
  });

  it('produz direções variadas com rng real', () => {
    const entities = spawnEntities({ ...BASE, counts: uniform(100) });
    const angles = new Set(entities.map((e) => Math.atan2(e.vy, e.vx)));

    expect(angles.size).toBeGreaterThan(50);
  });
});

describe('spawnEntities — determinismo', () => {
  it('a mesma sequência de rng produz exatamente o mesmo spawn', () => {
    const values = [0.11, 0.42, 0.77, 0.03, 0.95, 0.58];

    const first = spawnEntities(BASE, sequence(values));
    const second = spawnEntities(BASE, sequence(values));

    expect(first).toEqual(second);
  });

  it('sequências diferentes produzem spawns diferentes', () => {
    const first = spawnEntities(BASE, sequence([0.1, 0.2, 0.3]));
    const second = spawnEntities(BASE, sequence([0.9, 0.8, 0.7]));

    expect(first).not.toEqual(second);
  });
});

describe('ENTITY_TYPES', () => {
  it('todo tipo tem um portal', () => {
    for (const type of ENTITY_TYPES) {
      expect(SPAWN_EDGES[type]).toBeDefined();
    }
  });
});
