import React from 'react';
import Image from 'next/image';

interface Props {
  form: { username: string; password: string };
  error: string;
  setForm: (f: { username: string; password: string }) => void;
  onLogin: (e: React.FormEvent) => void;
}

// 玩家登录与免密自动注册组件 (南大家园纯净留白哲学，移除装饰图标)
export default function Login({ form, error, setForm, onLogin }: Props) {
  return (
    <div className="w-full max-w-sm bg-white p-6 sm:p-8 rounded-3xl text-[#0F172A] shadow-[0_4px_24px_rgba(0,0,0,0.04)] select-none">
      {/* 头部品牌图标与格言标语 */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#EBF8FF] mb-3 shadow-[0_2px_8px_rgba(102,204,255,0.18)]">
          <Image
            src="/icon.svg"
            alt="贪吃蛇"
            width={44}
            height={44}
            className="w-11 h-11 rounded-xl"
            priority
          />
        </div>
        <h1 className="text-xl font-black text-[#0F172A] tracking-tight">贪吃蛇</h1>
        <p className="text-xs text-[#94A3B8] mt-1">方寸之<span className="text-[#66CCFF] font-semibold">间</span> · 重温经<span className="text-[#66CCFF] font-semibold">典</span></p>
      </div>

      {/* 登录/自动注册双字段表单 */}
      <form onSubmit={onLogin} className="flex flex-col gap-3.5">
        <div>
          <input
            type="text"
            placeholder="用户名"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            className="w-full bg-slate-50 rounded-xl px-4 py-2.5 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-[#0099FF]/30 transition-all text-[#0F172A] placeholder-[#94A3B8]"
            required
          />
        </div>

        <div>
          <input
            type="password"
            placeholder="密码"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="w-full bg-slate-50 rounded-xl px-4 py-2.5 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-[#0099FF]/30 transition-all text-[#0F172A] placeholder-[#94A3B8]"
            required
          />
        </div>

        {/* 错误提示浮条 */}
        {error && (
          <div className="text-xs text-rose-500 bg-rose-50 py-1.5 px-3 rounded-lg text-center font-medium">
            {error}
          </div>
        )}

        {/* 极简实心进入按钮 */}
        <button
          type="submit"
          className="w-full mt-2 bg-[#0099FF] hover:bg-[#0088EE] active:scale-[0.99] text-white font-bold py-2.5 rounded-xl transition-all shadow-[0_2px_10px_rgba(0,153,255,0.25)] flex items-center justify-center cursor-pointer text-sm"
        >
          进入游戏
        </button>

        <p className="text-[11px] text-[#94A3B8] text-center mt-2 leading-relaxed">
          未注册账号输入账号密码即可 <strong className="text-[#0099FF] font-medium">自动注册入库</strong>
        </p>
      </form>
    </div>
  );
}
