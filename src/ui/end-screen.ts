import type { EntityType } from '../core/rules';
import { TYPE_COLORS } from '../render/palette';
import { renderIcon } from '../render/sprites';
import { byId } from './dom';
import { formatClock, pad } from './format';
import { formatSetup } from './history';
import { t, typeLabel } from './i18n';
import { segmentLayout } from './scoreboard';
import { CHART_COLUMNS, resample, type Sample } from './timeline';

export interface MatchResult {
  winner: EntityType;
  elapsed: number;
  conversions: number;
  setup: Record<EntityType, number>;
  samples: readonly Sample[];
}

export interface EndHandlers {
  onAgain(): void;
  onAdjust(): void;
}

export interface EndScreen {
  show(result: MatchResult): void;
}

/**
 * Gráfico de evolução: uma coluna por fatia de tempo, empilhada em 100%.
 *
 * Reaproveita `segmentLayout`, o mesmo cálculo do Placar Trinário — assim a
 * ordem das cores no gráfico é idêntica à da barra, e a leitura transfere.
 */
function renderChart(samples: readonly Sample[]): void {
  const columns = resample(samples, CHART_COLUMNS).map((sample) => {
    const column = document.createElement('div');
    column.className = 'chart-col';

    for (const segment of segmentLayout(sample)) {
      const bar = document.createElement('div');
      bar.className = `chart-bar chart-bar--${segment.type}`;
      bar.style.height = `${segment.share * 100}%`;
      column.append(bar);
    }

    return column;
  });

  byId('chart').replaceChildren(...columns);
}

export function createEndScreen(handlers: EndHandlers): EndScreen {
  const icon = byId<HTMLCanvasElement>('winner-icon');
  const name = byId('winner-name');
  const time = byId('end-time');
  const conversions = byId('end-conversions');
  const setup = byId('end-setup');

  byId('btn-again').addEventListener('click', () => handlers.onAgain());
  byId('btn-adjust').addEventListener('click', () => handlers.onAdjust());

  return {
    show(result) {
      renderIcon(icon, result.winner, TYPE_COLORS[result.winner]);

      name.textContent = `${typeLabel(result.winner)}\n${t('wins')}`;
      name.style.color = TYPE_COLORS[result.winner];

      time.textContent = formatClock(result.elapsed);
      conversions.textContent = pad(result.conversions, 4);
      setup.textContent = formatSetup(result.setup);

      renderChart(result.samples);
    },
  };
}
