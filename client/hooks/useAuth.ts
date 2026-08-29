import { useState, useCallback, useSyncExternalStore } from 'react';
import { UserProfile } from '@/types';
import { loginOrRegister } from '@/services/api';

const AUTH_KEY = 'tanchishe_auth';

const emptySubscribe = () => () => {};
export const useIsClient = () => useSyncExternalStore(emptySubscribe, () => true, () => false);

export function useAuth() {
  const [user, setUser] = useState<UserProfile | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const saved = localStorage.getItem(AUTH_KEY);
      return saved ? JSON.parse(saved)?.user || null : null;
    } catch {
      return null;
    }
  });

  const [authForm, setAuthForm] = useState(() => {
    if (typeof window === 'undefined') return { username: '', password: '' };
    try {
      const saved = localStorage.getItem(AUTH_KEY);
      return saved ? JSON.parse(saved)?.form || { username: '', password: '' } : { username: '', password: '' };
    } catch {
      return { username: '', password: '' };
    }
  });

  const [authError, setAuthError] = useState('');

  // 登录或注册
  const handleLogin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    const u = authForm.username.trim();
    const p = authForm.password.trim();
    if (!u || !p) {
      setAuthError('请输入用户名和密码');
      return;
    }

    const res = await loginOrRegister(u, p);
    if (res.success && res.data) {
      setUser(res.data);
      try {
        localStorage.setItem(AUTH_KEY, JSON.stringify({ user: res.data, form: { username: u, password: p } }));
      } catch {}
    } else {
      setAuthError(res.message || '登录失败');
    }
  }, [authForm]);

  // 退出登录
  const handleLogout = useCallback(() => {
    setUser(null);
    try {
      localStorage.removeItem(AUTH_KEY);
    } catch {}
  }, []);

  // 战绩刷新时更新用户档案
  const updateUserRecord = useCallback((updated: UserProfile) => {
    setUser(updated);
    try {
      localStorage.setItem(AUTH_KEY, JSON.stringify({ user: updated, form: authForm }));
    } catch {}
  }, [authForm]);

  return {
    user,
    authForm,
    authError,
    setAuthForm,
    handleLogin,
    handleLogout,
    updateUserRecord,
  };
}
