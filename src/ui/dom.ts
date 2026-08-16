/**
 * Busca um elemento por id, falhando alto se o markup e o código
 * dessincronizarem.
 *
 * Devolve tipo não-nulo, o que mantém o estreitamento dentro dos closures do
 * loop — checar com `if` no ponto de uso não sobreviveria.
 */
export function byId<T extends HTMLElement = HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Elemento #${id} não encontrado no documento.`);
  return element as T;
}

/** Todos os elementos de uma classe, já tipados. */
export function byClass<T extends HTMLElement = HTMLElement>(
  selector: string,
): T[] {
  return [...document.querySelectorAll<T>(selector)];
}
