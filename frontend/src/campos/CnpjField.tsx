import { useRef } from "react";

import { CampoEntrada, type ResolucaoCampo } from "./CampoEntrada";
import type { CnpjFieldProps } from "./campos.types";
import { fncCnpjValido, fncCompletarCnpj, fncLimparCnpj, fncMascararCnpj } from "./documentos";

/**
 * Campo de CNPJ, numérico ou alfanumérico (as 12 primeiras posições aceitam letras; o dígito verificador é numérico).
 * A máscara aparece enquanto digita e, ao sair, completa com zeros à esquerda. O dígito verificador é conferido: se não
 * bater, o campo fica vermelho e não deixa sair (a menos que `aceitaInvalido`).
 * Devolve string de 14 caracteres sem máscara; vazio = "".
 */
export function CnpjField({
  value,
  onChange,
  label,
  obrigatorio = false,
  enabled = "ENABLE",
  aceitaInvalido = false,
  larguraCampo,
  placeholder = "00.000.000/0000-00",
  id,
  className,
}: CnpjFieldProps) {
  const wInputRef = useRef<HTMLInputElement>(null);

  function prcAoResolver(resolucao: ResolucaoCampo): void {
    const wValor = resolucao.vazio ? "" : fncLimparCnpj(resolucao.texto);
    onChange({
      valor: wValor,
      vazio: wValor === "",
      valido: resolucao.valido,
      obrigatorioPendente: obrigatorio && wValor === "",
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
      valorTexto={value ? fncCompletarCnpj(value) : ""}
      larguraCh={larguraCampo ?? 16}
      mascarar={fncMascararCnpj}
      completar={fncCompletarCnpj}
      validar={(t) => (aceitaInvalido || fncCnpjValido(fncLimparCnpj(t)) ? null : "CNPJ com dígito inválido")}
      onResolver={prcAoResolver}
    />
  );
}
