# Manual: instalação em um projeto novo (React/TypeScript + FastAPI)

Como levar a biblioteca para qualquer projeto com **frontend React + TypeScript** e **backend Python (FastAPI)**. São dois pacotes independentes:

| Pacote | O que é | Instala com |
|---|---|---|
| `@componentes/react` | componentes e estilos | `npm` (arquivo `.tgz` local, `file:` ou workspace) |
| `componentes_py` | backend do Lookup (rotas FastAPI) | `pip` (pasta local ou wheel) |

Requisitos: Node 20+ com npm, React 18+, Python 3.11+. Em todos os exemplos abaixo, `D:\Componentes_React_Python` é a pasta desta biblioteca.

---

## 1. Frontend

### 1.1 Gerar o pacote npm (uma vez, ou a cada versão nova)

```powershell
cd D:\Componentes_React_Python\frontend
npm install
npm pack --pack-destination C:\temp          # gera C:\temp\componentes-react-0.0.2.tgz (roda o build sozinho)
```

### 1.2 Instalar no projeto

```powershell
cd C:\meu-projeto\frontend
npm install C:\temp\componentes-react-0.0.2.tgz
```

Outras formas, se preferir: `npm install file:D:/Componentes_React_Python/frontend` (aponta para a pasta; rode `npm run build` lá antes) ou um workspace npm. `react` e `react-dom` (>= 18) são **peerDependencies**: o seu projeto já os tem.

### 1.3 Importar o CSS (uma vez) e montar o provider (uma vez)

No ponto de entrada (`main.tsx`) ou no layout principal:

```tsx
import "@componentes/react/estilos.css";                    // estilos dos componentes (variáveis --cmp-*)
import { ComponentesProvider } from "@componentes/react";
import { api } from "./minhaApi";                           // a instância HTTP do seu projeto (§1.4)

createRoot(document.getElementById("root")!).render(
  <ComponentesProvider api={api}>
    <App />
  </ComponentesProvider>,
);
```

O provider só é **necessário para o `LookUpField`** (os demais componentes não fazem chamada HTTP), mas monte-o sempre: sem ele, o `LookUpField` lança `ComponentesProvider ausente: envolva a tela com o provider.`.

### 1.4 A instância HTTP (a sua, não a da biblioteca)

A biblioteca **não cria** a instância HTTP: token, refresh, cabeçalhos e toasts globais ficam no seu projeto. Ela só precisa de um objeto com `post(url, corpo, opcoes)` e `get(url, opcoes)` que devolvam `{ data }`. Uma instância **axios** serve direto:

```ts
// minhaApi.ts
import axios from "axios";
export const api = axios.create({ baseURL: "/api/" });      // note a barra final
// ... interceptors de token, refresh etc. do seu projeto
```

Sem axios, use `fetch` (e, em erro HTTP, lance um erro com `error.response.data` para a biblioteca ler `{ error }`):

```ts
// minhaApi.ts
import type { ApiHttp } from "@componentes/react";

export function criarApiFetch(base: string): ApiHttp {
  async function chamar<T>(metodo: "GET" | "POST", url: string, corpo?: unknown) {
    const r = await fetch(base + url, {
      method: metodo,
      headers: { "Content-Type": "application/json" },
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
    });
    const data = (await r.json().catch(() => null)) as T;
    if (!r.ok) {
      throw Object.assign(new Error(`HTTP ${r.status}`), { response: { status: r.status, data } });
    }
    return { data };
  }
  return { post: (u, c) => chamar("POST", u, c), get: (u) => chamar("GET", u) };
}
export const api = criarApiFetch("/api/");
```

**Para onde vão as chamadas do Lookup:** `POST {baseURL}Lookup/pesquisa|codigo|validacao`. Com `baseURL: "/api/"`, isso é `/api/Lookup/...`, e o backend deve incluir o roteador com `prefix="/api/Lookup"` (§2.3). Outro prefixo? `<ComponentesProvider api={api} caminhoLookup="v2/consulta">`.

**Toast global de erro:** os componentes enviam `skipGlobalErrorToast: true` nas chamadas do Lookup (convenção do Nexus). Se a sua instância tem um interceptor que mostra toast de erro, faça-o respeitar essa opção; o erro já aparece no próprio campo e em `onErro`.

### 1.5 Usar os componentes

```tsx
import { DataField, MIN_DATE } from "@componentes/react";

const [nascimento, setNascimento] = useState<Date>(MIN_DATE);
<DataField label="Nascimento" value={nascimento} onChange={(r) => setNascimento(r.valor)} />
```

Cada componente tem o seu manual: `Manual_DataField`, `Manual_DataHoraField`, `Manual_CpfField`, `Manual_CnpjField`, `Manual_MmAaaaField`, `Manual_ComboField`, `Manual_GridField`, `Manual_LookUpField`, `Manual_FNC_FORMATA`, `Manual_Carregando` (e `Manual_CamposComuns` para o que todos os campos compartilham).

### 1.6 Tema

Sobrescreva as variáveis CSS depois de importar o `estilos.css`:

```css
:root { --cmp-cor-foco: #0b6bcb; --cmp-raio: 6px; --cmp-fonte: "Inter", sans-serif; }
```

Tema escuro: `<html data-tema="escuro">`. Variáveis: `--cmp-cor-fundo`, `--cmp-cor-texto`, `--cmp-cor-borda`, `--cmp-cor-foco`, `--cmp-cor-erro`, `--cmp-cor-desabilitado`, `--cmp-raio`, `--cmp-fonte`, `--cmp-tamanho-fonte`. **Tailwind não é necessário.**

---

## 2. Backend (só se for usar o `LookUpField`)

### 2.1 Instalar o pacote Python

```powershell
cd C:\meu-projeto\backend
python -m venv .venv
.venv\Scripts\python -m pip install D:\Componentes_React_Python\backend      # instala também fastapi e pydantic
# para desenvolver a biblioteca junto: pip install -e D:\Componentes_React_Python\backend
```

Instale também o servidor ASGI para rodar a API (a biblioteca não o traz) e o **driver do seu banco** (ela não importa nenhum):

```powershell
.venv\Scripts\python -m pip install uvicorn               # servidor para rodar a API
.venv\Scripts\python -m pip install oracledb              # Oracle 12c+
.venv\Scripts\python -m pip install pyodbc                # SQL Server (precisa do ODBC Driver for SQL Server)
.venv\Scripts\python -m pip install "psycopg[binary]"     # PostgreSQL
```

### 2.2 Conexão e autenticação (do seu projeto)

```python
# conexao.py
import psycopg   # ou oracledb / pyodbc

def minha_conexao(banco: str):
    """Chamada uma vez por requisição, com o banco pedido pelo front ("ORACLE", "SQL_SERVER" ou "POSTGRESQL").
    A biblioteca chama close() ao terminar (com pool, devolva um objeto cujo close() devolve ao pool)."""
    if banco == "POSTGRESQL":
        return psycopg.connect("host=... dbname=... user=... password=...")
    raise RuntimeError(f"Banco não configurado: {banco}")
```

Use um **usuário de banco só com SELECT** nas tabelas necessárias: o Lookup consulta qualquer tabela visível a ele (ver `Manual_BackendLookup.md` §7).

### 2.3 Incluir o roteador

```python
# main.py
from fastapi import Depends, FastAPI, Header, HTTPException
from componentes_py import ConfiguracaoLookup, criar_roteador_lookup
from conexao import minha_conexao

def exigir_usuario(authorization: str | None = Header(default=None)):
    # a SUA autenticação (JWT, sessão...); devolva o usuário
    if not authorization:
        raise HTTPException(status_code=401, detail="não autenticado")
    return "usuario"

app = FastAPI()
app.include_router(
    criar_roteador_lookup(ConfiguracaoLookup(
        obter_conexao=minha_conexao,
        dependencia_autenticacao=exigir_usuario,   # obrigatória (ou permitir_anonimo=True, só em testes)
    )),
    prefix="/api/Lookup",
)
```

Rodar: `.venv\Scripts\python -m uvicorn main:app --port 8000` (troque a porta se a 8000 já estiver em uso; ajuste o destino do proxy do §2.4 para a mesma porta).

### 2.4 Desenvolvimento: proxy ou CORS

O front em `localhost:5173` e o back em `localhost:8000` são origens diferentes. Use o **proxy do Vite** (recomendado):

```ts
// vite.config.ts
export default defineConfig({ plugins: [react()], server: { proxy: { "/api": "http://localhost:8000" } } });
```

ou o `CORSMiddleware` do FastAPI. Em produção, sirva front e API sob o mesmo domínio ou configure o CORS.

---

## 3. Verificar a instalação

1. `npx tsc --noEmit` no front: sem erro de tipos (os tipos vêm do pacote, `dist/*.d.ts`).
2. `npm run build` no front: gera o bundle com o CSS.
3. No back, `POST /api/Lookup/validacao` com uma definição válida devolve `{ "ok": true, "inconsistencias": [] }` (não executa nada no banco).

## 4. Atualizar para uma versão nova

```powershell
cd D:\Componentes_React_Python\frontend; npm pack --pack-destination C:\temp
cd C:\meu-projeto\frontend;             npm install C:\temp\componentes-react-0.0.2.tgz
cd C:\meu-projeto\backend;              .venv\Scripts\python -m pip install --upgrade D:\Componentes_React_Python\backend
```

Aumente `version` em `frontend/package.json` e em `backend/pyproject.toml` antes de gerar. Publicar em um registro (npm/PyPI privado) é uma decisão do projeto; os dois pacotes já têm `name`, `version` e `files` definidos.

## 5. Problemas comuns

| Sintoma | Causa | Solução |
|---|---|---|
| `ComponentesProvider ausente` | `LookUpField` fora do provider | Envolva a árvore (§1.3) |
| Lookup responde 404 | `baseURL`/`caminhoLookup` não bate com o `prefix` do backend | Alinhe (§1.4 e §2.3) |
| Componentes sem estilo | Faltou `import "@componentes/react/estilos.css"` | §1.3 |
| `Cannot find module '@componentes/react/estilos.css'` (TS) | Falta declaração de CSS no seu projeto | Já vem com `vite/client` (`/// <reference types="vite/client" />`) |
| Backend lança `ValueError ... dependencia_autenticacao` | Autenticação não informada | §2.3 |
| `400 {error}` com texto `ORA-...`/`no such table` | Erro do banco vindo do SQL da `definicao` | Corrija a definição (tabela/coluna/filtro) |
| Calendário/lista cortado | Ancestral com `overflow: hidden` | Mova o campo ou ajuste o `overflow` do contêiner |
