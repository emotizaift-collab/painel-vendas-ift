# Prompt para colar na nova sessão do Claude Code

> Cole tudo o que está abaixo da linha na nova sessão do Claude Code que já
> tenha o repositório **`emotizaift-collab/dashboard-eventos-presenciais`**
> conectado **com permissão de escrita**. Se puder, anexe também o arquivo
> `melhorias-ingressos-contagens.patch` (é o jeito mais rápido e seguro de
> aplicar exatamente o que já foi feito). O `.zip` do projeto é opcional.

---

## Contexto do projeto

Estou trabalhando no painel de vendas de eventos presenciais da IFT. O
repositório é **`emotizaift-collab/dashboard-eventos-presenciais`** (branch de
deploy: **`claude/file-reading-8ghf6t`**), publicado no **Render** com
auto-deploy a cada commit nessa branch. Cada commit na branch de deploy sobe
pro ar automaticamente.

Stack: **TypeScript**, back-end **Express** lendo **Google Sheets**, front-end
**React + Recharts + Vite**. Estrutura relevante:

- `shared/types.ts` — tipos compartilhados servidor/interface
- `server/src/metrics.ts` — cálculo das métricas do painel
- `server/src/config.ts` — carga/validação da configuração (`validateConfig`)
- `config/event-config.default.json` — configuração padrão (eventos, apelidos, tipos de ingresso, fontes de planilha)
- `web/src/Painel.tsx` — a tela de Eventos Presenciais
- `web/src/Configuracao.tsx` — a tela de Configuração
- `web/src/styles.css` — estilos
- `server/test/*.test.js` — suíte de testes (`npm test`, lê de `dist/`)

Scripts: `npm run build:server`, `npm run build:web`, `npm run build`,
`npm test`, `npm run typecheck`.

## Regra de ouro

**Não altere o que está no ar.** Faça tudo numa **branch nova** (ex.:
`melhorias-ingressos-contagens`), nunca commitando direto na branch de deploy.
Ao final, **abra um Pull Request** contra `claude/file-reading-8ghf6t` — não
faça merge sozinho. Mantenha a suíte de testes verde.

## O que eu preciso (2 partes) — só na seção Eventos Presenciais

### Parte 1 — Detalhar tipos de ingresso separadamente (não somar tudo)

Mostrar cada tipo de ingresso separado, com contagem individual:

- **Individual**: quantidade de vendas
- **Duplo** (2 pessoas por venda): quantidade de vendas → multiplicar por 2 para contar pessoas
- **Triplo** (3 pessoas por venda): quantidade de vendas → multiplicar por 3 para contar pessoas
- **VIP**: quantidade de vendas
- **Convite Embaixador** (entrada gratuita): quantidade de linhas com esse tipo — cada linha conta como 1 pessoa

**Total de Participantes**: continua somando todas as pessoas presentes
(individual + duplo×2 + triplo×3 + VIP + convidados de embaixador). Esse total
geral **não muda**.

**Métricas financeiras** (faturamento, ticket médio, valor médio por
participante etc.): calculadas **apenas com os tipos pagos** (individual,
duplo, triplo, VIP) — **excluir convite embaixador**, que é gratuito.

### Parte 2 — Contagem regressiva de data e de vendas

Para cada evento/edição, mostrar dois números:

1. **Dias até a data do evento**.
2. **Vendas restantes** — quantas vendas ainda faltam para bater a meta.

Configuração manual por evento (na mesma estrutura de configuração já usada
para correlacionar produtos de vendas e leads por evento):

- **Data do Evento**: data em que o evento acontece.
- **Meta de Vendas**: número de vendas (ingressos) que se pretende atingir até a data.

Cálculos:

- Dias até o evento = Data do Evento − hoje.
- Vendas restantes = Meta de Vendas − vendas já realizadas (usar a contagem de
  vendas pagas da Parte 1, sem recalcular do zero).

Exibição: **apenas o número** em cada contagem, sem gráfico e sem elementos
visuais extras — "Faltam [N] dias para o evento" e "Faltam [N] vendas para
bater a meta".

### Escopo geral

- Aplicar **somente na seção de Eventos Presenciais** (não no High Ticket).
- **Não** alterar a lógica de contagem de embaixadores únicos (nomes distintos
  na coluna de indicação) — é um ajuste separado, ainda pendente.
- **Não** alterar layout, outros filtros ou outras seções do painel.

---

## Isto JÁ foi implementado numa sessão anterior — aplique o patch

O jeito mais rápido: **aplique o patch `melhorias-ingressos-contagens.patch`**
(anexado). Ele foi gerado em cima do commit-base `ce4a6aa` (o HEAD atual da
branch de deploy).

```bash
# a partir da raiz do repositório, com o repo no commit ce4a6aa:
git checkout -b melhorias-ingressos-contagens
git apply --3way melhorias-ingressos-contagens.patch      # ou: git am < melhorias-ingressos-contagens.patch
npm ci
npm run build:server && npm test        # deve dar 142 testes passando
npm run typecheck                        # deve passar limpo
npm run build                            # build de produção deve concluir
git add -A && git commit -m "Detalha tipos de ingresso por pessoa e adiciona contagens regressivas"
git push -u origin melhorias-ingressos-contagens
# depois abra um Pull Request contra claude/file-reading-8ghf6t (não faça merge)
```

Se o patch não aplicar limpo, **reimplemente pela especificação acima e pelas
notas abaixo** (o resultado tem que ser equivalente).

## Notas de implementação (o que o patch faz, arquivo por arquivo)

Uma descoberta importante da Parte 1: o back-end **já** separava os tipos de
ingresso (existe `Metrics.ingressos`, um bloco por tipo com `quantidade`,
`faturamento` e `participantes`) e **já** excluía o convite gratuito do
faturamento (o tipo `cortesia` tem `contaComoVenda: false`). O que faltava era
**mostrar o número de pessoas por tipo** na tela (é onde duplo×2 e triplo×3 se
perdiam). Nenhum cálculo de faturamento ou de Participantes foi alterado.

- **`shared/types.ts`**
  - `EventEdition` ganhou dois campos opcionais: `dataDoEvento?: string`
    (AAAA-MM-DD) e `metaDeVendas?: number` (inteiro ≥ 1).
  - Nova interface `ContagemRegressiva` com: `rotulo`, `dataDoEvento`,
    `diasParaEvento`, `metaDeVendas`, `vendasRealizadas`, `vendasRestantes`.
  - `Metrics` ganhou `contagemRegressiva: ContagemRegressiva | null`.

- **`server/src/config.ts`** (`validateConfig`)
  - Nova função `normalizarContagemRegressiva(edition)`: valida `dataDoEvento`
    no formato AAAA-MM-DD (recusa outros formatos), exige `metaDeVendas`
    inteiro ≥ 1 (recusa 0/negativo/fracionado), e **remove** o campo quando vem
    vazio. Mesmo cuidado já usado na `vigencia`.

- **`server/src/metrics.ts`**
  - `hojeSaoPaulo()` — data de hoje no fuso America/Sao_Paulo.
  - `computeMetrics(config, data, filter, hoje = hojeSaoPaulo())` — novo 4º
    parâmetro opcional `hoje` (não quebra chamadas existentes; usado pelos testes).
  - `edicaoEmFoco(config, filter)` — a edição escolhida no seletor; numa linha
    inteira, a edição `current`; em "todos os eventos", `null`.
  - `calcularContagemRegressiva(...)` — monta o objeto. **`vendasRealizadas` é
    CUMULATIVA**: conta todas as vendas de tipos pagos da edição até hoje, **sem
    recorte de data nem de campanha** (a meta é cumulativa). Só `diasParaEvento`
    depende de `hoje`. Retorna `null` quando não há edição única ou ela não tem
    data nem meta.

- **`web/src/Painel.tsx`**
  - Novo componente `Contagem` renderizado logo após o "Resultado", só quando
    `m.contagemRegressiva` existe. Mostra só o número + a frase (sem gráfico);
    cada metade (dias / vendas) aparece só quando aquele dado está cadastrado.
  - Na seção "Tipos de ingresso", cada tipo pago agora mostra também o nº de
    **pessoas** quando difere das vendas (duplo → ×2, triplo → ×3). O convite de
    embaixador segue em bloco próprio, marcado como gratuito ("cada um = 1 pessoa").

- **`web/src/Configuracao.tsx`**
  - Em cada edição, dois campos novos: **Data do evento** (input date) e
    **Meta de vendas** (input number), com helper `atualizarEdicao(...)`.
    Texto explicativo na seção.

- **`web/src/styles.css`** — classes `.contagem*` e `.linha-item-sub`, com
  empilhamento no mobile.

- **Testes** (`server/test/metrics.test.js`, `server/test/config.test.js`) —
  14 testes novos cobrindo: dias e vendas restantes; independência do filtro de
  data (venda fora do período ainda conta); `null` sem data/meta; `null` em
  "todos"; edição `current` na linha inteira; só-data / só-meta; dias negativos
  e meta batida; e validação de formato de data e de meta. Total: **142 testes**.

## Uma decisão em aberto (me pergunte ou assuma e avise)

"Meta de vendas" foi tratada como **número de vendas (transações pagas)** — um
ingresso duplo conta como **1 venda**. Se a intenção for contar **pessoas**
(duplo = 2), me avise: muda uma linha em `calcularContagemRegressiva`
(contar `participantes`/cadeiras em vez de linhas).

## Como configurar os valores depois (sem programar)

Data do evento e meta de vendas são preenchidas **na tela de Configuração**, em
cada edição, e salvas em `data/event-config.json`. Enquanto não forem
preenchidas, a contagem regressiva simplesmente não aparece.
