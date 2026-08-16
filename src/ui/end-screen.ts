import { formatSeed, type Seed } from '../core/rng';
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
  seed: Seed;
  samples: readonly Sample[];
}

export interface EndHandlers {
  onAgain(): void;
  /** Volta para a tela inicial, onde os parâmetros são ajustados. */
  onHome(): void;
  /** Devolve a URL que reproduz a partida recém-encerrada. */
  shareUrl(): string;
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

/** Quanto tempo o botão de compartilhar mostra a confirmação. */
const COPIED_FEEDBACK_MS = 1800;

export function createEndScreen(handlers: EndHandlers): EndScreen {
  const icon = byId<HTMLCanvasElement>('winner-icon');
  const name = byId('winner-name');
  const time = byId('end-time');
  const battles = byId('end-battles');
  const setup = byId('end-setup');
  const seedValue = byId('end-seed');
  const share = byId<HTMLButtonElement>('btn-share');

  let copiedTimer: ReturnType<typeof setTimeout> | undefined;

  byId('btn-again').addEventListener('click', () => handlers.onAgain());
  byId('btn-end-home').addEventListener('click', () => handlers.onHome());

  share.addEventListener('click', () => {
    void copyShareUrl();
  });

  /**
   * Copia o link da partida.
   *
   * A API de clipboard exige contexto seguro e gesto do usuário — o clique
   * atende ao segundo, mas em `http://` sem TLS ela simplesmente não existe.
   * Nesse caso o rótulo não muda, para não mentir que copiou.
   */
  async function copyShareUrl(): Promise<void> {
    try {
      await navigator.clipboard.writeText(handlers.shareUrl());
    } catch {
      return;
    }

    clearTimeout(copiedTimer);
    share.textContent = t('linkCopied');
    copiedTimer = setTimeout(() => {
      share.textContent = t('copyLink');
    }, COPIED_FEEDBACK_MS);
  }

  return {
    show(result) {
      // Cancela a confirmação pendente: o link agora é de outra partida.
      clearTimeout(copiedTimer);
      share.textContent = t('copyLink');
      seedValue.textContent = formatSeed(result.seed);

      renderIcon(icon, result.winner, TYPE_COLORS[result.winner]);

      name.textContent = `${typeLabel(result.winner)}\n${t('wins')}`;
      name.style.color = TYPE_COLORS[result.winner];

      time.textContent = formatClock(result.elapsed);
      battles.textContent = pad(result.conversions, 4);
      setup.textContent = formatSetup(result.setup);

      renderChart(result.samples);
    },
  };
}
