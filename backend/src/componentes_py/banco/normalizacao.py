"""Normaliza o que o driver devolve para valores seguros no JSON."""

from datetime import date, datetime
from decimal import Decimal
from typing import Any

# Data vazia do contrato (DateTime.MinValue do .NET).
DATA_VAZIA_ISO = "0001-01-01T00:00:00"


def fncNormalizarValor(valor: Any) -> Any:
    """Decimal vira int (se inteiro) ou float; datas viram `yyyy-MM-ddTHH:mm:ss`; o resto segue como veio.

    O Oracle devolve NUMBER como int ou Decimal: sem isto, o JSON sairia como texto.
    """
    if isinstance(valor, bool) or valor is None:
        return valor
    if isinstance(valor, Decimal):
        return int(valor) if valor == valor.to_integral_value() else float(valor)
    if isinstance(valor, datetime):
        return valor.isoformat(timespec="seconds")
    if isinstance(valor, date):
        return f"{valor.isoformat()}T00:00:00"
    if isinstance(valor, bytes | bytearray | memoryview):
        return bytes(valor).decode("utf-8", errors="replace")
    return valor


def fncEhErroDeBanco(erro: BaseException) -> bool:
    """True se o erro é do driver de banco (a classe base `Error` da DB-API: oracledb, pyodbc, psycopg, sqlite3...).

    Não importa nenhum driver: procura, na hierarquia da exceção, uma classe chamada `Error` definida fora do builtins.
    """
    return any(c.__name__ == "Error" and c.__module__ != "builtins" for c in type(erro).__mro__)
