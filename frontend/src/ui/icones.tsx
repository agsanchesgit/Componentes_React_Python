// Ícones SVG inline próprios (sem pacote de ícones). Herdam a cor do texto (currentColor).
import type { ReactNode } from "react";

function Icone({ children }: { children: ReactNode }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export function IconeCalendario() {
  return (
    <Icone>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </Icone>
  );
}

export function IconeCalendarioRelogio() {
  return (
    <Icone>
      <path d="M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3.5M16 2v4M8 2v4M3 10h5" />
      <circle cx="17.5" cy="17.5" r="4.5" />
      <path d="M17.5 15.5v2l1 1" />
    </Icone>
  );
}

export function IconeSetaBaixo() {
  return (
    <Icone>
      <path d="m6 9 6 6 6-6" />
    </Icone>
  );
}

export function IconeSetaEsquerda() {
  return (
    <Icone>
      <path d="m15 18-6-6 6-6" />
    </Icone>
  );
}

export function IconeSetaDireita() {
  return (
    <Icone>
      <path d="m9 18 6-6-6-6" />
    </Icone>
  );
}
