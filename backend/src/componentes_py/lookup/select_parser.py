"""Análise superficial de um SELECT vindo do front: lista de colunas, `*` e ORDER BY final."""

import re
from dataclasses import dataclass, field

_ALIAS = re.compile(r'^.*?\s+"?(?P<alias>[A-Za-z_][A-Za-z0-9_$#]*)"?$', re.DOTALL)
_IDENTIFICADOR = re.compile(r"^(?:[A-Za-z_][A-Za-z0-9_$#]*\.)*(?P<nome>[A-Za-z_][A-Za-z0-9_$#]*)$")
_DISTINCT = re.compile(r"^(DISTINCT|UNIQUE|ALL)\s+", re.IGNORECASE)


@dataclass(frozen=True)
class ResultadoSelect:
    tem_from: bool
    colunas: list[str] = field(default_factory=list)
    tem_estrela: bool = False
    tem_order_by_final: bool = False


def fncMascarar(texto: str) -> str:
    """Troca por espaços o conteúdo dos literais (e as próprias aspas), para não confundir a varredura."""
    wSaida: list[str] = []
    wDentro = False
    for wCaractere in texto:
        if wCaractere == "'":
            wDentro = not wDentro
            wSaida.append(" ")
        else:
            wSaida.append(" " if wDentro else wCaractere)
    return "".join(wSaida)


def _fncPalavrasNoTopo(sql: str) -> list[tuple[str, int]]:
    wResultado: list[tuple[str, int]] = []
    wNivel = 0
    wIndice = 0
    while wIndice < len(sql):
        wCaractere = sql[wIndice]
        if wCaractere == "(":
            wNivel += 1
        elif wCaractere == ")":
            wNivel -= 1
        elif wNivel == 0 and wCaractere.isalpha():
            wAnterior = sql[wIndice - 1] if wIndice > 0 else ""
            if not (wIndice > 0 and (wAnterior.isalnum() or wAnterior in "_$#.")):
                wFim = wIndice
                while wFim < len(sql) and (sql[wFim].isalnum() or sql[wFim] in "_$#"):
                    wFim += 1
                wResultado.append((sql[wIndice:wFim].upper(), wIndice))
                wIndice = wFim - 1
        wIndice += 1
    # "ORDER BY": só conta o ORDER seguido de BY.
    return [
        wItem
        for wK, wItem in enumerate(wResultado)
        if wItem[0] != "ORDER" or (wK + 1 < len(wResultado) and wResultado[wK + 1][0] == "BY")
    ]


def _fncDividirNoTopo(lista: str) -> list[str]:
    wItens: list[str] = []
    wNivel = 0
    wDentro = False
    wAtual: list[str] = []
    for wCaractere in lista:
        if wCaractere == "'":
            wDentro = not wDentro
        if not wDentro:
            if wCaractere == "(":
                wNivel += 1
            elif wCaractere == ")":
                wNivel -= 1
            elif wCaractere == "," and wNivel == 0:
                wItens.append("".join(wAtual))
                wAtual = []
                continue
        wAtual.append(wCaractere)
    if wAtual:
        wItens.append("".join(wAtual))
    return wItens


def fncAnalisar(select: str) -> ResultadoSelect:
    wSql = fncMascarar(select)
    wTopo = _fncPalavrasNoTopo(wSql)

    wSel = next((p for p in wTopo if p[0] == "SELECT"), None)
    wFrom = next((p for p in wTopo if wSel and p[0] == "FROM" and p[1] > wSel[1]), None)
    wTemOrderBy = any(p[0] == "ORDER" for p in wTopo)

    if wSel is None or wFrom is None:
        return ResultadoSelect(False, [], False, wTemOrderBy)

    wLista = select[wSel[1] + len("SELECT") : wFrom[1]].strip()
    wLista = _DISTINCT.sub("", wLista)

    wColunas: list[str] = []
    wEstrela = False
    for wItem in _fncDividirNoTopo(wLista):
        wTexto = wItem.strip()
        if wTexto == "*" or wTexto.endswith(".*"):
            wEstrela = True
            continue

        wAlias = _ALIAS.match(wTexto)
        if wAlias and not wTexto.endswith(")"):
            wColunas.append(wAlias.group("alias"))
            continue
        wId = _IDENTIFICADOR.match(wTexto)
        if wId:
            wColunas.append(wId.group("nome"))
    return ResultadoSelect(True, wColunas, wEstrela, wTemOrderBy)
