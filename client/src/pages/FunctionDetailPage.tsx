import { ArrowLeft, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { BlockMath } from 'react-katex';
import { Link, useParams } from 'react-router-dom';
import { EmptyState } from '../components/EmptyState';
import { FunctionChart } from '../components/FunctionChart';
import { LoadingState } from '../components/LoadingState';
import type { FunctionConfig, ParameterValues } from '../types';

interface DetailProps {
  functions: FunctionConfig[];
  loading: boolean;
  error: string;
}

const defaultValues = (config: FunctionConfig): ParameterValues => Object.fromEntries(
  config.parameters.map((parameter) => [parameter.name, parameter.default]),
);

const decimals = (step: number) => Math.min(6, Math.max(0, (step.toString().split('.')[1] ?? '').length));

export const FunctionDetailPage = ({ functions, loading, error }: DetailProps) => {
  const { slug } = useParams();
  const config = useMemo(() => functions.find((item) => item.slug === slug), [functions, slug]);
  const [values, setValues] = useState<ParameterValues>({});

  useEffect(() => {
    if (config) setValues(defaultValues(config));
  }, [config]);

  if (loading) return <LoadingState />;
  if (error) return <main className="mx-auto max-w-4xl px-4 py-10"><EmptyState message={error} /></main>;
  if (!config) return <main className="mx-auto max-w-4xl px-4 py-10"><EmptyState message="没有找到这个函数" /></main>;

  const resolvedValues = Object.fromEntries(
    config.parameters.map((parameter) => [parameter.name, values[parameter.name] ?? parameter.default]),
  );

  return (
    <main className="mx-auto max-w-7xl px-4 pb-24 pt-4 sm:px-6 sm:pt-8 lg:px-8">
      <Link to="/" className="inline-flex items-center gap-2 rounded-xl px-2 py-2 text-sm font-semibold text-slate-500 transition hover:bg-white hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white">
        <ArrowLeft size={18} /> 返回函数库
      </Link>

      <div className="mt-3 grid items-start gap-4 sm:mt-5 sm:gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(330px,.75fr)]">
        <section className="flex min-w-0 flex-col gap-3 sm:gap-5">
          <div className="order-1 rounded-3xl border border-slate-200/80 bg-white p-4 shadow-soft dark:border-white/10 dark:bg-white/[0.045] sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <span className="inline-flex rounded-full bg-canvas-100 px-3 py-1 text-xs font-bold text-canvas-700 dark:bg-canvas-500/15 dark:text-canvas-100">{config.category}</span>
                <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">{config.name}</h1>
              </div>
              <button
                type="button"
                onClick={() => setValues(defaultValues(config))}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 dark:border-white/10 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white"
              >
                <RotateCcw size={16} /> 重置
              </button>
            </div>

            {config.formula && (
              <div className="math-formula mt-5 overflow-x-auto rounded-2xl border border-canvas-100 bg-canvas-50 px-4 py-5 text-center text-canvas-950 dark:border-white/10 dark:bg-black/20 dark:text-white">
                <BlockMath math={config.formula} />
              </div>
            )}
          </div>

          <div className="order-2 rounded-3xl border border-slate-200/80 bg-white p-4 dark:border-white/10 dark:bg-white/[0.045] sm:p-6 lg:order-3">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">关于这个函数</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300 sm:mt-3 sm:text-base sm:leading-7">{config.description}</p>
            <div className="mt-3 rounded-2xl bg-slate-50 px-4 py-3 dark:bg-black/20 sm:mt-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Expression</span>
              <code className="mt-1 block overflow-x-auto whitespace-nowrap text-sm font-semibold text-canvas-700 dark:text-canvas-100">{config.expression}</code>
            </div>
          </div>

          <div className="order-3 -mx-2 overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-1 shadow-soft dark:border-white/10 dark:bg-white/[0.045] sm:mx-0 sm:p-4 lg:order-2">
            <FunctionChart config={config} values={resolvedValues} />
          </div>
        </section>

        <aside className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-soft dark:border-white/10 dark:bg-white/[0.045] sm:p-6 lg:sticky lg:top-24">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-canvas-100 text-canvas-700 dark:bg-canvas-500/15 dark:text-canvas-100">
              <SlidersHorizontal size={19} />
            </span>
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white">参数控制</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">滑动时图像会实时更新</p>
            </div>
          </div>

          {config.parameters.length === 0 ? (
            <p className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500 dark:bg-black/20 dark:text-slate-400">这个函数没有可调参数。</p>
          ) : (
            <div className="mt-7 space-y-8">
              {config.parameters.map((parameter) => {
                const value = values[parameter.name] ?? parameter.default;
                const progress = ((value - parameter.min) / (parameter.max - parameter.min)) * 100;
                return (
                  <div key={parameter.name}>
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <label htmlFor={`parameter-${parameter.name}`} className="text-lg font-bold text-slate-800 dark:text-slate-100">{parameter.label}</label>
                      <output className="min-w-20 rounded-xl bg-canvas-50 px-3 py-2 text-center font-mono text-base font-bold tabular-nums text-canvas-700 dark:bg-canvas-500/15 dark:text-canvas-100">
                        {value.toFixed(decimals(parameter.step))}
                      </output>
                    </div>
                    <input
                      id={`parameter-${parameter.name}`}
                      type="range"
                      min={parameter.min}
                      max={parameter.max}
                      step={parameter.step}
                      value={value}
                      onChange={(event) => setValues((current) => ({ ...current, [parameter.name]: Number(event.target.value) }))}
                      style={{ '--range-progress': `${progress}%` } as React.CSSProperties}
                      className="math-range w-full"
                    />
                    <div className="mt-2 flex justify-between text-xs font-medium tabular-nums text-slate-400">
                      <span>{parameter.min}</span>
                      <span>{parameter.max}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </aside>
      </div>
    </main>
  );
};
