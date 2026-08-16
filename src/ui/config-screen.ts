import { ENTITY_TYPES, type EntityType } from '../core/rules';
import { TYPE_COLORS } from '../render/palette';
import { renderIcon } from '../render/sprites';
import { byClass, byId } from './dom';
import { pad } from './format';
import { t } from './i18n';
import {
  MAX_SPEED_LEVEL,
  MIN_SPEED_LEVEL,
  type MatchConfig,
} from './match-config';

export interface ConfigHandlers {
  onBump(type: EntityType, delta: number): void;
  onSpeedLevel(level: number): void;
  onStart(): void;
}

export interface ConfigScreen {
  sync(config: MatchConfig): void;
  /** Reescreve os rótulos que carregam número junto, após troca de idioma. */
  refreshLabels(): void;
}

/**
 * Tela de configuração: três cards de população e a barra de velocidade.
 *
 * Não guarda estado — dispara os handlers e pinta o que o chamador mandar. A
 * config vive no orquestrador.
 */
export function createConfigScreen(handlers: ConfigHandlers): ConfigScreen {
  const counters = ENTITY_TYPES.map((type) => ({
    type,
    element: byId(`cfg-${type}`),
  }));

  const speedValue = byId('cfg-speed');
  const speedCells = buildSpeedCells(handlers);

  for (const canvas of byClass<HTMLCanvasElement>('.card-icon')) {
    const type = canvas.dataset.type as EntityType | undefined;
    if (type) renderIcon(canvas, type, TYPE_COLORS[type]);
  }

  for (const button of byClass<HTMLButtonElement>('[data-bump]')) {
    button.addEventListener('click', () => {
      const type = button.dataset.bump as EntityType | undefined;
      const delta = Number(button.dataset.delta);
      if (type && Number.isFinite(delta)) handlers.onBump(type, delta);
    });
  }

  byId('btn-start').addEventListener('click', () => handlers.onStart());

  return {
    sync(config) {
      for (const counter of counters) {
        counter.element.textContent = pad(config.counts[counter.type]);
      }

      speedValue.textContent = pad(config.speedLevel, 2);

      for (let i = 0; i < speedCells.length; i++) {
        speedCells[i].classList.toggle('lit', i < config.speedLevel);
      }
    },

    refreshLabels() {
      for (const cell of speedCells) {
        const level = cell.dataset.speedLevel ?? '';
        cell.setAttribute('aria-label', `${t('speedLevel')} ${level}`);
      }
    },
  };
}

/** A barra de velocidade é feita de células clicáveis, uma por nível. */
function buildSpeedCells(handlers: ConfigHandlers): HTMLButtonElement[] {
  const container = byId('speed-cells');
  const cells: HTMLButtonElement[] = [];

  for (let level = MIN_SPEED_LEVEL; level <= MAX_SPEED_LEVEL; level++) {
    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = 'speed-cell';
    // O número é sufixo do rótulo traduzido; `refreshSpeedCellLabels` reescreve
    // isto quando o idioma muda.
    cell.dataset.speedLevel = String(level);
    cell.setAttribute('aria-label', `${t('speedLevel')} ${level}`);
    cell.addEventListener('click', () => handlers.onSpeedLevel(level));
    cells.push(cell);
  }

  container.replaceChildren(...cells);
  return cells;
}
