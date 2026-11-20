/** Estado de edição de um campo: editável, desabilitado ou somente leitura. */
export type CampoEnabled = "ENABLE" | "DISABLED" | "READONLY";

/** Entregue ao consumidor em cada `onChange`. O valor nunca é null. */
export interface CampoResultado<T> {
  valor: T;
  vazio: boolean;
  /** false quando o texto digitado é inválido (o campo bloqueia a saída). */
  valido: boolean;
  /** `obrigatorio && vazio`: o campo nunca bloqueia vazio; o consumidor trata no submit. */
  obrigatorioPendente: boolean;
}

export interface CampoBaseProps {
  label?: string;
  obrigatorio?: boolean;
  enabled?: CampoEnabled;
  placeholder?: string;
  /** Largura do campo em caracteres. Se omitida, cada componente usa o seu padrão. */
  larguraCampo?: number;
  id?: string;
  className?: string;
}

/** Vazio = `MIN_DATE`. */
export interface DataFieldProps extends CampoBaseProps {
  value: Date;
  onChange: (resultado: CampoResultado<Date>) => void;
  /** Menor data aceita. `MIN_DATE` ou omitido = sem limite (o piso é 01/01/1850). */
  menorData?: Date;
  /** Maior data aceita. `MIN_DATE` ou omitido = sem limite (o teto é 31/12/2100). */
  maiorData?: Date;
}

/** Vazio = `MIN_DATE`. Sempre com segundos (`DD/MM/AAAA HH:MI:SS`). */
export type DataHoraFieldProps = DataFieldProps;

/** Valor numérico sem máscara (`374287813`); vazio = 0. A máscara e os zeros à esquerda são só de exibição. */
export interface CpfFieldProps extends CampoBaseProps {
  value: number;
  onChange: (resultado: CampoResultado<number>) => void;
  /** Aceita digitar um CPF com dígito verificador inválido. Padrão: false. */
  aceitaInvalido?: boolean;
}

/** String de 14 caracteres sem máscara, com zeros à esquerda (`02849393000145`); vazio = "". Aceita CNPJ alfanumérico. */
export interface CnpjFieldProps extends CampoBaseProps {
  value: string;
  onChange: (resultado: CampoResultado<string>) => void;
  /** Aceita digitar um CNPJ com dígito verificador inválido. Padrão: false. */
  aceitaInvalido?: boolean;
}

/** Resultado do MmAaaaField: `valor` é a competência AAAAMM; `AAAA` e `MM` são o mesmo valor decomposto (strings). */
export interface CompetenciaResultado extends CampoResultado<string> {
  /** Ano com 4 dígitos ("" se vazio). */
  readonly AAAA: string;
  /** Mês com 2 dígitos, "01" a "12" ("" se vazio). */
  readonly MM: string;
}

/** Competência como string AAAAMM (`202610`); vazio = "". A máscara MM/AAAA é só de exibição. */
export interface MmAaaaFieldProps extends CampoBaseProps {
  value: string;
  onChange: (resultado: CompetenciaResultado) => void;
  /** Menor competência aceita, AAAAMM. Omitido = 185001. */
  menorCompetencia?: string;
  /** Maior competência aceita, AAAAMM. Omitido = 210012. */
  maiorCompetencia?: string;
}

/** Resultado do ComboField: `ordem` é a posição do item escolhido na lista (1 = primeiro); 0 quando vazio. */
export interface ComboResultado extends CampoResultado<string> {
  readonly ordem: number;
}

/** Valor alfa, igual a um item do domínio (grafia da lista); vazio = "". */
export interface ComboFieldProps extends CampoBaseProps {
  value: string;
  onChange: (resultado: ComboResultado) => void;
  /** Domínio separado por vírgula (`"SP,RJ,MG"`) ou array. */
  dominio: string | readonly string[];
  /** Pode sair vazio. Padrão: false (sem `value` válido, começa no 1º item). */
  permiteVazio?: boolean;
}
