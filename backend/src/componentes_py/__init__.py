"""Backend dos componentes reutilizáveis. API pública: importe somente daqui."""

from .erros import ErroAcessoNegado, ErroNegocio
from .lookup.configuracao import ConfiguracaoLookup
from .lookup.definicao import (
    LookupBanco,
    LookupBase,
    LookupColunaGrid,
    LookupDefinicao,
    LookupOperador,
    LookupTipoConsulta,
    LookupTipoValor,
)
from .lookup.rotas import criar_roteador_lookup
from .lookup.servico import ServicoLookup

__version__ = "0.0.1"

__all__ = [
    "ConfiguracaoLookup",
    "ErroAcessoNegado",
    "ErroNegocio",
    "LookupBanco",
    "LookupBase",
    "LookupColunaGrid",
    "LookupDefinicao",
    "LookupOperador",
    "LookupTipoConsulta",
    "LookupTipoValor",
    "ServicoLookup",
    "__version__",
    "criar_roteador_lookup",
]
