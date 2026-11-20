# Componentes React + Python (biblioteca reutilizável)

Biblioteca de componentes para projetos com frontend React/TypeScript e backend Python (FastAPI).
Portagem dos componentes do Nexus; o Nexus (`D:\nexus`) é somente leitura.

## Regra de organização
- **Código** (frontend, backend, testes, exemplos): estrutura de pastas na raiz do projeto (`frontend\`, `backend\`).
- **Documentos `.md`** (orientações, manuais, decisões, README, resumos de fase): **sempre dentro de `.claude\`**. Nunca criar `.md` fora dela.

## Mapa de `.claude\`
| Caminho | Conteúdo |
|---|---|
| `orientacoes_criar_componentes_reutilizaveis.md` | Especificação completa e plano em fases. **Leia antes de codificar.** |
| `docs\manuais\` | Um manual por componente, manual do backend, guia de instalação |
| `docs\decisoes\` | Decisões tomadas com o usuário (desvios do Nexus, escolhas de stack) |
| `docs\fases\` | Resumo de entrega de cada fase (feito, testado, dúvidas) |
| `README.md` | Visão geral, comandos e como levar a biblioteca a um novo projeto |
| `docs\Diferencas_Nexus.md` | Diferenças em relação ao Nexus, limites da verificação e melhorias sugeridas |

## Regras de código
Chaves obrigatórias, nomes em português, `w` para variáveis locais, `prc`/`fnc` para procedures/functions: ver §3 da orientação e o CLAUDE.md global do usuário.

## Processo
Uma fase por vez (§12), parar ao fim de cada uma e aguardar o "ok". Sem `git init`, commit ou push sem pedido.
