import { z } from 'zod';

export const directoryInputSchema = z.object({
  name: z.string().trim().min(1, '目录名称不能为空').max(60),
  order: z.number().int().min(0).optional(),
});

export const directoryOrderSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100).refine(
    (ids) => new Set(ids).size === ids.length,
    '目录不能重复',
  ),
});

const parameterSchema = z.object({
  name: z.string().regex(/^[A-Za-z][A-Za-z0-9_]*$/, '参数名必须以英文字母开头'),
  label: z.string().min(1).max(20),
  min: z.number().finite(),
  max: z.number().finite(),
  step: z.number().positive().finite(),
  default: z.number().finite(),
}).superRefine((value, ctx) => {
  if (value.max <= value.min) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: '参数最大值必须大于最小值' });
  }
  if (value.default < value.min || value.default > value.max) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: '默认值必须在参数范围内' });
  }
});

export const functionInputSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(80),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug 只能包含小写字母、数字和连字符'),
  category: z.string().trim().min(1).max(60),
  description: z.string().trim().max(1000).default(''),
  details: z.string().trim().max(10000).default(''),
  expression: z.string().trim().min(1).max(500),
  formula: z.string().trim().max(1000).default(''),
  parameters: z.array(parameterSchema).max(8).default([]),
  xMin: z.number().finite(),
  xMax: z.number().finite(),
  yMin: z.number().finite().nullable(),
  yMax: z.number().finite().nullable(),
  sampleCount: z.number().int().min(20).max(2000).default(400),
  chartType: z.enum(['line', 'bar']).default('line'),
  isBuiltin: z.boolean().optional().default(false),
}).superRefine((value, ctx) => {
  if (value.xMax <= value.xMin) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'x 轴最大值必须大于最小值' });
  }
  if (value.yMin !== null && value.yMax !== null && value.yMax <= value.yMin) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'y 轴最大值必须大于最小值' });
  }
  const names = value.parameters.map((item) => item.name);
  if (new Set(names).size !== names.length) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: '参数名不能重复' });
  }
});

export const importSchema = z.object({
  mode: z.enum(['merge', 'replace']).default('merge'),
  directories: z.array(directoryInputSchema).max(100).optional(),
  functions: z.array(functionInputSchema).min(1).max(500),
});
