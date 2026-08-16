/**
 * Vista do canvas: quanto vale um px de CSS e qual o lado útil do quadrado.
 */
export interface CanvasView {
  /** Lado do canvas em px de CSS. Todo desenho acontece nesta escala. */
  size: number;
  /** devicePixelRatio efetivamente aplicado, limitado a 2. */
  dpr: number;
}

/** Teto do devicePixelRatio: acima de 2 o custo dobra sem ganho visível. */
const MAX_DPR = 2;

/**
 * Ajusta o buffer do canvas e devolve a vista para desenhar.
 *
 * Três armadilhas resolvidas aqui:
 *
 * 1. Usa `clientWidth`, não `getBoundingClientRect().width` — este último
 *    inclui a borda de 4px do gabinete e a arena sairia esticada.
 * 2. O buffer é `clientWidth × dpr` arredondado, mantendo múltiplo inteiro da
 *    caixa CSS: é o que impede o sprite de cair em meio-pixel.
 * 3. `imageSmoothingEnabled = false` desliga a interpolação — sem isso a pixel
 *    art fica borrada ao escalar.
 *
 * Escrever em `width`/`height` limpa o canvas e reseta o estado do contexto,
 * mesmo com valor igual, então só escreve quando mudou de fato.
 */
export function syncCanvasSize(ctx: CanvasRenderingContext2D): CanvasView {
  const canvas = ctx.canvas;
  const size = canvas.clientWidth || canvas.width;
  const dpr = Math.min(MAX_DPR, window.devicePixelRatio || 1);

  const buffer = Math.max(1, Math.round(size * dpr));

  if (canvas.width !== buffer || canvas.height !== buffer) {
    canvas.width = buffer;
    canvas.height = buffer;
  }

  // Desenha em coordenadas de CSS; o dpr vira escala do contexto.
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;

  return { size, dpr };
}
