import {
  Activity,
  Atom,
  BrainCircuit,
  ChevronDown,
  ChevronRight,
  FolderTree,
  FunctionSquare,
  Search,
  Sparkles,
  Waves,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { EmptyState } from '../components/EmptyState';
import { LoadingState } from '../components/LoadingState';
import { api } from '../lib/api';
import type { Directory, FunctionConfig } from '../types';

interface LibraryProps {
  functions: FunctionConfig[];
  loading: boolean;
  error: string;
}

const categoryOrder = [
  'Basic Functions',
  'Special Functions',
  'Hyperbolic Functions',
  'Probability Distributions',
  'Neural Functions',
];

const categoryMeta: Record<string, { icon: typeof Activity; color: string; description: string }> = {
  'Basic Functions': { icon: Waves, color: 'from-sky-500 to-cyan-400', description: '从周期、指数到对数，触摸数学的基本形状' },
  'Special Functions': { icon: Atom, color: 'from-violet-500 to-fuchsia-500', description: '探索 Gamma、Beta 与误差函数的独特曲线' },
  'Hyperbolic Functions': { icon: Sparkles, color: 'from-amber-500 to-orange-500', description: '由指数函数构成的双曲世界' },
  'Probability Distributions': { icon: Activity, color: 'from-emerald-500 to-teal-400', description: '拖动参数，理解概率密度与概率质量' },
  'Neural Functions': { icon: BrainCircuit, color: 'from-rose-500 to-pink-500', description: '直观看见神经网络中的非线性变换' },
};

export const FunctionLibraryPage = ({ functions, loading, error }: LibraryProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const returnedDirectory = (location.state as { expandedDirectory?: string } | null)?.expandedDirectory ?? null;
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('全部');
  const [directories, setDirectories] = useState<Directory[]>([]);
  const [mobileDirectory, setMobileDirectory] = useState<string | null>(returnedDirectory);

  useEffect(() => {
    if (!returnedDirectory) return;

    setMobileDirectory(returnedDirectory);
    navigate(
      { pathname: location.pathname, search: location.search, hash: location.hash },
      { replace: true, state: null },
    );
  }, [location.hash, location.pathname, location.search, navigate, returnedDirectory]);

  useEffect(() => {
    let active = true;
    void api.listDirectories()
      .then((items) => {
        if (active) setDirectories(items);
      })
      .catch(() => {
        // The function categories below remain a complete fallback if this request fails.
      });
    return () => { active = false; };
  }, []);

  const categories = useMemo(() => {
    const unique = [...new Set(functions.map((item) => item.category))];
    const fallbackOrder = unique.sort((a, b) => {
      const aIndex = categoryOrder.indexOf(a);
      const bIndex = categoryOrder.indexOf(b);
      if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });
    if (directories.length === 0) return fallbackOrder;

    const functionCategorySet = new Set(unique.map((name) => name.toLowerCase()));
    const orderedNames = directories
      .map((directory) => directory.name)
      .filter((name) => functionCategorySet.has(name.toLowerCase()));
    const orderedNameSet = new Set(orderedNames.map((name) => name.toLowerCase()));
    return [...orderedNames, ...fallbackOrder.filter((name) => !orderedNameSet.has(name.toLowerCase()))];
  }, [directories, functions]);

  const visibleFunctions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return functions.filter((item) => {
      const matchesCategory = category === '全部' || item.category === category;
      const matchesQuery = !normalized || `${item.name} ${item.expression} ${item.description}`.toLowerCase().includes(normalized);
      return matchesCategory && matchesQuery;
    });
  }, [category, functions, query]);

  const groupedFunctions = useMemo(() => categories
    .map((name) => ({ name, items: visibleFunctions.filter((item) => item.category === name) }))
    .filter((group) => group.items.length > 0), [categories, visibleFunctions]);

  const mobileGroups = useMemo(() => {
    const names = directories.length > 0
      ? directories.map((item) => item.name)
      : categories;
    return [...new Set(names)]
      .map((name) => ({ name, items: functions.filter((item) => item.category === name) }));
  }, [categories, directories, functions]);

  const activeMobileDirectory = mobileDirectory === null
    ? null
    : mobileGroups.some((group) => group.name === mobileDirectory)
      ? mobileDirectory
      : (mobileGroups[0]?.name ?? null);

  return (
    <main className="overflow-x-hidden pb-20">
      <section className="border-b border-slate-200/70 bg-white/60 dark:border-white/10 dark:bg-white/[0.025] md:hidden">
        <div className="mx-auto max-w-lg px-3 py-4">
          <div className="mb-3 flex items-center gap-2 px-1">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-canvas-100 text-canvas-700 dark:bg-canvas-500/15 dark:text-canvas-100">
              <FolderTree size={18} />
            </span>
            <div className="min-w-0">
              <h1 className="text-base font-bold text-slate-900 dark:text-white">函数目录</h1>
              <p className="text-xs text-slate-400">选择目录，再选择函数</p>
            </div>
          </div>

          {loading ? (
            <div className="grid min-h-40 place-items-center text-sm text-slate-400">正在加载函数目录…</div>
          ) : error ? (
            <div className="rounded-2xl border border-dashed border-rose-200 px-4 py-8 text-center text-sm text-rose-500 dark:border-rose-500/20 dark:text-rose-300">{error}</div>
          ) : mobileGroups.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-400 dark:border-white/10">这里还没有目录</div>
          ) : (
            <nav
              aria-label="函数目录"
              className="max-h-[calc(100dvh-9rem)] touch-pan-y space-y-1 overflow-y-auto overflow-x-hidden overscroll-contain rounded-2xl border border-slate-200/80 bg-white p-1.5 shadow-sm dark:border-white/10 dark:bg-white/[0.035]"
            >
              {mobileGroups.map((group) => {
                const expanded = activeMobileDirectory === group.name;
                return (
                  <div key={group.name} className="min-w-0">
                    <button
                      type="button"
                      onClick={() => setMobileDirectory(expanded ? null : group.name)}
                      aria-expanded={expanded}
                      className={`flex min-h-11 w-full min-w-0 items-center gap-2 rounded-xl px-3 text-left text-sm font-bold transition-colors ${
                        expanded
                          ? 'bg-canvas-100 text-canvas-700 dark:bg-canvas-500/15 dark:text-canvas-100'
                          : 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/5'
                      }`}
                    >
                      <ChevronDown size={16} className={`shrink-0 transition-transform ${expanded ? '' : '-rotate-90'}`} />
                      <span className="min-w-0 flex-1 truncate">{group.name}</span>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] tabular-nums ${
                        expanded
                          ? 'bg-white/70 text-canvas-600 dark:bg-white/10 dark:text-canvas-100'
                          : 'bg-slate-100 text-slate-400 dark:bg-white/5 dark:text-slate-500'
                      }`}>{group.items.length}</span>
                    </button>

                    {expanded && (
                      <div className="ml-5 border-l border-canvas-200 py-1 pl-2 dark:border-canvas-500/20">
                        {group.items.length > 0 ? group.items.map((item) => (
                          <Link
                            key={item.id}
                            to={`/function/${item.slug}`}
                            className="flex min-h-10 min-w-0 items-center rounded-lg px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-canvas-50 hover:text-canvas-700 active:bg-canvas-100 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white"
                          >
                            <span className="min-w-0 truncate">{item.name}</span>
                          </Link>
                        )) : (
                          <p className="px-3 py-2 text-xs text-slate-400">这个目录还没有函数</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
          )}
        </div>
      </section>

      <section className="relative hidden overflow-hidden border-b border-slate-200/70 dark:border-white/10 md:block">
        <div className="pointer-events-none absolute inset-0 canvas-grid opacity-60 dark:opacity-25" />
        <div className="pointer-events-none absolute -left-24 -top-20 h-72 w-72 rounded-full bg-cyan-300/20 blur-3xl dark:bg-cyan-500/10" />
        <div className="pointer-events-none absolute -right-24 top-8 h-80 w-80 rounded-full bg-violet-400/20 blur-3xl dark:bg-violet-500/10" />
        <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-canvas-200 bg-white/70 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-canvas-700 shadow-sm backdrop-blur dark:border-canvas-500/30 dark:bg-white/5 dark:text-canvas-100">
              <Sparkles size={14} /> Interactive Mathematics
            </span>
            <h1 className="mt-6 text-4xl font-black tracking-tight text-slate-950 dark:text-white sm:text-5xl lg:text-6xl">
              把公式变成<br />
              <span className="bg-gradient-to-r from-canvas-600 via-violet-500 to-fuchsia-500 bg-clip-text text-transparent">可以触摸的图像</span>
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300 sm:text-lg">
              选择一个函数，滑动参数，实时观察曲线如何变化。把抽象公式变成属于你的数学实验。
            </p>

            <label className="mt-8 flex max-w-xl items-center gap-3 rounded-2xl border border-slate-200 bg-white p-2 pl-4 shadow-soft transition focus-within:border-canvas-400 focus-within:ring-4 focus-within:ring-canvas-500/10 dark:border-white/10 dark:bg-white/[0.06] dark:focus-within:border-canvas-500">
              <Search className="shrink-0 text-slate-400" size={20} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜索函数或表达式…"
                className="min-w-0 flex-1 bg-transparent py-2.5 text-base outline-none placeholder:text-slate-400"
              />
              <span className="hidden rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-500 dark:bg-white/10 dark:text-slate-400 sm:block">
                {functions.length} functions
              </span>
            </label>
          </div>
        </div>
      </section>

      <section className="mx-auto hidden max-w-7xl px-4 pt-8 sm:px-6 md:block lg:px-8">
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
          {['全部', ...categories].map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => setCategory(name)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                category === name
                  ? 'bg-slate-900 text-white shadow-md dark:bg-white dark:text-slate-900'
                  : 'border border-slate-200 bg-white text-slate-600 hover:border-canvas-300 hover:text-canvas-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:border-canvas-500/50 dark:hover:text-white'
              }`}
            >
              {name}
            </button>
          ))}
        </div>

        {loading ? <LoadingState /> : error ? <EmptyState message={error} /> : groupedFunctions.length === 0 ? (
          <EmptyState message="没有找到匹配的函数" />
        ) : (
          <div className="space-y-12 pt-8">
            {groupedFunctions.map((group) => {
              const meta = categoryMeta[group.name] ?? { icon: FunctionSquare, color: 'from-canvas-500 to-violet-500', description: '自定义数学函数集合' };
              const Icon = meta.icon;
              return (
                <section key={group.name}>
                  <div className="mb-5 flex items-start gap-3">
                    <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${meta.color} text-white shadow-lg`}>
                      <Icon size={21} />
                    </span>
                    <div>
                      <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">{group.name}</h2>
                      <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{meta.description}</p>
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {group.items.map((item, index) => (
                      <Link
                        key={item.id}
                        to={`/function/${item.slug}`}
                        className="group relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-canvas-300 hover:shadow-soft dark:border-white/10 dark:bg-white/[0.045] dark:hover:border-canvas-500/50"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <span className="text-xs font-bold tabular-nums text-slate-300 dark:text-slate-600">{String(index + 1).padStart(2, '0')}</span>
                          <span className="grid h-9 w-9 place-items-center rounded-xl bg-slate-50 text-slate-400 transition-all group-hover:bg-canvas-500 group-hover:text-white dark:bg-white/5 dark:text-slate-500">
                            <ChevronRight size={18} />
                          </span>
                        </div>
                        <h3 className="mt-5 text-lg font-bold text-slate-900 dark:text-white">{item.name}</h3>
                        <code className="mt-3 block truncate rounded-xl bg-slate-50 px-3 py-2.5 text-sm font-semibold text-canvas-700 dark:bg-black/20 dark:text-canvas-100">
                          {item.expression}
                        </code>
                        <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{item.description}</p>
                        <div className={`absolute bottom-0 left-0 h-1 w-full origin-left scale-x-0 bg-gradient-to-r ${meta.color} transition-transform duration-300 group-hover:scale-x-100`} />
                      </Link>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
};
