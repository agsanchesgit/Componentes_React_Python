"""Porte de LookupCriteriosTests.cs (Nexus) + conversão do código."""

from datetime import datetime
from decimal import Decimal

import pytest
from definicoes import fncDefinicaoValida

from componentes_py.erros import ErroNegocio
from componentes_py.lookup.definicao import LookupTipoValor
from componentes_py.lookup.dtos import LookupPesquisaRequest
from componentes_py.lookup.servico import fncConverterCodigo, fncNormalizar


def fncDefinicao():
    return fncDefinicaoValida(coluna_cpf="NR_CPF_CGC", coluna_cnpj="NR_CPF_CGC", coluna_dt_nascto="DT_NASCIMENTO")


def fncRequisicao(**campos) -> LookupPesquisaRequest:
    return LookupPesquisaRequest(definicao=fncDefinicao(), **campos)


@pytest.mark.parametrize(
    ("entrada", "esperado"),
    [
        ("374287813", "00374287813"),  # sem o zero à esquerda
        ("003.742.878-13", "00374287813"),  # com máscara
        ("00374287813", "00374287813"),
    ],
)
def test_cpf_vira_string_de_11_digitos(entrada, esperado):
    assert fncNormalizar(fncRequisicao(cpf=entrada)).cpf == esperado


@pytest.mark.parametrize(
    ("entrada", "esperado"),
    [
        ("2849393000145", "02849393000145"),
        ("02.849.393/0001-45", "02849393000145"),
        ("12.ABC.345/01DE-35", "12ABC34501DE35"),  # CNPJ alfanumérico
        ("12abc34501de35", "12ABC34501DE35"),  # letras em minúsculas
    ],
)
def test_cnpj_vira_string_de_14_digitos(entrada, esperado):
    assert fncNormalizar(fncRequisicao(cnpj=entrada)).cnpj == esperado


def test_cpf_com_mais_de_11_digitos_e_recusado():
    with pytest.raises(ErroNegocio, match="no máximo 11"):
        fncNormalizar(fncRequisicao(cpf="123456789012"))


def test_cpf_sem_digitos_e_recusado():
    with pytest.raises(ErroNegocio, match="CPF inválido"):
        fncNormalizar(fncRequisicao(cpf="abc"))


def test_filtro_extra_dispensa_o_minimo_de_caracteres_do_texto():
    assert fncNormalizar(fncRequisicao(texto="ab", cpf="374287813")).texto == "ab"


def test_so_texto_curto_e_recusado():
    with pytest.raises(ErroNegocio, match="ao menos 3 caracteres"):
        fncNormalizar(fncRequisicao(texto="ab"))


def test_requisicao_vazia_e_recusada():
    with pytest.raises(ErroNegocio, match="ao menos um critério"):
        fncNormalizar(fncRequisicao())
    with pytest.raises(ErroNegocio, match="ao menos um critério"):
        fncNormalizar(fncRequisicao(texto="   "))


def test_pesquisa_ao_abrir_liberada_aceita_vazio_e_texto_curto():
    assert fncNormalizar(fncRequisicao(), sem_minimo=True).sem_criterio_liberado
    assert fncNormalizar(fncRequisicao(texto="ab"), sem_minimo=True).texto == "ab"


def test_filtro_que_a_definicao_nao_tem_e_recusado():
    wSemCpf = LookupPesquisaRequest(definicao=fncDefinicaoValida(), cpf="374287813")
    with pytest.raises(ErroNegocio, match="não possui filtro de CPF"):
        fncNormalizar(wSemCpf)
    with pytest.raises(ErroNegocio, match="não possui filtro de CNPJ"):
        fncNormalizar(LookupPesquisaRequest(definicao=fncDefinicaoValida(), cnpj="1"))
    with pytest.raises(ErroNegocio, match="data de nascimento"):
        fncNormalizar(LookupPesquisaRequest(definicao=fncDefinicaoValida(), dt_nascto="2000-01-01"))


def test_data_de_nascimento_valida_e_invalida():
    assert fncNormalizar(fncRequisicao(dt_nascto="1980-05-10")).dt_nascto == datetime(1980, 5, 10)
    for wRuim in ("10/05/1980", "1980-13-01", "1980-02-30", "abc"):
        with pytest.raises(ErroNegocio, match="yyyy-MM-dd"):
            fncNormalizar(fncRequisicao(dt_nascto=wRuim))


@pytest.mark.parametrize(
    ("tipo", "valor", "esperado"),
    [
        (LookupTipoValor.NUMERO, "123", Decimal(123)),
        (LookupTipoValor.NUMERO, " 12.5 ", Decimal("12.5")),
        (LookupTipoValor.NUMERO, "-7", Decimal(-7)),
        (LookupTipoValor.NUMERO, "1,5", None),
        (LookupTipoValor.NUMERO, "12a", None),
        (LookupTipoValor.NUMERO, "", None),
        (LookupTipoValor.NUMERO, None, None),
        (LookupTipoValor.TEXTO, " A1 ", "A1"),
        (LookupTipoValor.DATA, "2026-05-10", datetime(2026, 5, 10)),
        (LookupTipoValor.DATA, "10/05/2026", datetime(2026, 5, 10)),
        (LookupTipoValor.DATA, "31/02/2026", None),
        (LookupTipoValor.DATA, "10-05-2026", None),
    ],
)
def test_converter_codigo(tipo, valor, esperado):
    assert fncConverterCodigo(tipo, valor) == esperado
