import { useEffect, useState, type ReactNode } from "react";

export interface CarregandoProps {
  /** Texto abaixo do indicador. */
  mensagem?: string;
  /** Marca opcional (ex.: `<img src={logo} alt="Minha empresa" />`), mostrada acima do indicador. */
  logo?: ReactNode;
  /** Mostra há quantos segundos o processamento está rodando (para o usuário ver que não travou). Padrão: true. */
  mostrarTempo?: boolean;
  className?: string;
}

/**
 * Tela de espera genérica: cobre a página, bloqueia cliques e mostra um indicador girando, a mensagem e o tempo
 * decorrido. É neutra (cores pelas variáveis `--cmp-*`); a marca do seu sistema entra pela prop `logo`.
 * Respeita `prefers-reduced-motion`. Renderize-a só enquanto estiver processando.
 */
export function Carregando({ mensagem = "Processando, aguarde...", logo, mostrarTempo = true, className }: CarregandoProps) {
  const [wSegundos, prcDefinirSegundos] = useState(0);

  useEffect(() => {
    const wInicio = Date.now();
    const wTemporizador = window.setInterval(() => prcDefinirSegundos(Math.floor((Date.now() - wInicio) / 1000)), 1000);
    return () => window.clearInterval(wTemporizador);
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={className ? `cmp-carregando ${className}` : "cmp-carregando"}
    >
      <div className="cmp-carregando-cartao">
        {logo && <div className="cmp-carregando-logo">{logo}</div>}
        <span className="cmp-carregando-giro" aria-hidden="true" />
        <div className="cmp-carregando-texto">
          <div className="cmp-carregando-mensagem">{mensagem}</div>
          {mostrarTempo && <div className="cmp-carregando-tempo">{wSegundos}s</div>}
        </div>
      </div>
    </div>
  );
}
