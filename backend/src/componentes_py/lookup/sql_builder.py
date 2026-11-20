"""Monta o SQL do Lookup para qualquer dialeto.

Tudo o que vem do usuário (texto, CPF, CNPJ, data, código) vai como parâmetro; os identificadores vêm só da
definição (já validados por `validador`). O que muda por banco (placeholder, limite, escape do LIKE) vem do `Dialeto`.
"""

from dataclasses import dataclass, field
from datetime import date, datetime, time, timedelta
from decimal import Decimal
from typing import Any

from ..banco.dialetos import Dialeto, fncObterDialeto
from .definicao import LookupBase, LookupDefinicao, LookupTipoConsulta
from .validador import fncNormalizarFiltro

LIMITE_CODIGO = 2
_UM_DIA = timedelta(days=1)


@dataclass(frozen=True)
class LookupCriterios:
    """Critérios já validados e normalizados pelo serviço."""

    texto: str | None = None
    dt_nascto: date | datetime | None = None
    cpf: str | None = None
    cnpj: str | None = None


@dataclass(frozen=True)
class LookupConsulta:
    sql: str
    # Valores por nome (o dialeto nomeado usa este dicionário direto).
    parametros: dict[str, Any] = field(default_factory=dict)
    # Nomes na ordem em que aparecem no SQL (o dialeto posicional, `?`, usa esta ordem).
    ordem: list[str] = field(default_factory=list)

    def fncParametrosParaDriver(self, dialeto: Dialeto) -> dict[str, Any] | list[Any]:
        """Parâmetros no formato que o driver espera: lista (posicional) ou dicionário (nomeado)."""
        if dialeto.posicional:
            return [dialeto.fncConverterParametro(self.parametros[n]) for n in self.ordem]
        return {n: dialeto.fncConverterParametro(v) for n, v in self.parametros.items()}


class _Coletor:
    """Guarda os parâmetros e devolve o placeholder de cada referência (no `?`, cada uso entra na ordem)."""

    def __init__(self, dialeto: Dialeto) -> None:
        self.dialeto = dialeto
        self.parametros: dict[str, Any] = {}
        self.ordem: list[str] = []

    def fncDefinir(self, nome: str, valor: Any) -> None:
        self.parametros[nome] = valor

    def fncReferenciar(self, nome: str) -> str:
        self.ordem.append(nome)
        return self.dialeto.fncPlaceholder(nome)


def _fncMeiaNoite(valor: date | datetime) -> datetime:
    return datetime.combine(valor.date() if isinstance(valor, datetime) else valor, time.min)


def fncColunasDoSelect(d: LookupDefinicao) -> list[str]:
    """Colunas do SELECT: retorno, descrição, grid e adicionais, sem repetição (sem diferenciar maiúsculas)."""
    wVistos: set[str] = set()
    wResultado: list[str] = []
    for wColuna in [d.coluna_retorno, d.coluna_descricao, *(g.coluna for g in d.colunas_grid), *d.colunas_adicionais]:
        if wColuna.casefold() not in wVistos:
            wVistos.add(wColuna.casefold())
            wResultado.append(wColuna)
    return wResultado


def _fncCondicaoFiltro(d: LookupDefinicao, dialeto: Dialeto) -> str | None:
    """Filtro fixo da definição (só com base = TABELA), entre parênteses para não alterar a precedência."""
    if d.base != LookupBase.TABELA or not d.filtro or not d.filtro.strip():
        return None
    wFiltro = fncNormalizarFiltro(d.filtro)
    return None if len(wFiltro) == 0 else "(" + dialeto.fncProtegerSql(wFiltro) + ")"


def _fncOrigem(d: LookupDefinicao, dialeto: Dialeto) -> str:
    if d.base == LookupBase.TABELA:
        return str(d.nome_tabela)
    return "(" + dialeto.fncProtegerSql(str(d.select).strip().rstrip(";").rstrip()) + ") B"


def _fncMontar(d: LookupDefinicao, dialeto: Dialeto, where: str, order_by: list[str], limite: int) -> str:
    wSql = "SELECT " + dialeto.fncLimiteInicio(limite)
    wSql += ", ".join(fncColunasDoSelect(d))
    wSql += " FROM " + _fncOrigem(d, dialeto)
    wSql += " WHERE " + where
    if order_by:
        wSql += " ORDER BY " + ", ".join(order_by)
    wSql += dialeto.fncLimiteFim(limite)
    return wSql


def _fncCondicaoTexto(d: LookupDefinicao, dialeto: Dialeto, coletor: _Coletor, texto: str) -> str:
    if d.tipo_consulta == LookupTipoConsulta.POR_ORDEM_ALFABETICA:
        coletor.fncDefinir("p0", texto.strip())
        return f"UPPER({d.colunas_base_pesquisa[0]}) >= UPPER({coletor.fncReferenciar('p0')})"

    wPalavras = texto.split()
    wNomes: list[str] = []
    for wIndice, wPalavra in enumerate(wPalavras):
        wNome = f"p{wIndice}"
        coletor.fncDefinir(wNome, "%" + dialeto.fncEscaparLike(wPalavra) + "%")
        wNomes.append(wNome)

    wOpColuna = d.operador_na_coluna.value
    wOpEntre = d.operador_entre_colunas.value
    wPorColuna: list[str] = []
    for wColuna in d.colunas_base_pesquisa:
        wPartes = [f"UPPER({wColuna}) LIKE UPPER({coletor.fncReferenciar(n)}) ESCAPE '\\'" for n in wNomes]
        wPorColuna.append("(" + f" {wOpColuna} ".join(wPartes) + ")")
    return "(" + f" {wOpEntre} ".join(wPorColuna) + ")"


def _fncCondicaoDocumento(coluna: str, nome: str, completo: str, coletor: _Coletor) -> str:
    """CPF/CNPJ chegam completos (11/14 caracteres, com zeros à esquerda) e assim ficam no banco.

    Como há registros antigos gravados sem os zeros, a consulta aceita também o valor sem eles. Os dois lados são
    comparações diretas, então um índice na coluna continua sendo usado.
    """
    coletor.fncDefinir(nome, completo)
    wSemZeros = completo.lstrip("0")
    if len(wSemZeros) == 0 or len(wSemZeros) == len(completo):
        return f"{coluna} = {coletor.fncReferenciar(nome)}"

    coletor.fncDefinir(nome + "Sz", wSemZeros)
    wPrimeiro = coletor.fncReferenciar(nome)
    wSegundo = coletor.fncReferenciar(nome + "Sz")
    return f"({coluna} = {wPrimeiro} OR {coluna} = {wSegundo})"


def fncPesquisa(d: LookupDefinicao, c: LookupCriterios) -> LookupConsulta:
    wDialeto = fncObterDialeto(d.banco)
    wColetor = _Coletor(wDialeto)
    wCondicoes: list[str] = []

    if c.texto and c.texto.strip():
        wCondicoes.append(_fncCondicaoTexto(d, wDialeto, wColetor, c.texto))
    if c.cpf is not None and d.coluna_cpf is not None:
        wCondicoes.append(_fncCondicaoDocumento(d.coluna_cpf, "pCpf", c.cpf, wColetor))
    if c.cnpj is not None and d.coluna_cnpj is not None:
        wCondicoes.append(_fncCondicaoDocumento(d.coluna_cnpj, "pCnpj", c.cnpj, wColetor))
    if c.dt_nascto is not None and d.coluna_dt_nascto is not None:
        wDia = _fncMeiaNoite(c.dt_nascto)
        wColetor.fncDefinir("pDt", wDia)
        wColetor.fncDefinir("pDtMais1", wDia + _UM_DIA)
        wInicio = wColetor.fncReferenciar("pDt")
        wFim = wColetor.fncReferenciar("pDtMais1")
        wCondicoes.append(f"({d.coluna_dt_nascto} >= {wInicio} AND {d.coluna_dt_nascto} < {wFim})")

    if not wCondicoes:
        raise ValueError("Pesquisa sem nenhum critério.")

    wFiltro = _fncCondicaoFiltro(d, wDialeto)
    if wFiltro is not None:
        wCondicoes.append(wFiltro)

    if d.colunas_order_by:
        wOrderBy = list(d.colunas_order_by)
    elif d.tipo_consulta == LookupTipoConsulta.POR_ORDEM_ALFABETICA:
        wOrderBy = [d.colunas_base_pesquisa[0]]
    else:
        wOrderBy = []

    # n+1 para saber se o limite foi atingido
    wSql = _fncMontar(d, wDialeto, " AND ".join(wCondicoes), wOrderBy, d.qtde_linhas + 1)
    return LookupConsulta(wSql, wColetor.parametros, wColetor.ordem)


def fncCodigo(d: LookupDefinicao, valor: Decimal | str | datetime) -> LookupConsulta:
    """`valor` já convertido para o tipo da coluna: Decimal, str ou datetime."""
    wDialeto = fncObterDialeto(d.banco)
    wColetor = _Coletor(wDialeto)

    if isinstance(valor, datetime):
        wDia = _fncMeiaNoite(valor)
        wColetor.fncDefinir("pCodigo", wDia)
        wColetor.fncDefinir("pCodigoMais1", wDia + _UM_DIA)
        wInicio = wColetor.fncReferenciar("pCodigo")
        wFim = wColetor.fncReferenciar("pCodigoMais1")
        wCondicao = f"({d.coluna_retorno} >= {wInicio} AND {d.coluna_retorno} < {wFim})"
    else:
        wColetor.fncDefinir("pCodigo", valor)
        wCondicao = f"{d.coluna_retorno} = {wColetor.fncReferenciar('pCodigo')}"

    wFiltro = _fncCondicaoFiltro(d, wDialeto)
    if wFiltro is not None:
        wCondicao += " AND " + wFiltro

    return LookupConsulta(_fncMontar(d, wDialeto, wCondicao, [], LIMITE_CODIGO), wColetor.parametros, wColetor.ordem)
