import { useRef, useState } from "react";

import { MIN_DATE } from "../formata/formata";
import { IconeCalendarioRelogio } from "../ui/icones";
import { Popover } from "../ui/Popover";
import { Calendario } from "./Calendario";
import { CampoEntrada, type ResolucaoCampo } from "./CampoEntrada";
import type { DataHoraFieldProps } from "./campos.types";
import {
  fncDiaDaSemana,
  fncFormatarDataHora,
  fncLerDataHora,
  fncLimiteOuNulo,
  fncSoDia,
  fncVerificarFaixa,
} from "./datas";
import { fncAplicarPadrao, fncSomenteDigitos } from "./documentos";

/**
 * Campo de data e hora (`DD/MM/AAAA HH:MI:SS`, sempre com segundos). Mesmas regras do DataField, mais a hora (00:00:00 a 23:59:59).
 * `menorData` e `maiorData` são comparadas como data e hora completas.
 */
export function DataHoraField({
  value,
  onChange,
  label,
  obrigatorio = false,
  enabled = "ENABLE",
  menorData,
  maiorData,
  larguraCampo,
  placeholder = "DD/MM/AAAA HH:MI:SS",
  id,
  className,
}: DataHoraFieldProps) {
  const wInputRef = useRef<HTMLInputElement>(null);
  const [wAberto, prcDefinirAberto] = useState(false);

  const wMin = fncLimiteOuNulo(menorData);
  const wMax = fncLimiteOuNulo(maiorData);
  const wAtual = fncLimiteOuNulo(value);

  function fncValidar(texto: string): string | null {
    const wLeitura = fncLerDataHora(texto);
    if (!wLeitura.data) {
      return wLeitura.erro ?? "Data/hora inválida";
    }
    return fncVerificarFaixa(wLeitura.data, wMin, wMax, true);
  }

  function prcAoResolver(resolucao: ResolucaoCampo): void {
    const wData = resolucao.vazio ? undefined : fncLerDataHora(resolucao.texto).data;
    onChange({
      valor: wData ?? MIN_DATE,
      vazio: !wData,
      valido: resolucao.valido,
      obrigatorioPendente: obrigatorio && !wData,
    });
  }

  function prcAplicar(data: Date): void {
    prcDefinirAberto(false);
    onChange({ valor: data, vazio: false, valido: true, obrigatorioPendente: false });
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
      valorTexto={wAtual ? fncFormatarDataHora(wAtual) : ""}
      larguraCh={larguraCampo ?? 19}
      mascarar={(t) => fncAplicarPadrao(fncSomenteDigitos(t).slice(0, 14), "XX/XX/XXXX XX:XX:XX")}
      validar={fncValidar}
      onResolver={prcAoResolver}
      sufixo={(t) => {
        const wData = fncLerDataHora(t).data;
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
              tabIndex={-1}
              disabled={enabled !== "ENABLE"}
              aria-label="Escolher data e hora"
              onClick={() => prcDefinirAberto(!wAberto)}
            >
              <IconeCalendarioRelogio />
            </button>
          }
        >
          <PainelDataHora atual={wAtual} min={wMin} max={wMax} onAplicar={prcAplicar} />
        </Popover>
      }
    />
  );
}

function fncDoisDigitos(n: number): string {
  return String(n).padStart(2, "0");
}

/** Mantém os dois ÚLTIMOS dígitos (como um relógio: "01" + "2" vira "12"), aplica o teto e devolve com 2 dígitos. */
function fncLimitar(valor: string, teto: number): string {
  if (valor === "") {
    return "";
  }
  const wNumero = Math.min(Number(valor.replace(/\D/g, "").slice(-2) || "0"), teto);
  return fncDoisDigitos(wNumero);
}

interface PainelDataHoraProps {
  atual: Date | null;
  min: Date | null;
  max: Date | null;
  onAplicar: (data: Date) => void;
}

/** Conteúdo do popover: calendário + hora. Só existe com o popover aberto, então começa sempre do valor atual. */
function PainelDataHora({ atual, min, max, onAplicar }: PainelDataHoraProps) {
  const [wDia, prcDefinirDia] = useState<Date | null>(atual ? fncSoDia(atual) : null);
  const [wHora, prcDefinirHora] = useState(atual ? fncDoisDigitos(atual.getHours()) : "00");
  const [wMinuto, prcDefinirMinuto] = useState(atual ? fncDoisDigitos(atual.getMinutes()) : "00");
  const [wSegundo, prcDefinirSegundo] = useState(atual ? fncDoisDigitos(atual.getSeconds()) : "00");
  const [wErro, prcDefinirErro] = useState<string | null>(null);

  function prcConfirmar(): void {
    if (!wDia) {
      return;
    }
    const wData = new Date(
      wDia.getFullYear(),
      wDia.getMonth(),
      wDia.getDate(),
      Number(wHora || 0),
      Number(wMinuto || 0),
      Number(wSegundo || 0),
    );
    const wProblema = fncVerificarFaixa(wData, min, max, true);
    if (wProblema) {
      prcDefinirErro(wProblema);
    } else {
      onAplicar(wData);
    }
  }

  return (
    <div className="cmp-painel-datahora">
      <Calendario
        selecionada={wDia}
        min={min}
        max={max}
        onEscolher={(dia) => {
          prcDefinirDia(dia);
          prcDefinirErro(null);
        }}
      />

      <div className="cmp-painel-hora">
        <input
          aria-label="Hora"
          className="cmp-entrada cmp-entrada-hora"
          inputMode="numeric"
          value={wHora}
          onChange={(e) => prcDefinirHora(fncLimitar(e.target.value, 23))}
        />
        <span>:</span>
        <input
          aria-label="Minuto"
          className="cmp-entrada cmp-entrada-hora"
          inputMode="numeric"
          value={wMinuto}
          onChange={(e) => prcDefinirMinuto(fncLimitar(e.target.value, 59))}
        />
        <span>:</span>
        <input
          aria-label="Segundo"
          className="cmp-entrada cmp-entrada-hora"
          inputMode="numeric"
          value={wSegundo}
          onChange={(e) => prcDefinirSegundo(fncLimitar(e.target.value, 59))}
        />
      </div>

      {wErro && <p className="cmp-erro cmp-painel-erro">{wErro}</p>}

      <button type="button" className="cmp-botao cmp-botao-primario" disabled={!wDia} onClick={prcConfirmar}>
        Aplicar
      </button>
    </div>
  );
}
