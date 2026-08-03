export type ChartType = 'line' | 'bar';

export interface Directory {
  id: string;
  name: string;
  order: number;
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
  details: string;
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

export type FunctionConfigInput = Omit<
  FunctionConfig,
  'id' | 'details' | 'isBuiltin' | 'createdAt' | 'updatedAt'
> & { id?: string; details?: string; isBuiltin?: boolean };
