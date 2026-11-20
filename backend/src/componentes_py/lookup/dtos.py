"""Requests e responses do Lookup (JSON em camelCase, idêntico ao do Nexus)."""

from typing import Any

from .definicao import LookupDefinicao, ModeloCamelCase


class LookupPesquisaRequest(ModeloCamelCase):
    """Pelo menos um dos campos de critério precisa vir preenchido."""

    definicao: LookupDefinicao
    texto: str | None = None
    dt_nascto: str | None = None  # yyyy-MM-dd
    cpf: str | None = None
    cnpj: str | None = None


class LookupCodigoRequest(ModeloCamelCase):
    definicao: LookupDefinicao
    valor: str | None = None


class LookupPesquisaResponse(ModeloCamelCase):
    linhas: list[dict[str, Any]]
    limite_atingido: bool


class LookupCodigoResponse(ModeloCamelCase):
    situacao: str  # ENCONTRADO | NAO_ENCONTRADO | MAIS_DE_UM
    codigo: Any = None
    descricao: str | None = None
    linha: dict[str, Any] | None = None
