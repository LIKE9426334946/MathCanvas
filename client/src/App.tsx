import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Header } from './components/Header';
import { LoadingState } from './components/LoadingState';
import { useDarkMode } from './hooks/useDarkMode';
import { useFunctions } from './hooks/useFunctions';

const FunctionLibraryPage = lazy(() => import('./pages/FunctionLibraryPage').then((module) => ({ default: module.FunctionLibraryPage })));
const FunctionDetailPage = lazy(() => import('./pages/FunctionDetailPage').then((module) => ({ default: module.FunctionDetailPage })));
const AdminPage = lazy(() => import('./pages/AdminPage').then((module) => ({ default: module.AdminPage })));

export const App = () => {
  const { isDark, toggleDarkMode } = useDarkMode();
  const functionState = useFunctions();

  return (
    <div className="min-h-screen bg-canvas-50 text-slate-900 transition-colors dark:bg-canvas-950 dark:text-slate-100">
      <Header isDark={isDark} onToggleDarkMode={toggleDarkMode} />
      <Suspense fallback={<LoadingState />}>
        <Routes>
          <Route path="/" element={<FunctionLibraryPage {...functionState} />} />
          <Route path="/function/:slug" element={<FunctionDetailPage {...functionState} />} />
          <Route path="/admin" element={<AdminPage {...functionState} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </div>
  );
};
