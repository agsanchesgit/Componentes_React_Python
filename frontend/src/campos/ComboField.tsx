import { useEffect, useMemo, useRef, useState } from "react";

import { IconeSetaBaixo } from "../ui/icones";
import { Popover } from "../ui/Popover";
import { CampoEntrada, type ResolucaoCampo } from "./CampoEntrada";
import type { ComboFieldProps } from "./campos.types";
import { fncItemPorPrefixo, fncLerDominio, fncOrdemDoItem, fncRestringirAoDominio } from "./combo";

/**
 * Lista de domínio (combo). `dominio` é "SP,RJ,MG" (ou array); a seta ao lado (ou F4) abre a lista.
 * Digitar posiciona pelo começo do texto, sem diferenciar maiúscula, e só aceita o que existe no domínio.
 * Sem `permiteVazio` (padrão false) o campo nunca fica vazio: sem `value` válido começa no 1º item e
 * esvaziar o texto bloqueia a saída. Devolve `valor` (grafia da lista) e `ordem` (1 = primeiro; 0 = vazio).
 */
export function ComboField({
  value,
  onChange,
  dominio,
  permiteVazio = false,
  label,
  obrigatorio = false,
  enabled = "ENABLE",
  larguraCampo,
  placeholder,
  id,
  className,
}: ComboFieldProps) {
  const wInputRef = useRef<HTMLInputElement>(null);
  const [wAberto, prcDefinirAberto] = useState(false);

  const wLista = useMemo(() => fncLerDominio(dominio), [dominio]);
  const wChave = wLista.join("\u0000");

  const wOrdemAtual = fncOrdemDoItem(wLista, value);
  const wAtual = wOrdemAtual > 0 ? wLista[wOrdemAtual - 1] : "";
  const wInicial = wAtual === "" && !permiteVazio ? (wLista[0] ?? "") : wAtual;

  function prcEmitir(valor: string, valido = true): void {
    const wOrdem = fncOrdemDoItem(wLista, valor);
    onChange({
      valor: wOrdem > 0 ? wLista[wOrdem - 1] : "",
      ordem: wOrdem,
      vazio: wOrdem === 0,
      valido,
      obrigatorioPendente: obrigatorio && wOrdem === 0,
    });
  }

  // Sem valor válido e sem permitir vazio: o consumidor passa a ter o 1º item.
  useEffect(() => {
    if (!permiteVazio && wAtual === "" && wInicial !== "") {
      prcEmitir(wInicial);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wChave, permiteVazio, value]);

  function prcAoResolver(resolucao: ResolucaoCampo): void {
    if (resolucao.vazio && !resolucao.valido) {
      onChange({ valor: "", ordem: 0, vazio: true, valido: false, obrigatorioPendente: obrigatorio });
      return;
    }
    prcEmitir(resolucao.texto, resolucao.valido);
  }

  function prcEscolher(item: string): void {
    prcDefinirAberto(false);
    prcEmitir(item);
    wInputRef.current?.focus();
  }

  const wMaior = wLista.reduce((maior, item) => Math.max(maior, item.length), 1);

  return (
    <CampoEntrada
      id={id}
      label={label}
      obrigatorio={obrigatorio}
      enabled={enabled}
      className={className}
      placeholder={placeholder}
      inputRef={wInputRef}
      valorTexto={wInicial}
      larguraCh={larguraCampo ?? wMaior}
      mascarar={(t) => fncRestringirAoDominio(wLista, t)}
      completar={(t) => fncItemPorPrefixo(wLista, t) ?? ""}
      validar={(t) => (fncOrdemDoItem(wLista, t) > 0 ? null : "Valor fora do domínio")}
      vazioInvalido={permiteVazio ? undefined : "Escolha um valor da lista"}
      onResolver={prcAoResolver}
      onF4={() => prcDefinirAberto(true)}
      acao={
        <Popover
          aberto={wAberto}
          aoMudar={prcDefinirAberto}
          aoRetornarFoco={() => wInputRef.current?.focus()}
          className="cmp-popover-lista"
          gatilho={
            <button
              type="button"
              className="cmp-botao cmp-botao-icone"
              tabIndex={-1} // só mouse (ou F4 no campo)
              disabled={enabled !== "ENABLE"}
              aria-label="Abrir lista"
              onClick={() => prcDefinirAberto(!wAberto)}
            >
              <IconeSetaBaixo />
            </button>
          }
        >
          {permiteVazio && (
            <button type="button" className="cmp-item-lista cmp-item-vazio" onClick={() => prcEscolher("")}>
              (vazio)
            </button>
          )}
          {wLista.map((item, indice) => (
            <button
              key={item}
              type="button"
              className={indice + 1 === wOrdemAtual ? "cmp-item-lista cmp-item-atual" : "cmp-item-lista"}
              onClick={() => prcEscolher(item)}
            >
              {item}
            </button>
          ))}
        </Popover>
      }
    />
  );
}
