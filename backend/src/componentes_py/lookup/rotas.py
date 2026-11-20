"""Rotas do Lookup: `criar_roteador_lookup(config)` devolve um APIRouter que o projeto consumidor inclui.

Contrato HTTP (idêntico ao do Nexus, JSON em camelCase): POST /pesquisa, POST /codigo (sempre 200) e POST /validacao.
Erros: ErroNegocio -> 400 {"error": msg}; recusa do consumidor -> 403; erro inesperado -> 500 com errorId (e log
"ERRO [errorId]" com o detalhe).
"""

import logging
import uuid
from collections.abc import Callable
from typing import Any

from fastapi import APIRouter, Depends
from fastapi.exceptions import RequestValidationError
from fastapi.requests import Request
from fastapi.responses import JSONResponse, Response
from fastapi.routing import APIRoute
from starlette.exceptions import HTTPException

from ..erros import ErroAcessoNegado, ErroNegocio
from .configuracao import ConfiguracaoLookup
from .definicao import LookupDefinicao
from .dtos import LookupCodigoRequest, LookupPesquisaRequest
from .servico import ServicoLookup, fncValidar

_LOG = logging.getLogger("componentes_py.lookup")


class _RotaLookup(APIRoute):
    """Traduz as exceções para o formato de erro do Nexus, só nas rotas do Lookup."""

    def get_route_handler(self) -> Callable[[Request], Any]:
        wOriginal = super().get_route_handler()

        async def fncProtegido(request: Request) -> Response:
            try:
                return await wOriginal(request)
            except RequestValidationError as erro:
                wCampos = "; ".join(
                    ".".join(str(p) for p in e["loc"] if p != "body") + ": " + e["msg"] for e in erro.errors()
                )
                return JSONResponse(status_code=400, content={"error": f"Requisição inválida: {wCampos}"})
            except ErroAcessoNegado as erro:
                return JSONResponse(status_code=403, content={"error": erro.mensagem})
            except ErroNegocio as erro:
                return JSONResponse(status_code=400, content={"error": erro.mensagem})
            except HTTPException:
                raise  # 401/403 da dependência de autenticação seguem o fluxo normal do FastAPI
            except Exception:
                wErroId = str(uuid.uuid4())
                _LOG.exception("ERRO [%s]", wErroId)
                return JSONResponse(
                    status_code=500,
                    content={"error": "Erro inesperado ao processar a requisição.", "errorId": wErroId},
                )

        return fncProtegido


def _fncJson(modelo: Any) -> JSONResponse:
    # by_alias: camelCase como no Nexus; os valores nulos continuam no JSON (codigo/descricao/linha = null).
    return JSONResponse(content=modelo.model_dump(by_alias=True, mode="json"))


def criar_roteador_lookup(config: ConfiguracaoLookup) -> APIRouter:
    """Cria o roteador do Lookup; o consumidor o inclui com o prefixo que quiser (padrão do Nexus: /api/Lookup)."""
    wAutenticacao = config.dependencia_autenticacao
    if wAutenticacao is None and not config.permitir_anonimo:
        raise ValueError(
            "ConfiguracaoLookup: informe dependencia_autenticacao (o Lookup consulta qualquer tabela visível ao "
            "usuário de banco) ou, só em exemplos/testes, permitir_anonimo=True."
        )

    if wAutenticacao is not None:

        async def fncUsuario(usuario: Any = Depends(wAutenticacao)) -> Any:
            return usuario

    else:

        async def fncUsuario() -> Any:  # modo anônimo (permitir_anonimo=True)
            return None

    wServico = ServicoLookup(config)
    wRoteador = APIRouter(route_class=_RotaLookup)

    # Rotas `def` (não async): o FastAPI as executa no threadpool, onde o driver síncrono pode bloquear à vontade.
    @wRoteador.post("/pesquisa")
    def rotaPesquisa(corpo: LookupPesquisaRequest, usuario: Any = Depends(fncUsuario)) -> JSONResponse:
        return _fncJson(wServico.pesquisar(corpo, usuario))

    @wRoteador.post("/codigo")
    def rotaCodigo(corpo: LookupCodigoRequest, usuario: Any = Depends(fncUsuario)) -> JSONResponse:
        """Sempre 200: código não encontrado é um resultado esperado."""
        return _fncJson(wServico.buscar_por_codigo(corpo, usuario))

    @wRoteador.post("/validacao")
    def rotaValidacao(corpo: LookupDefinicao, usuario: Any = Depends(fncUsuario)) -> JSONResponse:
        """Valida a configuração sem executar nada (usado no modo debug do front)."""
        return _fncJson(fncValidar(corpo))

    return wRoteador
