# Manual: DataHoraField

Campo de data e hora `DD/MM/AAAA HH:MI:SS` (**sempre com segundos**). Mesmas regras do `DataField` (ver `Manual_DataField.md` e `Manual_CamposComuns.md`), mais a hora.

## Assinatura

```tsx
<DataHoraField
  label="Registrado em"
  value={quando}            // Date; vazio = MIN_DATE
  onChange={(r) => setQuando(r.valor)}
  maiorData={new Date()}    // opcional
/>
```

Props idênticas às do `DataField`. Largura padrão **19**. Placeholder `DD/MM/AAAA HH:MI:SS`.

## Regras próprias

- Digita até 14 dígitos; máscara `DD/MM/AAAA HH:MI:SS`.
- Hora de `00:00:00` a `23:59:59`. Hora fora disso: `Hora inválida`. Texto incompleto (sem os segundos): `Data/hora inválida`.
- `menorData`/`maiorData` são comparadas **como data e hora completas** (no `DataField` só o dia).
- **F4** ou o botão abre o painel: calendário + campos **Hora**, **Minuto** e **Segundo** + botão **Aplicar**.
  - Os campos de hora funcionam como relógio: mantêm os dois últimos dígitos digitados e limitam a 23 / 59 / 59 (digitar `99` na hora vira `23`).
  - **Aplicar** só fica ativo depois de escolher um dia. Se o resultado estiver fora da faixa, o painel mostra a mensagem e não aplica.
- O dia da semana aparece dentro do campo, como no `DataField`.

## Armadilhas

1. Valor sem segundos (`10/05/2026 14:05`) é inválido: digite sempre os 14 dígitos ou use o painel.
2. O `Date` devolvido usa o **fuso local**; ao enviar à API, converta de forma consciente (a biblioteca não aplica fuso).
