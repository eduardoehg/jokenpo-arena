import type { EntityType } from '../core/rules';
import { DISPLAY_ORDER } from './scoreboard';

/** Quantas partidas o histórico guarda. */
export const HISTORY_LIMIT = 6;

export interface MatchRecord {
  /** Número sequencial da partida, do primeiro para o último. */
  number: number;
  winner: EntityType;
  /** Duração em segundos de tempo simulado. */
  elapsed: number;
  conversions: number;
  setup: Record<EntityType, number>;
}

/**
 * Insere uma partida no topo e descarta o excedente.
 *
 * O número é atribuído aqui, a partir do último registrado — assim ele
 * acompanha a partida mesmo depois de ela sair da janela das seis.
 */
export function pushMatch(
  history: readonly MatchRecord[],
  record: Omit<MatchRecord, 'number'>,
): MatchRecord[] {
  const number = (history[0]?.number ?? 0) + 1;
  return [{ ...record, number }, ...history].slice(0, HISTORY_LIMIT);
}

/** Setup inicial no formato `30/30/30`, na ordem visual da barra. */
export function formatSetup(setup: Record<EntityType, number>): string {
  return DISPLAY_ORDER.map((type) => setup[type]).join('/');
}
