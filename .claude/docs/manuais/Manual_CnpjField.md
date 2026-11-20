# Manual: CnpjField

Campo de CNPJ, numérico ou **alfanumérico** (formato da Receita a partir de julho/2026). Comportamento comum: ver `Manual_CamposComuns.md`.

## Assinatura

```tsx
<CnpjField
  label="CNPJ"
  value={cnpj}                // string de 14 posições sem máscara; vazio = ""
  onChange={(r) => setCnpj(r.valor)}   // CampoResultado<string>
  aceitaInvalido={false}      // padrão
/>
```

| Prop | Tipo | Observação |
|---|---|---|
| `value` | `string` | `"02849393000145"`, sem máscara, com zeros à esquerda. Vazio = `""` |
| `onChange` | `(r: CampoResultado<string>) => void` | `valor` = 14 caracteres sem máscara |
| `aceitaInvalido` | `boolean` | Padrão `false` |
| demais | — | `CampoBaseProps`. Largura padrão **16** |

## Regras

- As **12 primeiras posições** aceitam letras e números; as **2 últimas** (dígito verificador) só números. Letras minúsculas viram maiúsculas.
- Máscara `00.000.000/0000-00` enquanto digita (`12abc34501de35` → `12.ABC.345/01DE-35`).
- Ao sair, completa com zeros à esquerda: `191` → `00.000.000/0001-91`.
- O dígito verificador usa **código ASCII − 48** (`A` = 17, `B` = 18...). Inválido (ou todos os caracteres iguais): `CNPJ com dígito inválido`, bloqueia a saída. Com `aceitaInvalido` passa.
- F4 não faz nada.

## Exemplos válidos

`11222333000181` (numérico) · `12ABC34501DE35` (alfanumérico, exemplo oficial da Receita) · `00000000000191`.

## Armadilhas

1. Mantenha o valor como **string**: converter para número perde zeros à esquerda e quebra o alfanumérico.
2. Colunas `CHAR(14)` de banco podem vir com espaços: aplique `trim()` antes de passar em `value`.
