import type { EntityType } from '../core/rules';

/**
 * Tokens da direção retro arcade. Espelham as variáveis CSS em `style.css` —
 * o canvas não lê CSS, então as cores precisam existir dos dois lados.
 */
export const NOITE = '#0B0B14';
export const GABINETE = '#1A1A2E';
export const LINHA = '#2E2E4D';
export const MAGENTA = '#FF2E88';

/** Pontos da grade de fundo da arena. */
export const GRADE = '#1C1C30';

/**
 * Cor por tipo.
 *
 * As luminâncias relativas são distintas (papel ≈ 0.89, tesoura ≈ 0.60,
 * pedra ≈ 0.25) e a ordenação sobrevive a deuteranopia e protanopia. Ainda
 * assim, o canal primário de identificação é a silhueta do sprite.
 */
export const TYPE_COLORS: Record<EntityType, string> = {
  paper: '#F5F1E0',
  rock: '#3B82F6',
  scissors: '#FFC233',
};

/** Branco puro do flash de conversão — os dois frames antes da nova silhueta. */
export const FLASH = '#FFFFFF';
