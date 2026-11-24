import { useRef } from "react";

import { CampoEntrada, type ResolucaoCampo } from "./CampoEntrada";
import type { TextNumericoFieldProps } from "./campos.types";
import { fncFormatarNumero, fncLerMascaraNumerica, fncMascararNumerico, fncNumeroDoTexto } from "./numerico";

/**
 * Campo de valor numérico (inteiro, decimal, moeda ou percentual), alinhado à direita. Digita-se a parte inteira e `,` ou `.`
 * passa para a parte fracionária; enquanto digita só aparecem dígitos e a vírgula, e ao sair o texto completa com as casas
 * decimais e o ponto de milhar da máscara (`1234,5` → `1.234,50`). Com `percentual`, o `%` aparece no fim do campo.
 * Diferente dos demais campos numéricos, o vazio se distingue do zero pelo `vazio` do resultado (`valorInicial` `null` = vazio).
 */
export function TextNumericoField({
  valorInicial,
  onChange,
  mascara,
  percentual = false,
  label,
  obrigatorio = false,
  enabled = "ENABLE",
  larguraCampo,
  placeholder,
  id,
  className,
}: TextNumericoFieldProps) {
  const wInputRef = useRef<HTMLInputElement>(null);
  const wMascara = fncLerMascaraNumerica(mascara);

  function prcAoResolver(resolucao: ResolucaoCampo): void {
    const wVazio = resolucao.vazio;
    onChange({
      valor: wVazio ? 0 : fncNumeroDoTexto(resolucao.texto),
      vazio: wVazio,
      valido: resolucao.valido,
      obrigatorioPendente: obrigatorio && wVazio,
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
      valorTexto={valorInicial === null || valorInicial === undefined ? "" : fncFormatarNumero(valorInicial, wMascara)}
      larguraCh={larguraCampo ?? mascara.length}
      mascarar={(wDigitado) => fncMascararNumerico(wDigitado, wMascara)}
      completar={(wTexto) => fncFormatarNumero(fncNumeroDoTexto(wTexto), wMascara)}
      validar={() => null}
      onResolver={prcAoResolver}
      alinhamento="direita"
      sufixoFixo={percentual ? "%" : undefined}
      inputMode={wMascara.decimais > 0 ? "decimal" : "numeric"}
      selecionarAoFocar
    />
  );
}
