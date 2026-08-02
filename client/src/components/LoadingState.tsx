export const LoadingState = () => (
  <div className="grid min-h-[45vh] place-items-center">
    <div className="flex flex-col items-center gap-4 text-slate-500 dark:text-slate-400">
      <span className="h-10 w-10 animate-spin rounded-full border-4 border-canvas-100 border-t-canvas-600 dark:border-white/10 dark:border-t-canvas-500" />
      <span className="text-sm font-medium">正在展开函数画布…</span>
    </div>
  </div>
);
