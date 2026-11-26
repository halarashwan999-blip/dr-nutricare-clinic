import { useCallback, useEffect, useState } from 'react';
import { api, errorMessage } from './api';

export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(path));
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!path) return;
    let alive = true;
    setLoading(true);
    setError(null);
    api<T>(path)
      .then((value) => { if (alive) { setData(value); setLoading(false); } })
      .catch((reason) => { if (alive) { setError(errorMessage(reason)); setLoading(false); } });
    return () => { alive = false; };
  }, [path, tick]);

  const reload = useCallback(() => setTick((value) => value + 1), []);
  return { data, error, loading, reload };
}
