import React from 'react';
import Image from 'next/image';

interface Props {
  form: { username: string; password: string };
  error: string;
  setForm: (f: { username: string; password: string }) => void;
  onLogin: (e: React.FormEvent) => void;
}

// 玩家登录与免密自动激活组件 (南大家园极简现代主义，纯净留白无AI感设计)
export default function Login({ form, error, setForm, onLogin }: Props) {
  return (
    <div className="w-full max-w-[360px] bg-white rounded-3xl p-7 sm:p-8 border border-slate-200/80 select-none text-[#0F172A] transition-all">
      {/* 头部：南大家园经典超椭圆微拟态品牌标识与四色微标 */}
      <div className="flex flex-col items-center text-center mb-6">
        {/* 南大家园标志性四色多巴胺图腾微点 */}
        <div className="flex items-center gap-1.5 mb-3.5 opacity-85">
          <span className="w-1.5 h-1.5 rounded-full bg-[#66CCFF]" />
          <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
          <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
          <span className="w-1.5 h-1.5 rounded-full bg-[#EC4899]" />
        </div>

        {/* NCU Squircle 柔和超椭圆底板 */}
        <div className="w-14 h-14 rounded-[20px] bg-[#EBF8FF] border border-[#66CCFF]/35 flex items-center justify-center mb-3">
          <Image
            src="/icon.svg"
            alt="贪吃蛇图标"
            width={40}
            height={40}
            className="w-10 h-10 rounded-[14px]"
            priority
          />
        </div>

        <h1 className="text-xl font-bold tracking-tight text-slate-800">贪吃蛇</h1>
        <p className="text-xs text-slate-400 mt-1 font-normal">
          方寸之间 · 重温经典
        </p>
      </div>

      {/* 登录与快捷自动激活表单 */}
      <form onSubmit={onLogin} className="flex flex-col gap-3.5">
        <div>
          <label className="block text-[11px] font-medium text-slate-500 mb-1 pl-0.5">
            用户名
          </label>
          <input
            type="text"
            placeholder="输入玩家用户名或昵称"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            className="w-full bg-[#F8FAFC] border border-slate-200/80 rounded-2xl px-4 py-2.5 text-sm text-[#0F172A] placeholder-slate-400 outline-none transition-all focus:bg-white focus:border-[#0099FF] focus:ring-4 focus:ring-[#66CCFF]/15"
            required
            autoComplete="username"
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-slate-500 mb-1 pl-0.5">
            密码
          </label>
          <input
            type="password"
            placeholder="输入密码"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="w-full bg-[#F8FAFC] border border-slate-200/80 rounded-2xl px-4 py-2.5 text-sm text-[#0F172A] placeholder-slate-400 outline-none transition-all focus:bg-white focus:border-[#0099FF] focus:ring-4 focus:ring-[#66CCFF]/15"
            required
            autoComplete="current-password"
          />
        </div>

        {/* 错误提示条 */}
        {error && (
          <div className="text-xs text-rose-600 bg-rose-50 border border-rose-100/80 py-2 px-3 rounded-xl text-center font-medium">
            {error}
          </div>
        )}

        {/* 南大家园深天蓝主交互按钮 */}
        <button
          type="submit"
          className="w-full mt-1.5 py-2.5 bg-[#0099FF] hover:bg-[#0088EE] active:scale-[0.98] text-white font-bold text-sm rounded-2xl transition-all cursor-pointer shadow-xs flex items-center justify-center"
        >
          开始游戏
        </button>

        {/* 底部无感自动入库轻提示与南大水印 */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 px-1">
          <span>首次登录自动注册激活</span>
          <span className="font-mono text-[10px] text-slate-300">NCU HOME</span>
        </div>
      </form>
    </div>
  );
}
