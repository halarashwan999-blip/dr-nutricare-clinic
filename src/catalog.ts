import { useEffect, useState } from 'react';
import { api, errorMessage } from './api';
import type { Catalog } from './types';

let cache: Catalog | null = null;
let pending: Promise<Catalog> | null = null;

function load(): Promise<Catalog> {
  pending ??= api<Catalog>('/api/catalog').then(
    (value) => { cache = value; return value; },
    (error) => { pending = null; throw error; },
  );
  return pending;
}

export function useCatalog() {
  const [catalog, setCatalog] = useState<Catalog | null>(cache);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (catalog) return;
    let alive = true;
    load()
      .then((value) => { if (alive) setCatalog(value); })
      .catch((reason) => { if (alive) setError(errorMessage(reason)); });
    return () => { alive = false; };
  }, [catalog]);

  return { catalog, error };
}
