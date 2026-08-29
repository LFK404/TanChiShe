import { useState, useCallback, useSyncExternalStore } from 'react';
import { User } from '@/types';
import { apiAuth } from '@/services/api';

const KEY = 'tanchishe_auth';
export const useIsClient = () => useSyncExternalStore(() => () => {}, () => true, () => false);

export function useAuth() {
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const saved = localStorage.getItem(KEY);
      return saved ? JSON.parse(saved)?.user || null : null;
    } catch {
      return null;
    }
  });

  const [form, setForm] = useState(() => {
    if (typeof window === 'undefined') return { username: '', password: '' };
    try {
      const saved = localStorage.getItem(KEY);
      return saved ? JSON.parse(saved)?.form || { username: '', password: '' } : { username: '', password: '' };
    } catch {
      return { username: '', password: '' };
    }
  });

  const [error, setError] = useState('');

  const login = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const u = form.username.trim();
    const p = form.password.trim();
    if (!u || !p) {
      setError('请输入用户名和密码');
      return;
    }
    const res = await apiAuth(u, p);
    if (res.ok && res.data) {
      setUser(res.data);
      try {
        localStorage.setItem(KEY, JSON.stringify({ user: res.data, form: { username: u, password: p } }));
      } catch {}
    } else {
      setError(res.msg || '登录失败');
    }
  }, [form]);

  const logout = useCallback(() => {
    setUser(null);
    try {
      localStorage.removeItem(KEY);
    } catch {}
  }, []);

  const updateUser = useCallback((u: User) => {
    setUser(u);
    try {
      localStorage.setItem(KEY, JSON.stringify({ user: u, form }));
    } catch {}
  }, [form]);

  return { user, form, error, setForm, login, logout, updateUser };
}
