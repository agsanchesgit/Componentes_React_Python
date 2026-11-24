"""Configuração injetada pelo projeto consumidor.

A biblioteca não cria pool, não lê credenciais e não guarda estado global.
"""

from collections.abc import Callable, Collection
from dataclasses import dataclass
from typing import Any

from .definicao import LookupDefinicao


@dataclass
class ConfiguracaoLookup:
    """Tudo o que o Lookup precisa do projeto que o usa.

    obter_conexao:
        `(banco: str) -> conexão DB-API` para o banco pedido ("ORACLE", "SQL_SERVER", "POSTGRESQL").
        Chamada uma vez por requisição; a biblioteca chama `close()` ao terminar (com pool, devolva um
        objeto cujo `close()` devolve a conexão ao pool).
    obter_conexao_do_usuario:
        Opcional: `(banco: str, usuario, definicao: LookupDefinicao) -> conexão DB-API`. Quando informada, **tem
        precedência** sobre `obter_conexao` e recebe o usuário autenticado e a definição da consulta (útil para
        tabelas com RLS por tenant: o projeto define o contexto do tenant na conexão). Com ela, `obter_conexao`
        pode ser omitida. A biblioteca também chama `close()` ao terminar.
    dependencia_autenticacao:
        Dependência do FastAPI que exige usuário logado (padrão do Nexus: [Authorize]). O valor que ela
        devolve é entregue ao gancho `autorizar` como `usuario`. Obrigatória, a menos que `permitir_anonimo=True`.
    permitir_anonimo:
        Libera as rotas sem autenticação. Só para exemplos e testes: o Lookup consulta qualquer tabela visível ao
        usuário de banco.
    tabelas_permitidas:
        Lista opcional de tabelas liberadas (sem diferenciar maiúsculas, ex.: `{"DBAPS.PESSOA"}`). Padrão `None`:
        sem restrição (igual ao Nexus). Com lista, só `base = TABELA` com nome na lista é aceito; `base = SELECT`
        é recusado (não há como conferir as tabelas de um SELECT livre).
    autorizar:
        Gancho opcional `(definicao, usuario) -> bool`. Devolver `False` recusa a consulta (HTTP 403).
    tipos_erro_banco:
        Classes de exceção que são erros do banco (viram HTTP 400 com a mensagem completa do banco). Padrão
        `None`: detecta pela hierarquia DB-API (`Error`) de qualquer driver.
    """

    obter_conexao: Callable[[str], Any] | None = None
    dependencia_autenticacao: Callable[..., Any] | None = None
    permitir_anonimo: bool = False
    tabelas_permitidas: Collection[str] | None = None
    autorizar: Callable[[LookupDefinicao, Any], bool] | None = None
    tipos_erro_banco: tuple[type[BaseException], ...] | None = None
    obter_conexao_do_usuario: Callable[[str, Any, LookupDefinicao], Any] | None = None

    def __post_init__(self) -> None:
        if self.obter_conexao is None and self.obter_conexao_do_usuario is None:
            raise ValueError("Informe obter_conexao ou obter_conexao_do_usuario")
