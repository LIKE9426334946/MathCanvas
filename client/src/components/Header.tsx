import { Moon, Settings2, Sun } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

interface HeaderProps {
  isDark: boolean;
  onToggleDarkMode: () => void;
}

export const Header = ({ isDark, onToggleDarkMode }: HeaderProps) => {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl dark:border-white/10 dark:bg-canvas-950/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="group flex items-center gap-3" aria-label="返回 MathCanvas 首页">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-canvas-500 to-fuchsia-500 text-lg font-bold text-white shadow-lg shadow-canvas-500/20 transition-transform group-hover:-rotate-3">
            ƒ
          </span>
          <span>
            <span className="block text-base font-bold tracking-tight text-slate-900 dark:text-white">MathCanvas</span>
            <span className="hidden text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400 sm:block">Explore every curve</span>
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            to={isAdmin ? '/' : '/admin'}
            className="hidden items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white sm:flex"
          >
            <Settings2 size={17} />
            {isAdmin ? '函数库' : '管理后台'}
          </Link>
          <button
            type="button"
            onClick={onToggleDarkMode}
            className="grid h-10 w-10 place-items-center rounded-xl text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
            aria-label={isDark ? '切换到浅色模式' : '切换到深色模式'}
          >
            {isDark ? <Sun size={19} /> : <Moon size={19} />}
          </button>
        </div>
      </div>
    </header>
  );
};
