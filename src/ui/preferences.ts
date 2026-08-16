import { isLanguage, type Language } from './i18n';

const LANGUAGE_KEY = 'jokenpo-arena:language';

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
