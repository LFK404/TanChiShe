import React from 'react';
import Image from 'next/image';
import { User, Lock, ArrowRight } from 'lucide-react';

interface Props {
  form: { username: string; password: string };
  error: string;
  setForm: (f: { username: string; password: string }) => void;
  onLogin: (e: React.FormEvent) => void;
}

// 玩家登录与免密自动注册组件
export default function Login({ form, error, setForm, onLogin }: Props) {
  return (
    <div className="w-full max-w-sm bg-white p-6 sm:p-8 rounded-3xl text-[#0F172A] shadow-[0_4px_24px_rgba(0,0,0,0.04)] select-none">
      {/* 头部品牌图标与格言标语 */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#EBF8FF] mb-3 shadow-[0_2px_8px_rgba(102,204,255,0.18)]">
          <Image
            src="/icon.svg"
            alt="贪吃蛇"
            width={40}
            height={40}
            className="w-10 h-10 rounded-xl"
            priority
          />
        </div>
        <h1 className="text-xl font-black text-[#0F172A] tracking-tight">贪吃蛇</h1>
        <p className="text-xs text-[#94A3B8] mt-1">方寸之<span className="text-[#66CCFF] font-semibold">间</span> · 重温经<span className="text-[#66CCFF] font-semibold">典</span></p>
      </div>

      {/* 登录/自动注册双字段表单 */}
      <form onSubmit={onLogin} className="flex flex-col gap-3.5">
        <div className="relative">
          <User size={16} className="absolute left-3.5 top-3 text-[#94A3B8]" />
          <input
            type="text"
            placeholder="用户名"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            className="w-full bg-slate-50 rounded-xl pl-10 pr-3.5 py-2.5 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-[#66CCFF]/30 transition-all text-[#0F172A] placeholder-[#94A3B8]"
            required
          />
        </div>

        <div className="relative">
          <Lock size={16} className="absolute left-3.5 top-3 text-[#94A3B8]" />
          <input
            type="password"
            placeholder="密码"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="w-full bg-slate-50 rounded-xl pl-10 pr-3.5 py-2.5 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-[#66CCFF]/30 transition-all text-[#0F172A] placeholder-[#94A3B8]"
            required
          />
        </div>

        {/* 错误提示浮条 */}
        {error && (
          <div className="text-xs text-rose-500 bg-rose-50 py-1.5 px-3 rounded-lg text-center font-medium">
            {error}
          </div>
        )}

        <button
          type="submit"
          className="w-full mt-2 py-2.5 bg-[#0099FF] hover:bg-[#0284C7] active:scale-[0.98] text-white rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
        >
          <span>进入游戏</span>
          <ArrowRight size={15} />
        </button>

        <p className="text-[11px] text-[#94A3B8] text-center mt-2">
          未注册账号输入密码后将自动完成极简注册
        </p>
      </form>
    </div>
  );
}
