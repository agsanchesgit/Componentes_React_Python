# Manual: FNC_FORMATA

Formata número, texto ou data/hora por máscara. Para programadores que usam a biblioteca `@componentes/react`.

---

## 1. Visão geral

- **O que faz:** recebe um valor (`number`, `string`, `Date`, `null` ou `undefined`) e uma máscara, e devolve uma `string` formatada.
- **Onde fica:** `frontend/src/formata/formata.ts`. Testes em `formata.test.ts`, na mesma pasta.
- **Como importar:**

```ts
import { FNC_FORMATA, MIN_DATE } from "@componentes/react";

FNC_FORMATA(1234.5, "999.999.999,99"); // '      1.234,50'
```

O comportamento é idêntico ao do Nexus (mesmos 26 casos oficiais + os complementares).

---

## 2. Assinatura

```ts
export function FNC_FORMATA(
  variavel: number | string | Date | null | undefined,
  mascara: string,
): string;

export const MIN_DATE: Date; // 0001-01-01T00:00:00, equivale ao DateTime.MinValue do .NET
```

**Função pura.** Mesma entrada, mesma saída. Não altera o argumento (nem um `Date`), não guarda estado, não faz chamada de rede. Com `Date`, lê os componentes no fuso local.

**Erro.** Lança `Error` só quando a máscara é inválida (§7). Valor que não cabe na máscara volta sem formatação, sem erro.

---

## 3. Tokens da máscara

| Token | Tipo | O que sai na posição |
|---|---|---|
| `9` | numérica | Dígito. Se faltar, sai branco `' '` |
| `Z` | numérica | Dígito. Se faltar, sai `0` |
| `A` | alfanumérica | Letra ou dígito, sem mudar maiúscula/minúscula |
| `DD` / `MM` / `AAAA` | data | Dia, mês, ano (2, 2 e 4 posições) |
| `HH` / `MI` / `SS` | hora | Hora, minuto, segundo (2 posições cada) |
| outro caractere | literal | Sai como está na máscara |
| `0` | — | **Inválido.** Lança `Error` |

Um literal logo depois de uma posição em branco também sai em branco: `FNC_FORMATA(1, "9/9")` dá `'  1'`.

---

## 4. Como a máscara é classificada

Testada nesta ordem; vale a primeira regra que casar:

1. **Inválida** → `Error`: vazia ou com `0`.
2. **Data/hora** → tem `DD`, `MM`, `HH`, `MI` ou `SS` (busca por substring).
3. **Sem posição** → `Error`: não tem `9`, `Z` nem `A`.
4. **Alfanumérica** → tem `A`.
5. **Numérica** → os demais casos. **A última `,` é o separador decimal.**

| Máscara | Tipo |
|---|---|
| `DD/MM/AAAA`, `AAAA-MM-DD`, `HH:MI` | data/hora |
| `AAAA`, `A.ZZZ` | alfanumérica |
| `999.999.999,99`, `ZZZ.ZZZ.ZZZ-ZZ` | numérica |
| `-` | `Error` (sem posição) |
| `0.000` | `Error` (tem `0`) |

---

## 5. Regras por tipo

### 5.1 Numérica com `number`

Arredonda para as casas da máscara (meio para cima), completa as decimais com zero, preenche os inteiros da direita para a esquerda e, no negativo, põe `-` no último branco antes do primeiro dígito (sem branco, na frente).

```ts
FNC_FORMATA(1.005, "9,99");              // '1,01'
FNC_FORMATA(0.5, "999.999,99");          // '      0,50'
FNC_FORMATA(10, "ZZZ,ZZ");               // '010,00'
FNC_FORMATA(1234567.89, "999.999.999,99"); // '  1.234.567,89'
FNC_FORMATA(-1234.5, "999.999,99");      // ' -1.234,50'
FNC_FORMATA(-5, "ZZZ");                  // '-005'  (sem branco: sinal na frente)
FNC_FORMATA(-0.001, "9,99");             // '0,00'  (arredonda para zero: sem sinal)
FNC_FORMATA(12345678, "ZZZ.ZZZ");        // '12345678'  (estouro: volta String(valor))
FNC_FORMATA(9.999, "9,99");              // '9.999'     (arredonda para 10,00, que não cabe)
```

### 5.2 Numérica com `string`

Tira da string os literais da máscara. Se sobrar só dígito, formata como inteiro lido da direita; senão, devolve a string como veio.

```ts
FNC_FORMATA("00345678912", "ZZZ.ZZZ.ZZZ-ZZ");    // '003.456.789-12'
FNC_FORMATA("003.456.789-12", "ZZZ.ZZZ.ZZZ-ZZ"); // '003.456.789-12'  (idempotente)
FNC_FORMATA("5", "999.999,99");                  // '      0,05'
FNC_FORMATA("12a", "ZZZ");                       // '12a'
FNC_FORMATA("-5", "ZZZ");                        // '-5'  (sinal não é tratado em string)
```

### 5.3 Alfanumérica

Tira os literais da máscara e preenche as posições da esquerda para a direita. `A` aceita letra ou dígito; `9` e `Z`, só dígito. Tamanho diferente ou caractere que não cabe: volta como veio.

```ts
FNC_FORMATA("A123", "A.ZZZ");  // 'A.123'
FNC_FORMATA("A.456", "A.ZZZ"); // 'A.456'
FNC_FORMATA("A12", "A.ZZZ");   // 'A12'  (tamanho diferente)
FNC_FORMATA("AB", "ZZ");       // 'AB'   (letra em posição numérica)
FNC_FORMATA("12", "A-A");      // '1-2'
```

### 5.4 Data/hora

Aceita `Date`, string ISO, `number` ou string só de dígitos.

```ts
// Date: componentes locais
FNC_FORMATA(new Date(2026, 4, 10, 14, 5, 9), "DD/MM/AAAA HH:MI:SS"); // '10/05/2026 14:05:09'

// ISO: lida como escrita, sem deslocar fuso (o Z / ±HH:MM é ignorado)
FNC_FORMATA("2026-05-10", "DD/MM/AAAA");                         // '10/05/2026'
FNC_FORMATA("2026-05-10T14:05:00", "HH:MI");                     // '14:05'
FNC_FORMATA("2026-05-10T14:05:09.123Z", "DD/MM/AAAA HH:MI:SS"); // '10/05/2026 14:05:09'

// number / dígitos: lidos na ordem da máscara, zero à esquerda se faltar
FNC_FORMATA(10052026, "DD/MM/AAAA"); // '10/05/2026'
FNC_FORMATA(1052026, "DD/MM/AAAA");  // '01/05/2026'
FNC_FORMATA(20260510, "AAAA-MM-DD"); // '2026-05-10'
FNC_FORMATA(1430, "HH:MI");          // '14:30'
```

Data inválida volta como veio:

```ts
FNC_FORMATA(32132026, "DD/MM/AAAA");    // '32132026'
FNC_FORMATA("2026-13-01", "DD/MM/AAAA"); // '2026-13-01'
FNC_FORMATA("29/02/2025", "DD/MM/AAAA"); // '29/02/2025'  (2025 não é bissexto)
FNC_FORMATA("2024-02-29", "DD/MM/AAAA"); // '29/02/2024'
```

---

## 6. Valores vazios

| Máscara | `null` / `undefined` | `""` |
|---|---|---|
| numérica `999.999,99` | 10 brancos | 10 brancos |
| numérica `ZZZ.ZZZ-ZZ` | `'000.000-00'` | `'000.000-00'` |
| alfanumérica `A.ZZZ` | `''` | `''` |
| data `DD/MM/AAAA` | `'__/__/____'` | `'__/__/____'` |
| hora `(HH:MI)` | `'(__:__)'` | `'(__:__)'` |

### `MIN_DATE`

É o "vazio" de data (equivale ao `DateTime.MinValue` do .NET).

- Em máscara de data, é vazio: `FNC_FORMATA(MIN_DATE, "DD/MM/AAAA")` → `'__/__/____'`. O ISO `"0001-01-01T00:00:00"` também. **Qualquer `Date` de ano 1** é vazio.
- Em máscara numérica ou alfanumérica **não** é vazio: volta `String(valor)`.
- **Nunca** crie com `new Date(1, 0, 1)`: o JavaScript trata anos 0–99 como 1900+ano e dá 01/01/1901. Use `MIN_DATE`, criado com `setFullYear(1, 0, 1)`.

---

## 7. Erros e valores sem formatação

### 7.1 Lança `Error`

A máscara é checada **antes** do valor, inclusive para `null`:

| Máscara | Mensagem |
|---|---|
| `""` ou com `0` | `FNC_FORMATA: máscara inválida "..." (vazia ou com o símbolo 0)` |
| `"-"` | `FNC_FORMATA: a máscara "-" não tem nenhuma posição (9, Z ou A)` |

Máscara que vem de dado (banco, props, configuração) pode lançar durante a renderização: valide ou trate antes.

### 7.2 Devolve sem formatação (sem erro)

| Caso | Entrada | Máscara | Saída |
|---|---|---|---|
| número não cabe | `12345678` | `ZZZ.ZZZ` | `'12345678'` |
| arredondamento estoura | `9.999` | `9,99` | `'9.999'` |
| texto não numérico | `'12a'` | `ZZZ` | `'12a'` |
| tamanho diferente (alfa) | `'A12'` | `A.ZZZ` | `'A12'` |
| texto que não é data | `'abc'` | `DD/MM/AAAA` | `'abc'` |
| `Date` inválido | `new Date("abc")` | `DD/MM/AAAA` | `'Invalid Date'` |

---

## 8. Receitas prontas

| Receita | Máscara | Entrada | Saída |
|---|---|---|---|
| CPF | `ZZZ.ZZZ.ZZZ-ZZ` | `345678912` | `'003.456.789-12'` |
| CPF (string) | `ZZZ.ZZZ.ZZZ-ZZ` | `'34567891200'` | `'345.678.912-00'` |
| CNPJ | `ZZ.ZZZ.ZZZ/ZZZZ-ZZ` | `2849393000115` | `'02.849.393/0001-15'` |
| CEP | `ZZZZZ-ZZZ` | `'01310100'` | `'01310-100'` |
| valor | `999.999.999,99` | `1234567.89` | `'  1.234.567,89'` |
| valor com R$ | `R$ 999.999,99` | `1234.5` | `'R$   1.234,50'` |
| data | `DD/MM/AAAA` | `'2026-05-10'` | `'10/05/2026'` |
| data vazia | `DD/MM/AAAA` | `null` | `'__/__/____'` |
| hora | `HH:MI` | `1405` | `'14:05'` |

Para CPF, CNPJ e CEP, prefira `string` (zeros à esquerda não se perdem). Para valor monetário, use `number`.

---

## 9. Exemplo em React/TSX

```tsx
import { FNC_FORMATA, MIN_DATE } from "@componentes/react";

export function LinhaTitulo({ cnpj, vencimento, total }: {
  cnpj: string | null;
  vencimento: string | null; // ISO da API, ex.: "2026-05-10T00:00:00"
  total: number | null;
}) {
  return (
    <tr>
      <td>{FNC_FORMATA(cnpj, "ZZ.ZZZ.ZZZ/ZZZZ-ZZ")}</td>
      {/* null ou "0001-01-01T00:00:00" mostram "__/__/____" */}
      <td>{FNC_FORMATA(vencimento ?? MIN_DATE, "DD/MM/AAAA")}</td>
      <td style={{ whiteSpace: "pre", textAlign: "right", fontFamily: "monospace" }}>
        {FNC_FORMATA(total, "999.999.999,99")}
      </td>
    </tr>
  );
}
```

`white-space: pre` é necessário nos valores numéricos: sem ele o HTML recolhe os brancos da frente. A função é barata e pura; não precisa de `useMemo`.

---

## 10. Armadilhas

1. **Decimal em string.** `FNC_FORMATA("1234.5", "999.999.999,99")` dá `'        123,45'` (o `.` é literal e sai junto). Passe `number`.
2. **A última vírgula é o decimal.** `999,999,999` vira `123,456,000`; use `999.999.999`.
3. **Fuso em ISO é ignorado.** `"2026-05-10T02:30:00Z"` → `'10/05/2026 02:30'`. Para mostrar no fuso local, converta antes e passe um `Date`.
4. **`AAAA` sozinho é alfanumérico.** Só vira data com `DD`, `MM`, `HH`, `MI` ou `SS` na máscara.
5. **Valor maior que a máscara não dá erro:** volta sem formatação. A tela precisa tratar.
6. **`Date` em máscara numérica/alfanumérica** volta `String(valor)`.
7. **Literal depois de branco some.** `FNC_FORMATA(null, "(99) 9999-9999")` dá `'(             '`. Use `Z` no que deve sair com `0`.
8. **`JSON.stringify(MIN_DATE)`** pode sair com horário deslocado pelo fuso (ex.: `0001-01-01T03:06:28.000Z`). Não envie `MIN_DATE` à API sem definir a convenção (`0001-01-01T00:00:00`).

---

## 11. Como testar

```powershell
cd frontend
npm test            # Vitest: lógica pura da biblioteca
npm run typecheck
npm run lint
```

Os 26 casos oficiais, o de máscara inválida e os complementares estão em `src/formata/formata.test.ts` (29 testes).
