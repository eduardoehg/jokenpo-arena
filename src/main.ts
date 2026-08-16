// Só o subset latino: o import padrão traz cirílico, grego e vietnamita, que
// esta interface nunca usa e pesariam mais que o resto do bundle inteiro.
import '@fontsource/press-start-2p/latin-400.css';
import '@fontsource/ibm-plex-mono/latin-400.css';
import '@fontsource/ibm-plex-mono/latin-600.css';
import './style.css';

import type { Arena } from './core/physics';
import { mulberry32, randomSeed, type Seed } from './core/rng';
import type { EntityType } from './core/rules';
import { countByType, createSimulation, tick } from './core/simulation';
import { syncCanvasSize } from './render/canvas';
import {
  advanceEffects,
  createEffects,
  pushConversions,
} from './render/effects';
import { render } from './render/renderer';
import { createAudio } from './ui/audio';
import { createConfigScreen } from './ui/config-screen';
import { createControls, type SpeedStep } from './ui/controls';
import { byId } from './ui/dom';
import { createEndScreen, type MatchResult } from './ui/end-screen';
import { pushMatch, type MatchRecord } from './ui/history';
import { DEFAULT_LANGUAGE, setLanguage } from './ui/i18n';
import { createLanguageSwitch } from './ui/language-switch';
import { createMotionPreference } from './ui/motion';
import {
  loadHistory,
  loadLanguage,
  loadSoundEnabled,
  saveHistory,
  saveSoundEnabled,
} from './ui/preferences';
import { renderHistory } from './ui/history-list';
import { createHud } from './ui/hud';
import {
  bumpPopulation,
  defaultMatchConfig,
  setSpeedLevel,
  toSpawnConfig,
} from './ui/match-config';
import { encodeMatch, readSharedMatch } from './ui/match-url';
import { createScoreboard } from './ui/scoreboard';
import { createScreens } from './ui/screens';
import { createTimeline, sampleTimeline } from './ui/timeline';

/** Arena em unidades lógicas. O canvas escala; a partida não muda. */
const ARENA: Arena = { width: 1000, height: 1000 };

/**
 * Passo fixo da simulação, em segundos.
 *
 * Desacopla a física do FPS de verdade: seja o monitor de 60Hz ou de 144Hz, a
 * partida avança nos mesmos incrementos. O `MAX_SUBSTEPS` é a válvula de
 * escape — sem ele, um quadro atrasado dispararia uma avalanche de subpassos
 * que atrasaria o próximo quadro ainda mais, em espiral.
 */
const SUBSTEP = 1 / 120;
const MAX_SUBSTEPS = 8;

/** Teto do intervalo entre quadros: protege contra aba em segundo plano. */
const MAX_FRAME_DT = 0.05;

/** Congelamento no instante da conversão — é o que dá peso ao golpe. */
const HIT_STOP = 0.035;

/**
 * Intervalo mínimo entre dois congelamentos.
 *
 * Sem isto, na fase quente da partida há várias conversões por segundo e o
 * hit-stop deixa de ser ênfase para virar engasgo permanente.
 */
const HIT_STOP_COOLDOWN = 0.15;

/**
 * Resolve o contexto 2D ou falha alto.
 *
 * O `throw` devolve um tipo não-nulo, o que mantém o `ctx` estreitado dentro do
 * loop — checar com `if` aqui fora não sobreviveria ao closure.
 */
function arenaContext(): CanvasRenderingContext2D {
  const canvas = byId<HTMLCanvasElement>('arena');
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Contexto 2D indisponível neste navegador.');
  return context;
}

/**
 * Idioma antes de tudo: os módulos de UI leem rótulos traduzidos já na
 * construção, então trocar depois deixaria texto obsoleto na tela.
 *
 * Entra sempre em inglês, a menos que o visitante já tenha escolhido outro. A
 * preferência do navegador não é consultada: o link abre igual para todo mundo.
 */
setLanguage(loadLanguage() ?? DEFAULT_LANGUAGE);

const motion = createMotionPreference();
const audio = createAudio(loadSoundEnabled());

const ctx = arenaContext();
const screens = createScreens('config');
const hud = createHud();
const scoreboard = createScoreboard();

/**
 * Partida vinda de um link compartilhado, se houver.
 *
 * Sem link válido, sorteia-se uma seed e a configuração fica no padrão. É o
 * único ponto não determinístico: dali em diante a partida inteira decorre da
 * seed.
 */
const shared = readSharedMatch(window.location.search);

let matchConfig = shared.config ?? defaultMatchConfig();
let seed: Seed = shared.seed;

/** Populações e seed com que a partida corrente começou, para o resumo. */
let setup = { ...matchConfig.counts };
let matchSeed = seed;

let state = createSimulation(
  toSpawnConfig(matchConfig, ARENA),
  mulberry32(seed),
);
let effects = createEffects(state.entities.length);
let timeline = createTimeline(countByType(state.entities));
let history: MatchRecord[] = loadHistory();

/** Última partida encerrada, para redesenhar a tela de fim ao trocar idioma. */
let lastResult: MatchResult | null = null;

let speed: SpeedStep = 1;
let paused = false;
let accumulator = 0;
let hitStop = 0;
let sinceHitStop = HIT_STOP_COOLDOWN;
let lastFrame = performance.now();

/**
 * Começa uma partida com a seed corrente, ou com a que for passada.
 *
 * A URL é reescrita com `replaceState` para que a barra de endereço sempre
 * descreva a partida em curso — compartilhar vira copiar o endereço, e o
 * histórico do navegador não fica poluído com uma entrada por partida.
 */
function startMatch(nextSeed?: Seed): void {
  // Chega aqui sempre por clique, que é o gesto que a política de autoplay
  // exige para o áudio sair do estado suspenso.
  audio.unlock();

  if (nextSeed !== undefined) seed = nextSeed;

  setup = { ...matchConfig.counts };
  matchSeed = seed;

  window.history.replaceState(null, '', encodeMatch(matchConfig, seed));

  state = createSimulation(
    toSpawnConfig(matchConfig, ARENA),
    mulberry32(seed),
  );
  effects = createEffects(state.entities.length);
  timeline = createTimeline(countByType(state.entities));

  accumulator = 0;
  hitStop = 0;
  paused = false;
  speed = 1;

  controls.setPaused(false);
  controls.setSpeed(1);
  screens.show('arena');
}

function finishMatch(winner: EntityType): void {
  const result = {
    winner,
    elapsed: state.elapsed,
    conversions: state.totalConversions,
    setup,
    seed: matchSeed,
  };

  audio.victory(winner);

  history = pushMatch(history, result);
  saveHistory(history);
  renderHistory(history);

  lastResult = { ...result, samples: timeline.samples };
  endScreen.show(lastResult);
  screens.show('end');
}

/**
 * Redesenha tudo que não é `data-i18n` depois de trocar de idioma.
 *
 * O texto estático o próprio switch reescreve; sobra o que é gerado em
 * runtime — botão de pausa, rótulos com número, nomes de tipo no histórico e
 * na tela de fim.
 */
function refreshLanguage(): void {
  languageSwitch.apply();
  configScreen.sync(matchConfig, seed);
  configScreen.refreshLabels();
  controls.setPaused(paused);
  controls.setSound(audio.enabled());
  renderHistory(history);
  if (lastResult) endScreen.show(lastResult);
}

const configScreen = createConfigScreen({
  onBump(type, delta) {
    matchConfig = bumpPopulation(matchConfig, type, delta);
    configScreen.sync(matchConfig, seed);
  },

  onSpeedLevel(level) {
    matchConfig = setSpeedLevel(matchConfig, level);
    configScreen.sync(matchConfig, seed);
  },

  onNewSeed() {
    seed = randomSeed();
    configScreen.sync(matchConfig, seed);
  },

  onStart: () => startMatch(),
});

const endScreen = createEndScreen({
  // Partida nova pede seed nova; para repetir a mesma, o link continua valendo.
  onAgain: () => startMatch(randomSeed()),

  onAdjust() {
    configScreen.sync(matchConfig, seed);
    screens.show('config');
  },

  shareUrl: () => window.location.href,
});

const languageSwitch = createLanguageSwitch(refreshLanguage);

const controls = createControls({
  onSpeedChange(next) {
    speed = next;
    controls.setSpeed(next);
  },

  onPauseToggle() {
    paused = !paused;
    controls.setPaused(paused);
  },

  onSoundToggle() {
    audio.setEnabled(!audio.enabled());
    saveSoundEnabled(audio.enabled());
    controls.setSound(audio.enabled());
  },

  // Reiniciar repete a mesma seed: é a mesma partida de novo, do zero.
  onRestart: () => startMatch(),

  onHome() {
    // Sai da arena com a partida pausada: voltar não deve fazer o jogador
    // perder o que estava acontecendo enquanto mexe na configuração.
    paused = true;
    controls.setPaused(true);
    configScreen.sync(matchConfig, seed);
    screens.show('config');
  },
});

/** Avança a simulação em passos fixos, consumindo o tempo do quadro. */
function simulate(dt: number): void {
  accumulator += dt * speed;
  let steps = 0;

  while (accumulator >= SUBSTEP && steps < MAX_SUBSTEPS) {
    accumulator -= SUBSTEP;
    steps++;

    state = tick(state, SUBSTEP);
    if (state.conversions.length === 0) continue;

    // Movimento reduzido: nada de flash, explosão ou congelamento. A partida
    // continua correndo — ela é o conteúdo, não um efeito.
    if (motion.reduced()) continue;

    pushConversions(effects, state.conversions);

    if (sinceHitStop >= HIT_STOP_COOLDOWN) {
      hitStop = HIT_STOP;
      sinceHitStop = 0;

      // O bleep segue o mesmo intervalo mínimo do congelamento. Uma nota por
      // conversão viraria ruído branco no auge da partida.
      audio.conversion(state.conversions[0].to);

      break; // congela já neste quadro, não no seguinte
    }
  }

  // Estourou o orçamento de subpassos: descarta o resto em vez de acumular
  // uma dívida de tempo que nunca seria paga.
  if (steps === MAX_SUBSTEPS) accumulator = 0;
}

function frame(now: number): void {
  const dt = Math.min(Math.max(0, now - lastFrame) / 1000, MAX_FRAME_DT);
  lastFrame = now;
  sinceHitStop += dt;

  if (screens.current() === 'arena') {
    if (!paused) {
      if (hitStop > 0) hitStop -= dt;
      else simulate(dt);
    }

    // Os efeitos andam pelo tempo real, não pelo simulado: em 4× a partida
    // acelera, mas a animação de impacto continua legível.
    advanceEffects(effects, dt);

    const counts = countByType(state.entities);
    sampleTimeline(timeline, state.elapsed, counts);

    const view = syncCanvasSize(ctx);
    render(ctx, state, view, effects);
    hud.sync(state);
    scoreboard.sync(counts);

    // Desenha o quadro final antes de trocar de tela: o jogador vê o golpe
    // que decidiu a partida.
    if (state.winner !== null) finishMatch(state.winner);
  }

  requestAnimationFrame(frame);
}

languageSwitch.apply();
configScreen.sync(matchConfig, seed);
controls.setSpeed(speed);
controls.setPaused(paused);
controls.setSound(audio.enabled());
renderHistory(history);
requestAnimationFrame(frame);
