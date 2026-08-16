import { ENTITY_TYPES, type EntityType } from '../core/rules';
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

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isSetup(value: unknown): value is Record<EntityType, number> {
  if (typeof value !== 'object' || value === null) return false;

  const record = value as Record<string, unknown>;
  return ENTITY_TYPES.every((type) => isFiniteNumber(record[type]));
}

function isMatchRecord(value: unknown): value is MatchRecord {
  if (typeof value !== 'object' || value === null) return false;

  const record = value as Record<string, unknown>;

  return (
    isFiniteNumber(record.number) &&
    isFiniteNumber(record.elapsed) &&
    isFiniteNumber(record.conversions) &&
    ENTITY_TYPES.some((type) => type === record.winner) &&
    isSetup(record.setup)
  );
}

/**
 * Valida o histórico lido do armazenamento.
 *
 * O conteúdo do `localStorage` é entrada não confiável: pode ter sido escrito
 * por uma versão antiga do app, editado à mão, ou corrompido. Registros
 * inválidos são descartados individualmente — um item estragado não deve
 * derrubar os outros cinco.
 */
export function parseHistory(value: unknown): MatchRecord[] {
  if (!Array.isArray(value)) return [];

  return value.filter(isMatchRecord).slice(0, HISTORY_LIMIT);
}
