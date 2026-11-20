import { useEffect, useRef, useState, type ChangeEvent, type FocusEvent, type KeyboardEvent } from "react";

import { FNC_FORMATA } from "../formata/formata";
import { prcMoverFoco } from "../foco";
import { LookUpModal } from "./LookUpModal";
import { fncMensagemDoErro } from "./lookup.api";
import type { LookupCodigo, LookupLinha, LookUpFieldProps, LookUpResultado } from "./lookup.types";
import {
  fncChaveDoValor,
  fncConverterCodigo,
  fncEhVazio,
  fncMascararData,
  fncValorParaTexto,
  fncValorVazio,
  MINIMO_BACKEND,
} from "./lookup.utils";
import { useLookupApi } from "./useLookupApi";

type Estado = "VAZIO" | "EDITANDO" | "VALIDANDO" | "VALIDO" | "INVALIDO";

const MENSAGEM_MAIS_DE_UM = "RETORNOU MAIS DE UM REGISTRO";

/**
 * Campo Código + Descrição (readonly) + botão "...". A configuração vem do objeto em tela (`definicao`).
 * Código inexistente bloqueia a saída do campo (F4 e "..." continuam livres); campo vazio nunca bloqueia.
 */
export function LookUpField({
  definicao,
  value,
  onChange,
  tituloPesquisa,
  tipoRefreshGrid,
  obrigatorio,
  mensagemNaoExistencia,
  qtdMinimaCaracterBusca = MINIMO_BACKEND,
  enabled = "ENABLE",
  placeholder,
  larguraCampo,
  larguraDescricaoPx,
  label,
  mascaraCodigo,
  mascaraGrid,
  mapaValores,
  highlightDoTermoBuscado = false,
  larguraGridPx = 1000,
  corFundoModal = "rgb(255, 255, 255)",
  criarCacheNoClient = false,
  debugMode = false,
  onLoadingChange,
  onErro,
  id,
  className,
}: LookUpFieldProps) {
  const wTipo = definicao.tipoColunaRetorno;
  const wApi = useLookupApi(definicao, { cache: criarCacheNoClient, debug: debugMode });

  const wInputRef = useRef<HTMLInputElement>(null);
  const wBotaoRef = useRef<HTMLButtonElement>(null);
  const wSequencia = useRef(0);

  const [wTexto, prcDefinirTexto] = useState(() => fncValorParaTexto(value, wTipo));
  const [wEstado, prcDefinirEstado] = useState<Estado>(() => (fncEhVazio(value, wTipo) ? "VAZIO" : "VALIDANDO"));
  const [wDescricao, prcDefinirDescricao] = useState("");
  const [wMensagem, prcDefinirMensagem] = useState<string | null>(null);
  const [wBloquear, prcDefinirBloquear] = useState(false);
  const [wAberto, prcDefinirAberto] = useState(false);
  const [wFocado, prcDefinirFocado] = useState(false);

  // Sincronização com o `value` do consumidor (componente controlado), feita durante o render.
  const [wChaveVista, prcDefinirChaveVista] = useState<string | null>(null);
  const [wChaveEmitida, prcDefinirChaveEmitida] = useState<string | null>(null);
  const [wConsultar, prcDefinirConsultar] = useState<{ valor: string } | null>(() =>
    fncEhVazio(value, wTipo) ? null : { valor: fncValorParaTexto(value, wTipo) },
  );

  const wChaveAtual = fncChaveDoValor(value);
  if (wChaveAtual !== wChaveVista) {
    prcDefinirChaveVista(wChaveAtual);
    if (wChaveVista !== null && wChaveAtual !== wChaveEmitida) {
      // Alteração externa (ex.: reset do formulário): refaz a descrição sem bloquear.
      const wNovoTexto = fncValorParaTexto(value, wTipo);
      prcDefinirTexto(wNovoTexto);
      prcDefinirDescricao("");
      prcDefinirMensagem(null);
      prcDefinirBloquear(false);
      if (fncEhVazio(value, wTipo)) {
        prcDefinirEstado("VAZIO");
      } else {
        prcDefinirEstado("VALIDANDO");
        prcDefinirConsultar({ valor: wNovoTexto });
      }
    }
  }

  const wDesabilitado = enabled === "DISABLED";
  const wSomenteLeitura = enabled === "READONLY";
  const wLivre = enabled === "ENABLE";

  function prcEmitir(codigo: LookupCodigo, descricao: string, json: LookupLinha | null, valido: boolean): void {
    const wVazio = fncEhVazio(codigo, wTipo);
    prcDefinirChaveEmitida(fncChaveDoValor(codigo));
    onChange({
      codigo,
      descricao,
      jsonLinhaEscolhida: json,
      vazio: wVazio,
      valido,
      obrigatorioPendente: obrigatorio && wVazio,
    } satisfies LookUpResultado);
  }

  function prcAvisarCarregando(carregando: boolean): void {
    onLoadingChange?.(carregando);
  }

  /** Texto digitado → valor enviado ao backend (DATA vira DD/MM/AAAA). */
  function fncParaEnvio(texto: string): string {
    if (wTipo !== "DATA") {
      return texto.trim();
    }
    return /^\d+$/.test(texto) ? FNC_FORMATA(Number(texto), "DD/MM/AAAA") : texto.trim();
  }

  async function prcConsultarCodigo(texto: string, opcoes: { bloqueia: boolean; refocar: boolean }): Promise<void> {
    const wIdSequencia = ++wSequencia.current;
    prcAvisarCarregando(true);
    try {
      const wResposta = await wApi.buscarCodigo(fncParaEnvio(texto));
      if (wIdSequencia !== wSequencia.current) {
        return;
      }

      if (wResposta.situacao === "ENCONTRADO") {
        const wCodigo = fncConverterCodigo(wResposta.codigo, wTipo);
        const wDesc = wResposta.descricao ?? "";
        prcDefinirTexto(fncValorParaTexto(wCodigo, wTipo));
        prcDefinirDescricao(wDesc);
        prcDefinirMensagem(null);
        prcDefinirBloquear(false);
        prcDefinirEstado("VALIDO");
        if (opcoes.bloqueia) {
          prcEmitir(wCodigo, wDesc, wResposta.linha ?? null, true);
        } else {
          prcDefinirChaveEmitida(fncChaveDoValor(wCodigo));
        }
        return;
      }

      prcDefinirDescricao("");
      prcDefinirMensagem(wResposta.situacao === "MAIS_DE_UM" ? MENSAGEM_MAIS_DE_UM : mensagemNaoExistencia);
      prcDefinirBloquear(opcoes.bloqueia);
      prcDefinirEstado("INVALIDO");
      if (opcoes.bloqueia) {
        prcEmitir(fncValorVazio(wTipo), "", null, false);
      }
      if (opcoes.bloqueia && opcoes.refocar) {
        prcRetomarFoco();
      }
    } catch (erro) {
      if (wIdSequencia !== wSequencia.current) {
        return;
      }
      prcDefinirDescricao("");
      prcDefinirMensagem(fncMensagemDoErro(erro));
      prcDefinirBloquear(false);
      prcDefinirEstado("INVALIDO");
      onErro?.(erro);
    } finally {
      if (wIdSequencia === wSequencia.current) {
        prcAvisarCarregando(false);
      }
    }
  }

  // Valor inicial / alteração externa: consulta a descrição sem bloquear.
  useEffect(() => {
    if (!wConsultar) {
      return;
    }
    void prcConsultarCodigo(wConsultar.valor, { bloqueia: false, refocar: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wConsultar]);

  useEffect(
    () => () => {
      wSequencia.current++;
    },
    [],
  );

  /** Devolve o foco ao Código, a menos que o usuário tenha ido ao botão "..." ou ao modal. */
  function prcRetomarFoco(): void {
    const wAtivo = document.activeElement;
    if (wAtivo === wBotaoRef.current || wAtivo === wInputRef.current) {
      return;
    }
    if (wAtivo instanceof HTMLElement && wAtivo.closest('[role="dialog"]')) {
      return;
    }
    wInputRef.current?.focus();
    wInputRef.current?.select();
  }

  function prcAoDigitar(evento: ChangeEvent<HTMLInputElement>): void {
    let wValor = evento.target.value;
    if (wTipo === "NUMERO") {
      wValor = wValor.replace(/\D/g, "");
    } else if (wTipo === "DATA") {
      wValor = fncMascararData(wValor);
    } else {
      wValor = wValor.toUpperCase();
    }

    wSequencia.current++; // invalida validação em andamento
    prcDefinirTexto(wValor);
    prcDefinirDescricao("");
    prcDefinirMensagem(null);
    prcDefinirEstado(wValor.trim() === "" ? "VAZIO" : "EDITANDO");
    if (wValor.trim() === "") {
      prcDefinirBloquear(false);
      prcEmitir(fncValorVazio(wTipo), "", null, true); // esvaziar libera o campo
    }
  }

  function prcValidarAgora(refocar: boolean): void {
    if (wEstado !== "EDITANDO") {
      return;
    }
    prcDefinirEstado("VALIDANDO");
    void prcConsultarCodigo(wTexto, { bloqueia: true, refocar });
  }

  function prcAoSair(evento: FocusEvent<HTMLInputElement>): void {
    prcDefinirFocado(false);
    const wFoiParaBotao = evento.relatedTarget === wBotaoRef.current;

    if (wEstado === "EDITANDO") {
      prcValidarAgora(!wFoiParaBotao);
    } else if (wEstado === "INVALIDO" && wBloquear && !wFoiParaBotao) {
      setTimeout(prcRetomarFoco, 0);
    }
  }

  function prcAoTeclar(evento: KeyboardEvent<HTMLInputElement>): void {
    if (evento.key === "F4" && wLivre) {
      evento.preventDefault();
      prcDefinirAberto(true);
    } else if (evento.key === "Enter" || evento.key === "ArrowDown") {
      // Enter e ↓ funcionam como Tab; a validação roda no blur, igual ao Tab.
      evento.preventDefault();
      prcMoverFoco(evento.currentTarget, 1);
    } else if (evento.key === "ArrowUp") {
      evento.preventDefault(); // ↑ funciona como Shift+Tab
      prcMoverFoco(evento.currentTarget, -1);
    }
  }

  function prcAoEscolher(escolhida: LookupLinha): void {
    const wCodigo = fncConverterCodigo(escolhida[definicao.colunaRetorno], wTipo);
    const wDesc = String(escolhida[definicao.colunaDescricao] ?? "");
    wSequencia.current++;
    prcDefinirTexto(fncValorParaTexto(wCodigo, wTipo));
    prcDefinirDescricao(wDesc);
    prcDefinirMensagem(null);
    prcDefinirBloquear(false);
    prcDefinirEstado("VALIDO");
    prcDefinirAberto(false);
    prcEmitir(wCodigo, wDesc, escolhida, true);
  }

  const wExibido =
    !wFocado && mascaraCodigo && wEstado === "VALIDO" && wTexto
      ? FNC_FORMATA(wTipo === "NUMERO" ? Number(wTexto) : wTexto, mascaraCodigo)
      : wTexto;

  const wCampoId = id ?? `lookup-${definicao.chave ?? definicao.colunaRetorno}`;
  const wInvalido = wEstado === "INVALIDO";
  const wClasseCodigo = ["cmp-entrada", "cmp-lk-codigo", wTipo === "NUMERO" ? "cmp-lk-numero" : ""].filter(Boolean).join(" ");

  return (
    <div className={className ? `cmp-campo ${className}` : "cmp-campo"}>
      {label && (
        <label className="cmp-rotulo" htmlFor={wCampoId}>
          {label}
          {obrigatorio && <span className="cmp-obrigatorio"> *</span>}
        </label>
      )}

      <div className="cmp-linha">
        <input
          id={wCampoId}
          ref={wInputRef}
          className={wClasseCodigo}
          style={larguraCampo === undefined ? undefined : { width: `calc(${larguraCampo}ch + 1.75rem)` }}
          value={wExibido}
          placeholder={placeholder}
          readOnly={wSomenteLeitura}
          disabled={wDesabilitado}
          aria-invalid={wInvalido}
          aria-describedby={wMensagem ? `${wCampoId}-desc` : undefined}
          autoComplete="off"
          onFocus={() => prcDefinirFocado(true)}
          onChange={prcAoDigitar}
          onBlur={prcAoSair}
          onKeyDown={prcAoTeclar}
        />
        {/* a mensagem de erro (inexistente, vários registros, erro de consulta) aparece no lugar da descrição */}
        <input
          id={`${wCampoId}-desc`}
          readOnly
          tabIndex={-1}
          value={wEstado === "VALIDANDO" ? "..." : (wMensagem ?? wDescricao)}
          title={wMensagem ?? undefined}
          aria-label={label ? `${label} (descrição)` : "Descrição"}
          aria-invalid={wInvalido}
          className={["cmp-entrada", "cmp-lk-descricao", wMensagem ? "cmp-lk-descricao-erro" : ""].filter(Boolean).join(" ")}
          style={larguraDescricaoPx === undefined ? undefined : { width: `${larguraDescricaoPx}px`, flex: "none" }}
        />
        <button
          ref={wBotaoRef}
          type="button"
          className="cmp-botao cmp-botao-icone"
          disabled={!wLivre}
          tabIndex={-1} // fora da ordem de Tab: só o mouse (ou F4 no Código) abre o modal
          aria-label="Pesquisar"
          onClick={() => prcDefinirAberto(true)}
        >
          ...
        </button>
      </div>

      <LookUpModal
        aberto={wAberto}
        onFechar={() => prcDefinirAberto(false)}
        onEscolher={prcAoEscolher}
        focoAoFechar={wInputRef}
        definicao={definicao}
        titulo={tituloPesquisa}
        tipoRefreshGrid={tipoRefreshGrid}
        qtdMinimaCaracterBusca={qtdMinimaCaracterBusca}
        pesquisar={wApi.pesquisar}
        mascaraGrid={mascaraGrid}
        mapaValores={mapaValores}
        highlight={highlightDoTermoBuscado}
        larguraGridPx={larguraGridPx}
        corFundoModal={corFundoModal}
        onLoadingChange={onLoadingChange}
        onErro={onErro}
      />
    </div>
  );
}
