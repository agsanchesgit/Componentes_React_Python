# Fase 5 — LookUpField

## Feito (frontend/src)
| Arquivo | Conteúdo |
|---|---|
| `lookup/LookUpField.tsx` | campo Código + Descrição + botão `...` (estados VAZIO/EDITANDO/VALIDANDO/VALIDO/INVALIDO, bloqueio de saída, F4) |
| `lookup/LookUpModal.tsx` | modal de pesquisa: texto, filtros DataField/CpfField/CnpjField, AUTOMATICA/COM_BOTAO_PESQUISA, teclado |
| `lookup/LookUpGrid.tsx` | grid do modal (alinhamento por tipo, sigla traduzida, máscara por linha/função, highlight) |
| `lookup/useLookupApi.ts`, `lookup.api.ts` | chamadas ao backend, cache por instância (TTL 10 min), `debugMode` |
| `lookup/lookup.types.ts`, `lookup.utils.ts` | contrato público e utilitários puros |
| `ui/Dialogo.tsx` | modal próprio (portal, Esc, clique no fundo, Tab preso, devolve foco) |
| `provider.tsx` | `ComponentesProvider` ganha `caminhoLookup` (padrão `"Lookup"`) |
| `testes/apiFalsa.ts` | backend falso em memória que respeita o contrato HTTP |
| `exemplos/src/apiFetch.ts` | instância HTTP de exemplo baseada em `fetch` (sem axios) |
| `.claude/docs/manuais/Manual_LookUpField.md` | manual |

`index.ts` exporta `LookUpField`, `useComponentesCaminhoLookup` e os tipos (`LookupDefinicao`, `LookUpResultado`, `LookupBanco` com `POSTGRESQL`...).

## Verificado (saída real)
- `npm test`: **163 passando + 7 ignorados** (a integração só roda com `URL_BACK_EXEMPLO`).
  - `lookup.utils` (15), `LookUpField` com backend falso (38): código (valor inicial, validar ao sair, inexistente/mais de um/erro, vazio, mudança externa, máscara, DATA, DISABLED/READONLY, debug e cache, caminho do provider), modal (F4, debounce, mínimo de caracteres, escolher por duplo clique/↓+Enter/Selecionar, Cancelar, em branco a cada abertura, limite, erro, mapaValores/máscara/highlight, largura e cor, Tab preso) e filtros extras (CPF/CNPJ/data pesquisam na hora, inválido não pesquisa, combinação com texto, Esc no calendário).
- **Integração real**: com a API de exemplo no ar (uvicorn + SQLite), os **7 testes de integração passaram** renderizando o `LookUpField` e conversando por `fetch` com o FastAPI: código existente/inexistente, pesquisa por texto, filtro de CPF, filtro de data, erro de negócio (400) e erro do banco (400 com a mensagem completa).
- `typecheck`, `lint`, `build` (`index.js` 65 kB / 18 kB gzip; `estilos.css` 8,8 kB) limpos. Backend: 170 testes seguem passando.
- Vite → API: confirmei que o proxy dos exemplos (`/api`) chega à API de exemplo.
- Servidor de teste parado ao final.

## Achado durante a integração
O SQLite devolve datas como `1963-02-11 00:00:00` (espaço, não `T`); o grid não as reconhecia como data ISO. Corrigi `fncEhDataIso`/`fncTextoDaCelula` para aceitar `T` ou espaço (igual ao `FNC_FORMATA`), com teste.

## **Não verificado**
- **Visual no navegador**: layout do modal, sobreposição (z-index) do calendário dentro do modal, cores e rolagem do grid só passaram por jsdom (sem layout). A página de exemplos sobe e o proxy funciona, mas **não abri o `LookUpField` no navegador**.
- **Bancos reais** (Oracle, SQL Server, PostgreSQL): igual à Fase 4. O front foi verificado só contra SQLite e contra o backend falso.
- Acessibilidade fina do modal (leitor de tela) não foi testada além do `role="dialog"`/`aria-modal`/rótulo.

## Desvios do Nexus
1. **Sem Radix/shadcn**: `Dialogo` próprio (portal em `document.body`, mantém o Tab dentro, Esc fecha, clique no fundo fecha). Se houver um calendário aberto dentro do modal, o Esc fecha só o calendário.
2. **`LookupBanco`** inclui `POSTGRESQL` (pedido do usuário) e `SQLITE` (só testes/exemplo).
3. **Provider**: `ComponentesProvider` aceita `caminhoLookup` (o Nexus tinha o caminho fixo `Lookup/...` relativo à `baseURL`).
4. **HTTP**: `ApiHttp` (compatível com axios) no lugar de `AxiosInstance`; as chamadas continuam enviando `skipGlobalErrorToast: true`.
5. Nomes pela regra do usuário (`fncXxx`/`prcXxx`/`wXxx`); props e tipos públicos idênticos aos do Nexus.
6. O modal foi reorganizado em `Dialogo` + `Conteudo` (o conteúdo só existe aberto); o comportamento descrito no `DECISOES.md` foi mantido (§3.4–3.10).
7. A porta padrão do exemplo é **8100** (a 8000 desta máquina já tem outro projeto seu rodando; não mexi nele). O proxy do Vite aceita `API_EXEMPLO` para mudar o destino.

## Pendências / sugestões
- **Conferir no navegador** (`npm run exemplos` + API na 8100): foco, bloqueio de saída, F4, modal e calendário dentro do modal.
- Testar com Oracle, SQL Server e PostgreSQL reais (ver Fase 4).
- Se o modal for usado dentro de um container com `transform`/`overflow`, o portal já evita o corte; o calendário (popover sem portal) dentro do modal pode ser cortado se a caixa ganhar `overflow: hidden` (hoje não tem).
