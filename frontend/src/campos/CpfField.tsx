import { useRef } from "react";

import { CampoEntrada, type ResolucaoCampo } from "./CampoEntrada";
import type { CpfFieldProps } from "./campos.types";
import { fncCompletarCpf, fncCpfValido, fncMascararCpf, fncSomenteDigitos } from "./documentos";

/**
 * Campo de CPF: digita-se só números, a máscara aparece enquanto digita e, ao sair, completa com zeros à esquerda
 * (`374287813` → `003.742.878-13`). O dígito verificador é conferido: se não bater, o campo fica vermelho e não deixa sair
 * (a menos que `aceitaInvalido`). Devolve número sem máscara; vazio = 0.
 */
export function CpfField({
  value,
  onChange,
  label,
  obrigatorio = false,
  enabled = "ENABLE",
  aceitaInvalido = false,
  larguraCampo,
  placeholder = "000.000.000-00",
  id,
  className,
}: CpfFieldProps) {
  const wInputRef = useRef<HTMLInputElement>(null);

  function prcAoResolver(resolucao: ResolucaoCampo): void {
    const wNumero = resolucao.vazio ? 0 : Number(fncSomenteDigitos(resolucao.texto));
    onChange({
      valor: wNumero,
      vazio: wNumero === 0,
      valido: resolucao.valido,
      obrigatorioPendente: obrigatorio && wNumero === 0,
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
      valorTexto={value > 0 ? fncCompletarCpf(String(value)) : ""}
      larguraCh={larguraCampo ?? 12}
      mascarar={fncMascararCpf}
      completar={fncCompletarCpf}
      validar={(t) => (aceitaInvalido || fncCpfValido(fncSomenteDigitos(t)) ? null : "CPF com dígito inválido")}
      onResolver={prcAoResolver}
    />
  );
}
