# Manual: Carregando

Tela de espera **genérica**: cobre a página, bloqueia cliques e mostra um indicador girando, a mensagem e há quantos segundos o processamento está rodando (para o usuário ver que não travou). Substitui o `CarregandoBensaude` do Nexus, **sem nenhuma marca**: a marca do seu sistema entra pela prop `logo`.

## Uso

```tsx
import { Carregando } from "@componentes/react";

{salvando && <Carregando mensagem="Gravando..." />}
```

Renderize-o **só enquanto está processando** (montar inicia o contador; desmontar o encerra).

Com a marca do seu sistema:

```tsx
<Carregando mensagem="Gerando relatório..." logo={<img src={logoEmpresa} alt="Minha empresa" />} />
```

## Props

| Prop | Padrão | Descrição |
|---|---|---|
| `mensagem` | `"Processando, aguarde..."` | Texto abaixo do indicador |
| `logo` | — | Qualquer `ReactNode` (imagem, SVG), mostrado acima do indicador, limitado a 180 px de largura |
| `mostrarTempo` | `true` | Mostra `Ns` (segundos decorridos) |
| `className` | — | Classe extra na camada que cobre a tela |

## Comportamento e estilo

- `role="status"`, `aria-live="polite"` e `aria-busy="true"`: leitores de tela anunciam a mensagem.
- Camada `position: fixed` com `z-index: 1100` (acima do modal do Lookup, que usa 1000); o clique nela não chega à tela de baixo.
- Cores pelas variáveis `--cmp-*` (cartão em `--cmp-cor-fundo`, indicador em `--cmp-cor-foco`); respeita o tema escuro.
- `prefers-reduced-motion`: o giro desacelera.
- O Esc **não** fecha (é para operações em andamento).

## Armadilhas

1. Não tem botão de cancelar: se a operação puder demorar muito, mostre outro componente para cancelar.
2. Se o seu `ComponentesProvider`/layout tiver `overflow`/`transform` no ancestral, a camada `fixed` ainda cobre a janela inteira (ela não usa portal); se algum ancestral tiver `transform`, ela passa a cobrir só aquele ancestral. Renderize-a perto da raiz da aplicação.
