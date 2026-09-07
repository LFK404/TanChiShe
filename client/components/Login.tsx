import React from 'react';
import Image from 'next/image';

interface Props {
  form: { username: string; password: string };
  error: string;
  setForm: (f: { username: string; password: string }) => void;
  onLogin: (e: React.FormEvent) => void;
}

// 玩家登录与免密自动激活组件 (NCU HOME 极简现代主义，纯净留白设计)
export default function Login({ form, error, setForm, onLogin }: Props) {
  return (
    <div className="w-full max-w-[360px] md:max-w-2xl bg-white/95 backdrop-blur-xl rounded-3xl border border-slate-200/80 shadow-lg shadow-slate-200/50 select-none text-[#0F172A] transition-all overflow-hidden flex flex-col md:flex-row">
      {/* 左侧故事展画 (桌面端手绘绘本封面，移动端顶部高光画幅) */}
      <div className="relative md:w-5/12 h-36 md:h-auto min-h-[160px] bg-slate-100 overflow-hidden flex flex-col justify-end p-5 text-white">
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-700 hover:scale-105"
          style={{ backgroundImage: "url('/image/Gemini_Generated_Image_qplo2tqplo2tqplo.jpg')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-slate-950/75 via-slate-900/30 to-transparent" />
        <div className="relative z-10">
          <div className="flex items-center gap-1.5 mb-1.5 opacity-90">
            <span className="w-1.5 h-1.5 rounded-full bg-[#66CCFF]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#EC4899]" />
            <span className="text-[10px] font-mono tracking-widest text-sky-200 uppercase ml-1">NCU HOME</span>
          </div>
          <h2 className="text-lg md:text-xl font-black drop-shadow tracking-tight">贪吃蛇</h2>
          <p className="text-xs text-white/80 font-normal drop-shadow">方寸之间 · 重温经典竞技</p>
        </div>
      </div>

      {/* 右侧表单操作区 */}
      <div className="p-6 sm:p-8 flex-1 flex flex-col justify-center">
        <div className="hidden md:flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-xl bg-[#EBF8FF] border border-[#66CCFF]/35 flex items-center justify-center">
            <Image
              src="/icon.svg"
              alt="贪吃蛇图标"
              width={22}
              height={22}
              className="rounded-lg"
              priority
            />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">玩家登录</h3>
            <p className="text-[11px] text-slate-400">输入昵称即刻加入风云榜</p>
          </div>
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

          {/* NCU HOME 深天蓝主交互按钮 */}
          <button
            type="submit"
            className="w-full mt-1.5 py-2.5 bg-[#0099FF] hover:bg-[#0088EE] active:scale-[0.98] text-white font-bold text-sm rounded-2xl transition-all cursor-pointer shadow-xs flex items-center justify-center"
          >
            开始游戏
          </button>

          {/* 底部无感自动入库轻提示与 NCU HOME 水印 */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 px-1">
            <span>首次登录自动注册激活</span>
            <span className="font-mono text-[10px] text-slate-300">NCU HOME</span>
          </div>
        </form>
      </div>
    </div>
  );
}
