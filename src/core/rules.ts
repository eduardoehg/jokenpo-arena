/**
 * Regras do jokenpo: quem vence quem.
 *
 * Os valores são IDs internos, nunca texto de tela — a tradução para exibição
 * (pt/en) vive em `ui/`, para que o seletor de idioma não toque no `core/`.
 */
export type EntityType = 'rock' | 'paper' | 'scissors';

export const ENTITY_TYPES = ['rock', 'paper', 'scissors'] as const;

/**
 * Fonte única da dominância: `BEATS[a]` é o tipo que `a` derrota.
 *
 * Como mapa total, é impossível ficar incompleto ou contraditório — cada tipo
 * vence exatamente um outro, e o ciclo se fecha.
 */
const BEATS: Record<EntityType, EntityType> = {
  rock: 'scissors',
  scissors: 'paper',
  paper: 'rock',
};

/** `true` se `a` derrota `b`. Sempre `false` quando os tipos são iguais. */
export function beats(a: EntityType, b: EntityType): boolean {
  return BEATS[a] === b;
}

/**
 * Tipo vencedor do confronto, ou `null` se forem iguais.
 *
 * O `null` é o caso de colisão entre iguais: só resolução física, sem
 * conversão. Para tipos distintos um sempre vence o outro, então o retorno
 * é sempre `a` ou `b`.
 */
export function winner(a: EntityType, b: EntityType): EntityType | null {
  if (a === b) return null;
  return beats(a, b) ? a : b;
}
