export interface ChartParamDef {
  prop: string;
  type?: 'string' | 'boolean' | 'int' | 'float';
  label?: string;
  defaultValue?: string | number | boolean;
  required?: boolean;
}
