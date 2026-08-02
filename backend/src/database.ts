import initSqlJs, { type BindParams, type Database } from 'sql.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { defaultFunctions } from './defaultFunctions.js';
import type { FunctionConfig, FunctionConfigInput } from './types.js';

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const dataDirectory = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.resolve(currentDirectory, '../data');

fs.mkdirSync(dataDirectory, { recursive: true });
const databasePath = path.join(dataDirectory, 'mathcanvas.db');
const SQL = await initSqlJs();
const database: Database = fs.existsSync(databasePath)
  ? new SQL.Database(fs.readFileSync(databasePath))
  : new SQL.Database();

database.run(`
  CREATE TABLE IF NOT EXISTS functions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    expression TEXT NOT NULL,
    formula TEXT NOT NULL DEFAULT '',
    parameters TEXT NOT NULL DEFAULT '[]',
    x_min REAL NOT NULL,
    x_max REAL NOT NULL,
    y_min REAL,
    y_max REAL,
    sample_count INTEGER NOT NULL DEFAULT 400,
    chart_type TEXT NOT NULL DEFAULT 'line',
    is_builtin INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_functions_category ON functions(category);
  CREATE INDEX IF NOT EXISTS idx_functions_name ON functions(name);
`);

interface FunctionRow {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  expression: string;
  formula: string;
  parameters: string;
  x_min: number;
  x_max: number;
  y_min: number | null;
  y_max: number | null;
  sample_count: number;
  chart_type: 'line' | 'bar';
  is_builtin: number;
  created_at: string;
  updated_at: string;
}

const persist = () => {
  const temporaryPath = `${databasePath}.tmp`;
  fs.writeFileSync(temporaryPath, Buffer.from(database.export()));
  fs.renameSync(temporaryPath, databasePath);
};

const queryAll = <T>(sql: string, params: BindParams = []): T[] => {
  const statement = database.prepare(sql);
  statement.bind(params);
  const rows: T[] = [];
  while (statement.step()) rows.push(statement.getAsObject() as T);
  statement.free();
  return rows;
};

const queryOne = <T>(sql: string, params: BindParams = []): T | undefined => queryAll<T>(sql, params)[0];

const toConfig = (row: FunctionRow): FunctionConfig => ({
  id: row.id,
  name: row.name,
  slug: row.slug,
  category: row.category,
  description: row.description,
  expression: row.expression,
  formula: row.formula,
  parameters: JSON.parse(row.parameters),
  xMin: row.x_min,
  xMax: row.x_max,
  yMin: row.y_min,
  yMax: row.y_max,
  sampleCount: row.sample_count,
  chartType: row.chart_type,
  isBuiltin: Boolean(row.is_builtin),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const serialize = (input: FunctionConfigInput, id?: string, createdAt?: string) => {
  const now = new Date().toISOString();
  return {
    ...input,
    id: id ?? input.id ?? randomUUID(),
    parameters: JSON.stringify(input.parameters),
    isBuiltin: input.isBuiltin ? 1 : 0,
    createdAt: createdAt ?? now,
    updatedAt: now,
  };
};

const insert = (data: ReturnType<typeof serialize>) => {
  database.run(`
    INSERT INTO functions (
      id, name, slug, category, description, expression, formula, parameters,
      x_min, x_max, y_min, y_max, sample_count, chart_type, is_builtin, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    data.id, data.name, data.slug, data.category, data.description, data.expression,
    data.formula, data.parameters, data.xMin, data.xMax, data.yMin, data.yMax,
    data.sampleCount, data.chartType, data.isBuiltin, data.createdAt, data.updatedAt,
  ]);
};

const update = (data: ReturnType<typeof serialize>) => {
  database.run(`
    UPDATE functions SET
      name=?, slug=?, category=?, description=?, expression=?, formula=?, parameters=?,
      x_min=?, x_max=?, y_min=?, y_max=?, sample_count=?, chart_type=?, is_builtin=?, updated_at=?
    WHERE id=?
  `, [
    data.name, data.slug, data.category, data.description, data.expression, data.formula,
    data.parameters, data.xMin, data.xMax, data.yMin, data.yMax, data.sampleCount,
    data.chartType, data.isBuiltin, data.updatedAt, data.id,
  ]);
};

export const listFunctions = (category?: string): FunctionConfig[] => {
  const rows = category
    ? queryAll<FunctionRow>('SELECT * FROM functions WHERE category = ? ORDER BY name COLLATE NOCASE', [category])
    : queryAll<FunctionRow>('SELECT * FROM functions ORDER BY category COLLATE NOCASE, name COLLATE NOCASE');
  return rows.map(toConfig);
};

export const getFunctionBySlug = (slug: string): FunctionConfig | undefined => {
  const row = queryOne<FunctionRow>('SELECT * FROM functions WHERE slug = ?', [slug]);
  return row ? toConfig(row) : undefined;
};

export const getFunctionById = (id: string): FunctionConfig | undefined => {
  const row = queryOne<FunctionRow>('SELECT * FROM functions WHERE id = ?', [id]);
  return row ? toConfig(row) : undefined;
};

export const createFunction = (input: FunctionConfigInput): FunctionConfig => {
  const data = serialize(input);
  insert(data);
  persist();
  return getFunctionById(data.id)!;
};

export const updateFunction = (id: string, input: FunctionConfigInput): FunctionConfig | undefined => {
  const existing = getFunctionById(id);
  if (!existing) return undefined;
  update(serialize(input, id, existing.createdAt));
  persist();
  return getFunctionById(id);
};

export const deleteFunction = (id: string): boolean => {
  database.run('DELETE FROM functions WHERE id = ?', [id]);
  const deleted = database.getRowsModified() > 0;
  if (deleted) persist();
  return deleted;
};

export const importFunctions = (items: FunctionConfigInput[], mode: 'merge' | 'replace') => {
  database.run('BEGIN TRANSACTION');
  try {
    if (mode === 'replace') database.run('DELETE FROM functions');
    for (const item of items) {
      const existing = queryOne<FunctionRow>('SELECT * FROM functions WHERE slug = ?', [item.slug]);
      if (existing) update(serialize(item, existing.id, existing.created_at));
      else insert(serialize(item));
    }
    database.run('COMMIT');
    persist();
  } catch (error) {
    database.run('ROLLBACK');
    throw error;
  }
  return listFunctions();
};

const count = queryOne<{ count: number }>('SELECT COUNT(*) AS count FROM functions')?.count ?? 0;
if (count === 0) {
  database.run('BEGIN TRANSACTION');
  for (const item of defaultFunctions) insert(serialize(item));
  database.run('COMMIT');
  persist();
}
