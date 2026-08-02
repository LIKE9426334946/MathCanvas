import { useEffect, useState } from 'react';

const getInitialMode = () => {
  const saved = localStorage.getItem('mathcanvas-theme');
  if (saved) return saved === 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

export const useDarkMode = () => {
  const [isDark, setIsDark] = useState(getInitialMode);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('mathcanvas-theme', isDark ? 'dark' : 'light');
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', isDark ? '#171625' : '#f7f7ff');
  }, [isDark]);

  return { isDark, toggleDarkMode: () => setIsDark((value) => !value) };
};
