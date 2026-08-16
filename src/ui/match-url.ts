import {
  formatSeed,
  parseSeed,
  randomSeed,
  type Seed,
} from '../core/rng';
import {
  MAX_POPULATION,
  MAX_SPEED_LEVEL,
  MIN_POPULATION,
  MIN_SPEED_LEVEL,
  type MatchConfig,
} from './match-config';

/**
 * Parâmetros da URL.
 *
 * Curtos de propósito: o link é feito para ser colado em conversa, e uma query
 * enorme só atrapalha.
 */
const PARAM_SEED = 'seed';
const PARAM_PAPER = 'p';
const PARAM_ROCK = 'r';
const PARAM_SCISSORS = 's';
const PARAM_SPEED = 'v';

export interface SharedMatch {
  config: MatchConfig;
  seed: Seed;
}

/**
 * Monta a query que reproduz uma partida.
 *
 * A seed sozinha não basta: com outra população o mesmo gerador produz uma
 * partida diferente. O link carrega os dois para ser autocontido.
 */
export function encodeMatch(config: MatchConfig, seed: Seed): string {
  const params = new URLSearchParams({
    [PARAM_SEED]: formatSeed(seed),
    [PARAM_PAPER]: String(config.counts.paper),
    [PARAM_ROCK]: String(config.counts.rock),
    [PARAM_SCISSORS]: String(config.counts.scissors),
    [PARAM_SPEED]: String(config.speedLevel),
  });

  return `?${params.toString()}`;
}

function readInteger(
  params: URLSearchParams,
  name: string,
  min: number,
  max: number,
): number | null {
  const raw = params.get(name);
  if (raw === null) return null;

  const value = Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) return null;

  return value;
}

/**
 * Lê uma partida compartilhada da query.
 *
 * Devolve `null` a qualquer sinal de que a URL não descreve uma partida
 * válida. Um link truncado ou adulterado precisa cair no comportamento padrão,
 * não gerar uma arena com população negativa.
 */
export function decodeMatch(search: string): SharedMatch | null {
  const params = new URLSearchParams(search);

  const rawSeed = params.get(PARAM_SEED);
  if (rawSeed === null) return null;

  const seed = parseSeed(rawSeed);
  if (seed === null) return null;

  const paper = readInteger(params, PARAM_PAPER, MIN_POPULATION, MAX_POPULATION);
  const rock = readInteger(params, PARAM_ROCK, MIN_POPULATION, MAX_POPULATION);
  const scissors = readInteger(
    params,
    PARAM_SCISSORS,
    MIN_POPULATION,
    MAX_POPULATION,
  );
  const speedLevel = readInteger(
    params,
    PARAM_SPEED,
    MIN_SPEED_LEVEL,
    MAX_SPEED_LEVEL,
  );

  if (paper === null || rock === null || scissors === null) return null;
  if (speedLevel === null) return null;

  return { config: { counts: { paper, rock, scissors }, speedLevel }, seed };
}

/** Partida compartilhada na URL atual, ou uma seed nova se não houver. */
export function readSharedMatch(
  search: string,
): SharedMatch | { seed: Seed; config: null } {
  return decodeMatch(search) ?? { seed: randomSeed(), config: null };
}

/** URL absoluta que reproduz a partida, para copiar. */
export function shareUrl(
  origin: string,
  pathname: string,
  config: MatchConfig,
  seed: Seed,
): string {
  return `${origin}${pathname}${encodeMatch(config, seed)}`;
}
