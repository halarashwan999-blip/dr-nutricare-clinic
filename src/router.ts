import { useEffect, useState } from 'react';

function normalize(hash: string): string {
  const path = hash.replace(/^#/, '');
  if (!path || path === '/') return '/';
  return path.startsWith('/') ? path : `/${path}`;
}

export function useHashRoute(): string {
  const [path, setPath] = useState(() => normalize(window.location.hash));

  useEffect(() => {
    const onChange = () => setPath(normalize(window.location.hash));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [path]);

  return path;
}

export function go(path: string, options: { replace?: boolean } = {}) {
  const target = `#${path.startsWith('/') ? path : `/${path}`}`;
  if (options.replace) window.location.replace(target);
  else window.location.hash = target;
}
