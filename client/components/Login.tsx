import React from 'react';
import Image from 'next/image';

interface Props {
  form: { username: string; password: string };
  error: string;
  setForm: (f: { username: string; password: string }) => void;
  onLogin: (e: React.FormEvent) => void;
}

// 玩家登录与免密自动激活组件 (整张画全画幅沉浸绘本卡片，轻奢毛玻璃浮岛设计)
export default function Login({ form, error, setForm, onLogin }: Props) {
  return (
    <div className="w-full max-w-[400px] sm:max-w-[440px] rounded-3xl overflow-hidden border border-white/80 shadow-2xl shadow-indigo-950/20 relative select-none text-[#0F172A] transition-all group">
      {/* 1. 整张画全画幅艺术底图 (完整呈现手绘绘本画卷) */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 group-hover:scale-105"
        style={{ backgroundImage: "url('/image/Gemini_Generated_Image_qplo2tqplo2tqplo.jpg')" }}
      />
      {/* 2. 柔和艺术氛围层 (烘托整幅画作光影细节，同时强化文字可读性) */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/45 via-slate-900/25 to-slate-950/65" />

      {/* 3. 悬浮轻奢毛玻璃内容操作区 */}
      <div className="relative z-10 p-5 sm:p-7 flex flex-col">
        {/* 顶部：官方品牌水印徽标与游戏副标 */}
        <div className="flex flex-col items-center justify-center mb-4 text-center">
          <div className="bg-white/80 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/80 shadow-xs mb-2 flex items-center justify-center">
            <Image
              src="/ncuhome_logo.png"
              alt="NCUHOME 官方徽标"
              width={160}
              height={40}
              className="h-6 w-auto object-contain"
              priority
            />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white drop-shadow-md tracking-tight">贪吃蛇</h2>
          <p className="text-xs text-sky-100/90 font-normal drop-shadow">方寸之间 · 重温经典竞技</p>
        </div>

        {/* 登录与快捷自动激活毛玻璃表单浮岛 */}
        <form onSubmit={onLogin} className="bg-white/80 backdrop-blur-xl border border-white/85 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1 pl-0.5">
              用户名
            </label>
            <input
              type="text"
              placeholder="输入玩家用户名或昵称"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              className="w-full bg-white/85 border border-slate-200/80 rounded-2xl px-4 py-2.5 text-sm text-[#0F172A] placeholder-slate-400 outline-none transition-all focus:bg-white focus:border-[#0099FF] focus:ring-4 focus:ring-[#66CCFF]/20"
              required
              autoComplete="username"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1 pl-0.5">
              密码
            </label>
            <input
              type="password"
              placeholder="输入密码"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full bg-white/85 border border-slate-200/80 rounded-2xl px-4 py-2.5 text-sm text-[#0F172A] placeholder-slate-400 outline-none transition-all focus:bg-white focus:border-[#0099FF] focus:ring-4 focus:ring-[#66CCFF]/20"
              required
              autoComplete="current-password"
            />
          </div>

          {/* 错误提示条 */}
          {error && (
            <div className="text-xs text-rose-600 bg-rose-50/90 border border-rose-100/80 py-2 px-3 rounded-xl text-center font-medium">
              {error}
            </div>
          )}

          {/* NCU HOME 深天蓝主交互按钮 */}
          <button
            type="submit"
            className="w-full mt-1 py-2.5 bg-[#0099FF] hover:bg-[#0088EE] active:scale-[0.98] text-white font-bold text-sm rounded-2xl transition-all cursor-pointer shadow-xs flex items-center justify-center"
          >
            开始游戏
          </button>

          {/* 底部无感自动入库轻提示与 NCU HOME 官方字标 */}
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1 px-1">
            <span>首次登录自动注册激活</span>
            <span className="font-mono text-[10px] text-slate-400">NCU HOME</span>
          </div>
        </form>
      </div>
    </div>
  );
}
