import type { SimulationState } from '../core/simulation';
import { SPAWN_EDGES, DEFAULT_PORTAL_SPAN, type Edge } from '../core/spawn';
import { ENTITY_TYPES } from '../core/rules';
import type { CanvasView } from './canvas';
import type { Effects } from './effects';
import { FLASH, GRADE, MAGENTA, NOITE, TYPE_COLORS } from './palette';
import { cellSize, drawSprite } from './sprites';

/** Divisões da grade de fundo. */
const GRID_DIVISIONS = 8;

/** Espessura da barra do portal, em px de CSS. */
const PORTAL_THICKNESS = 5;

/** Enquanto `life` está acima disto, a explosão ainda é branca. */
const BURST_WHITE_UNTIL = 0.55;

/** Abaixo disto, as faíscas magenta aparecem. */
const SPARK_AFTER = 0.75;

const BURST_MIN = 4;
const BURST_GROWTH = 22;

function drawGrid(ctx: CanvasRenderingContext2D, size: number): void {
  ctx.fillStyle = GRADE;

  for (let i = 1; i < GRID_DIVISIONS; i++) {
    for (let j = 1; j < GRID_DIVISIONS; j++) {
      const x = Math.round((i * size) / GRID_DIVISIONS) - 1;
      const y = Math.round((j * size) / GRID_DIVISIONS) - 1;
      ctx.fillRect(x, y, 2, 2);
    }
  }
}

/** Barra do portal, centralizada e do mesmo comprimento do trecho de spawn. */
function drawPortal(
  ctx: CanvasRenderingContext2D,
  edge: Edge,
  size: number,
  color: string,
): void {
  const span = size * DEFAULT_PORTAL_SPAN;
  const start = (size - span) / 2;
  const t = PORTAL_THICKNESS;

  ctx.fillStyle = color;

  switch (edge) {
    case 'top':
      ctx.fillRect(start, 0, span, t);
      break;
    case 'bottom':
      ctx.fillRect(start, size - t, span, t);
      break;
    case 'left':
      ctx.fillRect(0, start, t, span);
      break;
    case 'right':
      ctx.fillRect(size - t, start, t, span);
      break;
  }
}

/**
 * Quadrado vazado explodindo + quatro faíscas magenta.
 *
 * Branco enquanto o impacto é recente, depois assume a cor do vencedor. As
 * faíscas são o único uso do acento dentro da arena.
 */
function drawBursts(
  ctx: CanvasRenderingContext2D,
  effects: Effects,
  toScreen: (value: number) => number,
  cell: number,
): void {
  for (const burst of effects.bursts) {
    const age = 1 - burst.life;
    // Lado sempre par: mantém o contorno centrado na grade de pixels.
    const side = Math.round((BURST_MIN + age * BURST_GROWTH) / 2) * 2;
    const cx = Math.round(toScreen(burst.x));
    const cy = Math.round(toScreen(burst.y));

    ctx.strokeStyle =
      burst.life > BURST_WHITE_UNTIL ? FLASH : TYPE_COLORS[burst.winner];
    ctx.lineWidth = cell;
    ctx.strokeRect(cx - side / 2, cy - side / 2, side, side);

    if (burst.life >= SPARK_AFTER) continue;

    ctx.fillStyle = MAGENTA;
    const reach = Math.round(side * 0.85);
    for (const [dx, dy] of [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ]) {
      ctx.fillRect(cx + dx * reach, cy + dy * reach, cell, cell);
    }
  }
}

/**
 * Desenha um quadro. Só lê o estado — nunca o modifica.
 *
 * O contexto está em px de CSS (ver `syncCanvasSize`), então as coordenadas da
 * arena são convertidas aqui pela razão `size / arena.width`.
 */
export function render(
  ctx: CanvasRenderingContext2D,
  state: SimulationState,
  view: CanvasView,
  effects: Effects,
): void {
  const { size } = view;
  const { arena, entities } = state;
  const scale = size / arena.width;
  const toScreen = (value: number): number => value * scale;

  ctx.fillStyle = NOITE;
  ctx.fillRect(0, 0, size, size);

  drawGrid(ctx, size);

  for (const type of ENTITY_TYPES) {
    drawPortal(ctx, SPAWN_EDGES[type], size, TYPE_COLORS[type]);
  }

  const cell = cellSize(entities[0]?.radius ?? 0, arena.width, size);

  for (let i = 0; i < entities.length; i++) {
    const entity = entities[i];
    const color = effects.flash[i] > 0 ? FLASH : TYPE_COLORS[entity.type];
    drawSprite(ctx, entity.type, toScreen(entity.x), toScreen(entity.y), cell, color);
  }

  drawBursts(ctx, effects, toScreen, cell);
}
