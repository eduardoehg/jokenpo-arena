import type { Conversion } from '../core/collision';
import type { EntityType } from '../core/rules';

/** Duração do flash branco na peça convertida, em segundos. */
export const FLASH_DURATION = 0.14;

/** Velocidade de decaimento da explosão: `life` vai de 1 a 0. */
const BURST_DECAY = 4.2;

/** Explosão de conversão: quadrado vazado + faíscas, em coordenadas da arena. */
export interface Burst {
  x: number;
  y: number;
  /** 1 no impacto, 0 ao morrer. */
  life: number;
  winner: EntityType;
}

/**
 * Estado puramente visual dos efeitos.
 *
 * Fica em `render/` porque não é regra do jogo: se sumir, a partida corre
 * igual. É mutável de propósito — é tocado a 60fps e não vale realocar.
 */
export interface Effects {
  bursts: Burst[];
  /** Segundos restantes de flash, por índice de entidade. */
  flash: number[];
}

export function createEffects(entityCount: number): Effects {
  return { bursts: [], flash: new Array<number>(entityCount).fill(0) };
}

/** Registra as conversões de um tick: acende o flash e nasce a explosão. */
export function pushConversions(
  effects: Effects,
  conversions: readonly Conversion[],
): void {
  for (const conversion of conversions) {
    effects.flash[conversion.index] = FLASH_DURATION;
    effects.bursts.push({
      x: conversion.x,
      y: conversion.y,
      life: 1,
      winner: conversion.to,
    });
  }
}

/**
 * Envelhece os efeitos em `dt` segundos.
 *
 * Anda pelo tempo real, não pelo tempo simulado: em 4× a partida acelera, mas
 * a animação de impacto continua legível.
 */
export function advanceEffects(effects: Effects, dt: number): void {
  for (let i = 0; i < effects.flash.length; i++) {
    if (effects.flash[i] > 0) effects.flash[i] = Math.max(0, effects.flash[i] - dt);
  }

  for (const burst of effects.bursts) burst.life -= dt * BURST_DECAY;
  effects.bursts = effects.bursts.filter((burst) => burst.life > 0);
}
