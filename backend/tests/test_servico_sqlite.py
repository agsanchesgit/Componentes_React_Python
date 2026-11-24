"""Serviço de ponta a ponta contra um SQLite em memória (único banco que dá para rodar sem servidor)."""

import sqlite3
from datetime import date

import pytest
from definicoes import fncGrid

from componentes_py.erros import ErroAcessoNegado, ErroNegocio
from componentes_py.lookup.configuracao import ConfiguracaoLookup
from componentes_py.lookup.definicao import (
    LookupBanco,
    LookupBase,
    LookupDefinicao,
    LookupTipoConsulta,
    LookupTipoValor,
)
from componentes_py.lookup.dtos import LookupCodigoRequest, LookupPesquisaRequest
from componentes_py.lookup.servico import ServicoLookup, fncValidar

PESSOAS = [
    (1, "Ana Souza", "1980-05-10 00:00:00", "00000000191", "00000000000191", "A", 10.5),
    (2, "Ana Maria Lima", "1991-01-02 00:00:00", "12345678909", None, "A", 20),
    (3, "Bruno Lima", "1980-05-10 08:30:00", "52998224725", None, "I", 30),
    (4, "Carla 100% Dias", "2000-12-31 00:00:00", None, "11222333000181", "A", 40),
    (5, "Davi_Rocha", "1975-03-03 00:00:00", None, None, "A", 50),
]


@pytest.fixture
def servico(tmp_path):
    wArquivo = str(tmp_path / "teste.db")
    wBanco = sqlite3.connect(wArquivo)
    wBanco.execute(
        "CREATE TABLE pessoa (cd_pessoa INTEGER, nm_pessoa TEXT, dt_nascimento TEXT, nr_cpf TEXT, nr_cnpj TEXT, "
        "tp_situacao TEXT, vl_renda REAL)"
    )
    wBanco.executemany("INSERT INTO pessoa VALUES (?,?,?,?,?,?,?)", PESSOAS)
    wBanco.commit()
    wBanco.close()
    return ServicoLookup(
        ConfiguracaoLookup(obter_conexao=lambda banco: sqlite3.connect(wArquivo), permitir_anonimo=True)
    )


def fncDefinicao(**ajuste) -> LookupDefinicao:
    wBase = LookupDefinicao(
        chave="pessoa",
        banco=LookupBanco.SQLITE,
        base=LookupBase.TABELA,
        nome_tabela="pessoa",
        coluna_retorno="CD_PESSOA",
        tipo_coluna_retorno=LookupTipoValor.NUMERO,
        coluna_descricao="NM_PESSOA",
        colunas_base_pesquisa=["NM_PESSOA"],
        tipo_consulta=LookupTipoConsulta.POR_LIKE,
        colunas_grid=fncGrid(("CD_PESSOA", "Código"), ("NM_PESSOA", "Nome")),
        colunas_order_by=["nm_pessoa"],
        coluna_cpf="NR_CPF",
        coluna_cnpj="NR_CNPJ",
        coluna_dt_nascto="DT_NASCIMENTO",
        qtde_linhas=3,
    )
    return wBase.model_copy(update=ajuste)


def test_pesquisa_por_texto_com_varias_palavras(servico):
    wResposta = servico.pesquisar(LookupPesquisaRequest(definicao=fncDefinicao(), texto="ana lima"))
    assert [linha["NM_PESSOA"] for linha in wResposta.linhas] == ["Ana Maria Lima"]
    assert wResposta.limite_atingido is False


def test_nomes_das_colunas_voltam_como_configurados(servico):
    wResposta = servico.pesquisar(LookupPesquisaRequest(definicao=fncDefinicao(), texto="Ana"))
    assert set(wResposta.linhas[0]) == {"CD_PESSOA", "NM_PESSOA"}  # o SQLite devolve em minúsculas


def test_limite_atingido_corta_em_qtde_linhas(servico):
    wResposta = servico.pesquisar(LookupPesquisaRequest(definicao=fncDefinicao(qtde_linhas=1), texto="ana"))
    assert len(wResposta.linhas) == 1
    assert wResposta.limite_atingido is True


def test_limite_exato_nao_atinge(servico):
    wResposta = servico.pesquisar(LookupPesquisaRequest(definicao=fncDefinicao(qtde_linhas=3), texto="ana"))
    assert len(wResposta.linhas) == 2
    assert wResposta.limite_atingido is False


def test_curingas_digitados_valem_literalmente(servico):
    wPercentual = servico.pesquisar(LookupPesquisaRequest(definicao=fncDefinicao(), texto="100%"))
    assert [linha["CD_PESSOA"] for linha in wPercentual.linhas] == [4]
    wSublinhado = servico.pesquisar(LookupPesquisaRequest(definicao=fncDefinicao(), texto="davi_r"))
    assert [linha["CD_PESSOA"] for linha in wSublinhado.linhas] == [5]
    # "_" sem escape casaria "Davi Rocha"/qualquer letra: aqui só casa o sublinhado de verdade
    wNenhum = servico.pesquisar(LookupPesquisaRequest(definicao=fncDefinicao(), texto="davixr"))
    assert wNenhum.linhas == []


def test_texto_malicioso_nao_executa(servico):
    wResposta = servico.pesquisar(LookupPesquisaRequest(definicao=fncDefinicao(), texto="x'; DROP TABLE pessoa; --"))
    assert wResposta.linhas == []
    assert len(servico.pesquisar(LookupPesquisaRequest(definicao=fncDefinicao(), texto="Ana")).linhas) == 2


def test_pesquisa_por_cpf_completa_zeros_e_aceita_gravado_sem_zeros(servico):
    wCom = servico.pesquisar(LookupPesquisaRequest(definicao=fncDefinicao(), cpf="000.000.001-91"))
    assert [linha["CD_PESSOA"] for linha in wCom.linhas] == [1]
    wDigitado = servico.pesquisar(LookupPesquisaRequest(definicao=fncDefinicao(), cpf="191"))
    assert [linha["CD_PESSOA"] for linha in wDigitado.linhas] == [1]


def test_pesquisa_por_cnpj_e_por_data_de_nascimento(servico):
    wCnpj = servico.pesquisar(LookupPesquisaRequest(definicao=fncDefinicao(), cnpj="11.222.333/0001-81"))
    assert [linha["CD_PESSOA"] for linha in wCnpj.linhas] == [4]
    # a faixa [dia, dia+1) pega o registro com hora (id 3) e o sem hora (id 1)
    wData = servico.pesquisar(LookupPesquisaRequest(definicao=fncDefinicao(), dt_nascto="1980-05-10"))
    assert sorted(linha["CD_PESSOA"] for linha in wData.linhas) == [1, 3]


def test_criterios_combinam_com_and(servico):
    wResposta = servico.pesquisar(LookupPesquisaRequest(definicao=fncDefinicao(), texto="ana", dt_nascto="1980-05-10"))
    assert [linha["CD_PESSOA"] for linha in wResposta.linhas] == [1]


def test_filtro_fixo_vale_na_pesquisa_e_no_codigo(servico):
    wDefinicao = fncDefinicao(filtro=" and tp_situacao = 'A' ")
    wPesquisa = servico.pesquisar(LookupPesquisaRequest(definicao=wDefinicao, texto="lima"))
    assert [linha["CD_PESSOA"] for linha in wPesquisa.linhas] == [2]  # Bruno Lima (I) fica de fora
    wCodigo = servico.buscar_por_codigo(LookupCodigoRequest(definicao=wDefinicao, valor="3"))
    assert wCodigo.situacao == "NAO_ENCONTRADO"


def test_ordem_alfabetica_traz_a_partir_do_texto(servico):
    wDefinicao = fncDefinicao(
        tipo_consulta=LookupTipoConsulta.POR_ORDEM_ALFABETICA, colunas_order_by=[], qtde_linhas=10
    )
    wResposta = servico.pesquisar(LookupPesquisaRequest(definicao=wDefinicao, texto="bru"))
    assert [linha["NM_PESSOA"] for linha in wResposta.linhas] == ["Bruno Lima", "Carla 100% Dias", "Davi_Rocha"]


def test_base_select_com_alias_e_coluna_calculada(servico):
    wDefinicao = fncDefinicao(
        base=LookupBase.SELECT,
        nome_tabela=None,
        select=(
            "SELECT cd_pessoa, nm_pessoa, "
            "CASE tp_situacao WHEN 'A' THEN 'Ativo' ELSE 'Inativo' END ds_situacao FROM pessoa"
        ),
        colunas_grid=fncGrid(("CD_PESSOA", "Código"), ("NM_PESSOA", "Nome"), ("DS_SITUACAO", "Situação")),
        colunas_order_by=["nm_pessoa"],
        coluna_cpf=None,
        coluna_cnpj=None,
        coluna_dt_nascto=None,
    )
    wResposta = servico.pesquisar(LookupPesquisaRequest(definicao=wDefinicao, texto="bruno"))
    assert wResposta.linhas == [{"CD_PESSOA": 3, "NM_PESSOA": "Bruno Lima", "DS_SITUACAO": "Inativo"}]


def test_codigo_encontrado_nao_encontrado_e_invalido(servico):
    wEncontrado = servico.buscar_por_codigo(LookupCodigoRequest(definicao=fncDefinicao(), valor="1"))
    assert wEncontrado.situacao == "ENCONTRADO"
    assert wEncontrado.codigo == 1
    assert wEncontrado.descricao == "Ana Souza"
    assert wEncontrado.linha == {"CD_PESSOA": 1, "NM_PESSOA": "Ana Souza"}

    assert (
        servico.buscar_por_codigo(LookupCodigoRequest(definicao=fncDefinicao(), valor="999")).situacao
        == "NAO_ENCONTRADO"
    )
    assert (
        servico.buscar_por_codigo(LookupCodigoRequest(definicao=fncDefinicao(), valor="abc")).situacao
        == "NAO_ENCONTRADO"
    )
    assert (
        servico.buscar_por_codigo(LookupCodigoRequest(definicao=fncDefinicao(), valor="")).situacao == "NAO_ENCONTRADO"
    )


def test_codigo_mais_de_um(servico):
    wDefinicao = fncDefinicao(coluna_retorno="TP_SITUACAO", tipo_coluna_retorno=LookupTipoValor.TEXTO)
    assert servico.buscar_por_codigo(LookupCodigoRequest(definicao=wDefinicao, valor="A")).situacao == "MAIS_DE_UM"


def test_codigo_de_data_usa_a_faixa_do_dia(servico):
    wDefinicao = fncDefinicao(coluna_retorno="DT_NASCIMENTO", tipo_coluna_retorno=LookupTipoValor.DATA)
    assert (
        servico.buscar_por_codigo(LookupCodigoRequest(definicao=wDefinicao, valor="03/03/1975")).situacao
        == "ENCONTRADO"
    )
    # 10/05/1980 existe duas vezes (com e sem hora)
    assert (
        servico.buscar_por_codigo(LookupCodigoRequest(definicao=wDefinicao, valor="1980-05-10")).situacao
        == "MAIS_DE_UM"
    )


def test_definicao_invalida_lista_tudo_de_uma_vez(servico):
    wRuim = fncDefinicao(nome_tabela="pessoa; DROP", qtde_linhas=0)
    with pytest.raises(ErroNegocio, match="Configuração do Lookup inválida") as erro:
        servico.pesquisar(LookupPesquisaRequest(definicao=wRuim, texto="ana"))
    assert "NomeTabela" in str(erro.value)
    assert "QtdeLinhas" in str(erro.value)


def test_erro_do_banco_vira_erro_de_negocio_com_a_mensagem_completa(servico):
    wDefinicao = fncDefinicao(
        coluna_descricao="NM_INEXISTENTE", colunas_grid=fncGrid(("CD_PESSOA", "C"), ("NM_INEXISTENTE", "N"))
    )
    with pytest.raises(ErroNegocio, match="NM_INEXISTENTE"):
        servico.pesquisar(LookupPesquisaRequest(definicao=wDefinicao, texto="ana"))


def test_erro_que_nao_e_do_banco_nao_e_engolido():
    def fncQuebra(banco):
        raise RuntimeError("falha de pool")

    wServico = ServicoLookup(ConfiguracaoLookup(obter_conexao=fncQuebra, permitir_anonimo=True))
    with pytest.raises(RuntimeError, match="falha de pool"):
        wServico.pesquisar(LookupPesquisaRequest(definicao=fncDefinicao(), texto="ana"))


def test_conexao_e_fechada_mesmo_com_erro(tmp_path):
    wFechadas = []

    class Conexao(sqlite3.Connection):
        def close(self):
            wFechadas.append(True)
            super().close()

    wServico = ServicoLookup(
        ConfiguracaoLookup(
            obter_conexao=lambda banco: sqlite3.connect(str(tmp_path / "x.db"), factory=Conexao), permitir_anonimo=True
        )
    )
    with pytest.raises(ErroNegocio):  # a tabela não existe
        wServico.pesquisar(LookupPesquisaRequest(definicao=fncDefinicao(), texto="ana"))
    assert wFechadas == [True]


def test_tabelas_permitidas_restringe(servico):
    wConfig = ConfiguracaoLookup(
        obter_conexao=servico._config.obter_conexao, permitir_anonimo=True, tabelas_permitidas={"PESSOA"}
    )
    wRestrito = ServicoLookup(wConfig)
    assert wRestrito.pesquisar(
        LookupPesquisaRequest(definicao=fncDefinicao(), texto="ana")
    ).linhas  # sem diferenciar maiúscula

    with pytest.raises(ErroAcessoNegado, match="não permitida"):
        wRestrito.pesquisar(LookupPesquisaRequest(definicao=fncDefinicao(nome_tabela="outra"), texto="ana"))

    wSelect = fncDefinicao(
        base=LookupBase.SELECT,
        nome_tabela=None,
        select="SELECT cd_pessoa, nm_pessoa FROM pessoa",
        colunas_order_by=[],
        coluna_cpf=None,
        coluna_cnpj=None,
        coluna_dt_nascto=None,
    )
    with pytest.raises(ErroAcessoNegado, match="Base SELECT"):
        wRestrito.pesquisar(LookupPesquisaRequest(definicao=wSelect, texto="ana"))


def test_gancho_autorizar_recebe_definicao_e_usuario(servico):
    wRecebidos = []

    def fncAutorizar(definicao, usuario):
        wRecebidos.append((definicao.chave, usuario))
        return usuario == "admin"

    wServico = ServicoLookup(
        ConfiguracaoLookup(obter_conexao=servico._config.obter_conexao, permitir_anonimo=True, autorizar=fncAutorizar)
    )
    assert wServico.pesquisar(LookupPesquisaRequest(definicao=fncDefinicao(), texto="ana"), "admin").linhas
    with pytest.raises(ErroAcessoNegado, match="Acesso negado"):
        wServico.pesquisar(LookupPesquisaRequest(definicao=fncDefinicao(), texto="ana"), "visitante")
    assert wRecebidos == [("pessoa", "admin"), ("pessoa", "visitante")]


def test_tipos_erro_banco_personalizados(servico):
    class MeuErro(Exception):
        pass

    def fncQuebra(banco):
        raise MeuErro("ORA-00942: tabela ou view não existe")

    wServico = ServicoLookup(
        ConfiguracaoLookup(obter_conexao=fncQuebra, permitir_anonimo=True, tipos_erro_banco=(MeuErro,))
    )
    with pytest.raises(ErroNegocio, match="ORA-00942"):
        wServico.pesquisar(LookupPesquisaRequest(definicao=fncDefinicao(), texto="ana"))


def test_validar_devolve_inconsistencias_sem_executar():
    wOk = fncValidar(fncDefinicao())
    assert wOk.ok is True
    assert wOk.inconsistencias == []
    wRuim = fncValidar(fncDefinicao(nome_tabela=None))
    assert wRuim.ok is False
    assert wRuim.inconsistencias[0].propriedade == "NomeTabela"
    assert wRuim.inconsistencias[0].chave == "pessoa"
    with pytest.raises(ErroNegocio):
        fncValidar(None)


def test_data_do_banco_sai_em_iso(servico):
    wDefinicao = fncDefinicao(
        colunas_adicionais=["DT_NASCIMENTO", "VL_RENDA"],
        colunas_grid=fncGrid(("CD_PESSOA", "C"), ("NM_PESSOA", "N")),
    )
    wLinha = servico.pesquisar(LookupPesquisaRequest(definicao=wDefinicao, texto="souza")).linhas[0]
    assert wLinha["DT_NASCIMENTO"] == "1980-05-10 00:00:00"  # SQLite guarda texto; os drivers reais devolvem datetime
    assert wLinha["VL_RENDA"] == 10.5

    assert date(1980, 5, 10).isoformat() in wLinha["DT_NASCIMENTO"]


def test_obter_conexao_do_usuario_recebe_usuario_e_definicao(servico):
    wRecebidos = []
    wAntiga = servico._config.obter_conexao

    def fncConexaoUsuario(banco, usuario, definicao):
        wRecebidos.append((banco, usuario, definicao.chave))
        return wAntiga(banco)

    wServico = ServicoLookup(ConfiguracaoLookup(obter_conexao_do_usuario=fncConexaoUsuario, permitir_anonimo=True))
    assert wServico.pesquisar(LookupPesquisaRequest(definicao=fncDefinicao(), texto="ana"), "admin").linhas
    assert wServico.buscar_por_codigo(LookupCodigoRequest(definicao=fncDefinicao(), valor="1"), "outro").situacao == (
        "ENCONTRADO"
    )
    assert [(u, c) for _, u, c in wRecebidos] == [("admin", "pessoa"), ("outro", "pessoa")]


def test_obter_conexao_do_usuario_tem_precedencia_sobre_obter_conexao(servico):
    wChamadas = []

    def fncAntiga(banco):
        wChamadas.append("antiga")
        return servico._config.obter_conexao(banco)

    def fncNova(banco, usuario, definicao):
        wChamadas.append("nova")
        return servico._config.obter_conexao(banco)

    wServico = ServicoLookup(
        ConfiguracaoLookup(obter_conexao=fncAntiga, obter_conexao_do_usuario=fncNova, permitir_anonimo=True)
    )
    wServico.pesquisar(LookupPesquisaRequest(definicao=fncDefinicao(), texto="ana"))
    assert wChamadas == ["nova"]


def test_configuracao_exige_alguma_funcao_de_conexao():
    with pytest.raises(ValueError, match="obter_conexao"):
        ConfiguracaoLookup(permitir_anonimo=True)
