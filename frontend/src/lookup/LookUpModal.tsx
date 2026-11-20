import { useEffect, useRef, useState, type KeyboardEvent, type RefObject } from "react";

import { CnpjField } from "../campos/CnpjField";
import { CpfField } from "../campos/CpfField";
import { DataField } from "../campos/DataField";
import type { CampoResultado } from "../campos/campos.types";
import { fncLimiteOuNulo } from "../campos/datas";
import { MIN_DATE } from "../formata/formata";
import { Dialogo } from "../ui/Dialogo";
import { LookUpGrid } from "./LookUpGrid";
import { fncMensagemDoErro } from "./lookup.api";
import type {
  LookupCriteriosEnvio,
  LookupDefinicao,
  LookupLinha,
  LookupMascaraGrid,
  LookupPesquisaResposta,
  LookupTipoRefreshGrid,
} from "./lookup.types";
import { MINIMO_BACKEND } from "./lookup.utils";

const DEBOUNCE_MS = 300;

/** Valores dos filtros: data (vazia = MIN_DATE), CPF numérico (vazio = 0), CNPJ em string (vazio = ""). */
interface Filtros {
  texto: string;
  dt: Date;
  cpf: number;
  cnpj: string;
}

function fncDoisDigitos(n: number): string {
  return String(n).padStart(2, "0");
}

interface LookUpModalProps {
  aberto: boolean;
  onFechar: () => void;
  onEscolher: (linha: LookupLinha) => void;
  /** Devolve o foco ao campo Código quando o modal fecha. */
  focoAoFechar: RefObject<HTMLInputElement | null>;
  definicao: LookupDefinicao;
  titulo: string;
  tipoRefreshGrid: LookupTipoRefreshGrid;
  qtdMinimaCaracterBusca: number;
  pesquisar: (criterios: LookupCriteriosEnvio) => Promise<LookupPesquisaResposta>;
  mascaraGrid?: Record<string, LookupMascaraGrid>;
  mapaValores?: Record<string, Record<string, string>>;
  highlight: boolean;
  larguraGridPx: number;
  corFundoModal: string;
  onLoadingChange?: (loading: boolean) => void;
  onErro?: (erro: unknown) => void;
}

export function LookUpModal(props: LookUpModalProps) {
  return (
    <Dialogo
      aberto={props.aberto}
      aoFechar={props.onFechar}
      titulo={props.titulo}
      // largura e cor vêm das props; o max-width limita à tela
      estilo={{ width: props.larguraGridPx, maxWidth: "calc(100vw - 2rem)", backgroundColor: props.corFundoModal }}
      aoAbrirFoco={(caixa) => {
        const wId = fncIdDoPrimeiroCampo(props.definicao);
        (caixa.querySelector(`#${wId}`) as HTMLElement | null)?.focus();
      }}
      aoFecharFoco={() => props.focoAoFechar.current?.focus()}
    >
      {/* o conteúdo só existe aberto: cada abertura começa em branco */}
      <Conteudo {...props} />
    </Dialogo>
  );
}

/** Primeiro campo existente: data de nascimento → CPF → CNPJ → texto. */
function fncIdDoPrimeiroCampo(definicao: LookupDefinicao): string {
  if (definicao.colunaDtNascto) {
    return "lk-dt";
  }
  if (definicao.colunaCpf) {
    return "lk-cpf";
  }
  if (definicao.colunaCnpj) {
    return "lk-cnpj";
  }
  return "lk-texto";
}

function Conteudo({
  onFechar,
  onEscolher,
  definicao,
  tipoRefreshGrid,
  qtdMinimaCaracterBusca,
  pesquisar,
  mascaraGrid,
  mapaValores,
  highlight,
  onLoadingChange,
  onErro,
}: LookUpModalProps) {
  const wTemDt = !!definicao.colunaDtNascto;
  const wTemCpf = !!definicao.colunaCpf;
  const wTemCnpj = !!definicao.colunaCnpj;
  const wMinimo = Math.max(qtdMinimaCaracterBusca, MINIMO_BACKEND);

  const [wTexto, prcDefinirTexto] = useState("");
  const [wDt, prcDefinirDt] = useState<Date>(MIN_DATE);
  const [wCpf, prcDefinirCpf] = useState(0);
  const [wCnpj, prcDefinirCnpj] = useState("");
  const [wResposta, prcDefinirResposta] = useState<LookupPesquisaResposta | null>(null);
  const [wTermo, prcDefinirTermo] = useState("");
  const [wSelecionada, prcDefinirSelecionada] = useState(0);
  const [wNavegou, prcDefinirNavegou] = useState(false);
  const [wErro, prcDefinirErro] = useState<string | null>(null);
  const [wCarregando, prcDefinirCarregando] = useState(false);

  const wRefTexto = useRef<HTMLInputElement>(null);
  const wSequencia = useRef(0);
  const wDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (wDebounce.current) {
        clearTimeout(wDebounce.current);
      }
      wSequencia.current++;
    },
    [],
  );

  /** Monta os critérios: o texto só entra a partir do mínimo; sem nenhum critério, não pesquisa. */
  function fncCriterios(filtros: Filtros): LookupCriteriosEnvio | null {
    const wCriterios: LookupCriteriosEnvio = {};
    const wTextoLimpo = filtros.texto.trim();
    if (wTextoLimpo.length >= wMinimo) {
      wCriterios.texto = wTextoLimpo;
    }
    const wData = fncLimiteOuNulo(filtros.dt);
    if (wData) {
      wCriterios.dtNascto = `${wData.getFullYear()}-${fncDoisDigitos(wData.getMonth() + 1)}-${fncDoisDigitos(wData.getDate())}`;
    }
    if (filtros.cpf > 0) {
      wCriterios.cpf = String(filtros.cpf).padStart(11, "0");
    }
    if (filtros.cnpj) {
      wCriterios.cnpj = filtros.cnpj;
    }
    return Object.keys(wCriterios).length ? wCriterios : null;
  }

  async function prcExecutar(filtros: Filtros): Promise<void> {
    const wCriterios = fncCriterios(filtros);
    if (!wCriterios) {
      return;
    }

    const wId = ++wSequencia.current;
    prcDefinirCarregando(true);
    onLoadingChange?.(true);
    prcDefinirErro(null);
    try {
      const wResultado = await pesquisar(wCriterios);
      if (wId !== wSequencia.current) {
        return; // resposta de uma pesquisa antiga
      }
      prcDefinirResposta(wResultado);
      prcDefinirTermo(wCriterios.texto ?? "");
      prcDefinirSelecionada(0);
      prcDefinirNavegou(false);
    } catch (erro) {
      if (wId !== wSequencia.current) {
        return;
      }
      prcDefinirErro(fncMensagemDoErro(erro));
      onErro?.(erro);
    } finally {
      if (wId === wSequencia.current) {
        prcDefinirCarregando(false);
        onLoadingChange?.(false);
      }
    }
  }

  const wAtuais: Filtros = { texto: wTexto, dt: wDt, cpf: wCpf, cnpj: wCnpj };

  function prcAoDigitarTexto(valor: string): void {
    prcDefinirTexto(valor);
    if (tipoRefreshGrid !== "AUTOMATICA") {
      return;
    }
    if (wDebounce.current) {
      clearTimeout(wDebounce.current);
    }
    // Abaixo do mínimo o grid não muda (a menos que haja filtro extra, que `fncCriterios` considera).
    wDebounce.current = setTimeout(() => void prcExecutar({ ...wAtuais, texto: valor }), DEBOUNCE_MS);
  }

  // Os filtros são os campos DataField, CpfField e CnpjField: o onChange vem ao sair do campo (ou ao escolher no
  // calendário) com o valor já validado. Preenchido e válido: pesquisa na hora, em qualquer modo (DECISOES §3-10).
  function prcAoMudarDt(resultado: CampoResultado<Date>): void {
    prcDefinirDt(resultado.valor);
    if (resultado.valido && !resultado.vazio) {
      void prcExecutar({ ...wAtuais, dt: resultado.valor });
    }
  }

  function prcAoMudarCpf(resultado: CampoResultado<number>): void {
    prcDefinirCpf(resultado.valor);
    if (resultado.valido && !resultado.vazio) {
      void prcExecutar({ ...wAtuais, cpf: resultado.valor });
    }
  }

  function prcAoMudarCnpj(resultado: CampoResultado<string>): void {
    prcDefinirCnpj(resultado.valor);
    if (resultado.valido && !resultado.vazio) {
      void prcExecutar({ ...wAtuais, cnpj: resultado.valor });
    }
  }

  function prcEscolher(indice: number): void {
    const wLinha = wResposta?.linhas[indice];
    if (wLinha) {
      onEscolher(wLinha);
    }
  }

  function prcAoTeclar(evento: KeyboardEvent<HTMLDivElement>): void {
    const wOrigem = evento.target as HTMLElement;
    // Os campos de filtro têm teclado próprio (Enter/↓/↑ funcionam como Tab).
    if (!evento.currentTarget.contains(wOrigem) || wOrigem.closest("[data-filtros]")) {
      return;
    }

    const wTotal = wResposta?.linhas.length ?? 0;
    if (evento.key === "ArrowDown" && wTotal > 0) {
      evento.preventDefault();
      prcDefinirSelecionada((s) => Math.min(s + 1, wTotal - 1));
      prcDefinirNavegou(true);
    } else if (evento.key === "ArrowUp" && wTotal > 0) {
      evento.preventDefault();
      prcDefinirSelecionada((s) => Math.max(s - 1, 0));
      prcDefinirNavegou(true);
    } else if (evento.key === "Enter") {
      if (wOrigem.tagName === "BUTTON") {
        return; // o botão trata o próprio Enter
      }
      evento.preventDefault();
      const wEmTexto = wOrigem === wRefTexto.current;
      // COM_BOTAO_PESQUISA: Enter no texto pesquisa, a menos que o usuário já tenha navegado no grid.
      const wPesquisa = wEmTexto && tipoRefreshGrid === "COM_BOTAO_PESQUISA" && !wNavegou;
      if (wPesquisa || !wEmTexto) {
        void prcExecutar(wAtuais);
      } else if (wTotal > 0) {
        prcEscolher(wSelecionada);
      }
    }
  }

  const wLinhas = wResposta?.linhas ?? [];

  return (
    <div className="cmp-lk-conteudo" onKeyDown={prcAoTeclar}>
      {/* filtros extras: uma única linha; cada campo tem a largura própria do seu componente */}
      {(wTemDt || wTemCpf || wTemCnpj) && (
        <div data-filtros="" className="cmp-lk-filtros">
          {wTemDt && <DataField id="lk-dt" label="Data de nascimento" value={wDt} onChange={prcAoMudarDt} />}
          {wTemCpf && <CpfField id="lk-cpf" label="CPF" value={wCpf} onChange={prcAoMudarCpf} />}
          {wTemCnpj && <CnpjField id="lk-cnpj" label="CNPJ" value={wCnpj} onChange={prcAoMudarCnpj} />}
        </div>
      )}

      {/* texto: sempre existe, na linha abaixo dos filtros, ocupando a largura inteira */}
      <div className="cmp-campo">
        <label className="cmp-rotulo" htmlFor="lk-texto">
          Pesquisar
        </label>
        <div className="cmp-linha">
          <input
            id="lk-texto"
            ref={wRefTexto}
            className="cmp-entrada cmp-lk-texto"
            value={wTexto}
            autoComplete="off"
            placeholder={`Mínimo de ${wMinimo} caracteres`}
            onChange={(e) => prcAoDigitarTexto(e.target.value.toUpperCase())}
          />
          {tipoRefreshGrid === "COM_BOTAO_PESQUISA" && (
            <button
              type="button"
              className="cmp-botao cmp-botao-primario cmp-lk-botao"
              onClick={() => void prcExecutar(wAtuais)}
              disabled={wCarregando}
            >
              Pesquisar
            </button>
          )}
        </div>
      </div>

      {wErro && <p className="cmp-erro cmp-lk-mensagem">{wErro}</p>}

      {wResposta && wLinhas.length === 0 && !wErro && <p className="cmp-lk-aviso">Nenhum registro encontrado.</p>}

      {wLinhas.length > 0 && (
        <LookUpGrid
          colunas={definicao.colunasGrid}
          linhas={wLinhas}
          selecionada={wSelecionada}
          onSelecionar={(indice) => {
            prcDefinirSelecionada(indice);
            prcDefinirNavegou(true);
          }}
          onEscolher={onEscolher}
          mascaraGrid={mascaraGrid}
          mapaValores={mapaValores}
          termo={highlight ? wTermo : ""}
        />
      )}

      {wResposta?.limiteAtingido && (
        <p className="cmp-lk-aviso cmp-lk-aviso-pequeno">Mostrando as primeiras {wLinhas.length} linhas. Refine a pesquisa.</p>
      )}

      <div className="cmp-lk-rodape">
        <button type="button" className="cmp-botao cmp-lk-botao" onClick={onFechar}>
          Cancelar
        </button>
        <button
          type="button"
          className="cmp-botao cmp-botao-primario cmp-lk-botao"
          disabled={wLinhas.length === 0}
          onClick={() => prcEscolher(wSelecionada)}
        >
          Selecionar
        </button>
      </div>
    </div>
  );
}
