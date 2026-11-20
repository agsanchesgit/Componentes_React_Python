"""Erros da biblioteca."""


class ErroNegocio(Exception):
    """Erro de negócio: vira HTTP 400 com corpo {"error": mensagem} (equivale à CustomException do Nexus)."""

    def __init__(self, mensagem: str) -> None:
        super().__init__(mensagem)
        self.mensagem = mensagem


class ErroAcessoNegado(ErroNegocio):
    """Consulta recusada pela configuração do consumidor (tabelas permitidas ou gancho `autorizar`): HTTP 403."""
