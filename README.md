# Jokenpo Arena

Rock-paper-scissors as a population simulation, in Canvas 2D. Three armies enter
through opposite portals, travel in straight lines, and every collision converts
the loser into the winner's type — until a single type is left standing.

**[▶ Live demo](https://edu-portfolio.com.br/jokenpo-arena)** ·
[![CI](https://github.com/eduardoehg/jokenpo-arena/actions/workflows/ci.yml/badge.svg)](https://github.com/eduardoehg/jokenpo-arena/actions/workflows/ci.yml)

Plain TypeScript — no framework, no game engine. 288 tests, zero runtime
dependencies.

**[English](#english) · [Português](#português)**

---

<a id="english"></a>

## English

### Rules

`rock > scissors` · `scissors > paper` · `paper > rock`

On collision the loser is **converted**, not removed. Total population is
constant from the first frame to the last — what changes is its composition.
Same-type collisions resolve physically only: the pieces bounce apart, nobody
converts.

### Architecture

Three layers, with one dependency rule that isn't up for negotiation:

```
src/
  core/     pure logic — no DOM, no Canvas, 100% testable
  render/   canvas drawing; reads state, never writes it
  ui/       screens, HUD, controls
  main.ts   game loop
```

`core/` never imports from `render/`, `ui/`, or any browser API. That guarantee
isn't just convention: **the test suite runs in a Node environment, with no
jsdom**, so an accidental `document` or `window` breaks the build immediately.

| Module | Responsibility |
|---|---|
| `core/rules` | Who beats whom |
| `core/entity` | The `Entity` type and its construction |
| `core/rng` | Deterministic seeded generator |
| `core/spawn` | Emission from the three portals, with injectable RNG |
| `core/physics` | Delta-time movement and wall reflection |
| `core/collision` | Spatial hash grid and collision resolution |
| `core/simulation` | Orchestrates one tick: takes `dt`, returns new state |

The dependency rule is **enforced by a test**: `core/architecture.test.ts` reads
every production module, extracts its imports, and looks for browser globals in
executable code. And since a boundary test that can't fail is decoration, it
also feeds fabricated violations to its own detectors — a forbidden-layer
import, a dynamic import, a re-export — to prove they actually catch them.

### Technical decisions

**Spatial hash grid, not O(n²).** Each entity is only compared against the nine
cells around it. The test that earns confidence in this doesn't measure time —
it compares the grid's output against a naive O(n²) sweep across eight scenarios
with varying radii, negative coordinates, and different densities. Without it,
"uses a spatial hash grid" would be a claim rather than a fact.

**300 entities in ~0.1 ms per tick**, against a 5 ms budget. The entire `core/`
fits in roughly 1.7% of a frame at 60fps.

**FPS independence.** The step is fixed at 1/120s, capped at 8 substeps per
frame. A test verifies that one 1/30s step produces exactly the same result as
two 1/60s steps — including when the path crosses a wall.

**Reflection by modular arithmetic.** Walls are resolved with a triangle wave
instead of a fold loop: constant cost even if an entity overshoots the arena
several times in one tick. That's what prevents tunneling when a frame stalls.

**Immutable simulation.** `tick` returns a new state; the previous one stays
intact. At 300 entities × 60fps that's ~18k allocations per second, irrelevant
to V8 — and what you get in exchange is a deterministic simulation that's
trivial to test.

**Capped hit-stop.** Each conversion freezes the simulation for 35 ms, which
gives the hit some weight. But at peak there are several conversions per second,
so freezes have a 150 ms minimum spacing — without it, emphasis becomes stutter.

### Visual

8-bit arcade direction: no gradients, no soft shadows, no antialiasing, no
border-radius. Bevels are solid `box-shadow: inset`, motion is `steps()`.

**Shape before color.** Each type has its own 7×7 silhouette — paper is the
sheet with a folded corner, rock the solid block, scissors the hollow X. All
three stay distinguishable in grayscale and under color blindness; color is
reinforcement, not the primary channel.

The **Trinary Scoreboard** isn't a score next to a proportion bar — it's the
same object. Segment widths *are* each type's live share, and the counts run
inside them. When a type drops below 13%, its number jumps outside the bar and
takes on the type's color, so a dying population never disappears from view.

### Reproducible matches

Every match is born from a 32-bit seed, and the URL carries that seed alongside
the three populations and the speed. Opening the same link replays the identical
match, frame for frame — no server, no recording, no shared state.

This only works because the simulation is deterministic end to end:
`Math.random` appears nowhere in `core/`, the RNG arrives as a parameter, and
spawn consumes a fixed number of draws per entity, always in the same order.

The seed alone wouldn't be enough — a different population would make the same
generator produce a different match — so the link is self-contained. And
decoding validates everything against the game's own limits: a truncated or
tampered link falls back to defaults instead of building an invalid arena.

### Accessibility

- **Shape before color**, with a distinct silhouette per type
- **`prefers-reduced-motion`** disables flash, burst, and hit-stop; the
  simulation keeps running, because it's the content and not an effect
- 44px touch targets on steppers and buttons
- Sound on by default, with a mute button and the choice remembered

### Languages

English and Portuguese, switchable inside the cabinet. Every visit starts in
English — the switch lasts for the session, so a shared link opens identically
for everyone.

`EntityType` values are neutral internal IDs (`rock`, `paper`, `scissors`) — no
layer below `ui/` knows any display text. The Portuguese dictionary is the
source of keys and English is typed from it, which means **a missing translation
is a compile error**, not an empty label in production.

### Running

```bash
npm install
npm run dev        # local server
npm run build      # production build
npm test           # 288 tests
npm run typecheck  # tsc --noEmit
```

### Stack

Vite · TypeScript · Vitest · Canvas 2D · WebAudio · GitHub Pages

No runtime dependencies beyond the fonts, which are served from the site's own
domain via `@fontsource` — the page makes no external request at all. Sound is
synthesized with WebAudio, so there's not a single audio file in the bundle.

---

<a id="português"></a>

## Português

Simulação de pedra, papel e tesoura em Canvas 2D. Três populações entram por
portais opostos, se movem em linha reta e convertem o perdedor a cada colisão,
até restar um único tipo.

TypeScript puro, sem framework e sem engine de jogo. 288 testes, zero
dependências de runtime.

### Regras

`pedra > tesoura` · `tesoura > papel` · `papel > pedra`

Ao colidir, o perdedor **é convertido** no tipo do vencedor — não é removido. A
população total é constante do primeiro ao último quadro; o que muda é a
composição dela. Colisão entre iguais tem só resolução física: as peças se
afastam, sem conversão.

### Arquitetura

Três camadas, com uma regra de dependência que não é negociável:

```
src/
  core/     lógica pura — sem DOM, sem Canvas, 100% testável
  render/   desenho no canvas; só lê o estado
  ui/       telas, HUD, controles
  main.ts   game loop
```

`core/` nunca importa de `render/`, `ui/` ou de API de browser. A garantia não é
só convenção: **os testes rodam em ambiente Node, sem jsdom**, então qualquer
uso acidental de `document` ou `window` quebra a suíte na hora.

| Módulo | Responsabilidade |
|---|---|
| `core/rules` | Quem vence quem |
| `core/entity` | O tipo `Entity` e sua construção |
| `core/rng` | Gerador determinístico semeado |
| `core/spawn` | Geração nos três portais, com RNG injetável |
| `core/physics` | Movimento por delta time e reflexão nas paredes |
| `core/collision` | Spatial hash grid e resolução de colisões |
| `core/simulation` | Orquestra um tick: recebe `dt`, devolve novo estado |

A regra de dependência é **verificada por teste**: `core/architecture.test.ts`
lê cada módulo de produção, extrai os imports e procura globais de browser no
código executável. E como um teste de fronteira que não sabe falhar é
decoração, ele também alimenta os próprios detectores com código violador
fabricado — import de camada proibida, import dinâmico, re-export — para provar
que acusam.

### Decisões técnicas

**Spatial hash grid, não O(n²).** Cada entidade só é comparada com as 9 células
ao redor. O teste que dá confiança nisso não mede tempo — compara o resultado
da grid com uma busca ingênua O(n²) em 8 cenários com raios variados,
coordenadas negativas e densidades diferentes. Sem ele, "usa spatial hash grid"
seria só uma afirmação.

**300 entidades em ~0,1 ms por tick**, contra um orçamento de 5 ms. O `core/`
inteiro cabe em ~1,7% de um quadro a 60fps.

**Independência de FPS.** O passo é fixo em 1/120s, com teto de 8 subpassos por
quadro. Um teste verifica que um passo de 1/30s produz exatamente o mesmo
resultado que dois de 1/60s — inclusive quando o percurso atravessa uma parede.

**Reflexão por aritmética modular.** A parede é resolvida por onda triangular em
vez de um laço de dobras: custo constante mesmo que a entidade ultrapasse a
arena várias vezes num único tick. É o que impede tunelamento quando um quadro
atrasa.

**Simulação imutável.** `tick` devolve um estado novo; o anterior fica intacto.
A 300 entidades × 60fps são ~18k alocações por segundo, irrelevantes para o V8 —
e o resultado é uma simulação determinística e trivial de testar.

**Hit-stop com teto.** A conversão congela a simulação por 35 ms, o que dá peso
ao golpe. Mas no auge da partida há várias conversões por segundo, então há um
intervalo mínimo de 150 ms entre congelamentos — sem isso a ênfase vira engasgo.

### Visual

Direção retro arcade 8-bit: sem gradiente, sem sombra suave, sem antialiasing,
sem border-radius. Bevel é `box-shadow: inset` sólido e movimento é `steps()`.

**Forma antes de cor.** Cada tipo tem uma silhueta 7×7 própria — papel é a folha
com canto dobrado, pedra o bloco maciço, tesoura o X vazado. Os três se
distinguem em escala de cinza e sob daltonismo; a cor é reforço, não o canal
primário.

O **Placar Trinário** não é um placar ao lado de uma barra de proporção: é a
mesma coisa. As larguras dos segmentos são a participação viva de cada tipo, e
os números correm dentro deles. Quando um tipo cai abaixo de 13%, seu número
salta para fora da barra e assume a cor do tipo — a população moribunda nunca
some da leitura.

### Partidas reproduzíveis

Toda partida nasce de uma seed de 32 bits, e a URL carrega a seed junto com as
três populações e a velocidade. Abrir o mesmo link reproduz a partida idêntica,
quadro a quadro — sem servidor, sem gravação, sem estado compartilhado.

Só funciona porque a simulação é determinística de ponta a ponta: `Math.random`
não aparece em lugar nenhum do `core/`, o RNG entra por parâmetro, e o spawn
consome uma quantidade fixa de sorteios por entidade, sempre na mesma ordem.

A seed sozinha não bastaria — com outra população o mesmo gerador produz outra
partida —, então o link é autocontido. E a decodificação valida tudo contra os
limites do jogo: um link truncado ou adulterado cai no padrão em vez de gerar
uma arena inválida.

### Acessibilidade

- **Forma antes de cor**, com silhuetas distintas por tipo
- **`prefers-reduced-motion`** desliga flash, explosão e hit-stop; a simulação
  segue, porque ela é o conteúdo e não um efeito
- Alvos de toque de 44px nos steppers e botões
- Som ligado por padrão, com botão para silenciar e a escolha lembrada

### Idiomas

Inglês e português, alternáveis no gabinete. Toda visita começa em inglês — a
troca vale para a sessão, e o link abre exatamente igual para todo mundo.

Os valores de `EntityType` são IDs internos neutros (`rock`, `paper`,
`scissors`) — nenhuma camada abaixo de `ui/` conhece texto de tela. O dicionário
português é a fonte das chaves, e o inglês é tipado a partir dele: **esquecer
uma tradução é erro de compilação**, não rótulo vazio em produção.

### Rodando

```bash
npm install
npm run dev        # servidor local
npm run build      # build de produção
npm test           # 288 testes
npm run typecheck  # tsc --noEmit
```

### Stack

Vite · TypeScript · Vitest · Canvas 2D · WebAudio · GitHub Pages

Nenhuma dependência de runtime além das fontes, que são servidas do próprio
domínio via `@fontsource` — a página não faz requisição externa nenhuma. O som
é sintetizado com WebAudio, sem nenhum arquivo de áudio no bundle.
