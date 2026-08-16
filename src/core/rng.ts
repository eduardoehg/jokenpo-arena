import type { Rng } from './spawn';

/**
 * Seed de 32 bits sem sinal.
 *
 * Cabe inteira num inteiro do JavaScript e em 7 caracteres de base 36, o que
 * mantém a URL curta o bastante para ser compartilhada sem encurtador.
 */
export type Seed = number;

export const MAX_SEED = 0xffffffff;

/**
 * mulberry32 — gerador determinístico de 32 bits.
 *
 * Escolhido por ser minúsculo, rápido e ter período e distribuição mais que
 * suficientes para semear uma arena. Não é criptográfico, e não precisa ser:
 * o objetivo é reproduzir uma partida, não resistir a um adversário.
 *
 * A mesma seed produz sempre a mesma sequência, em qualquer navegador — é isso
 * que faz um link reproduzir a partida exata que a outra pessoa viu.
 */
export function mulberry32(seed: Seed): Rng {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

/** Normaliza qualquer número para uma seed válida de 32 bits. */
export function toSeed(value: number): Seed {
  return Math.abs(Math.trunc(value)) % (MAX_SEED + 1) >>> 0;
}

/**
 * Seed nova a partir de `Math.random`.
 *
 * É o único ponto não determinístico do fluxo — e fica isolado aqui de
 * propósito: uma vez sorteada, a partida inteira decorre dela.
 */
export function randomSeed(): Seed {
  return toSeed(Math.random() * (MAX_SEED + 1));
}

/** Seed em base 36, minúscula: compacta e fácil de ler em voz alta. */
export function formatSeed(seed: Seed): string {
  return toSeed(seed).toString(36);
}

/** Lê uma seed em base 36. Devolve `null` se o texto não for uma seed válida. */
export function parseSeed(text: string): Seed | null {
  const trimmed = text.trim().toLowerCase();
  if (!/^[0-9a-z]{1,7}$/.test(trimmed)) return null;

  const value = Number.parseInt(trimmed, 36);
  if (!Number.isFinite(value) || value < 0 || value > MAX_SEED) return null;

  return value >>> 0;
}
