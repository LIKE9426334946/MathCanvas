import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { ZodError } from 'zod';
import {
  createDirectory,
  createFunction,
  deleteDirectory,
  deleteFunction,
  getFunctionById,
  getFunctionBySlug,
  importFunctions,
  listDirectories,
  listFunctions,
  reorderDirectories,
  updateDirectory,
  updateFunction,
} from './database.js';
import { directoryInputSchema, directoryOrderSchema, functionInputSchema, importSchema } from './validation.js';

const app = express();
const host = process.env.HOST ?? '127.0.0.1';
const port = Number(process.env.PORT ?? 3021);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok', service: 'MathCanvas' });
});

app.get('/api/directories', (_request, response) => {
  response.json(listDirectories());
});

app.post('/api/directories', (request, response) => {
  const input = directoryInputSchema.parse(request.body);
  response.status(201).json(createDirectory(input.name));
});

app.put('/api/directories/order', (request, response) => {
  const input = directoryOrderSchema.parse(request.body);
  response.json(reorderDirectories(input.ids));
});

app.put('/api/directories/:id', (request, response) => {
  const input = directoryInputSchema.parse(request.body);
  const updated = updateDirectory(request.params.id, input.name);
  if (!updated) return response.status(404).json({ message: '没有找到这个目录' });
  response.json(updated);
});

app.delete('/api/directories/:id', (request, response) => {
  const result = deleteDirectory(request.params.id);
  if (!result) return response.status(404).json({ message: '没有找到这个目录' });
  response.json(result);
});

app.get('/api/functions', (request, response) => {
  const category = typeof request.query.category === 'string' ? request.query.category : undefined;
  response.json(listFunctions(category));
});

app.get('/api/functions/:slug', (request, response) => {
  const item = getFunctionBySlug(request.params.slug);
  if (!item) return response.status(404).json({ message: '没有找到这个函数' });
  response.json(item);
});

app.post('/api/functions', (request, response) => {
  const input = functionInputSchema.parse(request.body);
  const created = createFunction(input);
  response.status(201).json(created);
});

app.put('/api/functions/:id', (request, response) => {
  if (!getFunctionById(request.params.id)) {
    return response.status(404).json({ message: '没有找到这个函数' });
  }
  const input = functionInputSchema.parse(request.body);
  response.json(updateFunction(request.params.id, input));
});

app.delete('/api/functions/:id', (request, response) => {
  if (!deleteFunction(request.params.id)) {
    return response.status(404).json({ message: '没有找到这个函数' });
  }
  response.status(204).send();
});

app.get('/api/config/export', (_request, response) => {
  response.setHeader('Content-Disposition', 'attachment; filename="mathcanvas-functions.json"');
  response.json({
    version: 3,
    exportedAt: new Date().toISOString(),
    directories: listDirectories().map(({ name, order }) => ({ name, order })),
    functions: listFunctions(),
  });
});

app.post('/api/config/import', (request, response) => {
  const input = importSchema.parse(request.body);
  response.json({ imported: input.functions.length, functions: importFunctions(input.functions, input.mode, input.directories) });
});

app.use('/api', (_request, response) => {
  response.status(404).json({ message: 'API 路径不存在' });
});

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const clientDirectory = path.resolve(currentDirectory, '../../client/dist');

if (fs.existsSync(clientDirectory)) {
  app.use(express.static(clientDirectory, { maxAge: '1h', index: false }));
  app.get('*', (_request, response) => response.sendFile(path.join(clientDirectory, 'index.html')));
}

app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  if (error instanceof ZodError) {
    return response.status(400).json({ message: '函数配置不完整', issues: error.issues });
  }
  if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
    return response.status(409).json({ message: '这个页面标识已经存在，请换一个 slug' });
  }
  if (error instanceof Error && error.message === 'DIRECTORY_EXISTS') {
    return response.status(409).json({ message: '这个目录名称已经存在' });
  }
  if (error instanceof Error && error.message === 'DEFAULT_DIRECTORY') {
    return response.status(400).json({ message: 'Uncategorized 是系统保留目录，不能删除' });
  }
  if (error instanceof Error && error.message === 'DIRECTORY_ORDER_INVALID') {
    return response.status(400).json({ message: '目录顺序已经变化，请刷新后重试' });
  }
  console.error(error);
  response.status(500).json({ message: '服务器处理请求时出现错误' });
});

app.listen(port, host, () => {
  console.log(`MathCanvas is running at http://${host}:${port}`);
});
