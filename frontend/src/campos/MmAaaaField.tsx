import { useRef } from "react";

import { CampoEntrada, type ResolucaoCampo } from "./CampoEntrada";
import type { MmAaaaFieldProps } from "./campos.types";
import {
  COMPETENCIA_MAX,
  COMPETENCIA_MIN,
  fncCompetenciaParaTexto,
  fncCompletarCompetencia,
  fncMascararCompetencia,
  fncTextoParaCompetencia,
  fncValidarCompetencia,
} from "./competencia";

/**
 * Campo de competência (mês/ano). Máscara MM/AAAA; ao sair, o mês de 1 dígito ganha o zero à esquerda.
 * Mês fora de 01–12, ano incompleto ou competência fora de `menorCompetencia`/`maiorCompetencia` deixam o campo
 * vermelho com a mensagem e bloqueiam a saída. Vazio sai livre.
 * Devolve `valor` string AAAAMM (vazio = ""), mais `AAAA` e `MM` decompostos, também strings.
 */
export function MmAaaaField({
  value,
  onChange,
  label,
  obrigatorio = false,
  enabled = "ENABLE",
  menorCompetencia = COMPETENCIA_MIN,
  maiorCompetencia = COMPETENCIA_MAX,
  larguraCampo,
  placeholder = "MM/AAAA",
  id,
  className,
}: MmAaaaFieldProps) {
  const wInputRef = useRef<HTMLInputElement>(null);
  const wMenor = /^\d{6}$/.test(menorCompetencia) ? menorCompetencia : COMPETENCIA_MIN;
  const wMaior = /^\d{6}$/.test(maiorCompetencia) ? maiorCompetencia : COMPETENCIA_MAX;

  function prcAoResolver(resolucao: ResolucaoCampo): void {
    const wValor = resolucao.vazio ? "" : fncTextoParaCompetencia(resolucao.texto);
    onChange({
      valor: wValor,
      AAAA: wValor.slice(0, 4),
      MM: wValor.slice(4),
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
      valorTexto={fncCompetenciaParaTexto(value)}
      larguraCh={larguraCampo ?? 7}
      mascarar={fncMascararCompetencia}
      completar={fncCompletarCompetencia}
      validar={(t) => fncValidarCompetencia(t, wMenor, wMaior)}
      onResolver={prcAoResolver}
    />
  );
}
