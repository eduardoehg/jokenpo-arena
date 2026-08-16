import { byClass, byId } from './dom';
import { t } from './i18n';

/** Multiplicadores de tempo simulado oferecidos pelo HUD. */
export const SPEED_STEPS = [1, 2, 4] as const;

export type SpeedStep = (typeof SPEED_STEPS)[number];

export interface ControlHandlers {
  onSpeedChange(speed: SpeedStep): void;
  onPauseToggle(): void;
  onSoundToggle(): void;
  onRestart(): void;
  onHome(): void;
}

export interface Controls {
  /** Reflete a velocidade ativa nos botões. */
  setSpeed(speed: SpeedStep): void;
  /** Reflete o estado de pausa no botão. */
  setPaused(paused: boolean): void;
  /** Reflete o estado do som no botão. */
  setSound(enabled: boolean): void;
}

/**
 * Botões de velocidade, pausa e reinício.
 *
 * Não guarda estado: apenas dispara os handlers e pinta o que o chamador
 * mandar. Quem é dono do estado da partida é o loop.
 */
export function createControls(handlers: ControlHandlers): Controls {
  const speedButtons = byClass<HTMLButtonElement>('.speed-btn');
  const pauseButton = byId<HTMLButtonElement>('btn-pause');
  const soundButton = byId<HTMLButtonElement>('btn-sound');
  const restartButton = byId<HTMLButtonElement>('btn-restart');
  const homeButton = byId<HTMLButtonElement>('btn-home');

  for (const button of speedButtons) {
    button.addEventListener('click', () => {
      const value = Number(button.dataset.speed);
      const step = SPEED_STEPS.find((candidate) => candidate === value);
      if (step) handlers.onSpeedChange(step);
    });
  }

  pauseButton.addEventListener('click', () => handlers.onPauseToggle());
  soundButton.addEventListener('click', () => handlers.onSoundToggle());
  restartButton.addEventListener('click', () => handlers.onRestart());
  homeButton.addEventListener('click', () => handlers.onHome());

  return {
    setSpeed(speed) {
      for (const button of speedButtons) {
        button.classList.toggle('active', Number(button.dataset.speed) === speed);
      }
    },

    setPaused(paused) {
      // Traduzido na hora: o rótulo depende do estado, então `data-i18n` não
      // daria conta e a troca de idioma precisa passar por aqui de novo.
      pauseButton.textContent = paused ? t('resume') : t('pause');
      pauseButton.classList.toggle('resumed', paused);
    },

    setSound(enabled) {
      soundButton.textContent = enabled ? t('soundOn') : t('soundOff');
      soundButton.classList.toggle('muted', !enabled);
      soundButton.setAttribute('aria-pressed', String(enabled));
    },
  };
}
