"""Porte de LookupValidadorTests.cs (Nexus), mais os casos próprios do PostgreSQL."""

import pytest
from definicoes import fncDefinicaoValida, fncGrid

from componentes_py.lookup.definicao import LookupBase, LookupTipoConsulta
from componentes_py.lookup.validador import fncValidar


def fncPropriedades(d):
    return sorted({i.propriedade for i in fncValidar(d)})


def test_definicao_valida_nao_tem_inconsistencias():
    assert fncValidar(fncDefinicaoValida()) == []


@pytest.mark.parametrize(
    "filtro",
    [
        " and tp_sexo = 'M' ",
        "TP_SEXO IN ('M', 'F') AND (NR_X > 3 OR NR_Y < 2)",
        "NM_PESSOA LIKE 'A;B%'",  # ';' dentro de literal é permitido
        "DS_X <> 'it''s'",
        "DT_UPDATE > 3",  # palavra reservada dentro de um nome
    ],
)
def test_filtro_valido_e_aceito(filtro):
    assert fncValidar(fncDefinicaoValida(filtro=filtro)) == []


@pytest.mark.parametrize(
    "filtro",
    [
        "a = 1; DROP TABLE X",
        "a = 1 -- comentario",
        "a = 1 /* x */",
        "a = 1) OR (1 = 1",  # fecha o parêntese do montador
        "(a = 1",
        "a = 'x",
        "a = q'[x]'",
        "a = :p0",
        "a IN (SELECT 1 FROM T@LINK)",
        "a = DBMS_RANDOM.VALUE",
        "a = 1 FOR UPDATE",
        "a IN (SELECT x INTO y FROM T)",
        "   and   ",
        # PostgreSQL
        "a = E'x\\'; DROP TABLE T; --'",
        "a = $$x$$",
        "a = $tag$x$tag$",
        "a = PG_SLEEP(10)",
        "a = LO_IMPORT('/etc/passwd')",
        "a IN (SELECT * FROM DBLINK('x', 'y') AS t(a int))",
        "a = 1 OR COPY",
    ],
)
def test_filtro_perigoso_ou_malformado_e_recusado(filtro):
    assert "Filtro" in fncPropriedades(fncDefinicaoValida(filtro=filtro))


def test_filtro_nao_pode_ser_usado_com_base_select():
    wDefinicao = fncDefinicaoValida(
        base=LookupBase.SELECT,
        nome_tabela=None,
        select="SELECT CD_PRESTADOR, NM_PRESTADOR FROM DBAPS.PRESTADOR",
        filtro="tp = 'A'",
    )
    assert "Filtro" in fncPropriedades(wDefinicao)


def test_v2_ordem_alfabetica_aceita_so_uma_coluna():
    wDefinicao = fncDefinicaoValida(
        tipo_consulta=LookupTipoConsulta.POR_ORDEM_ALFABETICA,
        colunas_base_pesquisa=["NM_PRESTADOR", "NM_FANTASIA"],
    )
    assert "ColunasBasePesquisa" in fncPropriedades(wDefinicao)


@pytest.mark.parametrize("qtde", [0, 301])
def test_v3_qtde_linhas_fora_da_faixa(qtde):
    assert "QtdeLinhas" in fncPropriedades(fncDefinicaoValida(qtde_linhas=qtde))


def test_v3_limites_validos_passam():
    assert fncValidar(fncDefinicaoValida(qtde_linhas=1)) == []
    assert fncValidar(fncDefinicaoValida(qtde_linhas=300)) == []


def test_v4_tabela_exige_nome():
    assert "NomeTabela" in fncPropriedades(fncDefinicaoValida(nome_tabela=None))


def test_v5_select_exige_texto():
    assert "Select" in fncPropriedades(fncDefinicaoValida(base=LookupBase.SELECT, select=" "))


def test_v5_select_com_estrela():
    for wSelect in ("SELECT * FROM PRESTADOR", "SELECT P.* FROM PRESTADOR P"):
        wDefinicao = fncDefinicaoValida(base=LookupBase.SELECT, select=wSelect)
        assert "Select" in fncPropriedades(wDefinicao)


def test_v5_order_by_final_com_colunas_order_by():
    wDefinicao = fncDefinicaoValida(
        base=LookupBase.SELECT,
        select="SELECT CD_PRESTADOR, NM_PRESTADOR FROM PRESTADOR ORDER BY NM_PRESTADOR",
    )
    assert "ColunasOrderBy" in fncPropriedades(wDefinicao)


def test_v5_order_by_final_sem_colunas_order_by_passa():
    wDefinicao = fncDefinicaoValida(
        base=LookupBase.SELECT,
        colunas_order_by=[],
        select="SELECT CD_PRESTADOR, NM_PRESTADOR FROM PRESTADOR ORDER BY NM_PRESTADOR",
    )
    assert fncValidar(wDefinicao) == []


def test_v5_order_by_em_subselect_nao_conta():
    wDefinicao = fncDefinicaoValida(
        base=LookupBase.SELECT,
        select="SELECT CD_PRESTADOR, NM_PRESTADOR FROM (SELECT * FROM PRESTADOR ORDER BY 1) T",
    )
    assert fncValidar(wDefinicao) == []


def test_v6_coluna_inexistente_no_select():
    wDefinicao = fncDefinicaoValida(
        base=LookupBase.SELECT,
        select="SELECT CD_PRESTADOR, NM_PRESTADOR FROM PRESTADOR",
        colunas_grid=fncGrid(("CD_PRESTADOR", "Código"), ("NR_CPF_CGC", "CPF")),
    )
    assert any(i.propriedade == "ColunasGrid" and "NR_CPF_CGC" in i.mensagem for i in fncValidar(wDefinicao))


def test_v6_reconhece_alias_e_qualificacao_sem_diferenciar_maiusculas():
    wDefinicao = fncDefinicaoValida(
        base=LookupBase.SELECT,
        select="select p.cd_prestador, NVL(p.nm_razao, p.nm_fantasia) as nm_prestador FROM prestador p",
    )
    assert fncValidar(wDefinicao) == []


def test_v7_campos_obrigatorios_e_listas_vazias():
    wProps = fncPropriedades(
        fncDefinicaoValida(coluna_retorno="", coluna_descricao="", colunas_base_pesquisa=[], colunas_grid=[])
    )
    for wEsperada in ("ColunaRetorno", "ColunaDescricao", "ColunasBasePesquisa", "ColunasGrid"):
        assert wEsperada in wProps


@pytest.mark.parametrize("tabela", ["PRESTADOR; DROP TABLE X", "A B", "A.B.C"])
def test_v8_tabela_com_identificador_invalido(tabela):
    assert "NomeTabela" in fncPropriedades(fncDefinicaoValida(nome_tabela=tabela))


def test_v8_coluna_e_order_by_invalidos():
    wProps = fncPropriedades(
        fncDefinicaoValida(coluna_retorno="CD) OR (1=1", colunas_order_by=["NM_PRESTADOR; DROP", "DT_VENCTO DESCX"])
    )
    assert "ColunaRetorno" in wProps
    assert "ColunasOrderBy" in wProps


def test_v8_order_by_com_direcao_passa():
    assert fncValidar(fncDefinicaoValida(colunas_order_by=["DT_VENCTO DESC", "nm_prestador asc"])) == []


def test_devolve_lista_completa():
    wErros = fncValidar(fncDefinicaoValida(qtde_linhas=0, nome_tabela=None, colunas_grid=[]))
    assert len(wErros) >= 3


def test_prestador_do_exemplo_passa_na_validacao():
    wDefinicao = fncDefinicaoValida(
        base=LookupBase.SELECT,
        nome_tabela=None,
        select="""
            SELECT CD_PRESTADOR, NM_PRESTADOR, NM_FANTASIA, TP_PRESTADOR, NR_CPF_CGC,
                   CASE TP_SITUACAO WHEN 'A' THEN 'Ativo' ELSE TP_SITUACAO END DS_SITUACAO
            FROM DBAPS.PRESTADOR
            """,
        coluna_descricao="NM_FANTASIA",
        colunas_base_pesquisa=["NM_PRESTADOR", "NM_FANTASIA"],
        colunas_grid=fncGrid(("CD_PRESTADOR", "Código"), ("NM_FANTASIA", "Nome"), ("DS_SITUACAO", "Situação")),
        colunas_adicionais=["TP_PRESTADOR"],
        coluna_cpf="NR_CPF_CGC",
        coluna_cnpj="NR_CPF_CGC",
        colunas_order_by=["NM_PRESTADOR"],
    )
    assert fncValidar(wDefinicao) == []


# ---- segurança do SELECT vindo do front


def fncComSelect(select: str):
    return fncValidar(fncDefinicaoValida(base=LookupBase.SELECT, nome_tabela=None, select=select, colunas_order_by=[]))


def test_select_simples_e_aceito():
    assert fncComSelect("SELECT CD_PRESTADOR, NM_PRESTADOR FROM DBAPS.PRESTADOR WHERE TP_SITUACAO = 'A';") == []


@pytest.mark.parametrize(
    "select",
    [
        "DELETE FROM PRESTADOR",
        "SELECT CD_PRESTADOR, NM_PRESTADOR FROM PRESTADOR; DROP TABLE PRESTADOR",
        "SELECT CD_PRESTADOR, NM_PRESTADOR FROM PRESTADOR -- x",
        "SELECT CD_PRESTADOR, NM_PRESTADOR FROM PRESTADOR /* x */",
        "SELECT CD_PRESTADOR, NM_PRESTADOR FROM PRESTADOR@DBLINK",
        "SELECT CD_PRESTADOR, NM_PRESTADOR INTO X FROM PRESTADOR",
        "SELECT CD_PRESTADOR, NM_PRESTADOR FROM PRESTADOR FOR UPDATE",
        "SELECT CD_PRESTADOR, DBMS_LOCK.SLEEP(10) NM_PRESTADOR FROM PRESTADOR",
        "SELECT CD_PRESTADOR, NM_PRESTADOR FROM SYS.USER$",
        # PostgreSQL
        "SELECT CD_PRESTADOR, PG_SLEEP(10) NM_PRESTADOR FROM PRESTADOR",
        "SELECT CD_PRESTADOR, PG_READ_FILE('/etc/passwd') NM_PRESTADOR FROM PRESTADOR",
        "SELECT CD_PRESTADOR, $$x$$ NM_PRESTADOR FROM PRESTADOR",
        "SELECT CD_PRESTADOR, E'a\\'b' NM_PRESTADOR FROM PRESTADOR",
        "COPY PRESTADOR TO PROGRAM 'x'",
    ],
)
def test_select_perigoso_e_recusado(select):
    assert any(i.propriedade == "Select" for i in fncComSelect(select))


def test_palavras_dentro_de_literal_ou_de_nome_nao_sao_confundidas():
    wSelect = "SELECT CD_PRESTADOR, NM_PRESTADOR, DT_UPDATE FROM PRESTADOR WHERE NM_PRESTADOR <> 'DELETE ME @ -- x'"
    assert fncComSelect(wSelect) == []


def test_cast_do_postgresql_e_aceito_no_select():
    assert fncComSelect("SELECT CD_PRESTADOR::int AS CD_PRESTADOR, NM_PRESTADOR FROM PRESTADOR") == []
