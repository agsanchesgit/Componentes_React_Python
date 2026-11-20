import { useEffect, useMemo, useRef } from "react";

import type { LookupColunaGrid, LookupLinha, LookupMascaraGrid } from "./lookup.types";
import { fncAlinhamentoDaColuna, fncTextoDaCelula, fncTrechosComDestaque, type Alinhamento } from "./lookup.utils";

const CLASSE_ALINHAMENTO: Record<Alinhamento, string> = {
  left: "cmp-grid-esquerda",
  right: "cmp-grid-direita",
  center: "cmp-grid-centro",
};

interface LookUpGridProps {
  colunas: LookupColunaGrid[];
  linhas: LookupLinha[];
  selecionada: number;
  onSelecionar: (indice: number) => void;
  onEscolher: (linha: LookupLinha) => void;
  mascaraGrid?: Record<string, LookupMascaraGrid>;
  mapaValores?: Record<string, Record<string, string>>;
  /** Termo para o highlight; vazio desliga. */
  termo?: string;
}

/** Tabela do modal. A navegação por teclado (↑/↓/Enter) é feita pelo modal; aqui só o mouse. */
export function LookUpGrid({
  colunas,
  linhas,
  selecionada,
  onSelecionar,
  onEscolher,
  mascaraGrid,
  mapaValores,
  termo = "",
}: LookUpGridProps) {
  const wLinhaRef = useRef<HTMLTableRowElement | null>(null);
  const wAlinhamentos = useMemo(
    () => Object.fromEntries(colunas.map((c) => [c.coluna, fncAlinhamentoDaColuna(linhas, c.coluna)])),
    [colunas, linhas],
  );

  useEffect(() => {
    wLinhaRef.current?.scrollIntoView({ block: "nearest" });
  }, [selecionada]);

  return (
    <div className="cmp-lk-grid">
      <table className="cmp-lk-tabela">
        <thead>
          <tr>
            {colunas.map((coluna) => (
              <th key={coluna.coluna} className={CLASSE_ALINHAMENTO[wAlinhamentos[coluna.coluna]]}>
                {coluna.cabecalho}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.map((linha, indice) => (
            <tr
              key={indice}
              ref={indice === selecionada ? wLinhaRef : undefined}
              aria-selected={indice === selecionada}
              data-selecionada={indice === selecionada ? "true" : undefined}
              onClick={() => onSelecionar(indice)}
              onDoubleClick={() => onEscolher(linha)}
            >
              {colunas.map((coluna) => {
                const wTexto = fncTextoDaCelula(linha, coluna.coluna, mascaraGrid, mapaValores);
                return (
                  <td key={coluna.coluna} className={CLASSE_ALINHAMENTO[wAlinhamentos[coluna.coluna]]}>
                    {fncTrechosComDestaque(wTexto, termo).map((trecho, k) =>
                      trecho.marcado ? (
                        <mark key={k} className="cmp-destaque">
                          {trecho.texto}
                        </mark>
                      ) : (
                        <span key={k}>{trecho.texto}</span>
                      ),
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
