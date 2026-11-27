"""Motor único do LookUpField: recebe a configuração do objeto em tela e executa a consulta (tabela ou SELECT).

Abordagem de execução (única): DB-API **síncrona**. As rotas são `def` (não `async def`), então o FastAPI as roda
no threadpool e o driver bloqueante não trava o loop de eventos. Nada é cadastrado no backend por consulta.
"""

import logging
import re
from datetime import datetime
from decimal import Decimal
from typing import Any

from ..banco.dialetos import fncObterDialeto
from ..banco.normalizacao import fncEhErroDeBanco, fncNormalizarValor
from ..erros import ErroAcessoNegado, ErroNegocio
from . import sql_builder, validador
from .configuracao import ConfiguracaoLookup
from .definicao import (
    LookupBase,
    LookupDefinicao,
    LookupTipoValor,
    LookupValidacaoResultado,
)
from .dtos import (
    LookupCodigoRequest,
    LookupCodigoResponse,
    LookupPesquisaRequest,
    LookupPesquisaResponse,
)
from .sql_builder import LookupConsulta, LookupCriterios

# Piso fixo do backend para pesquisa só por texto, para proteger o banco.
MINIMO_CARACTERES_TEXTO = 3

_LOG = logging.getLogger("componentes_py.lookup")
_DATA_ISO = re.compile(r"\d{4}-\d{2}-\d{2}")
_DATA_BR = re.compile(r"\d{2}/\d{2}/\d{4}")
_NUMERO = re.compile(r"[+-]?(\d+\.?\d*|\.\d+)")


def _fncDocumento(valor: str | None, nome: str, tamanho: int, alfanumerico: bool = False) -> str | None:
    """Mantém só os dígitos (CNPJ alfanumérico: letras e dígitos em maiúsculas) e completa com zeros à esquerda."""
    if valor is None or not valor.strip():
        return None
    if alfanumerico:
        wMantidos = "".join(c.upper() for c in valor if c.isascii() and c.isalnum())
    else:
        wMantidos = "".join(c for c in valor if c.isascii() and c.isdigit())
    if len(wMantidos) == 0:
        raise ErroNegocio(f"{nome} inválido")
    if len(wMantidos) > tamanho:
        raise ErroNegocio(f"{nome} deve ter no máximo {tamanho} dígitos")
    return wMantidos.rjust(tamanho, "0")


def fncNormalizar(req: LookupPesquisaRequest, sem_minimo: bool = False) -> LookupCriterios:
    """Valida e normaliza a requisição: CPF vira string de 11 dígitos e CNPJ de 14, com zeros à esquerda.

    `sem_minimo` (pesquisa ao abrir, liberada pelo projeto) aceita requisição sem critério e texto de qualquer tamanho.
    """
    wDefinicao = req.definicao
    wTexto = req.texto.strip() if req.texto and req.texto.strip() else None
    wCpf = _fncDocumento(req.cpf, "CPF", 11)
    wCnpj = _fncDocumento(req.cnpj, "CNPJ", 14, alfanumerico=True)
    wData: datetime | None = None

    if req.dt_nascto and req.dt_nascto.strip():
        wBruta = req.dt_nascto.strip()
        try:
            if not _DATA_ISO.fullmatch(wBruta):
                raise ValueError(wBruta)
            wData = datetime.strptime(wBruta, "%Y-%m-%d")
        except ValueError:
            raise ErroNegocio("Data de nascimento inválida. Use o formato yyyy-MM-dd") from None

    if not sem_minimo and wTexto is None and wCpf is None and wCnpj is None and wData is None:
        raise ErroNegocio("Informe ao menos um critério de pesquisa")

    if wCpf is not None and wDefinicao.coluna_cpf is None:
        raise ErroNegocio("O Lookup não possui filtro de CPF")
    if wCnpj is not None and wDefinicao.coluna_cnpj is None:
        raise ErroNegocio("O Lookup não possui filtro de CNPJ")
    if wData is not None and wDefinicao.coluna_dt_nascto is None:
        raise ErroNegocio("O Lookup não possui filtro de data de nascimento")

    wSoTexto = wTexto is not None and wCpf is None and wCnpj is None and wData is None
    if not sem_minimo and wSoTexto and wTexto is not None and len(wTexto) < MINIMO_CARACTERES_TEXTO:
        raise ErroNegocio(f"Informe ao menos {MINIMO_CARACTERES_TEXTO} caracteres para pesquisar")

    return LookupCriterios(texto=wTexto, dt_nascto=wData, cpf=wCpf, cnpj=wCnpj, sem_criterio_liberado=sem_minimo)


def fncConverterCodigo(tipo: LookupTipoValor, valor: str | None) -> Decimal | str | datetime | None:
    """Converte o código digitado para o tipo da coluna. Devolve None se for impossível."""
    if valor is None or not valor.strip():
        return None
    wValor = valor.strip()

    if tipo == LookupTipoValor.NUMERO:
        return Decimal(wValor) if _NUMERO.fullmatch(wValor) else None
    if tipo == LookupTipoValor.DATA:
        for wPadrao, wFormato in ((_DATA_ISO, "%Y-%m-%d"), (_DATA_BR, "%d/%m/%Y")):
            if wPadrao.fullmatch(wValor):
                try:
                    return datetime.strptime(wValor, wFormato)
                except ValueError:
                    return None
        return None
    return wValor


def fncValidar(definicao: LookupDefinicao | None) -> LookupValidacaoResultado:
    """Para o modo debug do front: devolve a lista completa de inconsistências, sem executar nada."""
    if definicao is None:
        raise ErroNegocio("Configuração do Lookup não informada")
    wLista = validador.fncValidar(definicao)
    return LookupValidacaoResultado(ok=len(wLista) == 0, inconsistencias=wLista)


class ServicoLookup:
    def __init__(self, configuracao: ConfiguracaoLookup) -> None:
        self._config = configuracao

    # ------------------------------------------------------------------ API

    def pesquisar(self, req: LookupPesquisaRequest, usuario: Any = None) -> LookupPesquisaResponse:
        wDefinicao = self._fncDefinicao(req.definicao, usuario)
        wGancho = self._config.permitir_pesquisa_ao_abrir
        wSemMinimo = wDefinicao.pesquisar_ao_abrir and wGancho is not None and bool(wGancho(wDefinicao, usuario))
        wCriterios = fncNormalizar(req, wSemMinimo)

        wLinhas = self._fncExecutar(wDefinicao, sql_builder.fncPesquisa(wDefinicao, wCriterios), usuario)

        wAtingido = len(wLinhas) > wDefinicao.qtde_linhas
        if wAtingido:
            wLinhas = wLinhas[: wDefinicao.qtde_linhas]
        return LookupPesquisaResponse(linhas=wLinhas, limite_atingido=wAtingido)

    def buscar_por_codigo(self, req: LookupCodigoRequest, usuario: Any = None) -> LookupCodigoResponse:
        wDefinicao = self._fncDefinicao(req.definicao, usuario)

        wConvertido = fncConverterCodigo(wDefinicao.tipo_coluna_retorno, req.valor)
        if wConvertido is None:
            return LookupCodigoResponse(situacao="NAO_ENCONTRADO")

        wLinhas = self._fncExecutar(wDefinicao, sql_builder.fncCodigo(wDefinicao, wConvertido), usuario)
        if len(wLinhas) == 0:
            return LookupCodigoResponse(situacao="NAO_ENCONTRADO")
        if len(wLinhas) == 1:
            wLinha = wLinhas[0]
            wDescricao = wLinha.get(wDefinicao.coluna_descricao)
            return LookupCodigoResponse(
                situacao="ENCONTRADO",
                codigo=wLinha.get(wDefinicao.coluna_retorno),
                descricao=None if wDescricao is None else str(wDescricao),
                linha=wLinha,
            )
        return LookupCodigoResponse(situacao="MAIS_DE_UM")

    # ------------------------------------------------------------------ internos

    def _fncDefinicao(self, definicao: LookupDefinicao | None, usuario: Any) -> LookupDefinicao:
        """Recusa (400) configuração inconsistente ou insegura (listando tudo) e aplica as restrições do consumidor."""
        if definicao is None:
            raise ErroNegocio("Configuração do Lookup não informada")

        wErros = validador.fncValidar(definicao)
        if wErros:
            raise ErroNegocio(
                "Configuração do Lookup inválida: " + "; ".join(f"{e.propriedade}: {e.mensagem}" for e in wErros)
            )

        wPermitidas = self._config.tabelas_permitidas
        if wPermitidas is not None:
            if definicao.base != LookupBase.TABELA:
                raise ErroAcessoNegado("Base SELECT não é permitida: o projeto restringiu as tabelas do Lookup")
            wLiberadas = {t.casefold() for t in wPermitidas}
            if str(definicao.nome_tabela).casefold() not in wLiberadas:
                raise ErroAcessoNegado(f"Tabela '{definicao.nome_tabela}' não permitida para o Lookup")

        if self._config.autorizar is not None and not self._config.autorizar(definicao, usuario):
            raise ErroAcessoNegado("Acesso negado a esta consulta")
        return definicao

    def _fncExecutar(self, d: LookupDefinicao, consulta: LookupConsulta, usuario: Any = None) -> list[dict[str, Any]]:
        wDialeto = fncObterDialeto(d.banco)
        wParametros = consulta.fncParametrosParaDriver(wDialeto)
        # Nome devolvido pelo banco (Oracle: maiúsculas; PostgreSQL: minúsculas) -> nome como foi configurado.
        wNomes = {c.casefold(): c for c in sql_builder.fncColunasDoSelect(d)}

        try:
            if self._config.obter_conexao_do_usuario is not None:
                wConexao = self._config.obter_conexao_do_usuario(d.banco.value, usuario, d)
            else:
                wConexao = self._config.obter_conexao(d.banco.value)  # type: ignore[misc]
            try:
                wCursor = wConexao.cursor()
                try:
                    wCursor.execute(consulta.sql, wParametros)
                    wColunas = [c[0] for c in wCursor.description]
                    wBrutas = wCursor.fetchall()
                finally:
                    wCursor.close()
            finally:
                wConexao.close()
        except Exception as erro:
            if not self._fncEhErroDoBanco(erro):
                raise
            # Erro do banco (ORA-xxxxx, SQL Server, PostgreSQL): vai por inteiro, com o código do banco, como 400.
            # Assim o programador vê a causa (coluna inexistente no filtro, por exemplo) sem procurar no log da API.
            _LOG.warning("Erro do banco no Lookup %s: %s", d.chave, erro)
            raise ErroNegocio(str(erro)) from erro

        wResultado: list[dict[str, Any]] = []
        for wLinha in wBrutas:
            wSaida: dict[str, Any] = {}
            for wColuna, wValor in zip(wColunas, wLinha, strict=True):
                wSaida[wNomes.get(str(wColuna).casefold(), str(wColuna))] = fncNormalizarValor(wValor)
            wResultado.append(wSaida)
        return wResultado

    def _fncEhErroDoBanco(self, erro: BaseException) -> bool:
        wTipos = self._config.tipos_erro_banco
        if wTipos is not None:
            return isinstance(erro, wTipos)
        return fncEhErroDeBanco(erro)
