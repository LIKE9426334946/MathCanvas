import {
  Download,
  FileUp,
  Folder,
  FolderOpen,
  FolderPlus,
  FunctionSquare,
  Pencil,
  Plus,
  Save,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { FunctionChart } from '../components/FunctionChart';
import { LoadingState } from '../components/LoadingState';
import { api } from '../lib/api';
import { compileExpression } from '../lib/expressionEngine';
import type { Directory, FunctionConfig, FunctionInput, FunctionParameter, ParameterValues } from '../types';

interface AdminProps {
  functions: FunctionConfig[];
  setFunctions: (functions: FunctionConfig[]) => void;
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
}

const emptyFunction = (category = 'Uncategorized'): FunctionInput => ({
  name: '',
  slug: '',
  category,
  description: '',
  expression: 'a * sin(b * x)',
  formula: 'f(x)=a\\sin(bx)',
  parameters: [
    { name: 'a', label: 'a', min: 0, max: 3, step: 0.1, default: 1 },
    { name: 'b', label: 'b', min: 0, max: 5, step: 0.1, default: 1 },
  ],
  xMin: -6.28,
  xMax: 6.28,
  yMin: -3,
  yMax: 3,
  sampleCount: 500,
  chartType: 'line',
  isBuiltin: false,
});

const toInput = (config: FunctionConfig): FunctionInput => ({
  name: config.name,
  slug: config.slug,
  category: config.category,
  description: config.description,
  expression: config.expression,
  formula: config.formula,
  parameters: config.parameters.map((item) => ({ ...item })),
  xMin: config.xMin,
  xMax: config.xMax,
  yMin: config.yMin,
  yMax: config.yMax,
  sampleCount: config.sampleCount,
  chartType: config.chartType,
  isBuiltin: config.isBuiltin,
});

const slugify = (value: string) => value
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

const previewConfig = (input: FunctionInput): FunctionConfig => ({
  ...input,
  id: input.id ?? 'preview',
  isBuiltin: Boolean(input.isBuiltin),
  createdAt: '',
  updatedAt: '',
});

const numberValue = (value: string, fallback = 0) => value === '' ? fallback : Number(value);

export const AdminPage = ({ functions, setFunctions, loading, error, refresh }: AdminProps) => {
  const [directories, setDirectories] = useState<Directory[]>([]);
  const [directoriesLoading, setDirectoriesLoading] = useState(true);
  const [selectedDirectoryId, setSelectedDirectoryId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<FunctionInput>(emptyFunction);
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [addingDirectory, setAddingDirectory] = useState(false);
  const [newDirectoryName, setNewDirectoryName] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLFormElement>(null);

  const selectedDirectory = directories.find((item) => item.id === selectedDirectoryId) ?? null;
  const functionsInDirectory = useMemo(() => {
    if (!selectedDirectory) return [];
    const normalized = query.trim().toLowerCase();
    return functions.filter((item) => (
      item.category.toLowerCase() === selectedDirectory.name.toLowerCase()
      && (!normalized || `${item.name} ${item.expression} ${item.description}`.toLowerCase().includes(normalized))
    ));
  }, [functions, query, selectedDirectory]);

  const loadDirectories = async () => {
    setDirectoriesLoading(true);
    try {
      const items = await api.listDirectories();
      setDirectories(items);
      return items;
    } finally {
      setDirectoriesLoading(false);
    }
  };

  useEffect(() => {
    void loadDirectories().catch((caught) => {
      setMessage({ type: 'error', text: caught instanceof Error ? caught.message : '目录加载失败' });
    });
  }, []);

  useEffect(() => {
    if (loading || directoriesLoading || selectedDirectoryId || directories.length === 0) return;
    const firstDirectory = directories[0];
    setSelectedDirectoryId(firstDirectory.id);
    const firstFunction = functions.find((item) => item.category.toLowerCase() === firstDirectory.name.toLowerCase());
    if (firstFunction) {
      setSelectedId(firstFunction.id);
      setDraft(toInput(firstFunction));
    } else {
      setDraft(emptyFunction(firstDirectory.name));
    }
  }, [directories, directoriesLoading, functions, loading, selectedDirectoryId]);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    window.setTimeout(() => setMessage(null), 3500);
  };

  const scrollToEditor = () => {
    window.setTimeout(() => editorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  const selectFunction = (config: FunctionConfig, shouldScroll = true) => {
    setSelectedId(config.id);
    setDraft(toInput(config));
    setMessage(null);
    if (shouldScroll) scrollToEditor();
  };

  const selectDirectory = (directory: Directory) => {
    setSelectedDirectoryId(directory.id);
    setQuery('');
    const firstFunction = functions.find((item) => item.category.toLowerCase() === directory.name.toLowerCase());
    if (firstFunction) selectFunction(firstFunction, false);
    else {
      setSelectedId(null);
      setDraft(emptyFunction(directory.name));
    }
  };

  const startNew = () => {
    setSelectedId(null);
    setDraft(emptyFunction(selectedDirectory?.name));
    setMessage(null);
    scrollToEditor();
  };

  const setField = <K extends keyof FunctionInput>(key: K, value: FunctionInput[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const updateParameter = (index: number, key: keyof FunctionParameter, value: string | number) => {
    setDraft((current) => ({
      ...current,
      parameters: current.parameters.map((parameter, parameterIndex) => (
        parameterIndex === index ? { ...parameter, [key]: value } : parameter
      )),
    }));
  };

  const addParameter = () => {
    const index = draft.parameters.length + 1;
    setField('parameters', [
      ...draft.parameters,
      { name: `p${index}`, label: `p${index}`, min: 0, max: 10, step: 0.1, default: 1 },
    ]);
  };

  const removeParameter = (index: number) => {
    setField('parameters', draft.parameters.filter((_, parameterIndex) => parameterIndex !== index));
  };

  const createNewDirectory = async (event: FormEvent) => {
    event.preventDefault();
    const name = newDirectoryName.trim();
    if (!name) return;
    try {
      const created = await api.createDirectory(name);
      setDirectories((current) => [...current, created]);
      setSelectedDirectoryId(created.id);
      setSelectedId(null);
      setDraft(emptyFunction(created.name));
      setNewDirectoryName('');
      setAddingDirectory(false);
      showMessage('success', `目录“${created.name}”已经创建`);
    } catch (caught) {
      showMessage('error', caught instanceof Error ? caught.message : '目录创建失败');
    }
  };

  const renameDirectory = async (directory: Directory) => {
    const name = window.prompt('请输入新的目录名称', directory.name)?.trim();
    if (!name || name === directory.name) return;
    try {
      const updated = await api.updateDirectory(directory.id, name);
      setDirectories((current) => current.map((item) => item.id === directory.id ? updated : item));
      setFunctions(functions.map((item) => item.category.toLowerCase() === directory.name.toLowerCase() ? { ...item, category: updated.name } : item));
      if (draft.category.toLowerCase() === directory.name.toLowerCase()) setField('category', updated.name);
      showMessage('success', '目录名称已修改');
    } catch (caught) {
      showMessage('error', caught instanceof Error ? caught.message : '目录修改失败');
    }
  };

  const removeDirectory = async (directory: Directory) => {
    const count = functions.filter((item) => item.category.toLowerCase() === directory.name.toLowerCase()).length;
    const detail = count > 0 ? `\n目录中的 ${count} 个函数会移动到 Uncategorized，不会被删除。` : '';
    if (!window.confirm(`确定删除目录“${directory.name}”吗？${detail}`)) return;
    try {
      const result = await api.deleteDirectory(directory.id);
      const [nextDirectories, nextFunctions] = await Promise.all([api.listDirectories(), api.listFunctions()]);
      setDirectories(nextDirectories);
      setFunctions(nextFunctions);
      const fallback = nextDirectories.find((item) => item.name === 'Uncategorized') ?? nextDirectories[0];
      if (fallback) {
        setSelectedDirectoryId(fallback.id);
        const firstFunction = nextFunctions.find((item) => item.category.toLowerCase() === fallback.name.toLowerCase());
        if (firstFunction) selectFunction(firstFunction, false);
        else {
          setSelectedId(null);
          setDraft(emptyFunction(fallback.name));
        }
      }
      showMessage('success', result.movedFunctions > 0 ? `目录已删除，${result.movedFunctions} 个函数已移动` : '目录已删除');
    } catch (caught) {
      showMessage('error', caught instanceof Error ? caught.message : '目录删除失败');
    }
  };

  const saveFunction = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      if (!draft.slug) throw new Error('请填写页面标识 slug');
      compileExpression(draft.expression, draft.parameters.map((item) => item.name));
      const saved = selectedId
        ? await api.updateFunction(selectedId, draft)
        : await api.createFunction(draft);
      const nextFunctions = selectedId
        ? functions.map((item) => item.id === selectedId ? saved : item)
        : [...functions, saved];
      setFunctions(nextFunctions);
      setSelectedId(saved.id);
      setDraft(toInput(saved));
      const nextDirectories = await loadDirectories();
      const directory = nextDirectories.find((item) => item.name.toLowerCase() === saved.category.toLowerCase());
      if (directory) setSelectedDirectoryId(directory.id);
      showMessage('success', selectedId ? '函数修改已保存' : '新函数已经创建');
    } catch (caught) {
      showMessage('error', caught instanceof Error ? caught.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const deleteSelected = async () => {
    if (!selectedId) return;
    const selected = functions.find((item) => item.id === selectedId);
    if (!window.confirm(`确定删除“${selected?.name ?? '这个函数'}”吗？`)) return;
    try {
      await api.deleteFunction(selectedId);
      const next = functions.filter((item) => item.id !== selectedId);
      setFunctions(next);
      const nextInDirectory = next.find((item) => item.category.toLowerCase() === draft.category.toLowerCase());
      if (nextInDirectory) selectFunction(nextInDirectory, false);
      else {
        setSelectedId(null);
        setDraft(emptyFunction(selectedDirectory?.name));
      }
      await loadDirectories();
      showMessage('success', '函数已删除');
    } catch (caught) {
      showMessage('error', caught instanceof Error ? caught.message : '删除失败');
    }
  };

  const importConfig = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text()) as { functions?: FunctionInput[]; directories?: Array<{ name: string }> } | FunctionInput[];
      const items = Array.isArray(parsed) ? parsed : parsed.functions;
      const importedDirectories = Array.isArray(parsed) ? undefined : parsed.directories;
      if (!Array.isArray(items) || items.length === 0) throw new Error('JSON 文件中没有函数配置');
      const result = await api.importFunctions(items, 'merge', importedDirectories);
      setFunctions(result.functions);
      const nextDirectories = await loadDirectories();
      if (nextDirectories[0]) {
        setSelectedDirectoryId(nextDirectories[0].id);
        const firstFunction = result.functions.find((item) => item.category.toLowerCase() === nextDirectories[0].name.toLowerCase());
        if (firstFunction) selectFunction(firstFunction, false);
        else {
          setSelectedId(null);
          setDraft(emptyFunction(nextDirectories[0].name));
        }
      }
      showMessage('success', `已导入 ${result.imported} 个函数配置`);
    } catch (caught) {
      showMessage('error', caught instanceof Error ? caught.message : '导入失败');
    }
  };

  const currentValues: ParameterValues = Object.fromEntries(draft.parameters.map((parameter) => [parameter.name, parameter.default]));
  const functionCount = (directory: Directory) => functions.filter((item) => item.category.toLowerCase() === directory.name.toLowerCase()).length;

  if (loading || directoriesLoading) return <LoadingState />;

  return (
    <main className="admin-page mx-auto min-w-0 max-w-7xl overflow-x-hidden px-4 pb-24 pt-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-canvas-600 dark:text-canvas-100">Desktop Studio</span>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950 dark:text-white">函数管理后台</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">先选择目录，再管理目录中的函数。</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input ref={fileInputRef} type="file" accept="application/json,.json" className="hidden" onChange={importConfig} />
          <button type="button" onClick={() => fileInputRef.current?.click()} className="admin-button-secondary"><FileUp size={17} /> 导入 JSON</button>
          <a href="/api/config/export" download className="admin-button-secondary"><Download size={17} /> 导出 JSON</a>
        </div>
      </div>

      {message && (
        <div className={`fixed right-4 top-20 z-50 max-w-[calc(100vw-2rem)] rounded-2xl px-4 py-3 text-sm font-semibold shadow-xl ${message.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}`}>
          {message.text}
        </div>
      )}

      {error && (
        <div className="mb-5 rounded-2xl bg-rose-50 p-4 text-sm font-medium text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
          {error} <button type="button" onClick={() => void refresh()} className="ml-2 underline">重新加载</button>
        </div>
      )}

      <section className="admin-card min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="admin-section-title">
            <span><FolderOpen size={17} /></span>
            <div><h2>目录</h2><p>选择目录后只显示其中的函数</p></div>
          </div>
          <button type="button" onClick={() => setAddingDirectory(true)} className="admin-button-primary"><FolderPlus size={17} /> 新建目录</button>
        </div>

        {addingDirectory && (
          <form onSubmit={createNewDirectory} className="mt-4 flex min-w-0 flex-wrap gap-2 rounded-2xl bg-canvas-50 p-3 dark:bg-canvas-500/10">
            <input autoFocus value={newDirectoryName} onChange={(event) => setNewDirectoryName(event.target.value)} maxLength={60} placeholder="输入目录名称" className="min-w-48 flex-1 rounded-xl border border-canvas-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-canvas-500 dark:border-white/10 dark:bg-black/20" />
            <button type="submit" className="admin-button-primary">创建</button>
            <button type="button" onClick={() => { setAddingDirectory(false); setNewDirectoryName(''); }} className="admin-button-secondary">取消</button>
          </form>
        )}

        <div className="mt-5 grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {directories.map((directory) => {
            const selected = directory.id === selectedDirectoryId;
            const count = functionCount(directory);
            return (
              <div
                key={directory.id}
                className={`group flex min-w-0 items-start gap-2 rounded-2xl border p-3 transition-all ${selected ? 'border-canvas-500 bg-canvas-600 text-white shadow-lg shadow-canvas-500/20' : 'border-slate-200 bg-slate-50 hover:border-canvas-300 hover:bg-white dark:border-white/10 dark:bg-black/20 dark:hover:border-canvas-500/50 dark:hover:bg-white/5'}`}
              >
                <button type="button" onClick={() => selectDirectory(directory)} className="flex min-w-0 flex-1 items-start gap-3 rounded-xl p-1 text-left">
                  <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${selected ? 'bg-white/15' : 'bg-white text-canvas-600 dark:bg-white/5 dark:text-canvas-100'}`}><Folder size={18} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold">{directory.name}</span>
                    <span className={`mt-1 block text-xs ${selected ? 'text-white/70' : 'text-slate-400'}`}>{count} 个函数</span>
                  </span>
                </button>
                <span className="flex shrink-0 flex-col gap-1">
                  <button type="button" onClick={() => void renameDirectory(directory)} className={`grid h-8 w-8 place-items-center rounded-lg transition ${selected ? 'text-white/70 hover:bg-white/15 hover:text-white' : 'text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white'}`} title="重命名目录"><Pencil size={14} /></button>
                  <button type="button" onClick={() => void removeDirectory(directory)} className={`grid h-8 w-8 place-items-center rounded-lg transition ${selected ? 'text-white/70 hover:bg-white/15 hover:text-white' : 'text-slate-400 hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-300'}`} title="删除目录"><Trash2 size={14} /></button>
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="admin-card mt-5 min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="admin-section-title">
            <span><FunctionSquare size={17} /></span>
            <div><h2>{selectedDirectory?.name ?? '函数'}目录</h2><p>选择函数后在下方编辑</p></div>
          </div>
          <button type="button" onClick={startNew} disabled={!selectedDirectory} className="admin-button-primary disabled:opacity-50"><Plus size={17} /> 新建函数</button>
        </div>

        <label className="mt-4 flex min-w-0 items-center gap-2 rounded-xl bg-slate-50 px-3 dark:bg-black/20">
          <Search size={16} className="shrink-0 text-slate-400" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索当前目录中的函数…" className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none" />
        </label>

        {functionsInDirectory.length > 0 ? (
          <div className="mt-4 grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {functionsInDirectory.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => selectFunction(item)}
                className={`min-w-0 rounded-2xl border p-3 text-left transition ${selectedId === item.id ? 'border-canvas-500 bg-canvas-600 text-white shadow-lg shadow-canvas-500/20' : 'border-slate-200 bg-white hover:border-canvas-300 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-canvas-500/50 dark:hover:bg-white/5'}`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${selectedId === item.id ? 'bg-white/15' : 'bg-canvas-50 text-canvas-600 dark:bg-canvas-500/10 dark:text-canvas-100'}`}><FunctionSquare size={17} /></span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold">{item.name}</span><code className={`mt-0.5 block truncate text-xs ${selectedId === item.id ? 'text-white/65' : 'text-slate-400'}`}>{item.expression}</code></span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-400 dark:border-white/15">
            {query ? '没有找到匹配的函数' : '这个目录还没有函数，可以点击“新建函数”添加'}
          </div>
        )}
      </section>

      <form ref={editorRef} onSubmit={saveFunction} className="min-w-0 scroll-mt-24 space-y-5 pt-5">
        <section className="admin-card min-w-0">
          <div className="admin-section-title"><span>01</span><div><h2>基本信息</h2><p>名称、所属目录以及在函数库中的说明</p></div></div>
          <div className="mt-5 grid min-w-0 gap-4 md:grid-cols-2">
            <label className="admin-field"><span>函数名称</span><input required value={draft.name} onChange={(event) => setField('name', event.target.value)} onBlur={() => !draft.slug && setField('slug', slugify(draft.name))} placeholder="例如 Gamma Function" /></label>
            <label className="admin-field"><span>所属目录</span><select required value={draft.category} onChange={(event) => setField('category', event.target.value)}>{directories.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}</select></label>
            <label className="admin-field md:col-span-2"><span>页面标识（slug）</span><input required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={draft.slug} onChange={(event) => setField('slug', slugify(event.target.value))} placeholder="gamma-function" /></label>
            <label className="admin-field md:col-span-2"><span>函数说明</span><textarea rows={3} value={draft.description} onChange={(event) => setField('description', event.target.value)} placeholder="简要说明函数的含义和参数作用" /></label>
          </div>
        </section>

        <section className="admin-card min-w-0">
          <div className="admin-section-title"><span>02</span><div><h2>表达式与公式</h2><p>表达式用于计算，数学公式用于页面展示</p></div></div>
          <div className="mt-5 grid min-w-0 gap-4">
            <label className="admin-field"><span>函数表达式</span><input required value={draft.expression} onChange={(event) => setField('expression', event.target.value)} className="font-mono" placeholder="a * sin(b * x)" /><small>支持 sin、cos、exp、log、sqrt、gamma、beta、erf 以及内置概率分布函数。</small></label>
            <label className="admin-field"><span>数学公式（LaTeX）</span><input value={draft.formula} onChange={(event) => setField('formula', event.target.value)} className="font-mono" placeholder="f(x)=a\\sin(bx)" /></label>
          </div>
        </section>

        <section className="admin-card min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="admin-section-title"><span>03</span><div><h2>参数滑块</h2><p>每个参数都会自动生成移动端滑块</p></div></div>
            <button type="button" onClick={addParameter} className="admin-button-secondary"><Plus size={16} /> 添加参数</button>
          </div>
          <div className="mt-5 space-y-3">
            {draft.parameters.length === 0 && <p className="rounded-2xl border border-dashed border-slate-300 p-5 text-center text-sm text-slate-400 dark:border-white/15">这个函数暂时没有参数</p>}
            {draft.parameters.map((parameter, index) => (
              <div key={`${parameter.name}-${index}`} className="grid min-w-0 gap-3 rounded-2xl bg-slate-50 p-4 dark:bg-black/20 sm:grid-cols-2 xl:grid-cols-6">
                <label className="admin-mini-field"><span>参数名</span><input required value={parameter.name} onChange={(event) => updateParameter(index, 'name', event.target.value.replace(/[^A-Za-z0-9_]/g, ''))} /></label>
                <label className="admin-mini-field"><span>显示名</span><input required value={parameter.label} onChange={(event) => updateParameter(index, 'label', event.target.value)} /></label>
                <label className="admin-mini-field"><span>最小值</span><input required type="number" step="any" value={parameter.min} onChange={(event) => updateParameter(index, 'min', numberValue(event.target.value))} /></label>
                <label className="admin-mini-field"><span>最大值</span><input required type="number" step="any" value={parameter.max} onChange={(event) => updateParameter(index, 'max', numberValue(event.target.value))} /></label>
                <label className="admin-mini-field"><span>步长</span><input required type="number" min="0.000001" step="any" value={parameter.step} onChange={(event) => updateParameter(index, 'step', numberValue(event.target.value, 0.1))} /></label>
                <label className="admin-mini-field"><span>默认值</span><div className="flex min-w-0 gap-2"><input required type="number" step="any" value={parameter.default} onChange={(event) => updateParameter(index, 'default', numberValue(event.target.value))} /><button type="button" onClick={() => removeParameter(index)} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-slate-400 transition hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-300" aria-label="删除参数"><X size={18} /></button></div></label>
              </div>
            ))}
          </div>
        </section>

        <div className="grid min-w-0 gap-5 xl:grid-cols-2">
          <section className="admin-card min-w-0">
            <div className="admin-section-title"><span>04</span><div><h2>坐标轴与绘图</h2><p>控制图像可见范围</p></div></div>
            <div className="mt-5 grid min-w-0 grid-cols-2 gap-4">
              <label className="admin-field"><span>x 最小值</span><input required type="number" step="any" value={draft.xMin} onChange={(event) => setField('xMin', numberValue(event.target.value))} /></label>
              <label className="admin-field"><span>x 最大值</span><input required type="number" step="any" value={draft.xMax} onChange={(event) => setField('xMax', numberValue(event.target.value))} /></label>
              <label className="admin-field"><span>y 最小值</span><input type="number" step="any" value={draft.yMin ?? ''} onChange={(event) => setField('yMin', event.target.value === '' ? null : Number(event.target.value))} placeholder="自动" /></label>
              <label className="admin-field"><span>y 最大值</span><input type="number" step="any" value={draft.yMax ?? ''} onChange={(event) => setField('yMax', event.target.value === '' ? null : Number(event.target.value))} placeholder="自动" /></label>
              <label className="admin-field"><span>采样点数</span><input required type="number" min="20" max="2000" step="1" value={draft.sampleCount} onChange={(event) => setField('sampleCount', numberValue(event.target.value, 400))} /></label>
              <label className="admin-field"><span>图像类型</span><select value={draft.chartType} onChange={(event) => setField('chartType', event.target.value as 'line' | 'bar')}><option value="line">连续曲线</option><option value="bar">离散柱状图</option></select></label>
            </div>
          </section>

          <section className="admin-card min-w-0 overflow-hidden">
            <div className="admin-section-title"><span>05</span><div><h2>实时预览</h2><p>使用参数默认值绘制</p></div></div>
            <div className="mt-4 min-w-0 overflow-hidden rounded-2xl border border-slate-100 dark:border-white/10"><FunctionChart config={previewConfig(draft)} values={currentValues} compact /></div>
          </section>
        </div>

        <div className="sticky bottom-4 z-30 flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-xl backdrop-blur dark:border-white/10 dark:bg-[#211f31]/90">
          <div className="min-w-0 truncate text-sm text-slate-500 dark:text-slate-400">{selectedId ? `正在修改：${draft.name}` : `正在 ${draft.category} 中创建新函数`}</div>
          <div className="flex shrink-0 gap-2">
            {selectedId && <button type="button" onClick={() => void deleteSelected()} className="admin-button-danger"><Trash2 size={17} /> 删除</button>}
            <button type="submit" disabled={saving} className="admin-button-primary disabled:opacity-60"><Save size={17} /> {saving ? '保存中…' : '保存函数'}</button>
          </div>
        </div>
      </form>
    </main>
  );
};
