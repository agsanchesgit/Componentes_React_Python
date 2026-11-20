"""Contrato HTTP: sobe a API de exemplo (FastAPI + SQLite) e chama as 3 rotas com o JSON que o front envia
(camelCase, enums em MAIÚSCULAS). Garante que front e back conversam."""

import logging
import sqlite3
import sys
from pathlib import Path

import pytest
from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from componentes_py import ConfiguracaoLookup, criar_roteador_lookup
from exemplos.api_exemplo import fncCriarApp, fncObterConexao

DEFINICAO = {
    "chave": "pessoa",
    "banco": "SQLITE",
    "base": "TABELA",
    "nomeTabela": "pessoa",
    "colunaRetorno": "cd_pessoa",
    "tipoColunaRetorno": "NUMERO",
    "colunaDescricao": "nm_pessoa",
    "colunasBasePesquisa": ["nm_pessoa"],
    "tipoConsulta": "POR_LIKE",
    "colunasGrid": [{"coluna": "cd_pessoa", "cabecalho": "Código"}, {"coluna": "nm_pessoa", "cabecalho": "Nome"}],
    "colunasOrderBy": ["nm_pessoa"],
    "colunaCpf": "nr_cpf",
    "colunaCnpj": "nr_cnpj",
    "colunaDtNascto": "dt_nascimento",
    "qtdeLinhas": 5,
}


@pytest.fixture(scope="module")
def cliente():
    return TestClient(fncCriarApp())


def test_pesquisa_devolve_linhas_e_limite_atingido(cliente):
    wResposta = cliente.post("/api/Lookup/pesquisa", json={"definicao": DEFINICAO, "texto": "ana"})
    assert wResposta.status_code == 200
    wCorpo = wResposta.json()
    assert set(wCorpo) == {"linhas", "limiteAtingido"}
    assert wCorpo["linhas"] == [{"cd_pessoa": 1, "nm_pessoa": "Ana Souza"}]
    assert wCorpo["limiteAtingido"] is False


def test_pesquisa_corta_no_limite(cliente):
    wDefinicao = {**DEFINICAO, "qtdeLinhas": 2}
    wCorpo = cliente.post("/api/Lookup/pesquisa", json={"definicao": wDefinicao, "texto": "a r"}).json()
    assert len(wCorpo["linhas"]) == 2
    assert wCorpo["limiteAtingido"] is True


def test_pesquisa_por_cpf_e_data(cliente):
    wCpf = cliente.post("/api/Lookup/pesquisa", json={"definicao": DEFINICAO, "cpf": "100.007.919-89"}).json()
    assert [linha["cd_pessoa"] for linha in wCpf["linhas"]] == [1]

    wData = cliente.post("/api/Lookup/pesquisa", json={"definicao": DEFINICAO, "dtNascto": "1963-02-11"}).json()
    assert [linha["cd_pessoa"] for linha in wData["linhas"]] == [1]


def test_codigo_sempre_200_com_as_tres_situacoes(cliente):
    wEncontrado = cliente.post("/api/Lookup/codigo", json={"definicao": DEFINICAO, "valor": "2"})
    assert wEncontrado.status_code == 200
    assert wEncontrado.json() == {
        "situacao": "ENCONTRADO",
        "codigo": 2,
        "descricao": "Bruno Lima",
        "linha": {"cd_pessoa": 2, "nm_pessoa": "Bruno Lima"},
    }

    wNaoAchou = cliente.post("/api/Lookup/codigo", json={"definicao": DEFINICAO, "valor": "9999"})
    assert wNaoAchou.status_code == 200
    # os campos nulos continuam no JSON (como no Nexus)
    assert wNaoAchou.json() == {"situacao": "NAO_ENCONTRADO", "codigo": None, "descricao": None, "linha": None}

    wDefinicao = {**DEFINICAO, "colunaRetorno": "tp_situacao", "tipoColunaRetorno": "TEXTO"}
    wMais = cliente.post("/api/Lookup/codigo", json={"definicao": wDefinicao, "valor": "A"})
    assert wMais.status_code == 200
    assert wMais.json()["situacao"] == "MAIS_DE_UM"


def test_validacao_devolve_inconsistencias(cliente):
    wOk = cliente.post("/api/Lookup/validacao", json=DEFINICAO)
    assert wOk.status_code == 200
    assert wOk.json() == {"ok": True, "inconsistencias": []}

    wRuim = cliente.post("/api/Lookup/validacao", json={**DEFINICAO, "nomeTabela": None, "qtdeLinhas": 0}).json()
    assert wRuim["ok"] is False
    assert {"chave": "pessoa", "propriedade": "NomeTabela", "mensagem": "Base = TABELA exige NomeTabela"} in wRuim[
        "inconsistencias"
    ]
    assert {i["propriedade"] for i in wRuim["inconsistencias"]} == {"NomeTabela", "QtdeLinhas"}


def test_erro_de_negocio_vira_400_com_error(cliente):
    wResposta = cliente.post("/api/Lookup/pesquisa", json={"definicao": DEFINICAO, "texto": "ab"})
    assert wResposta.status_code == 400
    assert wResposta.json() == {"error": "Informe ao menos 3 caracteres para pesquisar"}


def test_definicao_invalida_vira_400(cliente):
    wResposta = cliente.post(
        "/api/Lookup/pesquisa", json={"definicao": {**DEFINICAO, "nomeTabela": "x; drop"}, "texto": "ana"}
    )
    assert wResposta.status_code == 400
    assert "Configuração do Lookup inválida" in wResposta.json()["error"]


def test_erro_do_banco_vai_inteiro_como_400(cliente):
    wDefinicao = {**DEFINICAO, "nomeTabela": "tabela_que_nao_existe"}
    wResposta = cliente.post("/api/Lookup/pesquisa", json={"definicao": wDefinicao, "texto": "ana"})
    assert wResposta.status_code == 400
    assert "tabela_que_nao_existe" in wResposta.json()["error"]


def test_json_malformado_vira_400_no_formato_do_nexus(cliente):
    wSemBanco = {k: v for k, v in DEFINICAO.items() if k != "banco"}
    wResposta = cliente.post("/api/Lookup/pesquisa", json={"definicao": wSemBanco, "texto": "ana"})
    assert wResposta.status_code == 400
    assert wResposta.json()["error"].startswith("Requisição inválida:")
    assert "banco" in wResposta.json()["error"]

    wEnumRuim = cliente.post(
        "/api/Lookup/pesquisa", json={"definicao": {**DEFINICAO, "banco": "MYSQL"}, "texto": "ana"}
    )
    assert wEnumRuim.status_code == 400


def test_erro_inesperado_vira_500_com_error_id_e_log(caplog):
    def fncQuebra(banco):
        raise RuntimeError("falha de pool com detalhe interno")

    wApp = FastAPI()
    wApp.include_router(
        criar_roteador_lookup(ConfiguracaoLookup(obter_conexao=fncQuebra, permitir_anonimo=True)), prefix="/api/Lookup"
    )
    with caplog.at_level(logging.ERROR, logger="componentes_py.lookup"):
        wResposta = TestClient(wApp).post("/api/Lookup/pesquisa", json={"definicao": DEFINICAO, "texto": "ana"})
    assert wResposta.status_code == 500
    wCorpo = wResposta.json()
    assert set(wCorpo) == {"error", "errorId"}
    assert "detalhe interno" not in wCorpo["error"]  # o detalhe vai só para o log
    assert f"ERRO [{wCorpo['errorId']}]" in caplog.text
    assert "falha de pool com detalhe interno" in caplog.text


def test_autenticacao_e_obrigatoria_ou_anonimo_explicito():
    with pytest.raises(ValueError, match="dependencia_autenticacao"):
        criar_roteador_lookup(ConfiguracaoLookup(obter_conexao=fncObterConexao))


def test_dependencia_de_autenticacao_protege_e_entrega_o_usuario_ao_gancho():
    wUsuarios = []

    def fncAutenticar(authorization: str | None = Header(default=None)):
        if authorization != "Bearer ok":
            raise HTTPException(status_code=401, detail="não autenticado")
        return "maria"

    def fncAutorizar(definicao, usuario):
        wUsuarios.append(usuario)
        return definicao.nome_tabela == "pessoa"

    fncCriarApp()  # popula o SQLite de exemplo
    wApp = FastAPI()
    wApp.include_router(
        criar_roteador_lookup(
            ConfiguracaoLookup(
                obter_conexao=fncObterConexao, dependencia_autenticacao=fncAutenticar, autorizar=fncAutorizar
            )
        ),
        prefix="/api/Lookup",
        dependencies=[Depends(lambda: None)],
    )
    wCliente = TestClient(wApp)
    wCorpo = {"definicao": DEFINICAO, "texto": "ana"}

    assert wCliente.post("/api/Lookup/pesquisa", json=wCorpo).status_code == 401
    assert (
        wCliente.post("/api/Lookup/pesquisa", json=wCorpo, headers={"Authorization": "Bearer ruim"}).status_code == 401
    )

    wOk = wCliente.post("/api/Lookup/pesquisa", json=wCorpo, headers={"Authorization": "Bearer ok"})
    assert wOk.status_code == 200
    assert wUsuarios == ["maria"]

    wNegado = wCliente.post(
        "/api/Lookup/pesquisa",
        json={"definicao": {**DEFINICAO, "nomeTabela": "outra"}, "texto": "ana"},
        headers={"Authorization": "Bearer ok"},
    )
    assert wNegado.status_code == 403
    assert wNegado.json() == {"error": "Acesso negado a esta consulta"}


def test_sqlite_do_exemplo_responde_a_conexao_direta():
    fncCriarApp()
    wConexao = fncObterConexao("SQLITE")
    assert isinstance(wConexao, sqlite3.Connection)
    assert wConexao.execute("select count(*) from pessoa").fetchone()[0] == 12
    wConexao.close()
