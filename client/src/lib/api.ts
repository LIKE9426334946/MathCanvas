import type { Directory, FunctionConfig, FunctionInput } from '../types';

const request = async <T>(url: string, options?: RequestInit): Promise<T> => {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options?.body ? { 'Content-Type': 'application/json' } : {}),
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: '请求失败' }));
    throw new Error(body.message ?? '请求失败');
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
};

export const api = {
  listDirectories: () => request<Directory[]>('/api/directories'),
  createDirectory: (name: string) => request<Directory>('/api/directories', {
    method: 'POST',
    body: JSON.stringify({ name }),
  }),
  updateDirectory: (id: string, name: string) => request<Directory>(`/api/directories/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ name }),
  }),
  deleteDirectory: (id: string) => request<{ movedFunctions: number }>(`/api/directories/${id}`, { method: 'DELETE' }),
  listFunctions: () => request<FunctionConfig[]>('/api/functions'),
  getFunction: (slug: string) => request<FunctionConfig>(`/api/functions/${encodeURIComponent(slug)}`),
  createFunction: (input: FunctionInput) => request<FunctionConfig>('/api/functions', {
    method: 'POST',
    body: JSON.stringify(input),
  }),
  updateFunction: (id: string, input: FunctionInput) => request<FunctionConfig>(`/api/functions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  }),
  deleteFunction: (id: string) => request<void>(`/api/functions/${id}`, { method: 'DELETE' }),
  importFunctions: (functions: FunctionInput[], mode: 'merge' | 'replace', directories?: Array<{ name: string }>) => request<{ imported: number; functions: FunctionConfig[] }>('/api/config/import', {
    method: 'POST',
    body: JSON.stringify({ functions, mode, directories }),
  }),
};
