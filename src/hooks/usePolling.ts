import { useState, useEffect, useRef, useCallback } from 'react';

export function usePolling<T>(
  fetcher: () => Promise<T>,
  interval: number,
  enabled: boolean = true
) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const result = await fetcher();
      setData(result);
      setError(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Fetch error';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [fetcher]);

  useEffect(() => {
    if (!enabled) return;

    fetchData();

    timerRef.current = setInterval(fetchData, interval);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [fetchData, interval, enabled]);

  return { data, error, loading, refetch: fetchData };
}
