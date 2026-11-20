import {
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type FocusEvent,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from "react";

import { prcMoverFoco } from "../foco";
import type { CampoEnabled } from "./campos.types";

export interface ResolucaoCampo {
  /** Texto completo e formatado (vazio quando o campo está vazio ou inválido). */
  texto: string;
  vazio: boolean;
  valido: boolean;
  mensagem: string | null;
}

export interface CampoEntradaProps {
  id?: string;
  label?: string;
  obrigatorio?: boolean;
  enabled: CampoEnabled;
  className?: string;
  placeholder?: string;
  inputRef: RefObject<HTMLInputElement>;
  /** Texto que o `value` do consumidor representa. Se mudar por fora, o campo acompanha. */
  valorTexto: string;
  /** Largura do campo, em caracteres. */
  larguraCh: number;
  /** Aplica a máscara enquanto o usuário digita. */
  mascarar: (digitado: string) => string;
  /** Ao sair: completa o texto (ex.: zeros à esquerda). Devolve "" se o resultado é vazio. */
  completar?: (texto: string) => string;
  /** Mensagem de erro do texto completo, ou null se é válido. Só é chamada com texto preenchido. */
  validar: (texto: string) => string | null;
  /** Mensagem de bloqueio quando o campo fica vazio (campo que não pode sair vazio). Omitido = vazio sempre livre. */
  vazioInvalido?: string;
  onResolver: (resolucao: ResolucaoCampo) => void;
  /** Texto exibido depois do campo quando ele está válido, preenchido e sem foco (ex.: dia da semana). */
  sufixo?: (texto: string) => string | null;
  /** Botões à direita do campo (ex.: calendário). O foco neles não dispara o bloqueio. */
  acao?: ReactNode;
  onF4?: () => void;
}

/**
 * Campo de texto com máscara, validação e bloqueio de saída, base de Data, Data/Hora, CPF, CNPJ, competência e combo.
 * Vazio nunca bloqueia; um texto inválido mostra a mensagem ao lado, deixa o campo vermelho e devolve o foco.
 * Enter e ↓ funcionam como Tab; ↑ como Shift+Tab. F4 abre o painel do campo (`onF4`).
 */
export function CampoEntrada({
  id,
  label,
  obrigatorio,
  enabled,
  className,
  placeholder,
  inputRef,
  valorTexto,
  larguraCh,
  mascarar,
  completar,
  validar,
  vazioInvalido,
  onResolver,
  sufixo,
  acao,
  onF4,
}: CampoEntradaProps) {
  const wAcaoRef = useRef<HTMLSpanElement>(null);
  const wIdGerado = useId();
  const wCampoId = id ?? wIdGerado;
  const wMensagemId = `${wCampoId}-erro`;

  const [wTexto, prcDefinirTexto] = useState(valorTexto);
  const [wMensagem, prcDefinirMensagem] = useState<string | null>(null);
  const [wSujo, prcDefinirSujo] = useState(false);
  const [wFocado, prcDefinirFocado] = useState(false);

  // Sincronização com o `value` do consumidor (componente controlado), feita durante o render.
  const [wVisto, prcDefinirVisto] = useState(valorTexto);
  const [wEmitido, prcDefinirEmitido] = useState<string | null>(null);
  if (valorTexto !== wVisto) {
    prcDefinirVisto(valorTexto);
    if (valorTexto !== wEmitido) {
      prcDefinirTexto(valorTexto);
      prcDefinirMensagem(null);
      prcDefinirSujo(false);
    }
    // O que emitimos já foi absorvido; não deixa "emitido" velho esconder uma troca futura.
    prcDefinirEmitido(null);
  }

  const wLivre = enabled === "ENABLE";

  /** Valida o texto atual e avisa o consumidor. Devolve a mensagem de erro, se houver. */
  function fncResolver(texto: string): string | null {
    const wCompleto = texto.trim() === "" ? "" : completar ? completar(texto) : texto;

    if (wCompleto === "" && vazioInvalido) {
      prcDefinirTexto("");
      prcDefinirSujo(false);
      prcDefinirMensagem(vazioInvalido);
      prcDefinirEmitido("");
      onResolver({ texto: "", vazio: true, valido: false, mensagem: vazioInvalido });
      return vazioInvalido;
    }

    if (wCompleto === "") {
      prcDefinirTexto("");
      prcDefinirMensagem(null);
      prcDefinirSujo(false);
      prcDefinirEmitido("");
      onResolver({ texto: "", vazio: true, valido: true, mensagem: null });
      return null;
    }

    const wErro = validar(wCompleto);
    prcDefinirTexto(wCompleto);
    prcDefinirSujo(false);
    if (wErro) {
      prcDefinirMensagem(wErro);
      prcDefinirEmitido("");
      onResolver({ texto: "", vazio: true, valido: false, mensagem: wErro });
      return wErro;
    }

    prcDefinirMensagem(null);
    prcDefinirEmitido(wCompleto);
    onResolver({ texto: wCompleto, vazio: false, valido: true, mensagem: null });
    return null;
  }

  function prcAoDigitar(evento: ChangeEvent<HTMLInputElement>): void {
    const wMascarado = mascarar(evento.target.value);
    prcDefinirTexto(wMascarado);
    prcDefinirMensagem(null);
    if (wMascarado.trim() === "" && !vazioInvalido) {
      fncResolver(""); // esvaziar libera o campo e avisa o consumidor
    } else {
      prcDefinirSujo(true);
    }
  }

  function prcAoSair(evento: FocusEvent<HTMLInputElement>): void {
    prcDefinirFocado(false);
    const wDestino = evento.relatedTarget as HTMLElement | null;
    // Ir para o botão de ação ou para dentro do painel (calendário, lista) não é "sair" do campo.
    const wFoiParaAcao =
      !!wDestino && (!!wAcaoRef.current?.contains(wDestino) || !!wDestino.closest("[data-cmp-popover]"));

    let wErro = wMensagem;
    if (wSujo) {
      wErro = fncResolver(wTexto);
    }

    if (wErro && !wFoiParaAcao) {
      // Devolve o foco depois que o navegador terminar de mover para o destino.
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 0);
    }
  }

  function prcAoTeclar(evento: KeyboardEvent<HTMLInputElement>): void {
    if (evento.key === "F4" && wLivre && onF4) {
      evento.preventDefault();
      onF4();
    } else if (evento.key === "Enter" || evento.key === "ArrowDown") {
      evento.preventDefault();
      prcMoverFoco(evento.currentTarget, 1);
    } else if (evento.key === "ArrowUp") {
      evento.preventDefault();
      prcMoverFoco(evento.currentTarget, -1);
    }
  }

  const wComplemento = !wMensagem && !wFocado && !wSujo && wTexto ? sufixo?.(wTexto) : null;

  return (
    <div className={className ? `cmp-campo ${className}` : "cmp-campo"}>
      {label && (
        <label className="cmp-rotulo" htmlFor={wCampoId}>
          {label}
          {obrigatorio && <span className="cmp-obrigatorio"> *</span>}
        </label>
      )}

      <div className="cmp-linha">
        {/* o dia da semana fica dentro do campo, à direita */}
        <div className="cmp-entrada-envoltorio">
          <input
            id={wCampoId}
            ref={inputRef}
            className="cmp-entrada"
            style={{ width: `calc(${larguraCh}ch + 1.75rem)` }}
            value={wTexto}
            placeholder={placeholder}
            readOnly={enabled === "READONLY"}
            disabled={enabled === "DISABLED"}
            aria-invalid={!!wMensagem}
            aria-describedby={wMensagem ? wMensagemId : undefined}
            autoComplete="off"
            inputMode="text"
            onFocus={() => prcDefinirFocado(true)}
            onChange={prcAoDigitar}
            onBlur={prcAoSair}
            onKeyDown={prcAoTeclar}
          />
          {wComplemento && <span className="cmp-sufixo">({wComplemento})</span>}
        </div>
        {acao && <span ref={wAcaoRef}>{acao}</span>}
        {wMensagem && (
          <span id={wMensagemId} role="alert" className="cmp-erro">
            {wMensagem}
          </span>
        )}
      </div>
    </div>
  );
}
