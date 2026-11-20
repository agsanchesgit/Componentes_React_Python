import sqlite3
from datetime import date, datetime
from decimal import Decimal

import pytest

from componentes_py.banco.dialetos import DIALETOS, DialetoSqlite
from componentes_py.banco.normalizacao import fncEhErroDeBanco, fncNormalizarValor
from componentes_py.lookup.definicao import LookupBanco


@pytest.mark.parametrize(
    ("entrada", "esperado"),
    [
        (Decimal(10), 10),
        (Decimal("10.50"), 10.5),
        (Decimal(0), 0),
        (7, 7),
        (1.5, 1.5),
        ("ABC", "ABC"),
        (None, None),
        (True, True),
        (datetime(2026, 5, 10, 14, 5, 9, 123456), "2026-05-10T14:05:09"),
        (date(2026, 5, 10), "2026-05-10T00:00:00"),
        (b"abc", "abc"),
    ],
)
def test_normalizar_valor(entrada, esperado):
    wSaida = fncNormalizarValor(entrada)
    assert wSaida == esperado
    assert type(wSaida) is type(esperado)


def test_decimal_inteiro_vira_int_para_o_json_sair_numerico():
    assert isinstance(fncNormalizarValor(Decimal(12345678901234567890)), int)


def test_deteccao_de_erro_do_banco_pela_hierarquia_db_api():
    assert fncEhErroDeBanco(sqlite3.OperationalError("x")) is True
    assert fncEhErroDeBanco(sqlite3.Error("x")) is True
    assert fncEhErroDeBanco(RuntimeError("x")) is False
    assert fncEhErroDeBanco(ValueError("x")) is False

    class Error(Exception):  # como a classe base dos drivers (oracledb.Error, psycopg.Error...)
        pass

    class DatabaseError(Error):
        pass

    assert fncEhErroDeBanco(DatabaseError("ORA-00942")) is True


def test_todo_banco_do_contrato_tem_dialeto():
    for wBanco in LookupBanco:
        assert wBanco in DIALETOS


def test_placeholders_e_limites_por_dialeto():
    wOracle, wSqlServer, wPostgres = (
        DIALETOS[b] for b in (LookupBanco.ORACLE, LookupBanco.SQL_SERVER, LookupBanco.POSTGRESQL)
    )
    assert wOracle.fncPlaceholder("p0") == ":p0"
    assert wSqlServer.fncPlaceholder("p0") == "?"
    assert wPostgres.fncPlaceholder("p0") == "%(p0)s"
    assert wOracle.fncLimiteFim(5) == " FETCH FIRST 5 ROWS ONLY"
    assert wSqlServer.fncLimiteInicio(5) == "TOP 5 "
    assert wPostgres.fncLimiteFim(5) == " LIMIT 5"
    assert wSqlServer.posicional and not wOracle.posicional and not wPostgres.posicional


def test_postgres_protege_percentual_e_os_outros_nao_mexem():
    assert DIALETOS[LookupBanco.POSTGRESQL].fncProtegerSql("a LIKE 'x%'") == "a LIKE 'x%%'"
    assert DIALETOS[LookupBanco.ORACLE].fncProtegerSql("a LIKE 'x%'") == "a LIKE 'x%'"
    assert DIALETOS[LookupBanco.SQL_SERVER].fncProtegerSql("a LIKE 'x%'") == "a LIKE 'x%'"


def test_sqlite_converte_datas_para_texto():
    wDialeto = DialetoSqlite()
    assert wDialeto.fncConverterParametro(datetime(2026, 5, 10)) == "2026-05-10 00:00:00"
    assert wDialeto.fncConverterParametro(date(2026, 5, 10)) == "2026-05-10"
    assert wDialeto.fncConverterParametro("x") == "x"
