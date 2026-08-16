# Jokenpo Arena

Simulação de pedra, papel e tesoura em Canvas 2D. Três populações entram por
portais opostos, se movem em linha reta e convertem o perdedor a cada colisão,
até restar um único tipo.

**[▶ Demo ao vivo](https://eduardoehg.github.io/jokenpo-arena/)** ·
[![CI](https://github.com/eduardoehg/jokenpo-arena/actions/workflows/ci.yml/badge.svg)](https://github.com/eduardoehg/jokenpo-arena/actions/workflows/ci.yml)

TypeScript puro, sem framework e sem engine de jogo. Português e inglês.
288 testes, zero dependências de runtime.

---

## Regras

`pedra > tesoura` · `tesoura > papel` · `papel > pedra`

Ao colidir, o perdedor **é convertido** no tipo do vencedor — não é removido.
A população total é constante do início ao fim. Colisão entre iguais tem só
resolução física: as peças se afastam, sem conversão.

## Arquitetura

Três camadas, com uma regra de dependência que não é negociável:

```
src/
  core/     lógica pura — sem DOM, sem Canvas, 100% testável
  render/   desenho no canvas; só lê o estado
  ui/       telas, HUD, controles
  main.ts   game loop
```

`core/` nunca importa de `render/`, `ui/` ou de API de browser. A garantia não
é só convenção: **os testes rodam em ambiente Node, sem jsdom**, então qualquer
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

## Decisões técnicas

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

## Visual

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

## Partidas reproduzíveis

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

## Acessibilidade

- **Forma antes de cor**, com silhuetas distintas por tipo
- **`prefers-reduced-motion`** desliga flash, explosão e hit-stop; a simulação
  segue, porque ela é o conteúdo e não um efeito
- Alvos de toque de 44px nos steppers e botões
- Som ligado por padrão, com botão para silenciar e escolha lembrada

## Idiomas

Português e inglês, alternáveis no gabinete. Entra em inglês por padrão, e a
escolha do visitante é lembrada.

Os valores de `EntityType` são IDs internos neutros (`rock`, `paper`,
`scissors`) — nenhuma camada abaixo de `ui/` conhece texto de tela. O dicionário
português é a fonte das chaves, e o inglês é tipado a partir dele: **esquecer
uma tradução é erro de compilação**, não rótulo vazio em produção.

## Rodando

```bash
npm install
npm run dev        # servidor local
npm run build      # build de produção
npm test           # 288 testes
npm run typecheck  # tsc --noEmit
```

## Stack

Vite · TypeScript · Vitest · Canvas 2D · WebAudio · GitHub Pages

Nenhuma dependência de runtime além das fontes, que são servidas do próprio
domínio via `@fontsource` — a página não faz requisição externa nenhuma. O som
é sintetizado com WebAudio, sem nenhum arquivo de áudio no bundle.
