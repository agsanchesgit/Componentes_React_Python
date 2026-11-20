# Manual: ComboField

Lista de domínio (combo) com digitação. Comportamento comum: ver `Manual_CamposComuns.md`.

## Assinatura

```tsx
<ComboField
  label="UF"
  dominio="SP,RJ,MG"          // string separada por vírgula ou array
  value={uf}                  // igual a um item do domínio; vazio = ""
  onChange={(r) => setUf(r.valor)}   // ComboResultado
  permiteVazio={false}        // padrão
/>
```

`onChange` recebe `ComboResultado`: `{ valor, ordem, vazio, valido, obrigatorioPendente }`.

- `valor`: **grafia da lista** (digitar `mg` devolve `MG`).
- `ordem`: posição do item (**base 1**); `0` = vazio.

Largura padrão: a do **maior item** do domínio.

## Regras

- `dominio`: itens vazios e repetidos (sem diferenciar maiúscula) são ignorados. Aceita `"SP,RJ"` ou `["SP", "RJ"]`.
- **Digitação restrita ao domínio**: só aceita texto que ainda é começo de algum item (digitar `x` em `SP,RJ,MG` não faz nada). Casa pelo começo, sem diferenciar maiúscula, e **completa ao sair** (`m` → `MG`).
- A seta ao lado (só mouse) ou **F4** abre a lista; o item atual aparece em negrito. Escolher um item fecha a lista e devolve o foco.
- **`permiteVazio` (padrão `false`)**:
  - sem `value` válido, **o campo emite o 1º item na montagem** (o consumidor passa a ter `SP`);
  - esvaziar o texto bloqueia a saída com `Escolha um valor da lista`;
  - com `permiteVazio`, esvaziar libera o campo e a lista mostra a opção `(vazio)`.
- Valor digitado fora do domínio (não casa com nenhum prefixo ao sair): `Valor fora do domínio`.

## Armadilhas

1. Com `permiteVazio=false`, o `onChange` dispara **na montagem** com o 1º item: o estado do consumidor muda sozinho.
2. Se `dominio` mudar e o `value` deixar de existir nele, o 1º item do novo domínio é emitido.
3. Passe `dominio` estável (constante ou `useMemo`) quando for array: a lista é recalculada a cada mudança de referência.
