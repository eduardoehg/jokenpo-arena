import { ENTITY_TYPES } from '../core/rules';
import { countByType, type SimulationState } from '../core/simulation';
import { byId } from './dom';
import { formatClock, pad } from './format';

export interface Hud {
  sync(state: SimulationState): void;
}

/**
 * HUD lateral: população viva, relógio e contador de conversões.
 *
 * Escreve direto nos nós já existentes no markup — nada de recriar a tela a
 * 60fps. Só toca no DOM quando o texto muda de fato, o que evita invalidar
 * layout à toa em cada quadro.
 */
export function createHud(): Hud {
  const counters = ENTITY_TYPES.map((type) => ({
    type,
    element: byId(`count-${type}`),
  }));

  const clock = byId('clock');
  const battles = byId('battles');

  const write = (element: HTMLElement, text: string): void => {
    if (element.textContent !== text) element.textContent = text;
  };

  return {
    sync(state) {
      const counts = countByType(state.entities);
      for (const counter of counters) {
        write(counter.element, pad(counts[counter.type]));
      }

      write(clock, formatClock(state.elapsed));
      write(battles, pad(state.totalConversions, 4));
    },
  };
}
