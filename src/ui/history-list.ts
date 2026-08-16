import { byId } from './dom';
import { formatClock } from './format';
import { formatSetup, type MatchRecord } from './history';
import { TYPE_LABELS } from './labels';
import { pad } from './format';

/** Containers que exibem o histórico — ele aparece na config e no fim. */
const CONTAINERS = ['history-config', 'history-end'];

function row(record: MatchRecord): HTMLElement {
  const line = document.createElement('div');
  line.className = 'hist-row';

  const cells: [string, string][] = [
    ['hist-number', `#${pad(record.number, 2)}`],
    [`hist-winner hist-winner--${record.winner}`, TYPE_LABELS[record.winner]],
    ['hist-time', formatClock(record.elapsed)],
    ['hist-setup', formatSetup(record.setup)],
  ];

  for (const [className, text] of cells) {
    const cell = document.createElement('span');
    cell.className = className;
    cell.textContent = text;
    line.append(cell);
  }

  return line;
}

/**
 * Redesenha o histórico nas duas telas que o exibem.
 *
 * Recria as linhas a cada chamada, o que é barato: acontece uma vez por
 * partida, não por quadro.
 */
export function renderHistory(history: readonly MatchRecord[]): void {
  const rows = history.map(row);

  for (const id of CONTAINERS) {
    const container = byId(id);
    container.replaceChildren(...rows.map((node) => node.cloneNode(true)));
  }
}
