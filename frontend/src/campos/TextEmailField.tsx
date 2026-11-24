import { useRef } from "react";

import { CampoEntrada, type ResolucaoCampo } from "./CampoEntrada";
import type { TextEmailFieldProps } from "./campos.types";
import { fncEmailValido, fncMascararEmail } from "./emailTexto";

/**
 * Campo de e-mail: tudo em minúsculas, sem espaços, um só `@`. Ao sair confere o formato (`nome@dominio.com.br`); inválido
 * deixa o campo vermelho e não deixa sair (a menos que `aceitaInvalido`). Vazio nunca bloqueia. Devolve o texto em minúsculas.
 */
export function TextEmailField({
  value,
  onChange,
  label,
  obrigatorio = false,
  enabled = "ENABLE",
  aceitaInvalido = false,
  larguraCampo,
  placeholder = "nome@dominio.com.br",
  id,
  className,
}: TextEmailFieldProps) {
  const wInputRef = useRef<HTMLInputElement>(null);

  function prcAoResolver(resolucao: ResolucaoCampo): void {
    onChange({
      valor: resolucao.vazio ? "" : resolucao.texto,
      vazio: resolucao.vazio,
      valido: resolucao.valido,
      obrigatorioPendente: obrigatorio && resolucao.vazio,
    });
  }

  return (
    <CampoEntrada
      id={id}
      label={label}
      obrigatorio={obrigatorio}
      enabled={enabled}
      className={className}
      placeholder={placeholder}
      inputRef={wInputRef}
      valorTexto={fncMascararEmail(value)}
      larguraCh={larguraCampo ?? 40}
      mascarar={fncMascararEmail}
      completar={(wTexto) => fncMascararEmail(wTexto.trim())}
      validar={(wTexto) => (aceitaInvalido || fncEmailValido(wTexto) ? null : "E-mail inválido")}
      onResolver={prcAoResolver}
      inputMode="email"
    />
  );
}
