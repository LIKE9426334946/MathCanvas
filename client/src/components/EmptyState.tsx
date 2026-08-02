import { FunctionSquare } from 'lucide-react';

export const EmptyState = ({ message = '这里还没有函数' }: { message?: string }) => (
  <div className="grid min-h-64 place-items-center rounded-3xl border border-dashed border-slate-300 bg-white/50 px-6 text-center dark:border-white/15 dark:bg-white/[0.03]">
    <div>
      <FunctionSquare className="mx-auto mb-3 text-slate-300 dark:text-slate-600" size={42} />
      <p className="font-medium text-slate-500 dark:text-slate-400">{message}</p>
    </div>
  </div>
);
