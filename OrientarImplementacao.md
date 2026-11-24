# Orientação de implementação de componentes

> **Como usar (analista):** peça ao Claude, no projeto que vai receber o componente:
> `Leia OrientarImplementacao.md e implemente o componente <nome_componente> na tela <tal>` — por exemplo `... o componente DataField ...`.
> **Para o Claude:** leia **(A) Regras gerais**, **(B) Preparação do projeto** e **somente a seção do componente pedido** (C). Para a lista completa de parâmetros, use o `listaComponentes.md`; para detalhes, o manual do componente em `.claude/docs/manuais/`.

Nomes aceitos de `<nome_componente>`: `ComponentesProvider`, `FNC_FORMATA`, `DataField`, `DataHoraField`, `CpfField`, `CnpjField`, `MmAaaaField`, `ComboField`, `TextNumericoField`, `TextEmailField`, `GridField`, `LookUpField`, `Carregando`, `BackendLookup`.

---

## A. Regras gerais (valem para qualquer componente)

1. **Não altere a biblioteca.** Ela fica em `D:\Componentes_React_Python` e é só **consumida**. Se achar um defeito ou faltar recurso, **pare e relate ao analista**; não copie nem "conserte" o código da biblioteca dentro do projeto.
2. **Importe somente de `@componentes/react`** (front) e `componentes_py` (back). Nunca de caminhos internos (`@componentes/react/src/...`, `dist/...`).
3. **Siga as convenções do projeto em que está trabalhando** (CLAUDE.md dele, nomenclatura, estilo, estrutura de pastas, gerenciador de estado, biblioteca de formulários). As regras de nomenclatura da biblioteca (`fnc`/`prc`/`w`) são dela; no projeto vale o que o projeto (ou o CLAUDE.md global do usuário) manda.
4. **Substitua, não duplique.** Antes de criar, procure no projeto o campo/máscara/grid/loading que já faz isso (`<input type="date">`, máscaras de CPF, tabelas, `Spinner`...). Troque pelo componente da biblioteca na tela pedida; não deixe os dois convivendo. Só mexa nas telas que o analista pediu.
5. **Valores vazios nunca são `null`.** Data = `MIN_DATE`, número = `0`, texto = `""`. Estado inicial e valores vindos da API devem respeitar isso (converta `null` da API antes de passar em `value`).
6. **O `onChange` dos campos só dispara ao sair do campo, ao esvaziar ou ao escolher no painel** (não a cada tecla). Não tente "ler digitando" nem recriar a validação por fora.
7. **Obrigatoriedade e validade são do projeto.** Os campos **nunca bloqueiam vazio**: guarde `obrigatorioPendente` e `valido` do último resultado e confira no submit.
8. **Não envolva o componente em máscaras/validações próprias** (o componente já aplica máscara, valida e bloqueia a saída com texto inválido).
9. **Não implemente o que o analista não pediu** (sem refatorar a tela, sem trocar bibliotecas, sem mudar layout além do necessário).
10. **Confirme antes de ações grandes**: mudar a configuração de build, instalar dependências novas, alterar o backend do projeto. Pergunte ao analista em caso de duas opções razoáveis.
11. **Ao terminar**: rode o `typecheck`/`build` do projeto, mostre o diff resumido do que mudou e diga **o que verificou e o que não conseguiu verificar** (ex.: "não abri no navegador"). Não afirme que funciona sem ter rodado.

---

## B. Preparação do projeto (faça uma vez, antes do primeiro componente)

Verifique, **nesta ordem**, e só faça o que faltar:

1. **O pacote está instalado?** Procure `@componentes/react` no `package.json` do front.
   - Não está: peça ao analista o caminho do `.tgz` (gerado com `npm pack` na pasta `frontend` da biblioteca) **ou** gere-o (`cd D:\Componentes_React_Python\frontend && npm pack --pack-destination <pasta>`) e instale (`npm install <caminho>.tgz`). Veja `.claude/docs/manuais/Manual_Instalacao.md` §1.
   - React/ReactDOM >= 18 são `peerDependencies`: o projeto já deve ter.
2. **CSS importado uma vez?** No ponto de entrada (`main.tsx`/layout raiz): `import "@componentes/react/estilos.css";`. Se o projeto tem tema próprio, sobrescreva as variáveis `--cmp-*` **depois** desse import (nunca edite o CSS da biblioteca).
3. **`ComponentesProvider` montado?** Obrigatório para o `LookUpField`; monte sempre, **uma vez**, perto da raiz:
   ```tsx
   <ComponentesProvider api={api}> <App /> </ComponentesProvider>
   ```
   `api` = **a instância HTTP que o projeto já usa** (axios com token etc.). Não crie outra. Se o projeto não tem instância (usa `fetch`), use o adaptador do `Manual_Instalacao.md` §1.4. A `baseURL` deve apontar para onde o backend inclui o roteador do Lookup (§C `LookUpField`).
4. **TypeScript**: se o projeto é JavaScript puro, avise o analista (a biblioteca funciona, mas sem tipos); não converta o projeto.
5. Se vai usar `LookUpField`, siga também a preparação do **BackendLookup** (seção C).

---

## C. Seções por componente

### C.1 `ComponentesProvider`

Só a preparação (B.3). Se o analista pedir "implemente o ComponentesProvider": faça B.1 a B.3, ligue a instância HTTP existente e verifique que o app compila.

### C.2 `FNC_FORMATA` / `MIN_DATE`

**Quando usar:** exibir (não editar) número, CPF/CNPJ, CEP, telefone, valor, data ou hora formatados em tabelas, relatórios, textos.

**Como:**
1. Substitua formatadores caseiros (`toLocaleString`, regex de CPF, `moment/dayjs.format` só para exibição) pela chamada: `FNC_FORMATA(valor, "máscara")`.
2. Escolha a máscara pelo tipo: CPF `"ZZZ.ZZZ.ZZZ-ZZ"`, CNPJ `"ZZ.ZZZ.ZZZ/ZZZZ-ZZ"`, valor `"999.999.999,99"`, data `"DD/MM/AAAA"`, data e hora `"DD/MM/AAAA HH:MI:SS"`.
3. Em valor numérico passe **number** (string com decimal quebra: `"1234.5"` vira `123,45`); CPF/CNPJ/CEP prefira **string** (preserva zeros). Datas vindas da API em ISO podem ir direto como string.
4. Em células numéricas use `white-space: pre` (a máscara preenche com brancos à esquerda).
5. Para "sem data", compare/atribua `MIN_DATE`; nunca `new Date(1, 0, 1)`.

**Armadilhas:** máscara com o caractere `0` lança `Error` (use `Z`/`9`); a última vírgula é o separador decimal; o fuso de ISO com `Z` é ignorado; valor que não cabe volta sem formatar.
**Conferir:** os exemplos do `Manual_FNC_FORMATA.md`.

### C.3 `DataField`

**Quando usar:** qualquer data (`DD/MM/AAAA`) editável.

**Como:**
1. Estado: `const [data, setData] = useState<Date>(MIN_DATE);` (ou o valor vindo da API convertido para `Date`; `null` → `MIN_DATE`).
2. Troque o campo de data atual por:
   ```tsx
   <DataField label="..." value={data} onChange={(r) => { setData(r.valor); /* guarde r.valido e r.obrigatorioPendente */ }} />
   ```
3. Limites: `menorData`/`maiorData` (só o dia). Obrigatório: `obrigatorio` (+ conferir `obrigatorioPendente` no submit).
4. Ao **enviar à API**: `MIN_DATE` significa "sem data". Combine a convenção com o backend do projeto (ex.: enviar `null` ou `0001-01-01T00:00:00`); **não** use `JSON.stringify(MIN_DATE)` (o fuso desloca o horário). Datas reais: formate no padrão que a API do projeto espera.
5. Ao **receber da API**: converta string ISO para `Date` local (`new Date(ano, mes-1, dia)`), `null`/vazio para `MIN_DATE`.
6. Edição de registro existente: `value` é o valor carregado; se o formulário é resetado, passe o novo `value` (o campo acompanha).

**Armadilhas:** `onChange` só ao sair do campo; anos 1850–2100; `valido:false` vem com `valor` vazio (não grave); o calendário é um painel sem portal (cuidado com ancestral `overflow:hidden`).
**Conferir:** `Manual_DataField.md`; digite uma data inválida e confirme que o foco não sai.

### C.4 `DataHoraField`

Igual ao C.3, com `Date` completo (data **e** hora, sempre com segundos). Diferenças: `menorData`/`maiorData` comparam data e hora completas; o painel tem hora/minuto/segundo. Ao enviar à API, cuide do **fuso** (o `Date` é local; a biblioteca não converte). Veja `Manual_DataHoraField.md`.

### C.5 `CpfField`

1. Estado numérico: `const [cpf, setCpf] = useState(0);`. Valor da API (string `"00374287813"` ou número) → `Number(...)`; vazio → `0`.
2. `<CpfField label="CPF" value={cpf} onChange={(r) => setCpf(r.valor)} />`.
3. **Ao enviar à API:** o valor é número sem máscara e **perde zeros à esquerda**. Se o backend espera string de 11 dígitos: `String(cpf).padStart(11, "0")` (e `cpf === 0` = vazio).
4. `aceitaInvalido` só se o analista pedir (padrão bloqueia dígito verificador inválido).
**Conferir:** `Manual_CpfField.md` (ex.: `191` vira `000.000.001-91`, que é válido).

### C.6 `CnpjField`

1. Estado string: `const [cnpj, setCnpj] = useState("");`. **Não converta para número** (aceita letras).
2. `<CnpjField label="CNPJ" value={cnpj} onChange={(r) => setCnpj(r.valor)} />` — o valor tem 14 caracteres sem máscara.
3. Valor vindo de coluna `CHAR(14)`: `trim()` antes de passar em `value`.
**Conferir:** `Manual_CnpjField.md` (`11222333000181` válido; `12ABC34501DE35` alfanumérico válido).

### C.7 `MmAaaaField`

1. Estado string `AAAAMM`: `const [comp, setComp] = useState("");`. Da API: número `202610` → `String(...)`.
2. `<MmAaaaField label="Competência" value={comp} onChange={(r) => setComp(r.valor)} />` — `r.AAAA` e `r.MM` já vêm separados.
3. Faixa: `menorCompetencia`/`maiorCompetencia` (`AAAAMM`).
**Armadilha:** o valor é string (compare como string). Conferir `Manual_MmAaaaField.md`.

### C.8 `ComboField`

1. `dominio` fixo (`"SP,RJ,MG"` ou array **estável**: constante fora do componente ou `useMemo`).
2. `<ComboField label="UF" dominio={UFS} value={uf} onChange={(r) => setUf(r.valor)} />`.
3. **Decida `permiteVazio`**: padrão `false` faz o campo **emitir o 1º item na montagem** (o estado do projeto muda sozinho). Se o formulário deve começar vazio, use `permiteVazio`.
4. Para domínios que vêm do banco/API, monte o array a partir da resposta e memorize; **não** use o `ComboField` para listas enormes (use `LookUpField`).
**Conferir:** `Manual_ComboField.md`.

### C.8.1 `TextNumericoField`

**Quando usar:** qualquer valor numérico editável: quantidade, moeda, alíquota, percentual, código numérico curto.

**Como:**
1. Estado: `const [valor, setValor] = useState<number | null>(null);` (`null` = vazio; use `0` só quando o zero for um valor de verdade).
2. Troque o `<input>` numérico atual por:
   ```tsx
   <TextNumericoField label="Valor" mascara="999.999,99" valorInicial={valor} onChange={(r) => setValor(r.vazio ? null : r.valor)} />
   ```
   Percentual: `mascara="99,99" percentual`.
3. A máscara decide tudo: dígitos antes da vírgula, casas decimais e ponto de milhar. Escolha pelo dado (alíquota de ISS `"99,99"`, valor em reais `"999.999.999,99"`, retenção `"999,9999"`).
4. Ao **enviar à API**: `r.valor` é `number`; envie como o backend espera (número ou texto com vírgula). Ao **receber**: passe o número em `valorInicial`; `null` da API = campo vazio.
5. O `onChange` só dispara ao sair do campo: o clique em "Salvar" já vem depois do blur, então o estado está atualizado.

**Armadilhas:** o campo é alinhado à direita por padrão; `%` não faz parte do valor; vazio e zero são diferentes (`r.vazio`); `valido` é sempre `true` (a máscara já limita os dígitos).
**Conferir:** `Manual_TextNumericoField.md`.

### C.8.2 `TextEmailField`

**Quando usar:** todo campo de e-mail editável (cadastro, contato, login, troca de e-mail).

**Como:**
1. Estado: `const [email, setEmail] = useState("");` (vazio = `""`).
2. Troque o `<input type="email">`/`<input>` de e-mail por:
   ```tsx
   <TextEmailField label="E-mail" value={email} onChange={(r) => { setEmail(r.valor); /* guarde r.valido */ }} />
   ```
3. **Não** repita regras por fora (minúsculas, trim, regex): estão no componente. `aceitaInvalido` só para dado legado.
4. O `onChange` só dispara ao sair do campo. Confira `valido` e `obrigatorioPendente` no submit.

**Armadilhas:** formato inválido bloqueia a saída do campo (como nos CPF/CNPJ); acentos não são aceitos (e-mail é ASCII); Enter move o foco em vez de enviar o formulário.
**Conferir:** `Manual_TextEmailField.md`.

### C.9 `GridField`

**Quando usar:** consulta/lista somente leitura (até 3000 linhas) com ordenação, paginação, detalhe e ações.

**Como:**
1. Defina `colunas` e `cabecalhos` (mesma ordem/tamanho) **fora** do componente ou com `useMemo`; `dados` também estável (estado ou `useMemo`) — nova referência a cada render reinicia ordem/página.
2. Escolha o `tipo` de cada coluna (`texto`, `numero`, `data`, `dataHora`, `competencia`, `logico`) e máscaras (`mascara`) conforme o dado; `colunaOrdenar` quando exibe `MM/AAAA` mas deve ordenar por `AAAAMM`.
3. **`linhasPorPagina` é obrigatória.**
4. Ligue os eventos que a tela precisa: `onLinhaAcionada` (abrir/editar), `onLinhaPosicionada` (master/detail — dispara também na 1ª carga), `onLinhaContexto`.
5. Detalhe: `detalhe` (+ `temDetalhe`, `detalheAberto`). Ações: `acoes` com `rotulo` único.
6. Substitua a tabela atual da tela; mantenha a busca/paginação **do servidor** do projeto se a lista passar de 3000 (o grid corta em 3000 e avisa).
**Armadilhas:** objetos de `dados` recriados a cada render; `onLinhaPosicionada` abrindo telas na 1ª carga; `rotulo` repetido em `acoes`.
**Conferir:** `Manual_GridField.md`; teste clique e duplo clique no cabeçalho, paginação e o evento de linha.

### C.10 `LookUpField`

**Quando usar:** campo "código + descrição" com pesquisa em tabela do banco (cliente, prestador, produto...).

**Pré-requisito:** o **backend do projeto** precisa expor o Lookup (veja C.12 `BackendLookup`). Sem ele, o campo mostra erro de consulta.

**Como:**
1. Monte a `LookupDefinicao` **como constante** (fora do componente): `banco`, `base` (`TABELA` ou `SELECT`), `nomeTabela`/`select`, `colunaRetorno` + `tipoColunaRetorno`, `colunaDescricao`, `colunasBasePesquisa`, `tipoConsulta`, `colunasGrid`, `colunasOrderBy`; opcionais `colunaCpf`/`colunaCnpj`/`colunaDtNascto` (filtros do modal), `colunasAdicionais`, `qtdeLinhas`, `filtro`. **Peça ao analista** os nomes reais de tabela/colunas e o banco; **não invente**. Não monte a definição com texto digitado pelo usuário.
2. Estado do código **com o tipo da coluna de retorno**: `NUMERO` → `useState<LookupCodigo>(0)`; `TEXTO` → `""`; `DATA` → `MIN_DATE`.
3. Use:
   ```tsx
   <LookUpField label="Pessoa" definicao={definicaoPessoa} value={codigo}
     onChange={(r) => { setCodigo(r.codigo); /* guarde r.descricao, r.jsonLinhaEscolhida, r.valido */ }}
     tituloPesquisa="Pesquisar pessoa" tipoRefreshGrid="AUTOMATICA"
     obrigatorio={false} mensagemNaoExistencia="Pessoa não cadastrada" />
   ```
   As 4 props `tituloPesquisa`, `tipoRefreshGrid`, `obrigatorio`, `mensagemNaoExistencia` são obrigatórias.
4. Siglas e máscaras: `mapaValores` (A→Ativo) ou `CASE` no SELECT; `mascaraGrid` (inclusive função por linha usando `colunasAdicionais`); `mascaraCodigo`.
5. Valor inicial na edição: passe o código; a descrição é buscada sozinha (sem disparar `onChange`).
6. No submit: `valido === false` (código digitado inexistente) ou `obrigatorioPendente` impedem o envio.
7. `baseURL` da instância HTTP + `prefix` do backend devem bater (`POST {baseURL}Lookup/...`); senão 404 (use `caminhoLookup` no Provider se o prefixo for outro).
**Armadilhas:** `0` num campo `TEXTO` não é vazio; definição recriada a cada render (é estabilizada internamente, mas mantenha constante); modal usa ids fixos `lk-*` (um modal por vez); o toast global de erro do projeto deve respeitar `skipGlobalErrorToast`.
**Conferir:** `Manual_LookUpField.md`; digite um código inexistente (bloqueia), um existente (descrição aparece), F4, pesquisa por texto e por CPF.

### C.11 `Carregando`

1. Renderize **condicionalmente** enquanto a operação roda: `{salvando && <Carregando mensagem="Gravando..." />}`.
2. Garanta que o estado volte a `false` em `finally` (senão a tela fica bloqueada).
3. Marca do sistema: `logo={<img src={logo} alt="Empresa" />}` (a biblioteca é neutra e não traz marca).
4. Substitua spinners/overlays existentes **da tela pedida**; não crie um provider global se o projeto já tem um gerenciador de loading (use `Carregando` dentro dele).
**Armadilha:** sem botão de cancelar. Conferir `Manual_Carregando.md`.

### C.12 `BackendLookup` (Python/FastAPI) — pré-requisito do `LookUpField`

1. **Já existe FastAPI no projeto?** Se não, pare e pergunte (não crie backend novo sem pedido).
2. Instale no ambiente do projeto: `pip install <caminho>\Componentes_React_Python\backend` (ou `-e`), o **driver do banco** (`oracledb`, `pyodbc` ou `psycopg[binary]`) e `uvicorn` se necessário. Veja `Manual_Instalacao.md` §2.
3. Escreva `obter_conexao(banco: str)` **reutilizando a conexão/pool que o projeto já tem**; não crie credenciais novas nem as escreva no código (use a configuração do projeto). A biblioteca chama `close()` na conexão.
4. Reaproveite a **dependência de autenticação existente** do projeto em `dependencia_autenticacao` (JWT/sessão). `permitir_anonimo=True` **só em teste**.
5. Inclua o roteador: `app.include_router(criar_roteador_lookup(ConfiguracaoLookup(...)), prefix="/api/Lookup")` — alinhado com a `baseURL` do front.
6. **Segurança**: o Lookup consulta qualquer tabela visível ao usuário de banco. Recomende ao analista um usuário **só com SELECT**; ofereça `tabelas_permitidas`/`autorizar` se o projeto quiser restringir.
7. **Verifique**: suba a API e chame `POST /api/Lookup/validacao` com uma definição válida (espera `{"ok": true}`), depois `/codigo` com um código real. Informe se **não** conseguiu testar contra o banco real.
**Conferir:** `Manual_BackendLookup.md`.

---

## D. Checklist final (para qualquer componente)

- [ ] Li o `listaComponentes.md` (parâmetros) e a seção do componente neste arquivo.
- [ ] Só importei de `@componentes/react` / `componentes_py`; não alterei a biblioteca.
- [ ] Estado inicial com o vazio correto (`MIN_DATE` / `0` / `""`); valores da API convertidos.
- [ ] Tratei `valido` e `obrigatorioPendente` no submit.
- [ ] Conversão ao enviar à API combinada (datas, CPF com zeros).
- [ ] Removi o componente/máscara antigo da tela pedida.
- [ ] Rodei `typecheck`/build do projeto e o relatei; disse o que **não** verifiquei (navegador, banco real).
