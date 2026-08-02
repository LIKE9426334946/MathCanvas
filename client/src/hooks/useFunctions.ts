import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { FunctionConfig } from '../types';

export const useFunctions = () => {
  const [functions, setFunctions] = useState<FunctionConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setFunctions(await api.listFunctions());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '函数库加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);
  return { functions, setFunctions, loading, error, refresh };
};
