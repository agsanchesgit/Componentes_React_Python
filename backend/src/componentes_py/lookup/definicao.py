"""Configuração de um LookUpField (modelo Pydantic, JSON em camelCase como no Nexus)."""

from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field, field_validator
from pydantic.alias_generators import to_camel

QTDE_LINHAS_MAXIMA = 300


class LookupBanco(StrEnum):
    ORACLE = "ORACLE"
    SQL_SERVER = "SQL_SERVER"
    POSTGRESQL = "POSTGRESQL"
    # Só para testes e para o backend de exemplo (SQLite em memória); não faz parte do contrato do Nexus.
    SQLITE = "SQLITE"


class LookupBase(StrEnum):
    TABELA = "TABELA"
    SELECT = "SELECT"


class LookupTipoConsulta(StrEnum):
    POR_LIKE = "POR_LIKE"
    POR_ORDEM_ALFABETICA = "POR_ORDEM_ALFABETICA"


class LookupOperador(StrEnum):
    AND = "AND"
    OR = "OR"


class LookupTipoValor(StrEnum):
    NUMERO = "NUMERO"
    TEXTO = "TEXTO"
    DATA = "DATA"


class ModeloCamelCase(BaseModel):
    """Base dos modelos do contrato HTTP: atributos em snake_case, JSON em camelCase."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class LookupColunaGrid(ModeloCamelCase):
    coluna: str
    cabecalho: str


class LookupDefinicao(ModeloCamelCase):
    """Vem do objeto em tela (front) a cada requisição; o backend não tem cadastro por consulta."""

    # Identificação opcional, só para mensagens e log.
    chave: str | None = ""
    banco: LookupBanco
    base: LookupBase
    nome_tabela: str | None = None
    select: str | None = None
    coluna_retorno: str
    tipo_coluna_retorno: LookupTipoValor
    coluna_descricao: str
    colunas_base_pesquisa: list[str]
    tipo_consulta: LookupTipoConsulta
    operador_na_coluna: LookupOperador = LookupOperador.AND
    operador_entre_colunas: LookupOperador = LookupOperador.OR
    colunas_grid: list[LookupColunaGrid]
    colunas_order_by: list[str] = Field(default_factory=list)
    # Colunas devolvidas em cada linha sem aparecer no grid (ex.: usadas pela máscara condicional do front).
    colunas_adicionais: list[str] = Field(default_factory=list)
    coluna_cnpj: str | None = None
    coluna_cpf: str | None = None
    coluna_dt_nascto: str | None = None
    qtde_linhas: int = 100
    # Condição fixa acrescentada ao WHERE (só com base = TABELA). Entra como AND (...) na pesquisa e no código.
    filtro: str | None = None

    @field_validator("colunas_order_by", "colunas_adicionais", mode="before")
    @classmethod
    def fncNuloViraLista(cls, valor: object) -> object:
        # O front pode mandar null; no Nexus isso vira lista vazia.
        return [] if valor is None else valor


class LookupInconsistencia(ModeloCamelCase):
    chave: str
    propriedade: str
    mensagem: str


class LookupValidacaoResultado(ModeloCamelCase):
    ok: bool
    inconsistencias: list[LookupInconsistencia]
