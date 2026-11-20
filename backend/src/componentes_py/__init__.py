"""Backend dos componentes reutilizáveis. API pública: importe somente daqui."""

from .erros import ErroNegocio

__version__ = "0.0.1"

__all__ = ["ErroNegocio", "__version__"]
