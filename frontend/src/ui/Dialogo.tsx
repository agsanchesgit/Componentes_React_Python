import { useEffect, useId, useRef, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";

const FOCAVEIS = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea, [tabindex]:not([tabindex="-1"])';

export interface DialogoProps {
  aberto: boolean;
  aoFechar: () => void;
  titulo: string;
  children: ReactNode;
  /** Estilo da caixa (largura, cor de fundo...). */
  estilo?: CSSProperties;
  /** Chamado ao abrir, para focar o elemento certo. Sem ele, o foco vai para a própria caixa. */
  aoAbrirFoco?: (caixa: HTMLElement) => void;
  /** Chamado ao fechar, para devolver o foco. Sem ele, o foco volta ao elemento que estava ativo antes de abrir. */
  aoFecharFoco?: () => void;
  onKeyDown?: (evento: KeyboardEvent<HTMLDivElement>) => void;
}

/**
 * Modal próprio (sem Radix): camada escura, caixa centralizada, fecha com Esc ou clique no fundo,
 * mantém o Tab dentro da caixa e devolve o foco ao fechar. O conteúdo só existe aberto.
 */
export function Dialogo(props: DialogoProps) {
  if (!props.aberto) {
    return null;
  }
  return createPortal(<CaixaDialogo {...props} />, document.body);
}

function CaixaDialogo({ aoFechar, titulo, children, estilo, aoAbrirFoco, aoFecharFoco, onKeyDown }: DialogoProps) {
  const wCaixaRef = useRef<HTMLDivElement>(null);
  const wTituloId = useId();

  useEffect(() => {
    const wAnterior = document.activeElement as HTMLElement | null;
    if (wCaixaRef.current) {
      if (aoAbrirFoco) {
        aoAbrirFoco(wCaixaRef.current);
      } else {
        wCaixaRef.current.focus();
      }
    }
    return () => {
      if (aoFecharFoco) {
        aoFecharFoco();
      } else {
        wAnterior?.focus?.();
      }
    };
    // Só na abertura/fechamento: os callbacks mudam a cada render do consumidor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function prcAoTeclar(evento: KeyboardEvent<HTMLDivElement>): void {
    onKeyDown?.(evento);
    if (evento.defaultPrevented) {
      return;
    }

    if (evento.key === "Escape") {
      // Um painel aberto (calendário, lista) fecha primeiro, com o próprio Esc dele.
      if (wCaixaRef.current?.querySelector("[data-cmp-popover]")) {
        return;
      }
      evento.preventDefault();
      aoFechar();
      return;
    }

    if (evento.key === "Tab" && wCaixaRef.current) {
      const wLista = Array.from(wCaixaRef.current.querySelectorAll<HTMLElement>(FOCAVEIS)).filter(
        (elemento) => elemento.getClientRects().length > 0,
      );
      if (wLista.length === 0) {
        evento.preventDefault();
        return;
      }
      const wPrimeiro = wLista[0];
      const wUltimo = wLista[wLista.length - 1];
      const wAtivo = document.activeElement;
      if (evento.shiftKey && (wAtivo === wPrimeiro || wAtivo === wCaixaRef.current)) {
        evento.preventDefault();
        wUltimo.focus();
      } else if (!evento.shiftKey && wAtivo === wUltimo) {
        evento.preventDefault();
        wPrimeiro.focus();
      }
    }
  }

  return (
    <div
      className="cmp-dialogo-fundo"
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget) {
          aoFechar();
        }
      }}
    >
      <div
        ref={wCaixaRef}
        className="cmp-dialogo"
        role="dialog"
        aria-modal="true"
        aria-labelledby={wTituloId}
        tabIndex={-1}
        style={estilo}
        onKeyDown={prcAoTeclar}
      >
        <h2 id={wTituloId} className="cmp-dialogo-titulo">
          {titulo}
        </h2>
        {children}
      </div>
    </div>
  );
}
