/**
 * Número com zero à esquerda, em largura fixa.
 *
 * A fonte display tem largura tabular: sem o preenchimento, o HUD dança a cada
 * mudança de casa decimal.
 */
export function pad(value: number, digits = 3): string {
  return String(Math.max(0, Math.trunc(value))).padStart(digits, '0');
}

/** Relógio da partida no formato `MM:SS`. Satura em `99:59`. */
export function formatClock(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(total / 60);

  // Estourar os dois dígitos quebraria a largura fixa do HUD.
  if (minutes > 99) return '99:59';

  return `${pad(minutes, 2)}:${pad(total % 60, 2)}`;
}
