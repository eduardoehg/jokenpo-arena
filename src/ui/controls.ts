import { byClass, byId } from './dom';

/** Multiplicadores de tempo simulado oferecidos pelo HUD. */
export const SPEED_STEPS = [1, 2, 4] as const;

export type SpeedStep = (typeof SPEED_STEPS)[number];

export interface ControlHandlers {
  onSpeedChange(speed: SpeedStep): void;
  onPauseToggle(): void;
  onRestart(): void;
}

export interface Controls {
  /** Reflete a velocidade ativa nos botões. */
  setSpeed(speed: SpeedStep): void;
  /** Reflete o estado de pausa no botão. */
  setPaused(paused: boolean): void;
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
  const restartButton = byId<HTMLButtonElement>('btn-restart');

  for (const button of speedButtons) {
    button.addEventListener('click', () => {
      const value = Number(button.dataset.speed);
      const step = SPEED_STEPS.find((candidate) => candidate === value);
      if (step) handlers.onSpeedChange(step);
    });
  }

  pauseButton.addEventListener('click', () => handlers.onPauseToggle());
  restartButton.addEventListener('click', () => handlers.onRestart());

  return {
    setSpeed(speed) {
      for (const button of speedButtons) {
        button.classList.toggle('active', Number(button.dataset.speed) === speed);
      }
    },

    setPaused(paused) {
      pauseButton.textContent = paused ? 'CONTINUAR' : 'PAUSAR';
      pauseButton.classList.toggle('resumed', paused);
    },
  };
}
