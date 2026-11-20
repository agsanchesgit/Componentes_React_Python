"""Valida uma definição do Lookup sem acessar o banco. Devolve a lista completa de inconsistências.

Esta é a barreira de segurança dos trechos de SQL que vêm do front (SELECT e filtro): não há lista de liberação.
Ela não é exaustiva: o que o usuário do banco pode ler continua sendo definido pelos grants dele.
Use `ConfiguracaoLookup.tabelas_permitidas` / `autorizar` para restringir mais.
"""

import re
from collections.abc import Callable

from .definicao import (
    QTDE_LINHAS_MAXIMA,
    LookupBase,
    LookupDefinicao,
    LookupInconsistencia,
    LookupTipoConsulta,
)
from .select_parser import fncAnalisar, fncMascarar

_ID = r"[A-Za-z_][A-Za-z0-9_$#]*"
_IDENTIFICADOR = re.compile(rf"{_ID}(\.{_ID})?")
_ORDER_BY = re.compile(rf"{_ID}(\.{_ID})?(\s+(ASC|DESC))?", re.IGNORECASE)

_COMECA = re.compile(r"^\s*SELECT\b", re.IGNORECASE)
_PROIBIDAS = re.compile(
    r"\b(INSERT|UPDATE|DELETE|MERGE|DROP|ALTER|CREATE|TRUNCATE|GRANT|REVOKE|EXEC|EXECUTE|CALL|BEGIN|DECLARE|INTO"
    r"|COMMIT|ROLLBACK|LOCK|WAITFOR|OPENROWSET|OPENQUERY|COPY)\b"
    r"|\bFOR\s+UPDATE\b|\bXP_\w*|\b(DBMS|UTL|OWA|HTP|APEX|SYS|PG)_\w*|\bSYS\s*\."
    # PostgreSQL: funções de objetos grandes, dblink e strings entre $$ (escondem trechos da varredura).
    r"|\bLO_\w+|\bDBLINK\w*|\$\w*\$",
    re.IGNORECASE,
)
_ASPAS_ALTERNATIVAS = re.compile(r"\bq\s*'", re.IGNORECASE)
# E'...' (PostgreSQL) aceita \' dentro da string e quebraria a contagem de aspas.
_ASPAS_ESCAPE = re.compile(r"\bE\s*'", re.IGNORECASE)
_AND_INICIAL = re.compile(r"^\s*AND\b", re.IGNORECASE)

Adicionar = Callable[[str, str], None]


def fncNormalizarFiltro(filtro: str) -> str:
    """Texto do filtro pronto para entrar no WHERE: sem o AND inicial opcional e sem espaços nas pontas.

    O montador de SQL o coloca entre parênteses.
    """
    wTexto = filtro.strip().rstrip(";").rstrip()
    return _AND_INICIAL.sub("", wTexto, count=1).strip()


def _fncValidarSeguranca(select: str, adicionar: Adicionar) -> None:
    wSql = fncMascarar(select).strip().rstrip(";").rstrip()

    if not _COMECA.match(wSql):
        adicionar("Select", "O SELECT deve começar com SELECT")
    if ";" in wSql:
        adicionar("Select", "O SELECT não pode ter mais de uma instrução (;)")
    if "--" in wSql or "/*" in wSql:
        adicionar("Select", "O SELECT não pode ter comentários")
    if "@" in wSql:
        adicionar("Select", "O SELECT não pode usar db link (@)")
    if _ASPAS_ESCAPE.search(select):
        adicionar("Select", "O SELECT não pode usar strings de escape E'...'")

    wProibida = _PROIBIDAS.search(wSql)
    if wProibida:
        adicionar("Select", f"O SELECT usa um termo não permitido: {wProibida.group(0).strip()}")


def _fncValidarFiltro(filtro: str, adicionar: Adicionar) -> None:
    wPropriedade = "Filtro"

    if _ASPAS_ALTERNATIVAS.search(filtro):
        adicionar(wPropriedade, "O filtro não pode usar aspas alternativas (q'...')")
    if _ASPAS_ESCAPE.search(filtro):
        adicionar(wPropriedade, "O filtro não pode usar strings de escape E'...'")
    if filtro.count("'") % 2 != 0:
        adicionar(wPropriedade, "O filtro tem aspas simples sem fechar")

    wSql = fncMascarar(filtro)
    if ";" in wSql:
        adicionar(wPropriedade, "O filtro não pode ter mais de uma instrução (;)")
    if "--" in wSql or "/*" in wSql:
        adicionar(wPropriedade, "O filtro não pode ter comentários")
    if "@" in wSql:
        adicionar(wPropriedade, "O filtro não pode usar db link (@)")
    if ":" in wSql:
        adicionar(wPropriedade, "O filtro não pode usar parâmetros (:); informe o valor direto na condição")

    wProibida = _PROIBIDAS.search(wSql)
    if wProibida:
        adicionar(wPropriedade, f"O filtro usa um termo não permitido: {wProibida.group(0).strip()}")

    # Parênteses balanceados: para o filtro não "fechar" o parêntese em que o montador o coloca.
    wNivel = 0
    wBalanceado = True
    for wCaractere in wSql:
        if wCaractere == "(":
            wNivel += 1
        elif wCaractere == ")":
            wNivel -= 1
            if wNivel < 0:
                wBalanceado = False
                break
    if not wBalanceado or wNivel != 0:
        adicionar(wPropriedade, "O filtro tem parênteses sem par")

    if len(fncNormalizarFiltro(filtro)) == 0:
        adicionar(wPropriedade, "O filtro está vazio")


def _fncValidarSelect(d: LookupDefinicao, adicionar: Adicionar) -> None:
    if not d.select or not d.select.strip():
        adicionar("Select", "Base = SELECT exige Select")
        return

    _fncValidarSeguranca(d.select, adicionar)

    wAnalise = fncAnalisar(d.select)
    if not wAnalise.tem_from:
        adicionar("Select", "SELECT inválido: não foi encontrada a cláusula FROM")
        return
    if wAnalise.tem_estrela:
        adicionar("Select", "SELECT não pode usar '*' na lista de colunas")
    if wAnalise.tem_order_by_final and len(d.colunas_order_by) > 0:
        adicionar("ColunasOrderBy", "SELECT termina com ORDER BY e ColunasOrderBy foi informado")

    if wAnalise.tem_estrela:
        return  # não dá para conferir as colunas

    wExistentes = {c.casefold() for c in wAnalise.colunas}

    def prcExiste(propriedade: str, coluna: str | None) -> None:
        if not coluna or not coluna.strip():
            return
        wNome = coluna[coluna.rfind(".") + 1 :] if "." in coluna else coluna
        if wNome.casefold() not in wExistentes:
            adicionar(propriedade, f"Coluna '{coluna}' não existe na lista do SELECT")

    prcExiste("ColunaRetorno", d.coluna_retorno)
    prcExiste("ColunaDescricao", d.coluna_descricao)
    for wColuna in d.colunas_base_pesquisa or []:
        prcExiste("ColunasBasePesquisa", wColuna)
    for wColuna in d.colunas_grid or []:
        prcExiste("ColunasGrid", wColuna.coluna)
    for wColuna in d.colunas_adicionais or []:
        prcExiste("ColunasAdicionais", wColuna)
    prcExiste("ColunaCnpj", d.coluna_cnpj)
    prcExiste("ColunaCpf", d.coluna_cpf)
    prcExiste("ColunaDtNascto", d.coluna_dt_nascto)


def fncValidar(d: LookupDefinicao) -> list[LookupInconsistencia]:
    """Lista completa de inconsistências da definição (vazia = válida), com os nomes de propriedade do Nexus."""
    wResultado: list[LookupInconsistencia] = []
    wChave = d.chave or ""

    def prcAdicionar(propriedade: str, mensagem: str) -> None:
        wResultado.append(LookupInconsistencia(chave=wChave, propriedade=propriedade, mensagem=mensagem))

    # V7
    if not d.coluna_retorno or not d.coluna_retorno.strip():
        prcAdicionar("ColunaRetorno", "ColunaRetorno é obrigatória")
    if not d.coluna_descricao or not d.coluna_descricao.strip():
        prcAdicionar("ColunaDescricao", "ColunaDescricao é obrigatória")
    if not d.colunas_base_pesquisa:
        prcAdicionar("ColunasBasePesquisa", "ColunasBasePesquisa não pode ser vazia")
    if not d.colunas_grid:
        prcAdicionar("ColunasGrid", "ColunasGrid não pode ser vazia")

    # V2
    if d.tipo_consulta == LookupTipoConsulta.POR_ORDEM_ALFABETICA and len(d.colunas_base_pesquisa or []) > 1:
        prcAdicionar("ColunasBasePesquisa", "POR_ORDEM_ALFABETICA aceita só 1 coluna em ColunasBasePesquisa")

    # V3
    if d.qtde_linhas < 1 or d.qtde_linhas > QTDE_LINHAS_MAXIMA:
        prcAdicionar("QtdeLinhas", f"QtdeLinhas deve estar entre 1 e {QTDE_LINHAS_MAXIMA}")

    # V4 / V5 / V6
    if d.base == LookupBase.TABELA:
        if not d.nome_tabela or not d.nome_tabela.strip():
            prcAdicionar("NomeTabela", "Base = TABELA exige NomeTabela")
        elif not _IDENTIFICADOR.fullmatch(d.nome_tabela):
            prcAdicionar("NomeTabela", "NomeTabela contém caracteres inválidos")  # V8
    else:
        _fncValidarSelect(d, prcAdicionar)

    # Filtro: condição fixa que complementa o WHERE (só com Base = TABELA)
    if d.filtro and d.filtro.strip():
        if d.base == LookupBase.SELECT:
            prcAdicionar(
                "Filtro",
                "Filtro só pode ser usado com Base = TABELA; com Base = SELECT, escreva a condição no próprio SELECT",
            )
        else:
            _fncValidarFiltro(d.filtro, prcAdicionar)

    # V8
    def prcIdentificador(propriedade: str, valor: str | None) -> None:
        if valor and valor.strip() and not _IDENTIFICADOR.fullmatch(valor):
            prcAdicionar(propriedade, f"'{valor}' não é um identificador válido")

    prcIdentificador("ColunaRetorno", d.coluna_retorno)
    prcIdentificador("ColunaDescricao", d.coluna_descricao)
    for wColuna in d.colunas_base_pesquisa or []:
        prcIdentificador("ColunasBasePesquisa", wColuna)
    for wColuna in d.colunas_grid or []:
        prcIdentificador("ColunasGrid", wColuna.coluna)
    prcIdentificador("ColunaCnpj", d.coluna_cnpj)
    prcIdentificador("ColunaCpf", d.coluna_cpf)
    prcIdentificador("ColunaDtNascto", d.coluna_dt_nascto)
    for wColuna in d.colunas_adicionais or []:
        prcIdentificador("ColunasAdicionais", wColuna)
    for wOrdem in d.colunas_order_by or []:
        if not _ORDER_BY.fullmatch(wOrdem.strip()):
            prcAdicionar("ColunasOrderBy", f"'{wOrdem}' deve ser '<coluna> [ASC|DESC]'")

    # V9 (colunas base alfanuméricas) não é verificada: decisão 8.4 do Nexus.
    return wResultado
