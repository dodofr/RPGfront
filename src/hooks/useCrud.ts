import { useState, useEffect, useCallback } from 'react';

interface CrudApi<T> {
  getAll: () => Promise<T[]>;
  create?: (data: Partial<T>) => Promise<T>;
  update?: (id: number, data: Partial<T>) => Promise<T>;
  remove?: (id: number) => Promise<unknown>;
}

export function useCrud<T extends { id: number }>(api: CrudApi<T>) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getAll();
      setItems(data);
      setError(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const create = useCallback(async (data: Partial<T>) => {
    if (!api.create) return;
    const item = await api.create(data);
    await refresh();
    return item;
  }, [api, refresh]);

  const update = useCallback(async (id: number, data: Partial<T>) => {
    if (!api.update) return;
    const item = await api.update(id, data);
    await refresh();
    return item;
  }, [api, refresh]);

  const remove = useCallback(async (id: number) => {
    if (!api.remove) return;
    await api.remove(id);
    await refresh();
  }, [api, refresh]);

  return { items, loading, error, refresh, create, update, remove };
}
