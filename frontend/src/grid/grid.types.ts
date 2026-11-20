import type { ReactNode } from "react";

export type GridTipo = "texto" | "numero" | "data" | "dataHora" | "competencia" | "logico";

export type GridLinha = Record<string, unknown>;

export interface GridColuna {
  /** Nome da propriedade em cada linha de `dados` (e do JSON do evento). */
  coluna: string;
  tipo: GridTipo;
  /** Máscara do FNC_FORMATA para exibir a célula, fixa ou função da linha (ex.: CPF x CNPJ). Data e dataHora têm padrão. */
  mascara?: string | ((linha: GridLinha) => string | undefined);
  /** Largura em caracteres (opcional). */
  largura?: number;
  /** Largura máxima da célula em caracteres: o que passar é cortado com "…" (o texto completo aparece ao parar o mouse). Vazia: não corta. */
  larguraMax?: number;
  /** Propriedade da linha usada para ordenar no lugar de `coluna` (ex.: exibe MM/AAAA, ordena por AAAAMM). Vazia: ordena pela própria coluna. */
  colunaOrdenar?: string;
  /** Alinhamento do conteúdo da célula. Vazio: número à direita, data/dataHora/competência/lógico centralizados, texto à esquerda. */
  alinhamento?: "esquerda" | "centro" | "direita";
  /** Exibe o texto da célula como link; o clique chama esta função com a linha. Célula vazia não vira link. */
  aoClicar?: (linha: GridLinha) => void;
}

/** Botão de ação no fim de cada linha (ex.: manutenção, cancelar). */
export interface GridAcao {
  /** Texto do tooltip e do leitor de tela. */
  rotulo: string;
  /** Ícone do botão (qualquer ReactNode: SVG, emoji, ícone de outra biblioteca). */
  icone: ReactNode;
  aoClicar: (linha: GridLinha) => void;
  /** Classe do botão (ex.: cor do ícone). */
  className?: string;
}

export interface GridOrdem {
  coluna: string;
  desc: boolean;
}

export interface GridFieldProps {
  colunas: readonly GridColuna[];
  /** Mesma ordem e tamanho de `colunas`. */
  cabecalhos: readonly string[];
  dados: readonly GridLinha[];
  /** Obrigatória. */
  linhasPorPagina: number;
  /** Padrão e teto: 3000. Acima disso o grid corta e avisa. */
  maxLinhas?: number;
  /** Padrão true. Com false o cabeçalho fica cinza e não ordena. */
  ordenavel?: boolean;
  /** Duplo clique, Enter ou F4 na linha; recebe `{coluna: valor}` da linha. */
  onLinhaAcionada?: (linha: GridLinha) => void;
  /**
   * Chamada quando a linha atual efetivamente muda (clique, setas, troca de página, ordenação ou `dados`).
   * Recebe uma cópia da linha; sem linhas visíveis recebe null. Não repete a chamada para a mesma linha.
   */
  onLinhaPosicionada?: (linha: GridLinha | null) => void;
  /**
   * Ao trocar `dados`, posiciona o cursor na 1ª linha que satisfaz a função, na ordem atual, indo para a página dela
   * (ex.: a regra recém-gravada). Sem esta prop ou sem linha encontrada: 1ª linha.
   */
  posicionarEm?: (linha: GridLinha) => boolean;
  /** Linha de detalhe: conteúdo exibido abaixo da linha, identado, ao abrir o botão da 1ª coluna. Sem esta prop, não há botão. */
  detalhe?: (linha: GridLinha) => ReactNode;
  /** Decide se a linha tem detalhe (botão habilitado). Padrão: todas as linhas. */
  temDetalhe?: (linha: GridLinha) => boolean;
  /** Abre (true) ou fecha (false) o detalhe de todas as linhas com detalhe, ao carregar `dados` e ao mudar o valor. Padrão false. */
  detalheAberto?: boolean;
  /** Botões no fim da linha, numa coluna "Ações" (não ordena e não entra no JSON do evento). O clique no botão não aciona a linha. */
  acoes?: readonly GridAcao[];
  /** Clique com o botão direito na linha (o menu do navegador não abre). Recebe uma cópia da linha. */
  onLinhaContexto?: (linha: GridLinha) => void;
  /** Cor de fundo CSS da linha (ex.: "#fde2e2"); vazio ou indefinido: sem cor. */
  corLinha?: (linha: GridLinha) => string | undefined;
  /** Com true, trocar `dados` mantém a ordenação e a página escolhidas pelo usuário (padrão false: reinicia). */
  manterOrdem?: boolean;
  /** Tamanho da fonte do rodapé (contagem de linhas e paginação), em CSS: "1.2rem". Padrão: 0,75rem. */
  fonteRodape?: string;
  /** Cores do cabeçalho (padrões: 0,0,255 / 0,0,225 / 0,0,200 / cinza quase preto). */
  corPrimeira?: string;
  corDemais?: string;
  corForaDaOrdem?: string;
  corNaoOrdenavel?: string;
  className?: string;
}
