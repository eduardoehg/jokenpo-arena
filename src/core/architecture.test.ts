import { describe, expect, it } from 'vitest';

/**
 * Código-fonte dos módulos do `core/`, lido pelo próprio Vite.
 *
 * Via `import.meta.glob` em vez de `node:fs`: dispensa `@types/node` e mantém
 * o projeto sem nenhuma dependência a mais só para verificar a arquitetura.
 */
const MODULES = import.meta.glob('./*.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

/**
 * Camadas que `core/` não pode alcançar.
 *
 * A regra do CLAUDE.md é que a lógica pura não conheça desenho nem interface.
 * Ela é o que torna o `core/` testável sem browser — e o tipo de regra que
 * erode em silêncio, um import de conveniência por vez.
 */
const FORBIDDEN_LAYERS = ['render', 'ui'];

/**
 * Globais de browser que denunciam vazamento de camada.
 *
 * O ambiente Node do Vitest já quebraria em tempo de execução, mas só se a
 * linha rodar. Isto pega o import morto e o caminho que nenhum teste exercita.
 */
const BROWSER_GLOBALS = [
  'document',
  'window',
  'navigator',
  'localStorage',
  'sessionStorage',
  'requestAnimationFrame',
  'HTMLElement',
  'CanvasRenderingContext2D',
];

interface SourceFile {
  name: string;
  code: string;
}

/** Remove comentários, preservando as strings — os imports moram nelas. */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\/\/[^\n]*/g, ' ');
}

/** Remove o conteúdo das strings, para procurar identificadores de verdade. */
function stripStrings(source: string): string {
  return source
    .replace(/'(?:[^'\\]|\\.)*'/g, "''")
    .replace(/"(?:[^"\\]|\\.)*"/g, '""')
    .replace(/`(?:[^`\\]|\\.)*`/g, '``');
}

function importsOf(source: string): string[] {
  const code = stripComments(source);
  const specifiers: string[] = [];

  const patterns = [
    // `import ... from 'x'` e `export ... from 'x'`
    /\b(?:import|export)\b[\s\S]*?\bfrom\s*['"]([^'"]+)['"]/g,
    // `import 'x'` sem binding e `import('x')` dinâmico
    /\bimport\s*\(?\s*['"]([^'"]+)['"]/g,
    // `require('x')`
    /\brequire\s*\(\s*['"]([^'"]+)['"]/g,
  ];

  for (const pattern of patterns) {
    for (const match of code.matchAll(pattern)) specifiers.push(match[1]);
  }

  return [...new Set(specifiers)];
}

/** Imports que alcançam `render/` ou `ui/`. */
function forbiddenLayerImports(file: SourceFile): string[] {
  return importsOf(file.code)
    .filter((specifier) =>
      FORBIDDEN_LAYERS.some(
        (layer) =>
          specifier.includes(`/${layer}/`) ||
          specifier.endsWith(`/${layer}`) ||
          specifier.startsWith(`${layer}/`),
      ),
    )
    .map((specifier) => `${file.name} importa '${specifier}'`);
}

/** Imports que saem do próprio diretório do `core/`. */
function outsideCoreImports(file: SourceFile): string[] {
  return importsOf(file.code)
    .filter((specifier) => !specifier.startsWith('./'))
    .map((specifier) => `${file.name} importa '${specifier}'`);
}

/** Usos de global de browser no código executável. */
function browserGlobalUses(file: SourceFile): string[] {
  const code = stripStrings(stripComments(file.code));

  return BROWSER_GLOBALS.filter((global) =>
    new RegExp(`\\b${global}\\b`).test(code),
  ).map((global) => `${file.name} usa '${global}'`);
}

/** Arquivos de produção do `core/` — os testes não seguem a mesma regra. */
function coreSources(): SourceFile[] {
  return Object.entries(MODULES)
    .map(([path, code]) => ({ name: path.replace(/^\.\//, ''), code }))
    .filter((file) => !file.name.endsWith('.test.ts'))
    .sort((a, b) => a.name.localeCompare(b.name));
}

const SOURCES = coreSources();

const scan = (check: (file: SourceFile) => string[]): string[] =>
  SOURCES.flatMap(check);

describe('fronteira do core/', () => {
  it('encontra os módulos de produção', () => {
    // Se a leitura do diretório quebrar, os testes abaixo passariam vazios e a
    // regra deixaria de ser verificada sem ninguém perceber.
    expect(SOURCES.length).toBeGreaterThanOrEqual(7);
    expect(SOURCES.map((file) => file.name)).toContain('simulation.ts');
  });

  it('lê imports de verdade dos módulos que os têm', () => {
    // Guarda contra o extrator devolver vazio por engano — que faria toda a
    // suíte de fronteira passar sem verificar nada.
    const simulation = SOURCES.find((file) => file.name === 'simulation.ts');

    expect(importsOf(simulation!.code)).toContain('./collision');
  });

  it('não importa de render/ nem de ui/', () => {
    expect(scan(forbiddenLayerImports)).toEqual([]);
  });

  it('só importa de dentro do próprio core/', () => {
    expect(scan(outsideCoreImports)).toEqual([]);
  });

  it('não toca em nenhuma API de browser', () => {
    expect(scan(browserGlobalUses)).toEqual([]);
  });
});

describe('o detector pega violação de verdade', () => {
  // Um teste de fronteira que não sabe falhar é decoração. Estes alimentam os
  // mesmos detectores com código violador fabricado.
  const fake = (code: string): SourceFile => ({ name: 'fake.ts', code });

  it('acusa import de render/', () => {
    expect(
      forbiddenLayerImports(fake("import { render } from '../render/renderer';")),
    ).toHaveLength(1);
  });

  it('acusa import de ui/', () => {
    expect(forbiddenLayerImports(fake("import { t } from '../ui/i18n';"))).toHaveLength(1);
  });

  it('acusa import de pacote externo', () => {
    expect(outsideCoreImports(fake("import { z } from 'zod';"))).toHaveLength(1);
  });

  it('acusa uso de global de browser', () => {
    expect(browserGlobalUses(fake('const el = document.body;'))).toHaveLength(1);
    expect(browserGlobalUses(fake('window.addEventListener("x", f);'))).toHaveLength(1);
  });

  it('acusa import escondido atrás de comentário', () => {
    expect(
      forbiddenLayerImports(fake("/* nota */ import { x } from '../ui/x';")),
    ).toHaveLength(1);
  });

  it('acusa import dinâmico', () => {
    expect(
      forbiddenLayerImports(fake("const m = await import('../render/palette');")),
    ).toHaveLength(1);
  });

  it('acusa re-export de camada proibida', () => {
    expect(
      forbiddenLayerImports(fake("export { render } from '../render/renderer';")),
    ).toHaveLength(1);
  });
});

describe('o detector não gera falso positivo', () => {
  const fake = (code: string): SourceFile => ({ name: 'fake.ts', code });

  it('aceita import relativo dentro do core/', () => {
    const file = fake("import type { Entity } from './entity';");

    expect(forbiddenLayerImports(file)).toEqual([]);
    expect(outsideCoreImports(file)).toEqual([]);
  });

  it('ignora global mencionado em comentário', () => {
    expect(browserGlobalUses(fake('// nunca use document aqui'))).toEqual([]);
    expect(browserGlobalUses(fake('/* window\n * navigator\n */'))).toEqual([]);
  });

  it('ignora global mencionado dentro de string', () => {
    expect(browserGlobalUses(fake("const a = 'document';"))).toEqual([]);
    expect(browserGlobalUses(fake('const a = `window`;'))).toEqual([]);
  });

  it('não confunde identificador que contém o nome de um global', () => {
    expect(browserGlobalUses(fake('const documentation = 1;'))).toEqual([]);
    expect(browserGlobalUses(fake('const windowSize = 2;'))).toEqual([]);
  });
});
