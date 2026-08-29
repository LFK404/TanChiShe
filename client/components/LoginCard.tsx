import React from 'react';
import { User, Lock } from 'lucide-react';

interface LoginCardProps {
  authForm: { username: string; password: string };
  authError: string;
  setAuthForm: (form: { username: string; password: string }) => void;
  onLogin: (e: React.FormEvent) => void;
}

export default function LoginCard({ authForm, authError, setAuthForm, onLogin }: LoginCardProps) {
  return (
    <div className="w-full max-w-sm bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-slate-800">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">贪吃蛇</h1>
        <p className="text-xs text-slate-500">请输入用户名和密码开启游戏</p>
      </div>

      <form onSubmit={onLogin} className="flex flex-col gap-4">
        <div className="relative">
          <User size={16} className="absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="用户名"
            value={authForm.username}
            onChange={(e) => setAuthForm({ ...authForm, username: e.target.value })}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>

        <div className="relative">
          <Lock size={16} className="absolute left-3 top-3 text-slate-400" />
          <input
            type="password"
            placeholder="密码"
            value={authForm.password}
            onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>

        {authError && <div className="text-xs text-rose-500 text-center">{authError}</div>}

        <button
          type="submit"
          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium text-sm transition-colors cursor-pointer shadow-sm"
        >
          登录 / 注册
        </button>
      </form>
    </div>
  );
}
