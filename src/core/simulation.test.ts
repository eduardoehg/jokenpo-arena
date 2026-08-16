import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../test/prng';
import type { Entity } from './entity';
import type { Arena } from './physics';
import type { EntityType } from './rules';
import type { SpawnConfig } from './spawn';
import {
  countByType,
  createSimulation,
  MAX_DT,
  survivingType,
  tick,
  type SimulationState,
} from './simulation';

const ARENA: Arena = { width: 400, height: 300 };

const uniform = (n: number): Record<EntityType, number> => ({
  rock: n,
  paper: n,
  scissors: n,
});

const CONFIG: SpawnConfig = {
  arena: ARENA,
  counts: uniform(10),
  speed: 140,
  radius: 8,
};

const FRAME = 1 / 60;

const insideArena = (e: Entity, arena: Arena): boolean =>
  e.x >= e.radius - 1e-9 &&
  e.x <= arena.width - e.radius + 1e-9 &&
  e.y >= e.radius - 1e-9 &&
  e.y <= arena.height - e.radius + 1e-9;

describe('countByType', () => {
  it('conta cada tipo e soma o total', () => {
    const state = createSimulation(CONFIG, mulberry32(1));
    const counts = countByType(state.entities);

    expect(counts).toEqual({ rock: 10, paper: 10, scissors: 10 });
    expect(counts.rock + counts.paper + counts.scissors).toBe(30);
  });

  it('zera os tipos ausentes', () => {
    expect(countByType([])).toEqual({ rock: 0, paper: 0, scissors: 0 });
  });
});

describe('survivingType', () => {
  it('é null enquanto há mais de um tipo', () => {
    const state = createSimulation(CONFIG, mulberry32(1));
    expect(survivingType(state.entities)).toBeNull();
  });

  it('é null com a arena vazia', () => {
    expect(survivingType([])).toBeNull();
  });

  it('devolve o tipo quando só resta um', () => {
    const state = createSimulation(CONFIG, mulberry32(1));
    const uniformTypes = state.entities.map((e) => ({
      ...e,
      type: 'paper' as const,
    }));

    expect(survivingType(uniformTypes)).toBe('paper');
  });
});

describe('createSimulation', () => {
  it('começa com o spawn completo, relógio zerado e sem vencedor', () => {
    const state = createSimulation(CONFIG, mulberry32(1));

    expect(state.entities).toHaveLength(30);
    expect(state.elapsed).toBe(0);
    expect(state.winner).toBeNull();
    expect(state.arena).toBe(ARENA);
  });

  it('começa sem conversões registradas', () => {
    const state = createSimulation(CONFIG, mulberry32(1));

    expect(state.conversions).toEqual([]);
    expect(state.totalConversions).toBe(0);
  });

  it('respeita populações diferentes por tipo', () => {
    const state = createSimulation(
      { ...CONFIG, counts: { rock: 30, paper: 45, scissors: 20 } },
      mulberry32(1),
    );

    expect(countByType(state.entities)).toEqual({
      rock: 30,
      paper: 45,
      scissors: 20,
    });
  });

  it('declara vencedor de saída quando só um tipo foi criado', () => {
    const state = createSimulation(
      { ...CONFIG, counts: { rock: 0, paper: 5, scissors: 0 } },
      mulberry32(1),
    );

    expect(state.winner).toBe('paper');
  });
});

describe('tick — relógio', () => {
  it('acumula o tempo simulado', () => {
    let state = createSimulation(CONFIG, mulberry32(1));
    for (let i = 0; i < 60; i++) state = tick(state, FRAME);

    expect(state.elapsed).toBeCloseTo(1);
  });

  it('limita o passo em MAX_DT quando o frame atrasa muito', () => {
    const state = createSimulation(CONFIG, mulberry32(1));

    expect(tick(state, 12).elapsed).toBe(MAX_DT);
  });

  it('trata dt negativo como zero', () => {
    const state = createSimulation(CONFIG, mulberry32(1));

    expect(tick(state, -5).elapsed).toBe(0);
  });
});

describe('tick — pureza', () => {
  it('não muta o estado anterior', () => {
    const state = createSimulation(CONFIG, mulberry32(1));
    const snapshot = structuredClone(state.entities);

    tick(state, FRAME);

    expect(state.entities).toEqual(snapshot);
  });

  it('devolve um estado novo a cada tick', () => {
    const state = createSimulation(CONFIG, mulberry32(1));
    const next = tick(state, FRAME);

    expect(next).not.toBe(state);
    expect(next.entities).not.toBe(state.entities);
  });

  it('é determinístico: mesmo estado e mesmo dt, mesmo resultado', () => {
    const state = createSimulation(CONFIG, mulberry32(9));

    expect(tick(state, FRAME)).toEqual(tick(state, FRAME));
  });
});

describe('tick — conversões', () => {
  // Arena minúscula com dois tipos em rota de colisão: garante conversão.
  const duel: SpawnConfig = {
    arena: { width: 120, height: 120 },
    counts: { rock: 12, paper: 12, scissors: 0 },
    speed: 200,
    radius: 8,
  };

  it('acumula o total de conversões ao longo da partida', () => {
    let state = createSimulation(duel, mulberry32(3));
    let seen = 0;

    for (let i = 0; i < 400; i++) {
      state = tick(state, FRAME);
      seen += state.conversions.length;
      expect(state.totalConversions).toBe(seen);
    }

    expect(seen).toBeGreaterThan(0);
  });

  it('só reporta as conversões do tick corrente', () => {
    let state = createSimulation(duel, mulberry32(3));
    let withConversions = 0;
    let withoutConversions = 0;

    for (let i = 0; i < 400; i++) {
      state = tick(state, FRAME);
      if (state.conversions.length > 0) withConversions++;
      else withoutConversions++;
    }

    // Se `conversions` fosse acumulativo, nunca haveria tick vazio depois da
    // primeira conversão.
    expect(withConversions).toBeGreaterThan(0);
    expect(withoutConversions).toBeGreaterThan(0);
  });

  it('cada conversão aponta para uma entidade dentro da arena', () => {
    let state = createSimulation(duel, mulberry32(5));

    for (let i = 0; i < 200; i++) {
      state = tick(state, FRAME);
      for (const conversion of state.conversions) {
        expect(conversion.index).toBeGreaterThanOrEqual(0);
        expect(conversion.index).toBeLessThan(state.entities.length);
        expect(Number.isFinite(conversion.x)).toBe(true);
        expect(Number.isFinite(conversion.y)).toBe(true);
      }
    }
  });
});

describe('tick — invariantes da arena', () => {
  it('mantém todas as entidades dentro da arena, inclusive após separação', () => {
    // Arena apertada: garante muita colisão junto às paredes, que é onde a
    // separação poderia empurrar alguém para fora.
    const tight: SpawnConfig = {
      arena: { width: 160, height: 160 },
      counts: uniform(25),
      speed: 200,
      radius: 7,
    };

    let state = createSimulation(tight, mulberry32(4));

    for (let i = 0; i < 600; i++) {
      state = tick(state, FRAME);
      for (const entity of state.entities) {
        expect(insideArena(entity, tight.arena)).toBe(true);
      }
    }
  });

  it('nunca cria nem destrói entidades', () => {
    let state = createSimulation(CONFIG, mulberry32(2));

    for (let i = 0; i < 300; i++) {
      state = tick(state, FRAME);
      expect(state.entities).toHaveLength(30);
    }
  });
});

describe('partida completa', () => {
  it('converge para um único tipo e registra o vencedor', () => {
    const config: SpawnConfig = {
      arena: { width: 300, height: 300 },
      counts: uniform(15),
      speed: 160,
      radius: 8,
    };

    let state: SimulationState = createSimulation(config, mulberry32(42));
    let ticks = 0;

    while (state.winner === null && ticks < 60_000) {
      state = tick(state, FRAME);
      ticks++;
    }

    expect(state.winner).not.toBeNull();

    // O vencedor é o único tipo com entidades vivas.
    const counts = countByType(state.entities);
    expect(counts[state.winner!]).toBe(45);
    expect(state.totalConversions).toBeGreaterThan(0);
  });
});

describe('performance', () => {
  it('processa um tick com 300 entidades em menos de 5ms', () => {
    const config: SpawnConfig = {
      arena: { width: 800, height: 600 },
      counts: uniform(100),
      speed: 150,
      radius: 8,
    };

    let state = createSimulation(config, mulberry32(7));
    expect(state.entities).toHaveLength(300);

    // Aquecimento: sem isso a medição pega a compilação JIT.
    for (let i = 0; i < 120; i++) state = tick(state, FRAME);

    const SAMPLES = 300;
    const start = performance.now();
    for (let i = 0; i < SAMPLES; i++) state = tick(state, FRAME);
    const perTick = (performance.now() - start) / SAMPLES;

    expect(perTick).toBeLessThan(5);
  });
});
