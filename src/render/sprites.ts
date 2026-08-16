import type { EntityType } from '../core/rules';

/**
 * Sprites 7×7 — a silhueta é o que distingue os tipos sem depender de matiz.
 *
 * Papel é a folha com o canto dobrado, pedra é o bloco maciço, tesoura é o X
 * vazado. As três leem em escala de cinza e a distância.
 */
export const SPRITES: Record<EntityType, readonly string[]> = {
  paper: [
    '.#####.',
    '.#####.',
    '.#####.',
    '.#####.',
    '.#####.',
    '.####..',
    '.###...',
  ],
  rock: [
    '..###..',
    '.#####.',
    '#######',
    '#######',
    '#######',
    '.#####.',
    '..###..',
  ],
  scissors: [
    '#.....#',
    '.#...#.',
    '..#.#..',
    '...#...',
    '..#.#..',
    '.##.##.',
    '.#...#.',
  ],
};

export const SPRITE_SIZE = 7;

/** Lado mínimo da célula, em px de CSS. Abaixo disso a silhueta some. */
export const MIN_CELL = 3;

/**
 * Lado da célula do sprite, em px de CSS.
 *
 * Precisa ser **inteiro**: é o que mantém a pixel art alinhada à grade e sem
 * meio-pixel. Deriva do raio de colisão para que o desenho e a hitbox
 * continuem casados em qualquer tamanho de canvas.
 */
export function cellSize(
  radius: number,
  arenaWidth: number,
  canvasSize: number,
): number {
  const diameterOnScreen = (radius * 2 * canvasSize) / arenaWidth;
  return Math.max(MIN_CELL, Math.round(diameterOnScreen / SPRITE_SIZE));
}

/**
 * Desenha um sprite centrado em `(cx, cy)`, em px de CSS.
 *
 * A origem é arredondada antes do laço — desenhar em coordenada fracionária
 * reintroduz o antialiasing que a estética 8-bit proíbe.
 */
/**
 * Preenche um canvas com o sprite de um tipo, ocupando toda a caixa.
 *
 * Usado nos ícones dos cards de configuração e no sprite gigante do vencedor.
 * Desenha em coordenadas do buffer, não de CSS: o elemento é encolhido pelo
 * `image-rendering: pixelated`, que é o que dá a ampliação sem borrar.
 */
export function renderIcon(
  canvas: HTMLCanvasElement,
  type: EntityType,
  color: string,
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = false;

  const cell = Math.max(1, Math.floor(canvas.width / SPRITE_SIZE));
  drawSprite(ctx, type, canvas.width / 2, canvas.height / 2, cell, color);
}

export function drawSprite(
  ctx: CanvasRenderingContext2D,
  type: EntityType,
  cx: number,
  cy: number,
  cell: number,
  color: string,
): void {
  const rows = SPRITES[type];
  const half = SPRITE_SIZE / 2;
  const originX = Math.round(cx - half * cell);
  const originY = Math.round(cy - half * cell);

  ctx.fillStyle = color;

  for (let row = 0; row < SPRITE_SIZE; row++) {
    const line = rows[row];
    for (let col = 0; col < SPRITE_SIZE; col++) {
      if (line[col] !== '#') continue;
      ctx.fillRect(originX + col * cell, originY + row * cell, cell, cell);
    }
  }
}
