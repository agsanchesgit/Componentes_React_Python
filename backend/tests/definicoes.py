"""Definições de apoio aos testes (equivalem ao `LookupValidadorTests.Valida` do Nexus)."""

from typing import Any

from componentes_py.lookup.definicao import (
    LookupBanco,
    LookupBase,
    LookupColunaGrid,
    LookupDefinicao,
    LookupTipoConsulta,
    LookupTipoValor,
)


def fncDefinicaoValida(**ajuste: Any) -> LookupDefinicao:
    """Definição válida (Oracle, tabela, por LIKE); `ajuste` troca campos (sem revalidar, como o `with` do C#)."""
    wBase = LookupDefinicao(
        banco=LookupBanco.ORACLE,
        base=LookupBase.TABELA,
        nome_tabela="DBAPS.PRESTADOR",
        coluna_retorno="CD_PRESTADOR",
        tipo_coluna_retorno=LookupTipoValor.NUMERO,
        coluna_descricao="NM_PRESTADOR",
        colunas_base_pesquisa=["NM_PRESTADOR"],
        tipo_consulta=LookupTipoConsulta.POR_LIKE,
        colunas_grid=[
            LookupColunaGrid(coluna="CD_PRESTADOR", cabecalho="Código"),
            LookupColunaGrid(coluna="NM_PRESTADOR", cabecalho="Nome"),
        ],
        colunas_order_by=["NM_PRESTADOR"],
    )
    return wBase.model_copy(update=ajuste)


def fncGrid(*pares: tuple[str, str]) -> list[LookupColunaGrid]:
    return [LookupColunaGrid(coluna=c, cabecalho=h) for c, h in pares]
