import { parseHistory, type MatchRecord } from './history';
import { isLanguage, type Language } from './i18n';

const LANGUAGE_KEY = 'jokenpo-arena:language';
const HISTORY_KEY = 'jokenpo-arena:history';

/**
 * Leitura e escrita de preferências, tolerantes a `localStorage` indisponível.
 *
 * Navegação anônima e políticas de privacidade podem fazer o acesso lançar em
 * vez de devolver `null`. Preferência é conveniência: se não der para guardar,
 * o app segue com o padrão em vez de quebrar.
 */
export function loadLanguage(): Language | null {
  try {
    const stored = localStorage.getItem(LANGUAGE_KEY);
    return isLanguage(stored) ? stored : null;
  } catch {
    return null;
  }
}

export function saveLanguage(language: Language): void {
  try {
    localStorage.setItem(LANGUAGE_KEY, language);
  } catch {
    // Sem persistência: a escolha vale só para esta sessão.
  }
}

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

export function saveHistory(history: readonly MatchRecord[]): void {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch {
    // Cota estourada ou storage bloqueado: o histórico vale só para esta
    // sessão. Perder as últimas partidas não justifica quebrar o app.
  }
}
