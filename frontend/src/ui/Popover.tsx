import { useEffect, useRef, type ReactNode } from "react";

export interface PopoverProps {
  aberto: boolean;
  aoMudar: (aberto: boolean) => void;
  /** Elemento que fica sempre visível (normalmente um botão). */
  gatilho: ReactNode;
  children: ReactNode;
  className?: string;
  /** Chamado ao fechar com Esc: o consumidor devolve o foco ao campo. */
  aoRetornarFoco?: () => void;
}

/**
 * Painel flutuante simples, sem portal: abre logo abaixo do gatilho, fecha com Esc ou clique fora.
 * O painel leva `data-cmp-popover`, que o CampoEntrada usa para não bloquear a saída do campo
 * quando o foco vai para dentro dele.
 */
export function Popover({ aberto, aoMudar, gatilho, children, className, aoRetornarFoco }: PopoverProps) {
  const wRaizRef = useRef<HTMLSpanElement>(null);
  const wPainelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) {
      return;
    }
    // Foco no painel: o teclado passa a navegar dentro dele (selects, dias, botões).
    wPainelRef.current?.focus();

    const prcAoClicarFora = (evento: MouseEvent): void => {
      if (wRaizRef.current && !wRaizRef.current.contains(evento.target as Node)) {
        aoMudar(false);
      }
    };
    const prcAoTeclar = (evento: KeyboardEvent): void => {
      if (evento.key === "Escape") {
        evento.stopPropagation();
        aoMudar(false);
        aoRetornarFoco?.();
      }
    };
    document.addEventListener("mousedown", prcAoClicarFora);
    document.addEventListener("keydown", prcAoTeclar);
    return () => {
      document.removeEventListener("mousedown", prcAoClicarFora);
      document.removeEventListener("keydown", prcAoTeclar);
    };
    // aoMudar/aoRetornarFoco mudam a cada render do consumidor; só reagir à abertura/fechamento.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto]);

  return (
    <span ref={wRaizRef} className="cmp-popover-raiz">
      {gatilho}
      {aberto && (
        <div
          ref={wPainelRef}
          className={className ? `cmp-popover ${className}` : "cmp-popover"}
          role="dialog"
          tabIndex={-1}
          data-cmp-popover=""
        >
          {children}
        </div>
      )}
    </span>
  );
}
