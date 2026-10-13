import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../lib/api.js';
import { homeFor, setSession } from '../lib/session.js';

const FEATURES = [
  { icon: 'fa-map', label: 'ดูผังโต๊ะว่างแบบเรียลไทม์', desc: 'เห็นโต๊ะว่างทุกโซนก่อนมาถึงร้าน' },
  { icon: 'fa-users', label: 'เลือกเกมพร้อมจองโต๊ะ', desc: 'ร้านเตรียมเกมไว้ให้ที่โต๊ะ' },
  {
    icon: 'fa-hourglass-half',
    label: 'ดูเวลา ต่อเวลา คืนเกมเองได้',
    desc: 'จัดการโต๊ะที่กำลังเล่นจากมือถือ',
  },
  { icon: 'fa-star', label: 'รีวิวเกม', desc: 'ให้คะแนนและอ่านรีวิวจากสมาชิก' },
];

export default function UserAuth() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from; // หน้าที่ถูกพามาก่อน login (ถ้ามี)
  const goNext = (user) => navigate(from || homeFor(user), { replace: true });

  const [tab, setTab] = useState('login');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [remember, setRemember] = useState(false);

  const [login, setLogin] = useState({ email: '', password: '' });
  const [reg, setReg] = useState({
    displayName: '',
    username: '',
    email: '',
    phone: '',
    password: '',
    confirm: '',
  });

  const setL = (k) => (e) => setLogin((f) => ({ ...f, [k]: e.target.value }));
  const setR = (k) => (e) => setReg((f) => ({ ...f, [k]: e.target.value }));

  function switchTab(t) {
    setTab(t);
    setError('');
    setFieldErrors({});
  }

  async function onLogin(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setFieldErrors({});
    try {
      const { token, user } = await api('/auth/login', {
        method: 'POST',
        body: { email: login.email.trim(), password: login.password },
      });
      setSession({ token, user });
      goNext(user);
    } catch (err) {
      if (err.status === 401) setError('ชื่อผู้ใช้/อีเมล หรือรหัสผ่านไม่ถูกต้อง');
      else if (err.status === 403) setError('บัญชีนี้ถูกระงับหรือยังรออนุมัติ — ติดต่อพนักงาน');
      else if (err.status === 400) {
        setError(err.message);
        setFieldErrors(err.details ?? {});
      } else setError(err.message ?? 'เกิดข้อผิดพลาด');
    } finally {
      setBusy(false);
    }
  }

  async function onRegister(e) {
    e.preventDefault();
    if (reg.password !== reg.confirm) {
      setFieldErrors({ confirm: ['รหัสผ่านไม่ตรงกัน'] });
      return;
    }
    setBusy(true);
    setError('');
    setFieldErrors({});
    try {
      const { token, user } = await api('/auth/register', {
        method: 'POST',
        body: {
          username: reg.username.trim(),
          email: reg.email.trim(),
          password: reg.password,
          displayName: reg.displayName.trim() || undefined,
          phone: reg.phone.trim() || undefined,
        },
      });
      setSession({ token, user });
      goNext(user);
    } catch (err) {
      if (err.status === 409) setError('อีเมลหรือชื่อผู้ใช้นี้มีคนใช้แล้ว');
      else if (err.status === 400) {
        setError(err.message);
        setFieldErrors(err.details ?? {});
      } else setError(err.message ?? 'เกิดข้อผิดพลาด');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f0fdf4] flex flex-col">
      {/* Header */}
      <header className="h-14 bg-white border-b border-slate-100 px-4 sm:px-8 flex items-center gap-3 shrink-0">
        <div className="w-9 h-9 rounded-xl bg-[#064e3b] flex items-center justify-center text-white text-sm shadow-sm">
          <i className="fa-solid fa-dice-d20" />
        </div>
        <div className="leading-none">
          <div className="font-bold text-slate-900 text-sm tracking-tight">Boardgame Everyday</div>
          <div className="text-[10px] text-slate-400 tracking-widest font-semibold">
            คาเฟ่บอร์ดเกม
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0">
        {/* Left: Hero (ซ่อนบนมือถือ ให้ฟอร์มเต็มจอ) */}
        <div className="hidden lg:flex flex-1 p-10 flex-col gap-6 overflow-y-auto">
          <span className="inline-flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1.5 rounded-full self-start">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            คาเฟ่บอร์ดเกม
          </span>

          <div>
            <h1 className="text-4xl font-bold text-slate-900 leading-tight">
              ยินดีต้อนรับสู่ <span className="text-[#064e3b]">Boardgame Everyday</span>
            </h1>
            <p className="text-slate-500 mt-2 text-sm leading-relaxed">
              ดูโต๊ะว่าง เลือกเกม และจองโต๊ะได้ในไม่กี่คลิก มาถึงร้านก็เล่นได้เลย
            </p>
          </div>

          {/* Hero photo placeholder */}
          <div
            className="relative rounded-2xl overflow-hidden bg-[#064e3b] shadow-lg"
            style={{ aspectRatio: '16/9' }}
          >
            <div className="absolute inset-0 flex items-center justify-center opacity-20">
              <i className="fa-solid fa-chess text-white" style={{ fontSize: 120 }} />
            </div>
            <div
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%)',
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-white opacity-60">
                <i className="fa-solid fa-dice-d20 text-5xl mb-2 block" />
                <div className="text-sm font-medium">Boardgame Everyday</div>
              </div>
            </div>
            {/* Stats overlay */}
            <div className="absolute bottom-3 left-3 right-3 flex items-center gap-3 bg-black/40 backdrop-blur-sm rounded-xl px-4 py-2">
              <i className="fa-solid fa-chess-knight text-white text-sm" />
              <span className="text-white text-xs font-semibold flex-1">
                บอร์ดเกมพร้อมเล่นทุกวัน
              </span>
              <span className="text-white/60 text-xs">•</span>
              <span className="text-emerald-300 text-xs font-semibold">ผังโต๊ะเรียลไทม์</span>
            </div>
          </div>

          {/* Feature grid */}
          <div className="grid grid-cols-2 gap-3">
            {FEATURES.map((f) => (
              <div key={f.label} className="flex items-start gap-3 bg-white/70 rounded-xl p-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm shrink-0">
                  <i className={`fa-solid ${f.icon}`} />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800">{f.label}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Form Card */}
        <div className="w-full lg:w-[460px] shrink-0 p-4 sm:p-8 flex items-center justify-center overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full p-8 my-auto">
            {/* Tabs */}
            <div className="flex rounded-xl border border-slate-200 p-1 mb-6">
              <button
                type="button"
                onClick={() => switchTab('login')}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                  tab === 'login'
                    ? 'bg-[#064e3b] text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                เข้าสู่ระบบ
              </button>
              <button
                type="button"
                onClick={() => switchTab('register')}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                  tab === 'register'
                    ? 'bg-[#064e3b] text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                สมัครสมาชิก
              </button>
            </div>

            {/* Login Form */}
            {tab === 'login' && (
              <form onSubmit={onLogin} noValidate>
                <h2 className="text-xl font-bold text-slate-900 mb-1">ยินดีต้อนรับกลับมา</h2>
                <p className="text-xs text-slate-400 mb-5">
                  เข้าสู่ระบบเพื่อจองโต๊ะและดูการจองของคุณ
                </p>

                {error && (
                  <div className="mb-4 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
                    {error}
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                      ชื่อผู้ใช้หรืออีเมล
                    </label>
                    <div className="relative">
                      <i className="fa-regular fa-envelope absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
                      <input
                        className="w-full border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-sm outline-none focus:border-[#064e3b] focus:ring-1 focus:ring-[#064e3b] transition"
                        type="email"
                        placeholder="เช่น gawin_dice หรือ you@example.com"
                        autoComplete="email"
                        value={login.email}
                        onChange={setL('email')}
                      />
                    </div>
                    {fieldErrors.email && (
                      <p className="text-xs text-red-500 mt-1">{fieldErrors.email[0]}</p>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-slate-600">รหัสผ่าน</label>
                      <button type="button" className="text-xs text-slate-400 hover:text-[#064e3b]">
                        Password
                      </button>
                    </div>
                    <div className="relative">
                      <i className="fa-solid fa-lock absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
                      <input
                        className="w-full border border-slate-200 rounded-xl pl-9 pr-10 py-2.5 text-sm outline-none focus:border-[#064e3b] focus:ring-1 focus:ring-[#064e3b] transition"
                        type={showPw ? 'text' : 'password'}
                        autoComplete="current-password"
                        value={login.password}
                        onChange={setL('password')}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        onClick={() => setShowPw((s) => !s)}
                      >
                        <i className={`fa-regular ${showPw ? 'fa-eye-slash' : 'fa-eye'} text-sm`} />
                      </button>
                    </div>
                    {fieldErrors.password && (
                      <p className="text-xs text-red-500 mt-1">{fieldErrors.password[0]}</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-500">
                      <input
                        type="checkbox"
                        className="rounded border-slate-300 text-[#064e3b]"
                        checked={remember}
                        onChange={(e) => setRemember(e.target.checked)}
                      />
                      จำฉันไว้
                    </label>
                    <button
                      type="button"
                      onClick={() => setError('ลืมรหัสผ่าน? แจ้งพนักงานที่ร้านให้ช่วยตั้งรหัสใหม่')}
                      className="text-xs text-[#064e3b] font-semibold hover:underline"
                    >
                      ลืมรหัสผ่าน?
                    </button>
                  </div>
                </div>

                <button
                  className="mt-5 w-full bg-[#064e3b] text-white py-3 rounded-xl font-bold text-sm hover:bg-emerald-900 transition disabled:opacity-50"
                  type="submit"
                  disabled={busy || !login.email || !login.password}
                >
                  {busy ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
                </button>

                <div className="flex items-center gap-3 my-5">
                  <div className="flex-1 h-px bg-slate-100" />
                  <span className="text-xs text-slate-400">หรือเข้าสู่ระบบด้วย (เร็ว ๆ นี้)</span>
                  <div className="flex-1 h-px bg-slate-100" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    disabled
                    className="flex items-center justify-center gap-2 border border-slate-200 rounded-xl py-2.5 text-sm font-semibold text-slate-400 bg-slate-50 cursor-not-allowed"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Google
                  </button>
                  <button
                    type="button"
                    disabled
                    className="flex items-center justify-center gap-2 border border-slate-200 rounded-xl py-2.5 text-sm font-semibold text-slate-400 bg-slate-50 cursor-not-allowed"
                  >
                    <i className="fa-brands fa-facebook text-blue-400 text-base" />
                    Facebook
                  </button>
                </div>

                <p className="text-center text-xs text-slate-400 mt-5">
                  ยังไม่มีบัญชีสมาชิกใช่ไหม?{' '}
                  <button
                    type="button"
                    onClick={() => switchTab('register')}
                    className="text-[#064e3b] font-bold hover:underline"
                  >
                    สมัครสมาชิกที่นี่
                  </button>
                </p>
              </form>
            )}

            {/* Register Form */}
            {tab === 'register' && (
              <form onSubmit={onRegister} noValidate>
                <h2 className="text-xl font-bold text-slate-900 mb-1">สร้างบัญชีสมาชิกใหม่</h2>
                <p className="text-xs text-slate-400 mb-5">
                  สมัครฟรี แล้วจองโต๊ะพร้อมเลือกเกมได้ทันที
                </p>

                {error && (
                  <div className="mb-4 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
                    {error}
                  </div>
                )}

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                        ชื่อที่แสดง
                      </label>
                      <input
                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#064e3b] focus:ring-1 focus:ring-[#064e3b] transition"
                        type="text"
                        placeholder="กวินท์ โต๊ะทอง"
                        value={reg.displayName}
                        onChange={setR('displayName')}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                        ชื่อผู้ใช้
                      </label>
                      <input
                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#064e3b] focus:ring-1 focus:ring-[#064e3b] transition"
                        type="text"
                        placeholder="gawin_dice"
                        autoComplete="username"
                        value={reg.username}
                        onChange={setR('username')}
                      />
                      {fieldErrors.username && (
                        <p className="text-xs text-red-500 mt-1">{fieldErrors.username[0]}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                      อีเมล
                    </label>
                    <input
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#064e3b] focus:ring-1 focus:ring-[#064e3b] transition"
                      type="email"
                      placeholder="you@example.com"
                      autoComplete="email"
                      value={reg.email}
                      onChange={setR('email')}
                    />
                    {fieldErrors.email && (
                      <p className="text-xs text-red-500 mt-1">{fieldErrors.email[0]}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                      เบอร์โทรศัพท์ <span className="text-slate-400 font-normal">(ไม่บังคับ)</span>
                    </label>
                    <input
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#064e3b] focus:ring-1 focus:ring-[#064e3b] transition"
                      type="tel"
                      placeholder="081-234-5678"
                      value={reg.phone}
                      onChange={setR('phone')}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                        รหัสผ่าน
                      </label>
                      <div className="relative">
                        <input
                          className="w-full border border-slate-200 rounded-xl pl-3 pr-9 py-2.5 text-sm outline-none focus:border-[#064e3b] focus:ring-1 focus:ring-[#064e3b] transition"
                          type={showPw ? 'text' : 'password'}
                          placeholder="ขั้นต่ำ 6 ตัวอักษร"
                          autoComplete="new-password"
                          value={reg.password}
                          onChange={setR('password')}
                        />
                        <button
                          type="button"
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                          onClick={() => setShowPw((s) => !s)}
                        >
                          <i
                            className={`fa-regular ${showPw ? 'fa-eye-slash' : 'fa-eye'} text-sm`}
                          />
                        </button>
                      </div>
                      {fieldErrors.password && (
                        <p className="text-xs text-red-500 mt-1">{fieldErrors.password[0]}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                        ยืนยันรหัสผ่าน
                      </label>
                      <div className="relative">
                        <input
                          className="w-full border border-slate-200 rounded-xl pl-3 pr-9 py-2.5 text-sm outline-none focus:border-[#064e3b] focus:ring-1 focus:ring-[#064e3b] transition"
                          type={showConfirm ? 'text' : 'password'}
                          placeholder="พิมพ์อีกครั้ง"
                          autoComplete="new-password"
                          value={reg.confirm}
                          onChange={setR('confirm')}
                        />
                        <button
                          type="button"
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                          onClick={() => setShowConfirm((s) => !s)}
                        >
                          <i
                            className={`fa-regular ${showConfirm ? 'fa-eye-slash' : 'fa-eye'} text-sm`}
                          />
                        </button>
                      </div>
                      {fieldErrors.confirm && (
                        <p className="text-xs text-red-500 mt-1">{fieldErrors.confirm[0]}</p>
                      )}
                    </div>
                  </div>

                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      required
                      className="mt-0.5 rounded border-slate-300 text-[#064e3b]"
                    />
                    <span className="text-xs text-slate-500 leading-relaxed">
                      ฉันยอมรับ{' '}
                      <button
                        type="button"
                        className="text-[#064e3b] font-semibold hover:underline"
                      >
                        ข้อกำหนดการใช้บริการ
                      </button>{' '}
                      และ{' '}
                      <button
                        type="button"
                        className="text-[#064e3b] font-semibold hover:underline"
                      >
                        นโยบายความเป็นส่วนตัว
                      </button>{' '}
                      ของ Boardgame Everyday
                    </span>
                  </label>
                </div>

                <button
                  className="mt-5 w-full bg-[#064e3b] text-white py-3 rounded-xl font-bold text-sm hover:bg-emerald-900 transition disabled:opacity-50 flex items-center justify-center gap-2"
                  type="submit"
                  disabled={busy || !reg.username || !reg.email || !reg.password || !reg.confirm}
                >
                  {busy ? (
                    'กำลังสร้างบัญชี...'
                  ) : (
                    <>
                      สมัครสมาชิก <i className="fa-solid fa-circle-check text-emerald-300" />
                    </>
                  )}
                </button>

                <p className="text-center text-xs text-slate-400 mt-5">
                  มีบัญชีสมาชิกอยู่แล้วใช่ไหม?{' '}
                  <button
                    type="button"
                    onClick={() => switchTab('login')}
                    className="text-[#064e3b] font-bold hover:underline"
                  >
                    เข้าสู่ระบบที่นี่
                  </button>
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
