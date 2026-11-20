"""Dialetos de banco: o que muda entre Oracle, SQL Server, PostgreSQL (e SQLite, só para testes/exemplo).

O `sql_builder` não conhece nenhum banco: ele pede ao dialeto o placeholder do parâmetro, o limite de linhas,
o escape do LIKE e a proteção de trechos de SQL vindos do front. Para suportar outro banco, crie uma subclasse
de `Dialeto` e registre-a em `DIALETOS`.
"""

from abc import ABC, abstractmethod
from datetime import date, datetime
from decimal import Decimal
from typing import Any

from ..lookup.definicao import LookupBanco


class Dialeto(ABC):
    """Contrato de um banco para o montador de SQL."""

    # True: o driver usa parâmetros posicionais (`?`) e recebe uma lista, na ordem em que aparecem no SQL.
    posicional: bool = False

    @abstractmethod
    def fncPlaceholder(self, nome: str) -> str:
        """Texto do parâmetro no SQL (`:p0`, `?`, `%(p0)s`)."""

    def fncLimiteInicio(self, limite: int) -> str:
        """Texto logo depois do SELECT (ex.: `TOP 10 `). Vazio na maioria dos bancos."""
        return ""

    def fncLimiteFim(self, limite: int) -> str:
        """Texto no fim da consulta (ex.: ` FETCH FIRST 10 ROWS ONLY`)."""
        return ""

    def fncEscaparLike(self, texto: str) -> str:
        """Escapa os curingas do LIKE, para o texto do usuário valer literalmente (ESCAPE '\\')."""
        return texto.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")

    def fncProtegerSql(self, sql: str) -> str:
        """Protege trechos de SQL vindos do front (filtro, select) antes de entrarem na consulta."""
        return sql

    def fncConverterParametro(self, valor: Any) -> Any:
        """Ajusta o valor do parâmetro ao driver (ex.: datas)."""
        return valor


class DialetoOracle(Dialeto):
    """Oracle 12c+ (python-oracledb): parâmetros nomeados `:nome`, FETCH FIRST."""

    def fncPlaceholder(self, nome: str) -> str:
        return f":{nome}"

    def fncLimiteFim(self, limite: int) -> str:
        return f" FETCH FIRST {limite} ROWS ONLY"


class DialetoSqlServer(Dialeto):
    """SQL Server (pyodbc): parâmetros posicionais `?`, TOP."""

    posicional = True

    def fncPlaceholder(self, nome: str) -> str:
        return "?"

    def fncLimiteInicio(self, limite: int) -> str:
        return f"TOP {limite} "

    def fncEscaparLike(self, texto: str) -> str:
        # '[' é curinga no SQL Server; no Oracle e no PostgreSQL, "\[" seria escape ilegal ou inútil.
        return super().fncEscaparLike(texto).replace("[", "\\[")


class DialetoPostgresql(Dialeto):
    """PostgreSQL (psycopg 3): parâmetros nomeados `%(nome)s`, LIMIT."""

    def fncPlaceholder(self, nome: str) -> str:
        return f"%({nome})s"

    def fncLimiteFim(self, limite: int) -> str:
        return f" LIMIT {limite}"

    def fncProtegerSql(self, sql: str) -> str:
        # No psycopg o '%' do SQL é reservado para parâmetros: um '%' literal (ex.: LIKE 'A%') precisa ser '%%'.
        return sql.replace("%", "%%")


class DialetoSqlite(Dialeto):
    """SQLite (sqlite3): só para testes e para o backend de exemplo. Parâmetros `?`, LIMIT."""

    posicional = True

    def fncPlaceholder(self, nome: str) -> str:
        return "?"

    def fncLimiteFim(self, limite: int) -> str:
        return f" LIMIT {limite}"

    def fncConverterParametro(self, valor: Any) -> Any:
        # O adaptador padrão de datetime do sqlite3 está obsoleto (Python 3.12+): usa texto ISO.
        if isinstance(valor, datetime):
            return valor.isoformat(sep=" ")
        if isinstance(valor, date):
            return valor.isoformat()
        # O sqlite3 não aceita Decimal (o código numérico chega como Decimal; os outros drivers aceitam).
        if isinstance(valor, Decimal):
            return int(valor) if valor == valor.to_integral_value() else float(valor)
        return valor


DIALETOS: dict[LookupBanco, Dialeto] = {
    LookupBanco.ORACLE: DialetoOracle(),
    LookupBanco.SQL_SERVER: DialetoSqlServer(),
    LookupBanco.POSTGRESQL: DialetoPostgresql(),
    LookupBanco.SQLITE: DialetoSqlite(),
}


def fncObterDialeto(banco: LookupBanco) -> Dialeto:
    return DIALETOS[banco]
