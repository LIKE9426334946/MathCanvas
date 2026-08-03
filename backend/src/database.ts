import initSqlJs, { type BindParams, type Database } from 'sql.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { defaultFunctions } from './defaultFunctions.js';
import type { Directory, FunctionConfig, FunctionConfigInput } from './types.js';

export const DEFAULT_DIRECTORY = 'Uncategorized';

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
  CREATE TABLE IF NOT EXISTS directories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL COLLATE NOCASE UNIQUE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
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

const directoryTable = database.exec('PRAGMA table_info(directories)');
const hasDirectoryOrder = directoryTable[0]?.values.some((row) => row[1] === 'sort_order') ?? false;
let directoryOrderMigrationNeeded = false;
if (!hasDirectoryOrder) {
  database.run('ALTER TABLE directories ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0');
  directoryOrderMigrationNeeded = true;
}

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

interface DirectoryRow {
  id: string;
  name: string;
  sort_order: number;
  function_count: number;
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

const normalizeDirectoryOrder = () => {
  const rows = queryAll<{ id: string; sort_order: number }>(`
    SELECT id, sort_order FROM directories ORDER BY sort_order, created_at, rowid
  `);
  let changed = false;
  rows.forEach((row, index) => {
    if (row.sort_order === index) return;
    database.run('UPDATE directories SET sort_order = ? WHERE id = ?', [index, row.id]);
    changed = true;
  });
  return changed;
};

const directoryOrderNormalized = normalizeDirectoryOrder();
if (directoryOrderMigrationNeeded || directoryOrderNormalized) persist();

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

const toDirectory = (row: DirectoryRow): Directory => ({
  id: row.id,
  name: row.name,
  order: row.sort_order,
  functionCount: row.function_count,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const ensureDirectoryRecord = (name: string) => {
  const normalized = name.trim();
  if (!normalized) return false;
  const existing = queryOne<{ id: string }>('SELECT id FROM directories WHERE name = ? COLLATE NOCASE', [normalized]);
  if (existing) return false;
  const now = new Date().toISOString();
  const nextOrder = queryOne<{ next_order: number }>('SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM directories')?.next_order ?? 0;
  database.run(
    'INSERT INTO directories (id, name, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    [randomUUID(), normalized, nextOrder, now, now],
  );
  return true;
};

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
    ? queryAll<FunctionRow>('SELECT * FROM functions WHERE category = ? ORDER BY created_at ASC, rowid ASC', [category])
    : queryAll<FunctionRow>('SELECT * FROM functions ORDER BY category COLLATE NOCASE, created_at ASC, rowid ASC');
  return rows.map(toConfig);
};

export const listDirectories = (): Directory[] => queryAll<DirectoryRow>(`
  SELECT
    d.id,
    d.name,
    d.sort_order,
    d.created_at,
    d.updated_at,
    (SELECT COUNT(*) FROM functions f WHERE f.category = d.name COLLATE NOCASE) AS function_count
  FROM directories d
  ORDER BY d.sort_order, d.created_at, d.name COLLATE NOCASE
`).map(toDirectory);

export const createDirectory = (name: string): Directory => {
  const normalized = name.trim();
  if (!ensureDirectoryRecord(normalized)) throw new Error('DIRECTORY_EXISTS');
  persist();
  return listDirectories().find((item) => item.name.toLowerCase() === normalized.toLowerCase())!;
};

export const updateDirectory = (id: string, name: string): Directory | undefined => {
  const existing = queryOne<DirectoryRow>(`
    SELECT id, name, sort_order, created_at, updated_at, 0 AS function_count FROM directories WHERE id = ?
  `, [id]);
  if (!existing) return undefined;
  const normalized = name.trim();
  const conflict = queryOne<{ id: string }>('SELECT id FROM directories WHERE name = ? COLLATE NOCASE AND id != ?', [normalized, id]);
  if (conflict) throw new Error('DIRECTORY_EXISTS');
  const now = new Date().toISOString();
  database.run('BEGIN TRANSACTION');
  try {
    database.run('UPDATE directories SET name = ?, updated_at = ? WHERE id = ?', [normalized, now, id]);
    database.run('UPDATE functions SET category = ?, updated_at = ? WHERE category = ? COLLATE NOCASE', [normalized, now, existing.name]);
    database.run('COMMIT');
    persist();
  } catch (error) {
    database.run('ROLLBACK');
    throw error;
  }
  return listDirectories().find((item) => item.id === id);
};

const applyDirectoryOrder = (ids: string[]) => {
  const now = new Date().toISOString();
  ids.forEach((id, index) => {
    database.run('UPDATE directories SET sort_order = ?, updated_at = ? WHERE id = ?', [index, now, id]);
  });
};

export const reorderDirectories = (ids: string[]): Directory[] => {
  const currentIds = listDirectories().map((item) => item.id);
  const currentIdSet = new Set(currentIds);
  if (ids.length !== currentIds.length || ids.some((id) => !currentIdSet.has(id))) {
    throw new Error('DIRECTORY_ORDER_INVALID');
  }

  database.run('BEGIN TRANSACTION');
  try {
    applyDirectoryOrder(ids);
    database.run('COMMIT');
    persist();
  } catch (error) {
    database.run('ROLLBACK');
    throw error;
  }
  return listDirectories();
};

export const deleteDirectory = (id: string): { movedFunctions: number } | undefined => {
  const existing = queryOne<DirectoryRow>(`
    SELECT id, name, sort_order, created_at, updated_at, 0 AS function_count FROM directories WHERE id = ?
  `, [id]);
  if (!existing) return undefined;
  if (existing.name.toLowerCase() === DEFAULT_DIRECTORY.toLowerCase()) throw new Error('DEFAULT_DIRECTORY');

  database.run('BEGIN TRANSACTION');
  try {
    ensureDirectoryRecord(DEFAULT_DIRECTORY);
    const now = new Date().toISOString();
    database.run('UPDATE functions SET category = ?, updated_at = ? WHERE category = ? COLLATE NOCASE', [DEFAULT_DIRECTORY, now, existing.name]);
    const movedFunctions = database.getRowsModified();
    database.run('DELETE FROM directories WHERE id = ?', [id]);
    normalizeDirectoryOrder();
    database.run('COMMIT');
    persist();
    return { movedFunctions };
  } catch (error) {
    database.run('ROLLBACK');
    throw error;
  }
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
  ensureDirectoryRecord(input.category);
  insert(data);
  persist();
  return getFunctionById(data.id)!;
};

export const updateFunction = (id: string, input: FunctionConfigInput): FunctionConfig | undefined => {
  const existing = getFunctionById(id);
  if (!existing) return undefined;
  ensureDirectoryRecord(input.category);
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

export const importFunctions = (items: FunctionConfigInput[], mode: 'merge' | 'replace', directories: Array<{ name: string; order?: number }> = []) => {
  database.run('BEGIN TRANSACTION');
  try {
    if (mode === 'replace') database.run('DELETE FROM functions');
    const orderedDirectories = directories
      .map((directory, index) => ({ ...directory, sourceIndex: index }))
      .sort((a, b) => (a.order ?? a.sourceIndex) - (b.order ?? b.sourceIndex));
    for (const directory of orderedDirectories) ensureDirectoryRecord(directory.name);
    for (const item of items) {
      ensureDirectoryRecord(item.category);
      const existing = queryOne<FunctionRow>('SELECT * FROM functions WHERE slug = ?', [item.slug]);
      if (existing) update(serialize(item, existing.id, existing.created_at));
      else insert(serialize(item));
    }
    if (orderedDirectories.length > 0) {
      const currentDirectories = listDirectories();
      const requestedIds = orderedDirectories
        .map((directory) => currentDirectories.find((item) => item.name.toLowerCase() === directory.name.toLowerCase())?.id)
        .filter((id): id is string => Boolean(id));
      const requestedIdSet = new Set(requestedIds);
      applyDirectoryOrder([
        ...requestedIds,
        ...currentDirectories.map((directory) => directory.id).filter((id) => !requestedIdSet.has(id)),
      ]);
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

let directoriesChanged = false;
for (const row of queryAll<{ category: string }>('SELECT DISTINCT category FROM functions')) {
  directoriesChanged = ensureDirectoryRecord(row.category) || directoriesChanged;
}
if (directoriesChanged) persist();
