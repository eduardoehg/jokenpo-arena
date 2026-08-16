import type { EntityType } from '../core/rules';

export type Language = 'pt' | 'en';

export const LANGUAGES: readonly Language[] = ['pt', 'en'];

/**
 * Idioma de entrada, antes de qualquer escolha do visitante.
 *
 * Inglês por ser a língua franca de quem chega ao projeto — a preferência do
 * navegador não é consultada de propósito, para que o link abra igual para
 * todo mundo.
 */
export const DEFAULT_LANGUAGE: Language = 'en';

/**
 * Dicionário português.
 *
 * É a fonte da verdade das chaves: `MessageKey` deriva daqui, então esquecer
 * uma tradução no inglês vira erro de compilação, não rótulo vazio em produção.
 */
const PT = {
  subtitle: 'SIMULADOR DE COMBATE · 3 POPULAÇÕES · 1 SOBREVIVENTE',

  typePaper: 'PAPEL',
  typeRock: 'PEDRA',
  typeScissors: 'TESOURA',

  portalNorth: 'PORTAL NORTE',
  portalWest: 'PORTAL OESTE',
  portalEast: 'PORTAL LESTE',

  speedBase: 'VELOCIDADE BASE',
  speedLevel: 'Velocidade',
  startBattle: 'INICIAR BATALHA',
  history: 'HISTÓRICO',

  seed: 'SEED',
  newSeed: 'NOVA',
  seedHint: 'MESMA SEED, MESMA PARTIDA',
  copyLink: 'COPIAR LINK',
  linkCopied: 'COPIADO',

  scoreboard: 'PLACAR TRINÁRIO',
  rules: 'REGRAS',
  rulePaper: 'PAPEL > PEDRA',
  ruleRock: 'PEDRA > TESOURA',
  ruleScissors: 'TESOURA > PAPEL',
  battles: 'BATALHAS',
  livePopulation: 'POPULAÇÃO VIVA',
  elapsedTime: 'TEMPO DECORRIDO',
  speed: 'VELOCIDADE',
  pause: 'PAUSAR',
  resume: 'CONTINUAR',
  restart: 'REINICIAR',
  home: 'INÍCIO',
  soundOn: 'SOM LIGADO',
  soundOff: 'SOM MUDO',

  matchOver: 'FIM DE PARTIDA',
  wins: 'VENCE',
  totalTime: 'TEMPO TOTAL',
  initialSetup: 'SETUP INICIAL',
  populationEvolution: 'EVOLUÇÃO DAS POPULAÇÕES',
  playAgain: 'JOGAR DE NOVO',
  adjustParameters: 'AJUSTAR PARÂMETROS',
} as const;

export type MessageKey = keyof typeof PT;

const EN: Record<MessageKey, string> = {
  subtitle: 'COMBAT SIMULATOR · 3 POPULATIONS · 1 SURVIVOR',

  typePaper: 'PAPER',
  typeRock: 'ROCK',
  typeScissors: 'SCISSORS',

  portalNorth: 'NORTH PORTAL',
  portalWest: 'WEST PORTAL',
  portalEast: 'EAST PORTAL',

  speedBase: 'BASE SPEED',
  speedLevel: 'Speed',
  startBattle: 'START BATTLE',
  history: 'HISTORY',

  seed: 'SEED',
  newSeed: 'NEW',
  seedHint: 'SAME SEED, SAME MATCH',
  copyLink: 'COPY LINK',
  linkCopied: 'COPIED',

  scoreboard: 'TRINARY SCOREBOARD',
  rules: 'RULES',
  rulePaper: 'PAPER > ROCK',
  ruleRock: 'ROCK > SCISSORS',
  ruleScissors: 'SCISSORS > PAPER',
  battles: 'BATTLES',
  livePopulation: 'LIVE POPULATION',
  elapsedTime: 'ELAPSED TIME',
  speed: 'SPEED',
  pause: 'PAUSE',
  resume: 'RESUME',
  restart: 'RESTART',
  home: 'HOME',
  soundOn: 'SOUND ON',
  soundOff: 'MUTED',

  matchOver: 'MATCH OVER',
  wins: 'WINS',
  totalTime: 'TOTAL TIME',
  initialSetup: 'INITIAL SETUP',
  populationEvolution: 'POPULATION EVOLUTION',
  playAgain: 'PLAY AGAIN',
  adjustParameters: 'ADJUST PARAMETERS',
};

export const MESSAGES: Record<Language, Record<MessageKey, string>> = {
  pt: PT,
  en: EN,
};

/** Tag BCP 47 de cada idioma, para o atributo `lang` do documento. */
export const HTML_LANG: Record<Language, string> = {
  pt: 'pt-BR',
  en: 'en',
};

const TYPE_KEYS: Record<EntityType, MessageKey> = {
  paper: 'typePaper',
  rock: 'typeRock',
  scissors: 'typeScissors',
};

export function translate(language: Language, key: MessageKey): string {
  return MESSAGES[language][key];
}

export function isLanguage(value: unknown): value is Language {
  return LANGUAGES.some((language) => language === value);
}

/*
 * Estado corrente.
 *
 * Um único idioma vale para a página inteira, e módulos distantes (botão de
 * pausa, nome do vencedor, histórico) precisam alcançá-lo sem que ele seja
 * enfiado na assinatura de todos eles. As funções acima seguem puras — é só
 * este pedaço que guarda estado.
 */
let current: Language = DEFAULT_LANGUAGE;

export function setLanguage(language: Language): void {
  current = language;
}

export function language(): Language {
  return current;
}

/** Texto traduzido no idioma corrente. */
export function t(key: MessageKey): string {
  return translate(current, key);
}

/** Nome de exibição de um tipo, no idioma corrente. */
export function typeLabel(type: EntityType): string {
  return t(TYPE_KEYS[type]);
}
