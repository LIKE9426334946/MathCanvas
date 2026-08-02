export type ChartType = 'line' | 'bar';

export interface Directory {
  id: string;
  name: string;
  functionCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface FunctionParameter {
  name: string;
  label: string;
  min: number;
  max: number;
  step: number;
  default: number;
}

export interface FunctionConfig {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  expression: string;
  formula: string;
  parameters: FunctionParameter[];
  xMin: number;
  xMax: number;
  yMin: number | null;
  yMax: number | null;
  sampleCount: number;
  chartType: ChartType;
  isBuiltin: boolean;
  createdAt: string;
  updatedAt: string;
}

export type FunctionInput = Omit<FunctionConfig, 'id' | 'isBuiltin' | 'createdAt' | 'updatedAt'> & {
  id?: string;
  isBuiltin?: boolean;
};

export type ParameterValues = Record<string, number>;
