import { useRef, useState } from "react";

import { MIN_DATE } from "../formata/formata";
import { IconeCalendario } from "../ui/icones";
import { Popover } from "../ui/Popover";
import { Calendario } from "./Calendario";
import { CampoEntrada, type ResolucaoCampo } from "./CampoEntrada";
import type { DataFieldProps } from "./campos.types";
import { fncDiaDaSemana, fncFormatarData, fncLerData, fncLimiteOuNulo, fncVerificarFaixa } from "./datas";
import { fncAplicarPadrao, fncSomenteDigitos } from "./documentos";

/**
 * Campo de data (`DD/MM/AAAA`) com calendário. Data inexistente bloqueia a saída (campo vermelho + mensagem).
 * Aceita de 01/01/1850 a 31/12/2100, dentro de `menorData` e `maiorData` quando informados.
 * Vazio nunca bloqueia e é devolvido como `MIN_DATE`. Depois de sair do campo mostra o dia da semana.
 */
export function DataField({
  value,
  onChange,
  label,
  obrigatorio = false,
  enabled = "ENABLE",
  menorData,
  maiorData,
  larguraCampo,
  placeholder = "DD/MM/AAAA",
  id,
  className,
}: DataFieldProps) {
  const wInputRef = useRef<HTMLInputElement>(null);
  const [wAberto, prcDefinirAberto] = useState(false);

  const wMin = fncLimiteOuNulo(menorData);
  const wMax = fncLimiteOuNulo(maiorData);
  const wAtual = fncLimiteOuNulo(value);

  function fncValidar(texto: string): string | null {
    const wLeitura = fncLerData(texto);
    if (!wLeitura.data) {
      return wLeitura.erro ?? "Data inválida";
    }
    return fncVerificarFaixa(wLeitura.data, wMin, wMax, false);
  }

  function prcAoResolver(resolucao: ResolucaoCampo): void {
    const wData = resolucao.vazio ? undefined : fncLerData(resolucao.texto).data;
    onChange({
      valor: wData ?? MIN_DATE,
      vazio: !wData,
      valido: resolucao.valido,
      obrigatorioPendente: obrigatorio && !wData,
    });
  }

  function prcEscolher(dia: Date): void {
    prcDefinirAberto(false);
    onChange({ valor: dia, vazio: false, valido: true, obrigatorioPendente: false });
    wInputRef.current?.focus();
  }

  return (
    <CampoEntrada
      id={id}
      label={label}
      obrigatorio={obrigatorio}
      enabled={enabled}
      className={className}
      placeholder={placeholder}
      inputRef={wInputRef}
      valorTexto={wAtual ? fncFormatarData(wAtual) : ""}
      larguraCh={larguraCampo ?? 12}
      mascarar={(t) => fncAplicarPadrao(fncSomenteDigitos(t).slice(0, 8), "XX/XX/XXXX")}
      validar={fncValidar}
      onResolver={prcAoResolver}
      sufixo={(t) => {
        const wData = fncLerData(t).data;
        return wData ? fncDiaDaSemana(wData) : null;
      }}
      onF4={() => prcDefinirAberto(true)}
      acao={
        <Popover
          aberto={wAberto}
          aoMudar={prcDefinirAberto}
          aoRetornarFoco={() => wInputRef.current?.focus()}
          gatilho={
            <button
              type="button"
              className="cmp-botao cmp-botao-icone"
              tabIndex={-1} // fora da ordem de Tab: só o mouse (ou F4 no campo) abre o calendário
              disabled={enabled !== "ENABLE"}
              aria-label="Escolher data"
              onClick={() => prcDefinirAberto(!wAberto)}
            >
              <IconeCalendario />
            </button>
          }
        >
          <Calendario selecionada={wAtual} min={wMin} max={wMax} onEscolher={prcEscolher} />
        </Popover>
      }
    />
  );
}
