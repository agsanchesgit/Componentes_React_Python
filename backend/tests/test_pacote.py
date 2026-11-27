import componentes_py
from componentes_py import ErroNegocio


def test_pacote_importa_e_tem_versao():
    assert componentes_py.__version__ == "0.0.2"


def test_erro_negocio_guarda_a_mensagem():
    wErro = ErroNegocio("falhou")
    assert wErro.mensagem == "falhou"
    assert str(wErro) == "falhou"
