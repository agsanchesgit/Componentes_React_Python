# Manual: MmAaaaField

Campo de competência (mês/ano). Comportamento comum: ver `Manual_CamposComuns.md`.

## Assinatura

```tsx
<MmAaaaField
  label="Competência"
  value={competencia}         // string AAAAMM ("202610"); vazio = ""
  onChange={(r) => setCompetencia(r.valor)}   // CompetenciaResultado
  menorCompetencia="202001"   // opcional (padrão 185001)
  maiorCompetencia="202712"   // opcional (padrão 210012)
/>
```

`onChange` recebe `CompetenciaResultado`: `{ valor, AAAA, MM, vazio, valido, obrigatorioPendente }`.

| Campo | Exemplo | Vazio |
|---|---|---|
| `valor` | `"202610"` | `""` |
| `AAAA` | `"2026"` | `""` |
| `MM` | `"10"` (sempre 2 dígitos) | `""` |

Largura padrão **7**. Placeholder `MM/AAAA`.

## Regras

- A máscara `MM/AAAA` é só de exibição; o valor é `AAAAMM`.
- Digitação: `3` vira `03/` (mês maior que 1 já completa); aceita a barra digitada (`3/2026`). Ao sair, mês de 1 dígito ganha o zero (`3/2026` → `03/2026`).
- Erros (bloqueiam a saída):
  - `Competência inválida (use MM/AAAA)` — ano incompleto ou texto fora do formato;
  - `Mês inválido (01 a 12)`;
  - `Competência fora da faixa (01/2020 a 12/2027)`.
- `menorCompetencia`/`maiorCompetencia` fora do formato `AAAAMM` (6 dígitos) são ignoradas e valem os padrões.
- F4 não faz nada.

## Armadilhas

1. O valor é **string**, não número: compare competências como strings (`"202610" > "202609"` funciona por serem de mesmo tamanho).
2. A faixa padrão vai de 01/1850 a 12/2100.
