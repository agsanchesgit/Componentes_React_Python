"""Erros da biblioteca."""


class ErroNegocio(Exception):
    """Erro de negócio: vira HTTP 400 com corpo {"error": mensagem} (equivale à CustomException do Nexus)."""

    def __init__(self, mensagem: str) -> None:
        super().__init__(mensagem)
        self.mensagem = mensagem
