import { Fragment, useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";

import { FNC_FORMATA } from "../formata/formata";
import {
  GRID_MAX_LINHAS,
  fncAbertasIniciais,
  fncAlternarAberta,
  fncCortarLinhas,
  fncOrdemClique,
  fncOrdemDuploClique,
  fncOrdenarLinhas,
  fncPaginar,
  fncPosicaoNaOrdem,
  fncTotalPaginas,
  fncValidarGrid,
} from "./grid";
import type { GridColuna, GridFieldProps, GridLinha, GridOrdem } from "./grid.types";

const MASCARA_PADRAO: Partial<Record<GridColuna["tipo"], string>> = {
  data: "DD/MM/AAAA",
  dataHora: "DD/MM/AAAA HH:MI:SS",
};

function fncTextoDaCelula(linha: GridLinha, coluna: GridColuna): string {
  const wValor = linha[coluna.coluna];
  if (wValor === null || wValor === undefined) {
    return "";
  }
  if (coluna.tipo === "logico") {
    return wValor === true || wValor === "S" || wValor === "true" || wValor === 1 ? "Sim" : "Não";
  }
  const wMascara = (typeof coluna.mascara === "function" ? coluna.mascara(linha) : coluna.mascara) ?? MASCARA_PADRAO[coluna.tipo];
  if (wMascara) {
    try {
      return FNC_FORMATA(wValor as number | string | Date, wMascara);
    } catch {
      return String(wValor);
    }
  }
  return String(wValor);
}

function fncClasseAlinhamento(coluna: GridColuna): string {
  if (coluna.alinhamento === "centro") {
    return "cmp-grid-centro";
  }
  if (coluna.alinhamento === "direita") {
    return "cmp-grid-direita";
  }
  if (coluna.alinhamento === "esquerda") {
    return "cmp-grid-esquerda";
  }
  if (coluna.tipo === "numero") {
    return "cmp-grid-direita";
  }
  if (coluna.tipo === "logico" || coluna.tipo === "data" || coluna.tipo === "dataHora" || coluna.tipo === "competencia") {
    return "cmp-grid-centro";
  }
  return "";
}

/** Grid de consulta: ordenação em várias colunas, paginação, detalhe expansível, ações e eventos de linha. */
export function GridField({
  colunas,
  cabecalhos,
  dados,
  linhasPorPagina,
  maxLinhas = GRID_MAX_LINHAS,
  ordenavel = true,
  onLinhaAcionada,
  onLinhaPosicionada,
  posicionarEm,
  detalhe,
  temDetalhe,
  detalheAberto = false,
  acoes,
  onLinhaContexto,
  corLinha,
  manterOrdem = false,
  fonteRodape,
  corPrimeira = "rgb(0,0,255)",
  corDemais = "rgb(0,0,225)",
  corForaDaOrdem = "rgb(0,0,200)",
  corNaoOrdenavel = "rgb(40,40,40)",
  className,
}: GridFieldProps) {
  const [wOrdem, prcDefinirOrdem] = useState<GridOrdem[]>([]);
  const [wPagina, prcDefinirPagina] = useState(1);
  const [wAtual, prcDefinirAtual] = useState(0);
  const [wAbertas, prcDefinirAbertas] = useState<ReadonlySet<GridLinha>>(new Set());
  const [wOrigemAbertas, prcDefinirOrigemAbertas] = useState<{ linhas: readonly GridLinha[]; aberto: boolean } | null>(null);
  const wLinhaRef = useRef<HTMLTableRowElement | null>(null);

  const wErro = fncValidarGrid(colunas, cabecalhos, linhasPorPagina, maxLinhas);
  const { linhas: wLimitadas, cortou: wCortou } = useMemo(() => fncCortarLinhas(dados, maxLinhas), [dados, maxLinhas]);
  // Novos dados ou mudança de `detalheAberto`: abre/fecha o detalhe de todas as linhas que têm detalhe
  // (ajuste de estado durante a renderização; `temDetalhe` costuma ser função inline e não entra na comparação).
  if (wOrigemAbertas?.linhas !== wLimitadas || wOrigemAbertas.aberto !== detalheAberto) {
    prcDefinirOrigemAbertas({ linhas: wLimitadas, aberto: detalheAberto });
    prcDefinirAbertas(fncAbertasIniciais(wLimitadas, temDetalhe, detalheAberto));
  }
  const wOrdenadas = useMemo(() => fncOrdenarLinhas(wLimitadas, colunas, wOrdem), [wLimitadas, colunas, wOrdem]);
  const wPaginas = fncTotalPaginas(wOrdenadas.length, Math.max(1, linhasPorPagina));
  const wPaginaOk = Math.min(wPagina, wPaginas);
  const wVisiveis = useMemo(
    () => fncPaginar(wOrdenadas, wPaginaOk, Math.max(1, linhasPorPagina)),
    [wOrdenadas, wPaginaOk, linhasPorPagina],
  );

  // Callbacks em ref: o pai costuma passá-los inline e eles não podem disparar efeitos a cada render.
  const wOnLinhaPosicionadaRef = useRef(onLinhaPosicionada);
  const wPosicionarEmRef = useRef(posicionarEm);
  const wDadosAplicadosRef = useRef<readonly GridLinha[] | null>(null);
  const wUltimaNotificadaRef = useRef<GridLinha | null | undefined>(undefined);
  const [wVersaoDados, prcDefinirVersaoDados] = useState(0);

  useEffect(() => {
    wOnLinhaPosicionadaRef.current = onLinhaPosicionada;
    wPosicionarEmRef.current = posicionarEm;
  });

  // Declarado antes do efeito de `dados`: no render em que `dados` muda, o estado (página/linha atual) ainda é o antigo
  // e o efeito abaixo ainda não rodou; a notificação só vale depois que ele aplicou os novos dados.
  useEffect(() => {
    if (wErro || wDadosAplicadosRef.current !== dados) {
      return;
    }
    const wLinha = wVisiveis[wAtual] ?? null;
    if (wUltimaNotificadaRef.current === wLinha) {
      return;
    }
    wUltimaNotificadaRef.current = wLinha;
    wOnLinhaPosicionadaRef.current?.(wLinha ? { ...wLinha } : null);
  }, [wVisiveis, wAtual, dados, wVersaoDados, wErro]);

  useEffect(() => {
    if (!manterOrdem) {
      prcDefinirOrdem([]);
      prcDefinirPagina(1);
    }
    prcDefinirAtual(0);
    const wPosicionar = wPosicionarEmRef.current;
    if (wPosicionar) {
      // Posiciona na 1ª linha que satisfaz, na ordem que valerá após a troca de `dados`.
      const wOrdemEfetiva = manterOrdem ? wOrdem : [];
      const wOrdenadasNovas = fncOrdenarLinhas(wLimitadas, colunas, wOrdemEfetiva);
      const wPorPagina = Math.max(1, linhasPorPagina);
      const wIndice = wOrdenadasNovas.findIndex((linha) => wPosicionar(linha));
      const wPosicao = wIndice >= 0 ? wIndice : 0;
      prcDefinirPagina(Math.floor(wPosicao / wPorPagina) + 1);
      prcDefinirAtual(wPosicao % wPorPagina);
    }
    wDadosAplicadosRef.current = dados;
    prcDefinirVersaoDados((versao) => versao + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dados]);

  useEffect(() => {
    wLinhaRef.current?.scrollIntoView({ block: "nearest" });
  }, [wAtual, wPaginaOk]);

  if (wErro) {
    return (
      <div role="alert" className="cmp-grid-erro">
        {wErro}
      </div>
    );
  }

  function prcMudarOrdem(nova: GridOrdem[]): void {
    prcDefinirOrdem(nova);
    prcDefinirPagina(1);
    prcDefinirAtual(0);
  }

  function prcIrParaPagina(pagina: number): void {
    prcDefinirPagina(Math.min(Math.max(1, pagina), wPaginas));
    prcDefinirAtual(0);
  }

  function prcAcionar(linha: GridLinha | undefined): void {
    if (linha && onLinhaAcionada) {
      onLinhaAcionada({ ...linha });
    }
  }

  const wColunasTotais = colunas.length + (detalhe ? 1 : 0) + (acoes?.length ? 1 : 0);
  const fncComDetalhe = (linha: GridLinha): boolean => !!detalhe && (!temDetalhe || temDetalhe(linha));

  function prcAlternarDetalhe(linha: GridLinha | undefined): void {
    if (linha && fncComDetalhe(linha)) {
      prcDefinirAbertas((abertas) => fncAlternarAberta(abertas, linha));
    }
  }

  function prcAoTeclar(evento: KeyboardEvent<HTMLDivElement>): void {
    // Teclas do botão de detalhe e do conteúdo do detalhe (ex.: outro grid) não são do grid externo.
    if (evento.target !== evento.currentTarget) {
      return;
    }
    switch (evento.key) {
      case " ":
        if (!detalhe) {
          return;
        }
        evento.preventDefault();
        prcAlternarDetalhe(wVisiveis[wAtual]);
        break;
      case "ArrowDown":
        evento.preventDefault();
        prcDefinirAtual((atual) => Math.min(atual + 1, wVisiveis.length - 1));
        break;
      case "ArrowUp":
        evento.preventDefault();
        prcDefinirAtual((atual) => Math.max(atual - 1, 0));
        break;
      case "PageDown":
        evento.preventDefault();
        prcIrParaPagina(wPaginaOk + 1);
        break;
      case "PageUp":
        evento.preventDefault();
        prcIrParaPagina(wPaginaOk - 1);
        break;
      case "Enter":
      case "F4":
        evento.preventDefault();
        prcAcionar(wVisiveis[wAtual]);
        break;
    }
  }

  const wCorCabecalhoFixo = ordenavel ? corForaDaOrdem : corNaoOrdenavel;

  return (
    <div className={className ? `cmp-grid ${className}` : "cmp-grid"}>
      <div tabIndex={0} onKeyDown={prcAoTeclar} className="cmp-grid-rolagem">
        <table className="cmp-grid-tabela">
          <thead>
            <tr>
              {detalhe && (
                <th
                  aria-label="Detalhe"
                  className="cmp-grid-th cmp-grid-th-detalhe"
                  style={{ backgroundColor: wCorCabecalhoFixo }}
                />
              )}
              {colunas.map((coluna, indice) => {
                const { posicao, desc } = fncPosicaoNaOrdem(wOrdem, coluna.coluna);
                const wCor = !ordenavel
                  ? corNaoOrdenavel
                  : posicao === 1
                    ? corPrimeira
                    : posicao > 1
                      ? corDemais
                      : corForaDaOrdem;
                const wEstilo: CSSProperties = {
                  backgroundColor: wCor,
                  minWidth: coluna.largura ? `${coluna.largura}ch` : undefined,
                };
                return (
                  <th
                    key={coluna.coluna}
                    style={wEstilo}
                    className={ordenavel ? "cmp-grid-th cmp-grid-th-ordenavel" : "cmp-grid-th"}
                    aria-sort={posicao === 0 ? "none" : desc ? "descending" : "ascending"}
                    onClick={(evento) => {
                      // O 2º clique do duplo é tratado no onDoubleClick.
                      if (!ordenavel || evento.detail > 1) {
                        return;
                      }
                      prcMudarOrdem(fncOrdemClique(wOrdem, coluna.coluna));
                    }}
                    onDoubleClick={() => {
                      if (ordenavel) {
                        prcMudarOrdem(fncOrdemDuploClique(coluna.coluna));
                      }
                    }}
                  >
                    {cabecalhos[indice]}
                    {ordenavel && posicao > 0 && (
                      <span className="cmp-grid-seta">
                        {desc ? "▼" : "▲"}
                        {posicao}
                      </span>
                    )}
                  </th>
                );
              })}
              {acoes?.length ? (
                <th className="cmp-grid-th cmp-grid-th-acoes" style={{ backgroundColor: wCorCabecalhoFixo }}>
                  Ações
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {wVisiveis.map((linha, indice) => {
              const wHabilitado = fncComDetalhe(linha);
              const wAberta = wHabilitado && wAbertas.has(linha);
              const wCorDaLinha = corLinha?.(linha);
              return (
                <Fragment key={indice}>
                  <tr
                    ref={indice === wAtual ? wLinhaRef : undefined}
                    data-selecionada={indice === wAtual ? "true" : undefined}
                    className="cmp-grid-linha"
                    style={wCorDaLinha ? { backgroundColor: wCorDaLinha } : undefined}
                    onClick={() => prcDefinirAtual(indice)}
                    onDoubleClick={() => prcAcionar(linha)}
                    onContextMenu={
                      onLinhaContexto
                        ? (evento) => {
                            evento.preventDefault();
                            prcDefinirAtual(indice);
                            onLinhaContexto({ ...linha });
                          }
                        : undefined
                    }
                  >
                    {detalhe && (
                      <td className="cmp-grid-td cmp-grid-td-detalhe" onDoubleClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          className="cmp-grid-botao-detalhe"
                          disabled={!wHabilitado}
                          aria-expanded={wAberta}
                          aria-label={wAberta ? "Fechar detalhe" : "Abrir detalhe"}
                          onClick={() => prcAlternarDetalhe(linha)}
                        >
                          {wAberta ? "−" : "+"}
                        </button>
                      </td>
                    )}
                    {colunas.map((coluna) => {
                      const wTexto = fncTextoDaCelula(linha, coluna);
                      const wConteudo =
                        coluna.aoClicar && wTexto ? (
                          <button
                            type="button"
                            className="cmp-grid-link"
                            onClick={(evento) => {
                              evento.stopPropagation();
                              coluna.aoClicar!(linha);
                            }}
                            onDoubleClick={(evento) => evento.stopPropagation()}
                          >
                            {wTexto}
                          </button>
                        ) : (
                          wTexto
                        );
                      const wClasse = ["cmp-grid-td", fncClasseAlinhamento(coluna)].filter(Boolean).join(" ");
                      return (
                        <td key={coluna.coluna} className={wClasse}>
                          {coluna.larguraMax ? (
                            // O limite vai num elemento interno: `max-width` na própria célula não vale em tabela automática.
                            <span className="cmp-grid-corte" style={{ maxWidth: `${coluna.larguraMax}ch` }} title={wTexto}>
                              {wConteudo}
                            </span>
                          ) : (
                            wConteudo
                          )}
                        </td>
                      );
                    })}
                    {acoes?.length ? (
                      <td className="cmp-grid-td cmp-grid-td-acoes" onDoubleClick={(e) => e.stopPropagation()}>
                        {acoes.map((acao) => (
                          <button
                            key={acao.rotulo}
                            type="button"
                            title={acao.rotulo}
                            aria-label={acao.rotulo}
                            className={acao.className ? `cmp-grid-acao ${acao.className}` : "cmp-grid-acao"}
                            onClick={(evento) => {
                              evento.stopPropagation();
                              prcDefinirAtual(indice);
                              acao.aoClicar({ ...linha });
                            }}
                          >
                            {acao.icone}
                          </button>
                        ))}
                      </td>
                    ) : null}
                  </tr>
                  {wAberta && (
                    <tr className="cmp-grid-linha-detalhe">
                      <td colSpan={wColunasTotais} className="cmp-grid-td-conteudo-detalhe">
                        <div className="cmp-grid-conteudo-detalhe">{detalhe!(linha)}</div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {wVisiveis.length === 0 && (
              <tr>
                <td colSpan={wColunasTotais} className="cmp-grid-td cmp-grid-vazio">
                  Nenhum registro
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="cmp-grid-rodape" style={fonteRodape ? { fontSize: fonteRodape } : undefined}>
        <span>
          {wCortou
            ? `Mostrando as primeiras ${maxLinhas} de ${dados.length} linhas. Refine a consulta.`
            : `${wOrdenadas.length} linha(s)`}
        </span>
        <span className="cmp-grid-paginacao">
          <button type="button" className="cmp-botao cmp-grid-botao-pagina" disabled={wPaginaOk <= 1} onClick={() => prcIrParaPagina(wPaginaOk - 1)}>
            Anterior
          </button>
          <span>
            Página {wPaginaOk} de {wPaginas}
          </span>
          <button
            type="button"
            className="cmp-botao cmp-grid-botao-pagina"
            disabled={wPaginaOk >= wPaginas}
            onClick={() => prcIrParaPagina(wPaginaOk + 1)}
          >
            Próxima
          </button>
        </span>
      </div>
    </div>
  );
}
