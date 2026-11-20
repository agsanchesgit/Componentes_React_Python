import { useState } from "react";

import { IconeSetaDireita, IconeSetaEsquerda } from "../ui/icones";
import { ANO_MAXIMO, ANO_MINIMO, fncDiasNoMes, fncSoDia, MESES } from "./datas";

const SEMANA = ["D", "S", "T", "Q", "Q", "S", "S"];
const ANOS = Array.from({ length: ANO_MAXIMO - ANO_MINIMO + 1 }, (_, i) => ANO_MINIMO + i);

interface CalendarioProps {
  selecionada: Date | null;
  min: Date | null;
  max: Date | null;
  onEscolher: (dia: Date) => void;
}

/** Mês/ano com navegação, troca de mês e ano por lista e escolha do dia. Só escolhe o dia (a hora é do DataHoraField). */
export function Calendario({ selecionada, min, max, onEscolher }: CalendarioProps) {
  const wHoje = fncSoDia(new Date());
  const wInicio = selecionada ?? wHoje;
  const [wAno, prcDefinirAno] = useState(wInicio.getFullYear());
  const [wMes, prcDefinirMes] = useState(wInicio.getMonth()); // 0-11

  const wMinDia = min ? fncSoDia(min) : null;
  const wMaxDia = max ? fncSoDia(max) : null;
  const fncFora = (data: Date): boolean => (wMinDia !== null && data < wMinDia) || (wMaxDia !== null && data > wMaxDia);

  function prcMover(delta: number): void {
    const wTotalMeses = wAno * 12 + wMes + delta;
    const wNovoAno = Math.floor(wTotalMeses / 12);
    if (wNovoAno < ANO_MINIMO || wNovoAno > ANO_MAXIMO) {
      return;
    }
    prcDefinirAno(wNovoAno);
    prcDefinirMes(wTotalMeses - wNovoAno * 12);
  }

  const wVazios = new Date(wAno, wMes, 1).getDay();
  const wTotalDias = fncDiasNoMes(wAno, wMes + 1);
  const wCelulas: (number | null)[] = [
    ...Array.from({ length: wVazios }, () => null),
    ...Array.from({ length: wTotalDias }, (_, i) => i + 1),
  ];
  const wSelecionadaDia = selecionada ? fncSoDia(selecionada) : null;

  return (
    <div className="cmp-calendario">
      <div className="cmp-calendario-topo">
        <button type="button" className="cmp-botao cmp-botao-icone" aria-label="Mês anterior" onClick={() => prcMover(-1)}>
          <IconeSetaEsquerda />
        </button>
        <select
          aria-label="Mês"
          className="cmp-selecao cmp-calendario-mes"
          value={wMes}
          onChange={(e) => prcDefinirMes(Number(e.target.value))}
        >
          {MESES.map((nome, indice) => (
            <option key={nome} value={indice}>
              {nome}
            </option>
          ))}
        </select>
        <select
          aria-label="Ano"
          className="cmp-selecao"
          value={wAno}
          onChange={(e) => prcDefinirAno(Number(e.target.value))}
        >
          {ANOS.map((ano) => (
            <option key={ano} value={ano}>
              {ano}
            </option>
          ))}
        </select>
        <button type="button" className="cmp-botao cmp-botao-icone" aria-label="Próximo mês" onClick={() => prcMover(1)}>
          <IconeSetaDireita />
        </button>
      </div>

      <div className="cmp-calendario-semana">
        {SEMANA.map((letra, indice) => (
          <span key={indice}>{letra}</span>
        ))}
      </div>

      <div className="cmp-calendario-dias">
        {wCelulas.map((dia, indice) => {
          if (dia === null) {
            return <span key={indice} />;
          }
          const wData = new Date(wAno, wMes, dia);
          const wEscolhida = wSelecionadaDia?.getTime() === wData.getTime();
          const wEhHoje = wHoje.getTime() === wData.getTime();
          const wClasse = ["cmp-dia", wEhHoje ? "cmp-dia-hoje" : "", wEscolhida ? "cmp-dia-escolhido" : ""]
            .filter(Boolean)
            .join(" ");
          return (
            <button
              key={indice}
              type="button"
              className={wClasse}
              disabled={fncFora(wData)}
              aria-pressed={wEscolhida}
              onClick={() => onEscolher(wData)}
            >
              {dia}
            </button>
          );
        })}
      </div>

      <button type="button" className="cmp-botao cmp-calendario-hoje" disabled={fncFora(wHoje)} onClick={() => onEscolher(wHoje)}>
        Hoje
      </button>
    </div>
  );
}
