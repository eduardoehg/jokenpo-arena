/**
 * mulberry32 — PRNG determinístico, usado só nos testes.
 *
 * Permite gerar cenários "aleatórios" que são reproduzíveis: um teste que passa
 * hoje passa amanhã, e uma falha pode ser investigada com a mesma seed.
 *
 * Mora fora de `core/` porque é infraestrutura de teste, não regra do jogo. Se
 * o app passar a oferecer partidas reproduzíveis por URL, aí sim vira um
 * `core/rng.ts` com testes próprios.
 */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}
