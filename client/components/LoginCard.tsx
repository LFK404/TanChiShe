import React from 'react';
import { User, Lock } from 'lucide-react';

interface Props {
  form: { username: string; password: string };
  error: string;
  setForm: (f: { username: string; password: string }) => void;
  onLogin: (e: React.FormEvent) => void;
}

export default function LoginCard({ form, error, setForm, onLogin }: Props) {
  return (
    <div className="w-full max-w-sm bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-slate-800">
      <h1 className="text-2xl font-bold text-center text-slate-900 mb-6">贪吃蛇</h1>
      <form onSubmit={onLogin} className="flex flex-col gap-3.5">
        <div className="relative">
          <User size={16} className="absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="用户名"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div className="relative">
          <Lock size={16} className="absolute left-3 top-3 text-slate-400" />
          <input
            type="password"
            placeholder="密码"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>
        {error && <div className="text-xs text-rose-500 text-center">{error}</div>}
        <button
          type="submit"
          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer"
        >
          登录 / 注册
        </button>
      </form>
    </div>
  );
}
