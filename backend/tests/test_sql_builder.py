"""Porte de LookupSqlBuilderTests.cs (Nexus), mais PostgreSQL e SQLite."""

from datetime import datetime
from decimal import Decimal

import pytest
from definicoes import fncDefinicaoValida, fncGrid

from componentes_py.banco.dialetos import DIALETOS
from componentes_py.lookup.definicao import LookupBanco, LookupBase, LookupTipoConsulta
from componentes_py.lookup.sql_builder import (
    LookupCriterios,
    fncCodigo,
    fncColunasDoSelect,
    fncPesquisa,
)


def fncTexto(texto: str) -> LookupCriterios:
    return LookupCriterios(texto=texto)


def test_oracle_like_com_duas_palavras_e_duas_colunas():
    wDefinicao = fncDefinicaoValida(colunas_base_pesquisa=["NM_PRESTADOR", "NM_FANTASIA"], qtde_linhas=50)
    wConsulta = fncPesquisa(wDefinicao, fncTexto("alex silva"))

    assert wConsulta.sql == (
        "SELECT CD_PRESTADOR, NM_PRESTADOR FROM DBAPS.PRESTADOR WHERE "
        "((UPPER(NM_PRESTADOR) LIKE UPPER(:p0) ESCAPE '\\' AND UPPER(NM_PRESTADOR) LIKE UPPER(:p1) ESCAPE '\\') "
        "OR (UPPER(NM_FANTASIA) LIKE UPPER(:p0) ESCAPE '\\' AND UPPER(NM_FANTASIA) LIKE UPPER(:p1) ESCAPE '\\')) "
        "ORDER BY NM_PRESTADOR FETCH FIRST 51 ROWS ONLY"
    )
    assert wConsulta.parametros["p0"] == "%alex%"
    assert wConsulta.parametros["p1"] == "%silva%"


@pytest.mark.parametrize("filtro", [" and tp_sexo = 'M' ", "tp_sexo = 'M'", "  AND   tp_sexo = 'M';"])
def test_filtro_entra_como_and_entre_parenteses_na_pesquisa(filtro):
    wConsulta = fncPesquisa(fncDefinicaoValida(filtro=filtro), fncTexto("alex"))
    assert " AND (tp_sexo = 'M') ORDER BY" in wConsulta.sql


def test_filtro_tambem_vale_na_busca_por_codigo():
    wConsulta = fncCodigo(fncDefinicaoValida(filtro=" and tp_sexo = 'M' "), Decimal(123))
    assert "WHERE CD_PRESTADOR = :pCodigo AND (tp_sexo = 'M')" in wConsulta.sql


def test_filtro_com_or_nao_vaza_para_os_outros_criterios():
    wConsulta = fncPesquisa(fncDefinicaoValida(filtro="a = 1 or b = 2"), fncTexto("alex"))
    assert " AND (a = 1 or b = 2) " in wConsulta.sql


def test_sem_filtro_o_sql_nao_muda():
    assert "AND (" not in fncPesquisa(fncDefinicaoValida(), fncTexto("alex")).sql


def test_filtro_nao_vale_com_base_select():
    wDefinicao = fncDefinicaoValida(
        base=LookupBase.SELECT, nome_tabela=None, select="SELECT CD_PRESTADOR, NM_PRESTADOR FROM T", filtro="a = 1"
    )
    assert "a = 1" not in fncPesquisa(wDefinicao, fncTexto("alex")).sql


def test_sql_server_usa_top_e_interrogacao_posicional():
    wDefinicao = fncDefinicaoValida(banco=LookupBanco.SQL_SERVER, qtde_linhas=10)
    wConsulta = fncPesquisa(wDefinicao, fncTexto("alex"))

    assert wConsulta.sql.startswith("SELECT TOP 11 CD_PRESTADOR, NM_PRESTADOR FROM")
    assert "LIKE UPPER(?)" in wConsulta.sql
    assert "FETCH FIRST" not in wConsulta.sql
    assert ":p0" not in wConsulta.sql
    assert wConsulta.ordem == ["p0"]


def test_sql_server_repete_o_valor_a_cada_uso_do_parametro():
    wDefinicao = fncDefinicaoValida(banco=LookupBanco.SQL_SERVER, colunas_base_pesquisa=["NM_PRESTADOR", "NM_FANTASIA"])
    wConsulta = fncPesquisa(wDefinicao, fncTexto("alex silva"))
    assert wConsulta.sql.count("?") == 4
    assert wConsulta.ordem == ["p0", "p1", "p0", "p1"]
    wValores = wConsulta.fncParametrosParaDriver(DIALETOS[LookupBanco.SQL_SERVER])
    assert wValores == ["%alex%", "%silva%", "%alex%", "%silva%"]


def test_postgresql_usa_limit_e_parametros_nomeados():
    wDefinicao = fncDefinicaoValida(banco=LookupBanco.POSTGRESQL, qtde_linhas=10)
    wConsulta = fncPesquisa(wDefinicao, fncTexto("alex"))

    assert "LIKE UPPER(%(p0)s) ESCAPE '\\'" in wConsulta.sql
    assert wConsulta.sql.endswith("ORDER BY NM_PRESTADOR LIMIT 11")
    assert "TOP" not in wConsulta.sql
    assert "FETCH FIRST" not in wConsulta.sql
    assert wConsulta.fncParametrosParaDriver(DIALETOS[LookupBanco.POSTGRESQL]) == {"p0": "%alex%"}


def test_postgresql_dobra_o_percentual_do_filtro_e_do_select():
    wFiltro = fncPesquisa(fncDefinicaoValida(banco=LookupBanco.POSTGRESQL, filtro="nm LIKE 'A%'"), fncTexto("alex"))
    assert "(nm LIKE 'A%%')" in wFiltro.sql

    wSelect = fncDefinicaoValida(
        banco=LookupBanco.POSTGRESQL,
        base=LookupBase.SELECT,
        nome_tabela=None,
        select="SELECT CD_PRESTADOR, NM_PRESTADOR FROM T WHERE NM_PRESTADOR LIKE 'A%'",
        colunas_order_by=[],
    )
    assert "LIKE 'A%%') B" in fncPesquisa(wSelect, fncTexto("alex")).sql


def test_curingas_do_usuario_sao_escapados():
    wConsulta = fncPesquisa(fncDefinicaoValida(), fncTexto("100%_a\\b"))
    assert wConsulta.parametros["p0"] == "%100\\%\\_a\\\\b%"

    wSqlServer = fncPesquisa(fncDefinicaoValida(banco=LookupBanco.SQL_SERVER), fncTexto("a[b"))
    assert wSqlServer.parametros["p0"] == "%a\\[b%"

    wOracle = fncPesquisa(fncDefinicaoValida(), fncTexto("a[b"))
    assert wOracle.parametros["p0"] == "%a[b%"  # "\[" seria escape ilegal no Oracle

    wPostgres = fncPesquisa(fncDefinicaoValida(banco=LookupBanco.POSTGRESQL), fncTexto("a[b"))
    assert wPostgres.parametros["p0"] == "%a[b%"


def test_texto_do_usuario_nunca_vai_para_o_sql():
    for wBanco in LookupBanco:
        wConsulta = fncPesquisa(fncDefinicaoValida(banco=wBanco), fncTexto("x'; DROP TABLE T; --"))
        assert "DROP" not in wConsulta.sql


def test_ordem_alfabetica_usa_maior_ou_igual_e_ordena_pela_coluna():
    wDefinicao = fncDefinicaoValida(tipo_consulta=LookupTipoConsulta.POR_ORDEM_ALFABETICA, colunas_order_by=[])
    wConsulta = fncPesquisa(wDefinicao, fncTexto("mar"))

    assert "UPPER(NM_PRESTADOR) >= UPPER(:p0)" in wConsulta.sql
    assert "ORDER BY NM_PRESTADOR FETCH FIRST 101 ROWS ONLY" in wConsulta.sql
    assert wConsulta.parametros["p0"] == "mar"


def test_filtros_extras_combinam_com_and_e_nao_exigem_texto():
    wDefinicao = fncDefinicaoValida(coluna_cnpj="NR_CNPJ", coluna_cpf="NR_CPF", coluna_dt_nascto="DT_NASCTO")
    wConsulta = fncPesquisa(
        wDefinicao,
        LookupCriterios(dt_nascto=datetime(1980, 5, 10, 13, 0, 0), cpf="34567891200", cnpj="02849393000115"),
    )

    assert "NR_CPF = :pCpf" in wConsulta.sql
    assert "NR_CNPJ = :pCnpj" in wConsulta.sql
    assert "(DT_NASCTO >= :pDt AND DT_NASCTO < :pDtMais1)" in wConsulta.sql
    assert "LIKE" not in wConsulta.sql
    assert wConsulta.parametros["pDt"] == datetime(1980, 5, 10)
    assert wConsulta.parametros["pDtMais1"] == datetime(1980, 5, 11)
    assert wConsulta.parametros["pCpf"] == "34567891200"


def test_cpf_completo_aceita_tambem_o_valor_gravado_sem_zeros_a_esquerda():
    wDefinicao = fncDefinicaoValida(coluna_cpf="NR_CPF_CGC", coluna_cnpj="NR_CPF_CGC")
    wConsulta = fncPesquisa(wDefinicao, LookupCriterios(cpf="01234567890"))

    assert "(NR_CPF_CGC = :pCpf OR NR_CPF_CGC = :pCpfSz)" in wConsulta.sql
    assert wConsulta.parametros["pCpf"] == "01234567890"
    assert wConsulta.parametros["pCpfSz"] == "1234567890"


def test_documento_sem_zeros_a_esquerda_ou_so_zeros_nao_duplica():
    wDefinicao = fncDefinicaoValida(coluna_cpf="NR_CPF")
    assert " OR " not in fncPesquisa(wDefinicao, LookupCriterios(cpf="12345678901")).sql
    assert " OR " not in fncPesquisa(wDefinicao, LookupCriterios(cpf="00000000000")).sql


def test_colunas_adicionais_entram_no_select_sem_repeticao():
    wColunas = fncColunasDoSelect(fncDefinicaoValida(colunas_adicionais=["TP_PRESTADOR", "nm_prestador"]))
    assert wColunas == ["CD_PRESTADOR", "NM_PRESTADOR", "TP_PRESTADOR"]


def test_base_select_vira_subconsulta_com_alias_e_sem_ponto_e_virgula():
    wDefinicao = fncDefinicaoValida(
        base=LookupBase.SELECT, nome_tabela=None, select="SELECT CD_PRESTADOR, NM_PRESTADOR FROM PRESTADOR;  "
    )
    wConsulta = fncPesquisa(wDefinicao, fncTexto("alex"))
    assert "FROM (SELECT CD_PRESTADOR, NM_PRESTADOR FROM PRESTADOR) B WHERE" in wConsulta.sql


def test_codigo_limita_a_duas_linhas_e_usa_parametro():
    wConsulta = fncCodigo(fncDefinicaoValida(), Decimal(123))
    assert wConsulta.sql == (
        "SELECT CD_PRESTADOR, NM_PRESTADOR FROM DBAPS.PRESTADOR WHERE CD_PRESTADOR = :pCodigo FETCH FIRST 2 ROWS ONLY"
    )
    assert wConsulta.parametros["pCodigo"] == Decimal(123)

    wSqlServer = fncCodigo(fncDefinicaoValida(banco=LookupBanco.SQL_SERVER), "A1")
    assert wSqlServer.sql.startswith("SELECT TOP 2 ")
    assert "= ?" in wSqlServer.sql

    wPostgres = fncCodigo(fncDefinicaoValida(banco=LookupBanco.POSTGRESQL), "A1")
    assert wPostgres.sql.endswith("WHERE CD_PRESTADOR = %(pCodigo)s LIMIT 2")


def test_codigo_de_data_usa_faixa_de_um_dia():
    wConsulta = fncCodigo(fncDefinicaoValida(coluna_retorno="DT_X"), datetime(2026, 5, 10, 14, 0))
    assert "(DT_X >= :pCodigo AND DT_X < :pCodigoMais1)" in wConsulta.sql
    assert wConsulta.parametros["pCodigo"] == datetime(2026, 5, 10)
    assert wConsulta.parametros["pCodigoMais1"] == datetime(2026, 5, 11)


def test_colunas_do_select_sem_repeticao():
    wColunas = fncColunasDoSelect(
        fncDefinicaoValida(
            colunas_grid=fncGrid(("cd_prestador", "Código"), ("NM_PRESTADOR", "Nome"), ("NR_CPF_CGC", "CPF"))
        )
    )
    assert wColunas == ["CD_PRESTADOR", "NM_PRESTADOR", "NR_CPF_CGC"]


def test_pesquisa_sem_criterio_lanca():
    with pytest.raises(ValueError):
        fncPesquisa(fncDefinicaoValida(), LookupCriterios())
