import { describe, expect, it } from 'vitest';
import { createEntity, type Entity } from '../core/entity';
import { ENTITY_TYPES, type EntityType } from '../core/rules';
import type { SimulationState } from '../core/simulation';
import type { CanvasView } from './canvas';
import { createEffects, type Effects } from './effects';
import { FLASH, GRADE, MAGENTA, NOITE, TYPE_COLORS } from './palette';
import { render } from './renderer';
import { SPRITES } from './sprites';

const ARENA = { width: 1000, height: 1000 };
const SIZE = 400;
const RADIUS = 16;

// cellSize(16, 1000, 400) = max(3, round(12.8 / 7)) = 3
const CELL = 3;
const PORTAL_THICKNESS = 5;

const VIEW: CanvasView = { size: SIZE, dpr: 1 };

interface Call {
  method: string;
  args: number[];
  fillStyle: string;
  strokeStyle: string;
  lineWidth: number;
}

/**
 * Contexto 2D falso que anota cada chamada junto com o estilo vigente.
 *
 * Roda no mesmo ambiente Node do `core/`, sem jsdom e sem canvas real — o que
 * interessa aqui é a sequência de comandos, não os pixels.
 */
function stubContext() {
  const calls: Call[] = [];
  const style = { fillStyle: '', strokeStyle: '', lineWidth: 0 };

  const record =
    (method: string) =>
    (...args: number[]): void => {
      calls.push({ method, args, ...style });
    };

  const stub = {
    canvas: { width: SIZE, height: SIZE },
    fillRect: record('fillRect'),
    strokeRect: record('strokeRect'),

    get fillStyle() {
      return style.fillStyle;
    },
    set fillStyle(value: string) {
      style.fillStyle = value;
    },
    get strokeStyle() {
      return style.strokeStyle;
    },
    set strokeStyle(value: string) {
      style.strokeStyle = value;
    },
    get lineWidth() {
      return style.lineWidth;
    },
    set lineWidth(value: number) {
      style.lineWidth = value;
    },
  };

  const fills = (predicate: (call: Call) => boolean): Call[] =>
    calls.filter((call) => call.method === 'fillRect' && predicate(call));

  /** Células de sprite (ou faíscas) pintadas com uma cor. */
  const cellsOf = (color: string): number =>
    fills((call) => call.args[2] === CELL && call.fillStyle === color).length;

  const strokes = (): Call[] =>
    calls.filter((call) => call.method === 'strokeRect');

  return {
    ctx: stub as unknown as CanvasRenderingContext2D,
    calls,
    fills,
    cellsOf,
    strokes,
  };
}

/** Quantos pixels acesos tem a silhueta de um tipo. */
const spritePixels = (type: EntityType): number =>
  SPRITES[type].join('').split('#').length - 1;

function entity(type: EntityType, over: Partial<Entity> = {}): Entity {
  return createEntity({
    x: 500,
    y: 500,
    vx: 0,
    vy: 0,
    type,
    radius: RADIUS,
    ...over,
  });
}

function stateWith(entities: Entity[]): SimulationState {
  return {
    entities,
    arena: ARENA,
    elapsed: 0,
    winner: null,
    conversions: [],
    totalConversions: 0,
  };
}

describe('render — fundo e portais', () => {
  it('cobre o canvas inteiro antes de qualquer outra coisa', () => {
    const { ctx, calls } = stubContext();

    render(ctx, stateWith([]), VIEW, createEffects(0));

    expect(calls[0].method).toBe('fillRect');
    expect(calls[0].args).toEqual([0, 0, SIZE, SIZE]);
    expect(calls[0].fillStyle).toBe(NOITE);
  });

  it('desenha a grade de fundo em 7×7 pontos', () => {
    const { ctx, fills } = stubContext();

    render(ctx, stateWith([]), VIEW, createEffects(0));

    const dots = fills((call) => call.fillStyle === GRADE);
    expect(dots).toHaveLength(49);
    for (const dot of dots) expect(dot.args.slice(2)).toEqual([2, 2]);
  });

  it('desenha um portal por tipo, na cor do tipo', () => {
    const { ctx, fills } = stubContext();

    render(ctx, stateWith([]), VIEW, createEffects(0));

    const portals = fills(
      (call) =>
        call.args[2] === PORTAL_THICKNESS || call.args[3] === PORTAL_THICKNESS,
    );

    expect(portals).toHaveLength(3);
    expect(new Set(portals.map((p) => p.fillStyle))).toEqual(
      new Set(ENTITY_TYPES.map((type) => TYPE_COLORS[type])),
    );
  });

  it('posiciona os portais em Norte, Oeste e Leste', () => {
    const { ctx, fills } = stubContext();

    render(ctx, stateWith([]), VIEW, createEffects(0));

    const portalOf = (type: EntityType): Call =>
      fills(
        (call) =>
          call.fillStyle === TYPE_COLORS[type] &&
          (call.args[2] === PORTAL_THICKNESS ||
            call.args[3] === PORTAL_THICKNESS),
      )[0];

    expect(portalOf('paper').args[1]).toBe(0); // topo
    expect(portalOf('rock').args[0]).toBe(0); // esquerda
    expect(portalOf('scissors').args[0]).toBe(SIZE - PORTAL_THICKNESS); // direita
  });
});

describe('render — silhuetas', () => {
  it('desenha a silhueta 7×7 de cada tipo na cor certa', () => {
    for (const type of ENTITY_TYPES) {
      const { ctx, cellsOf } = stubContext();

      render(ctx, stateWith([entity(type)]), VIEW, createEffects(1));

      expect(cellsOf(TYPE_COLORS[type])).toBe(spritePixels(type));
    }
  });

  it('converte as coordenadas da arena para a escala do canvas', () => {
    const { ctx, fills } = stubContext();

    // Entidade no centro da arena 1000×1000 cai no centro de um canvas de 400.
    render(ctx, stateWith([entity('rock')]), VIEW, createEffects(1));

    const cells = fills(
      (call) => call.args[2] === CELL && call.fillStyle === TYPE_COLORS.rock,
    );
    const xs = cells.map((call) => call.args[0]);
    const centre = (Math.min(...xs) + Math.max(...xs) + CELL) / 2;

    // Tolerância de 1px: a origem do sprite é arredondada de propósito, para
    // não cair em meio-pixel e reintroduzir antialiasing.
    expect(Math.abs(centre - SIZE / 2)).toBeLessThanOrEqual(1);
  });

  it('desenha uma silhueta por entidade', () => {
    const entities = Array.from({ length: 12 }, (_, i) =>
      entity('rock', { x: 100 + i * 50 }),
    );
    const { ctx, cellsOf } = stubContext();

    render(ctx, stateWith(entities), VIEW, createEffects(12));

    expect(cellsOf(TYPE_COLORS.rock)).toBe(12 * spritePixels('rock'));
  });

  it('não desenha silhueta nenhuma com a arena vazia', () => {
    const { ctx, cellsOf } = stubContext();

    render(ctx, stateWith([]), VIEW, createEffects(0));

    for (const type of ENTITY_TYPES) expect(cellsOf(TYPE_COLORS[type])).toBe(0);
  });
});

describe('render — flash de conversão', () => {
  it('pinta de branco a peça com flash ativo', () => {
    const effects = createEffects(1);
    effects.flash[0] = 0.1;

    const { ctx, cellsOf } = stubContext();
    render(ctx, stateWith([entity('rock')]), VIEW, effects);

    expect(cellsOf(FLASH)).toBe(spritePixels('rock'));
    expect(cellsOf(TYPE_COLORS.rock)).toBe(0);
  });

  it('volta à cor do tipo quando o flash acaba', () => {
    const effects = createEffects(1);
    effects.flash[0] = 0;

    const { ctx, cellsOf } = stubContext();
    render(ctx, stateWith([entity('rock')]), VIEW, effects);

    expect(cellsOf(FLASH)).toBe(0);
    expect(cellsOf(TYPE_COLORS.rock)).toBe(spritePixels('rock'));
  });

  it('acende só a peça convertida, não as vizinhas', () => {
    const effects = createEffects(2);
    effects.flash[1] = 0.1;

    const { ctx, cellsOf } = stubContext();
    render(
      ctx,
      stateWith([entity('rock', { x: 200 }), entity('rock', { x: 800 })]),
      VIEW,
      effects,
    );

    expect(cellsOf(FLASH)).toBe(spritePixels('rock'));
    expect(cellsOf(TYPE_COLORS.rock)).toBe(spritePixels('rock'));
  });
});

describe('render — explosão de conversão', () => {
  const burstEffects = (life: number): Effects => {
    const effects = createEffects(0);
    effects.bursts.push({ x: 500, y: 500, life, winner: 'rock' });
    return effects;
  };

  it('desenha o contorno em branco enquanto o impacto é recente', () => {
    const { ctx, strokes } = stubContext();

    render(ctx, stateWith([]), VIEW, burstEffects(0.9));

    expect(strokes()).toHaveLength(1);
    expect(strokes()[0].strokeStyle).toBe(FLASH);
    expect(strokes()[0].lineWidth).toBe(CELL);
  });

  it('assume a cor do vencedor na segunda metade da animação', () => {
    const { ctx, strokes } = stubContext();

    render(ctx, stateWith([]), VIEW, burstEffects(0.3));

    expect(strokes()[0].strokeStyle).toBe(TYPE_COLORS.rock);
  });

  it('cresce conforme a explosão envelhece', () => {
    const early = stubContext();
    render(early.ctx, stateWith([]), VIEW, burstEffects(0.95));

    const late = stubContext();
    render(late.ctx, stateWith([]), VIEW, burstEffects(0.1));

    expect(late.strokes()[0].args[2]).toBeGreaterThan(
      early.strokes()[0].args[2],
    );
  });

  it('usa lado par para manter o contorno na grade de pixels', () => {
    for (const life of [0.9, 0.6, 0.3, 0.05]) {
      const { ctx, strokes } = stubContext();
      render(ctx, stateWith([]), VIEW, burstEffects(life));

      expect(strokes()[0].args[2] % 2).toBe(0);
    }
  });

  it('não solta faíscas no início do impacto', () => {
    const { ctx, cellsOf } = stubContext();

    render(ctx, stateWith([]), VIEW, burstEffects(0.9));

    expect(cellsOf(MAGENTA)).toBe(0);
  });

  it('solta quatro faíscas magenta na segunda metade', () => {
    const { ctx, cellsOf } = stubContext();

    render(ctx, stateWith([]), VIEW, burstEffects(0.5));

    expect(cellsOf(MAGENTA)).toBe(4);
  });

  it('desenha uma explosão por conversão', () => {
    const effects = createEffects(0);
    effects.bursts.push(
      { x: 200, y: 200, life: 0.8, winner: 'rock' },
      { x: 600, y: 600, life: 0.4, winner: 'paper' },
    );

    const { ctx, strokes } = stubContext();
    render(ctx, stateWith([]), VIEW, effects);

    expect(strokes()).toHaveLength(2);
  });

  it('não desenha nada sem explosões ativas', () => {
    const { ctx, strokes } = stubContext();

    render(ctx, stateWith([]), VIEW, createEffects(0));

    expect(strokes()).toHaveLength(0);
  });
});

describe('palette', () => {
  it('define uma cor distinta para cada tipo', () => {
    for (const type of ENTITY_TYPES) {
      expect(TYPE_COLORS[type]).toMatch(/^#[0-9a-f]{6}$/i);
    }
    expect(new Set(Object.values(TYPE_COLORS)).size).toBe(3);
  });
});
