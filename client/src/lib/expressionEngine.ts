import { parse } from 'mathjs';
import type { FunctionConfig, ParameterValues } from '../types';

const allowedFunctions = new Set([
  'sin', 'cos', 'tan', 'asin', 'acos', 'atan',
  'sinh', 'cosh', 'tanh', 'exp', 'log', 'log10',
  'sqrt', 'abs', 'floor', 'ceil', 'round', 'min', 'max', 'pow',
  'gamma', 'beta', 'erf', 'normalPdf', 'betaPdf', 'gammaPdf',
  'poissonPmf', 'binomialPmf',
]);

const allowedNodeTypes = new Set([
  'OperatorNode', 'ConstantNode', 'SymbolNode', 'ParenthesisNode', 'FunctionNode',
]);

const lanczosCoefficients = [
  0.9999999999998099,
  676.5203681218851,
  -1259.1392167224028,
  771.3234287776531,
  -176.6150291621406,
  12.507343278686905,
  -0.13857109526572012,
  9.984369578019572e-6,
  1.5056327351493116e-7,
];

export const gamma = (value: number): number => {
  if (!Number.isFinite(value)) return Number.NaN;
  if (value < 0.5) return Math.PI / (Math.sin(Math.PI * value) * gamma(1 - value));
  const z = value - 1;
  let sum = lanczosCoefficients[0];
  for (let index = 1; index < lanczosCoefficients.length; index += 1) {
    sum += lanczosCoefficients[index] / (z + index);
  }
  const t = z + 7.5;
  return Math.sqrt(2 * Math.PI) * t ** (z + 0.5) * Math.exp(-t) * sum;
};

const logGamma = (value: number): number => Math.log(gamma(value));
const beta = (a: number, b: number) => Math.exp(logGamma(a) + logGamma(b) - logGamma(a + b));

const erf = (value: number) => {
  const sign = value < 0 ? -1 : 1;
  const x = Math.abs(value);
  const t = 1 / (1 + 0.3275911 * x);
  const polynomial = (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t;
  return sign * (1 - polynomial * Math.exp(-x * x));
};

const normalPdf = (x: number, mean: number, sigma: number) => {
  if (sigma <= 0) return Number.NaN;
  return Math.exp(-0.5 * ((x - mean) / sigma) ** 2) / (sigma * Math.sqrt(2 * Math.PI));
};

const betaPdf = (x: number, alpha: number, betaValue: number) => {
  if (x <= 0 || x >= 1 || alpha <= 0 || betaValue <= 0) return 0;
  return x ** (alpha - 1) * (1 - x) ** (betaValue - 1) / beta(alpha, betaValue);
};

const gammaPdf = (x: number, shape: number, scale: number) => {
  if (x < 0 || shape <= 0 || scale <= 0) return 0;
  return x ** (shape - 1) * Math.exp(-x / scale) / (gamma(shape) * scale ** shape);
};

const factorial = (value: number) => gamma(Math.round(value) + 1);
const combination = (n: number, k: number) => {
  const roundedN = Math.round(n);
  const roundedK = Math.round(k);
  if (roundedK < 0 || roundedK > roundedN) return 0;
  return Math.round(Math.exp(logGamma(roundedN + 1) - logGamma(roundedK + 1) - logGamma(roundedN - roundedK + 1)));
};

const poissonPmf = (x: number, lambda: number) => {
  const k = Math.round(x);
  if (k < 0 || lambda <= 0) return 0;
  return lambda ** k * Math.exp(-lambda) / factorial(k);
};

const binomialPmf = (x: number, n: number, probability: number) => {
  const k = Math.round(x);
  const trials = Math.round(n);
  if (k < 0 || k > trials || probability < 0 || probability > 1) return 0;
  return combination(trials, k) * probability ** k * (1 - probability) ** (trials - k);
};

const functionScope = {
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  asin: Math.asin,
  acos: Math.acos,
  atan: Math.atan,
  sinh: Math.sinh,
  cosh: Math.cosh,
  tanh: Math.tanh,
  exp: Math.exp,
  log: Math.log,
  log10: Math.log10,
  sqrt: Math.sqrt,
  abs: Math.abs,
  floor: Math.floor,
  ceil: Math.ceil,
  round: Math.round,
  min: Math.min,
  max: Math.max,
  pow: Math.pow,
  gamma,
  beta,
  erf,
  normalPdf,
  betaPdf,
  gammaPdf,
  poissonPmf,
  binomialPmf,
  pi: Math.PI,
  e: Math.E,
};

export const compileExpression = (expression: string, parameterNames: string[]) => {
  const node = parse(expression);
  const symbols = new Set(['x', 'pi', 'e', ...parameterNames]);

  node.traverse((child) => {
    if (!allowedNodeTypes.has(child.type)) {
      throw new Error(`不支持 ${child.type.replace('Node', '')} 类型的表达式`);
    }
    if (child.type === 'SymbolNode') {
      const name = (child as unknown as { name: string }).name;
      if (!symbols.has(name) && !allowedFunctions.has(name)) {
        throw new Error(`未知变量或函数：${name}`);
      }
    }
    if (child.type === 'FunctionNode') {
      const name = (child as unknown as { name: string }).name;
      if (!allowedFunctions.has(name)) throw new Error(`不支持函数：${name}`);
    }
  });

  const compiled = node.compile();
  return (x: number, parameters: ParameterValues) => {
    const result = compiled.evaluate({ ...functionScope, ...parameters, x });
    const number = typeof result === 'number' ? result : Number(result);
    return Number.isFinite(number) ? number : null;
  };
};

export const buildSeries = (config: FunctionConfig, parameters: ParameterValues) => {
  const evaluate = compileExpression(config.expression, config.parameters.map((item) => item.name));
  const points: Array<[number, number | null]> = [];

  if (config.chartType === 'bar') {
    for (let x = Math.ceil(config.xMin); x <= Math.floor(config.xMax); x += 1) {
      points.push([x, evaluate(x, parameters)]);
    }
    return points;
  }

  const ticksPerUnit = 10;
  const firstTick = Math.ceil(config.xMin * ticksPerUnit - 1e-9);
  const lastTick = Math.floor(config.xMax * ticksPerUnit + 1e-9);
  const availableTicks = Math.max(0, lastTick - firstTick + 1);
  const maximumPoints = Math.max(config.sampleCount, 20);
  const tickStride = Math.max(1, Math.ceil(availableTicks / maximumPoints));
  const alignedFirstTick = Math.ceil(firstTick / tickStride) * tickStride;

  for (let tick = alignedFirstTick; tick <= lastTick; tick += tickStride) {
    const x = tick / ticksPerUnit;
    const y = evaluate(x, parameters);
    const clipped = y !== null && Math.abs(y) > 1e10 ? null : y;
    points.push([x, clipped]);
  }
  return points;
};
