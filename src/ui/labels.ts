import type { EntityType } from '../core/rules';

/**
 * Rótulos em português.
 *
 * Todo texto de tela passa por aqui: os valores de `EntityType` são IDs
 * internos neutros, e é este mapa que o seletor de idioma vai trocar.
 */
export const TYPE_LABELS: Record<EntityType, string> = {
  paper: 'PAPEL',
  rock: 'PEDRA',
  scissors: 'TESOURA',
};

/** Portal de origem de cada tipo, como aparece na tela de configuração. */
export const PORTAL_LABELS: Record<EntityType, string> = {
  paper: 'PORTAL NORTE',
  rock: 'PORTAL OESTE',
  scissors: 'PORTAL LESTE',
};
