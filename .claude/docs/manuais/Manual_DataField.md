# Manual: DataField

Campo de data `DD/MM/AAAA` com calendário. Comportamento comum (teclado, bloqueio de saída, resultado): ver `Manual_CamposComuns.md`.

## Assinatura

```tsx
<DataField
  label="Nascimento"
  value={data}            // Date; vazio = MIN_DATE
  onChange={(r) => setData(r.valor)}   // CampoResultado<Date>
  menorData={new Date(2000, 0, 1)}     // opcional
  maiorData={new Date(2030, 11, 31)}   // opcional
/>
```

| Prop | Tipo | Observação |
|---|---|---|
| `value` | `Date` | Vazio = `MIN_DATE` (ou qualquer data de ano 1) |
| `onChange` | `(r: CampoResultado<Date>) => void` | `valor` é `MIN_DATE` quando vazio |
| `menorData` / `maiorData` | `Date` | `MIN_DATE` ou omitido = sem limite. Comparação **só pelo dia** |
| demais | — | `CampoBaseProps`. Largura padrão **12** |

## Regras

- Digita só números; a máscara `DD/MM/AAAA` entra sozinha (até 8 dígitos).
- Aceita de **01/01/1850 a 31/12/2100**, ano sempre com 4 dígitos. Fora disso: `Ano deve estar entre 1850 e 2100`.
- Data inexistente (30/02, 31/04, mês 13): `Data inválida`, bloqueia a saída.
- Fora de `menorData`/`maiorData`: `Data deve ser igual ou posterior a ...` / `... anterior a ...`.
- **O dia da semana aparece dentro do campo**, entre parênteses, quando o campo está preenchido, válido e sem foco: `(dom)`, `(seg)`...
- **F4** ou o botão abre o calendário: seletor de mês e ano, setas de mês, botão **Hoje**. Dias fora da faixa ficam desabilitados. Escolher um dia fecha o painel e devolve o foco ao campo.

## Exemplo com faixa e obrigatório

```tsx
const [data, setData] = useState<Date>(MIN_DATE);
const [pendente, setPendente] = useState(false);

<DataField
  label="Vencimento"
  obrigatorio
  value={data}
  menorData={new Date()}
  onChange={(r) => {
    setData(r.valor);
    setPendente(r.obrigatorioPendente);
  }}
/>
```

## Armadilhas

1. `new Date(1, 0, 1)` vira 1901; use `MIN_DATE` para "sem data".
2. Para enviar à API uma data vazia, defina a convenção (`0001-01-01T00:00:00`): `JSON.stringify(MIN_DATE)` pode sair deslocado pelo fuso (ver `Manual_FNC_FORMATA.md`).
3. Colar texto com separadores funciona (só os dígitos contam), mas `10/5/26` (ano de 2 dígitos) vira data inválida.
