"""API de exemplo: o Lookup sobre uma tabela fictícia `pessoa` em SQLite (memória). Dados 100% inventados.

Rodar:  uvicorn exemplos.api_exemplo:app --port 8100   (na pasta backend, com o venv ativo)
Rotas:  POST /api/Lookup/pesquisa | /codigo | /validacao

Nota SQLite: datas são texto; guarde-as como 'AAAA-MM-DD HH:MM:SS' para a comparação por faixa funcionar.
"""

import sqlite3
from datetime import date

from fastapi import FastAPI

from componentes_py import ConfiguracaoLookup, criar_roteador_lookup

_URI = "file:componentes_exemplo?mode=memory&cache=shared"
# Conexão que mantém o banco em memória vivo enquanto o processo roda (cada requisição abre e fecha a sua).
_MANTEDORA = sqlite3.connect(_URI, uri=True, check_same_thread=False)


def fncDigitoCpf(nove: str) -> str:
    wDigitos = [int(c) for c in nove]
    for wQtd in (9, 10):
        wSoma = sum(wDigitos[i] * (wQtd + 1 - i) for i in range(wQtd))
        wResto = (wSoma * 10) % 11
        wDigitos.append(0 if wResto == 10 else wResto)
    return "".join(str(d) for d in wDigitos)


def fncDigitoCnpj(doze: str) -> str:
    wDigitos = [ord(c) - 48 for c in doze]
    for wQtd in (12, 13):
        wSoma, wPeso = 0, 2
        for wIndice in range(wQtd - 1, -1, -1):
            wSoma += wDigitos[wIndice] * wPeso
            wPeso = 2 if wPeso == 9 else wPeso + 1
        wResto = wSoma % 11
        wDigitos.append(0 if wResto < 2 else 11 - wResto)
    return doze + "".join(str(d) for d in wDigitos[12:])


def prcPopularBanco() -> None:
    _MANTEDORA.execute("DROP TABLE IF EXISTS pessoa")
    _MANTEDORA.execute(
        "CREATE TABLE pessoa (cd_pessoa INTEGER PRIMARY KEY, nm_pessoa TEXT, dt_nascimento TEXT, "
        "nr_cpf TEXT, nr_cnpj TEXT, tp_situacao TEXT)"
    )
    wNomes = [
        "Ana Souza",
        "Bruno Lima",
        "Carla Dias",
        "Davi Rocha",
        "Elisa Prado",
        "Fábio Nunes",
        "Gabriela Torres",
        "Hugo Martins",
        "Irene Costa",
        "João Pereira",
        "Karina Alves",
        "Luís Barros",
    ]
    for wIndice, wNome in enumerate(wNomes, start=1):
        wCpf = fncDigitoCpf(str(100000000 + wIndice * 7919).zfill(9))
        wCnpj = fncDigitoCnpj(str(12000000 + wIndice * 1037).zfill(8) + "0001")
        wNascimento = date(1960 + wIndice * 3, (wIndice % 12) + 1, 10 + wIndice).isoformat() + " 00:00:00"
        _MANTEDORA.execute(
            "INSERT INTO pessoa VALUES (?, ?, ?, ?, ?, ?)",
            (wIndice, wNome, wNascimento, wCpf, wCnpj, "A" if wIndice % 4 else "I"),
        )
    _MANTEDORA.commit()


def fncObterConexao(banco: str) -> sqlite3.Connection:
    # Todo banco pedido cai no SQLite de exemplo (o front de exemplo manda banco = "SQLITE").
    return sqlite3.connect(_URI, uri=True)


def fncCriarApp() -> FastAPI:
    prcPopularBanco()
    wApp = FastAPI(title="Exemplo do Lookup")
    wApp.include_router(
        criar_roteador_lookup(ConfiguracaoLookup(obter_conexao=fncObterConexao, permitir_anonimo=True)),
        prefix="/api/Lookup",
    )
    return wApp


app = fncCriarApp()
