import { parseHistory, type MatchRecord } from './history';

const HISTORY_KEY = 'jokenpo-arena:history';
const SOUND_KEY = 'jokenpo-arena:sound';

/*
 * Leitura e escrita de preferências, tolerantes a `localStorage` indisponível.
 *
 * Navegação anônima e políticas de privacidade podem fazer o acesso lançar em
 * vez de devolver `null`. Preferência é conveniência: se não der para guardar,
 * o app segue com o padrão em vez de quebrar.
 *
 * O idioma não está aqui de propósito: toda visita começa em inglês, e guardar
 * a escolha faria a próxima abrir diferente.
 */

/**
 * Histórico salvo, já validado.
 *
 * `JSON.parse` lança em conteúdo malformado e `parseHistory` descarta o que
 * não tem a forma esperada — juntos, garantem que nada estranho no
 * armazenamento chegue à tela.
 */
export function loadHistory(): MatchRecord[] {
  try {
    const stored = localStorage.getItem(HISTORY_KEY);
    return stored === null ? [] : parseHistory(JSON.parse(stored));
  } catch {
    return [];
  }
}

/**
 * Preferência de som. Ligado por padrão — só desliga quem escolheu desligar.
 *
 * Guarda `'off'` explicitamente em vez de apagar a chave: assim "nunca
 * escolheu" e "escolheu mudo" ficam distinguíveis.
 */
export function loadSoundEnabled(): boolean {
  try {
    return localStorage.getItem(SOUND_KEY) !== 'off';
  } catch {
    return true;
  }
}

export function saveSoundEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(SOUND_KEY, enabled ? 'on' : 'off');
  } catch {
    // Sem persistência: a escolha vale só para esta sessão.
  }
}

export function saveHistory(history: readonly MatchRecord[]): void {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch {
    // Cota estourada ou storage bloqueado: o histórico vale só para esta
    // sessão. Perder as últimas partidas não justifica quebrar o app.
  }
}
