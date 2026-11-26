import {
  createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode,
} from 'react';
import { api } from './api';
import type { SessionPayload, Subscription, User } from './types';

type Status = 'loading' | 'ready' | 'guest';

interface SessionValue {
  status: Status;
  user: User | null;
  subscription: Subscription | null;
  login: (identifier: string, password: string) => Promise<SessionPayload>;
  register: (body: Record<string, unknown>) => Promise<SessionPayload>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  updateUser: (user: User) => void;
  updateSubscription: (subscription: Subscription | null) => void;
}

const SessionContext = createContext<SessionValue | null>(null);

const guest = { status: 'guest' as const, user: null, subscription: null };

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ status: Status; user: User | null; subscription: Subscription | null }>({
    status: 'loading', user: null, subscription: null,
  });

  useEffect(() => {
    let alive = true;
    api<SessionPayload>('/api/auth/me')
      .then((payload) => {
        if (alive) setState({ status: 'ready', user: payload.user, subscription: payload.subscription });
      })
      .catch(() => {
        if (alive) setState(guest);
      });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const onUnauthorized = () => {
      setState((current) => (current.status === 'ready' ? guest : current));
    };
    window.addEventListener('ghizai:unauthorized', onUnauthorized);
    return () => window.removeEventListener('ghizai:unauthorized', onUnauthorized);
  }, []);

  const login = useCallback(async (identifier: string, password: string) => {
    const payload = await api<SessionPayload>('/api/auth/login', {
      method: 'POST', body: { identifier, password },
    });
    setState({ status: 'ready', user: payload.user, subscription: payload.subscription });
    return payload;
  }, []);

  const register = useCallback(async (body: Record<string, unknown>) => {
    const payload = await api<SessionPayload>('/api/auth/register', { method: 'POST', body });
    setState({ status: 'ready', user: payload.user, subscription: payload.subscription });
    return payload;
  }, []);

  const logout = useCallback(async () => {
    try { await api('/api/auth/logout', { method: 'POST' }); } catch { /* session cleared locally regardless */ }
    setState(guest);
  }, []);

  const refresh = useCallback(async () => {
    const payload = await api<SessionPayload>('/api/auth/me');
    setState({ status: 'ready', user: payload.user, subscription: payload.subscription });
  }, []);

  const updateUser = useCallback((user: User) => {
    setState((current) => ({ ...current, user }));
  }, []);

  const updateSubscription = useCallback((subscription: Subscription | null) => {
    setState((current) => ({ ...current, subscription }));
  }, []);

  const value = useMemo(
    () => ({ ...state, login, register, logout, refresh, updateUser, updateSubscription }),
    [state, login, register, logout, refresh, updateUser, updateSubscription],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession must be used inside SessionProvider');
  return context;
}
