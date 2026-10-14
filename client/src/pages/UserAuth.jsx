// หน้าเข้าสู่ระบบ / สมัครสมาชิก (/signin) — หน้าเดียวสำหรับทั้งสมาชิกและพนักงาน
// login แล้วพากลับหน้าที่ถูกส่งมา (location.state.from) หรือหน้าหลักตาม role (พนักงาน → /admin)
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { homeFor, setSession } from '../lib/session.js';
import { BoardBorder, Logo, Photo } from '../components/brand/Brand.jsx';
import { CardsIcon, ClockIcon, DiceIcon, TableIcon } from '../components/brand/BrandIcons.jsx';
import FieldError, { FieldHint, PASSWORD_HINT } from '../components/FieldError.jsx';
import { DUP_ACCOUNT_MSG, useFieldErrors } from '../lib/useFieldErrors.js';
import {
  normalizePhone,
  vConfirm,
  vEmail,
  vNewPassword,
  vPersonName,
  vPhone,
  vUsername,
} from '../lib/validate.js';

const PERKS = [
  {
    Icon: TableIcon,
    title: 'เห็นโต๊ะว่างแบบเรียลไทม์',
    desc: 'เปิดผังร้าน เลือกโต๊ะ แล้วจองได้ทันที',
  },
  {
    Icon: CardsIcon,
    title: 'เลือกเกมพร้อมจองโต๊ะ',
    desc: 'ร้านเตรียมเกมที่คุณเลือกไว้ให้ที่โต๊ะ',
  },
  {
    Icon: ClockIcon,
    title: 'ต่อเวลา คืนเกม เรียกพนักงาน',
    desc: 'จัดการโต๊ะที่กำลังเล่นได้จากมือถือ',
  },
];

// ช่องที่ผิด (aria-invalid) ได้ขอบแดงอิฐจาก index.css
const inputCls = () =>
  'w-full h-12 rounded-xl border-2 bg-white px-4 text-base text-ink placeholder:text-slate-400 outline-none transition focus:border-forest focus:ring-4 focus:ring-forest-200 border-slate-200 hover:border-slate-300';

/** ช่องกรอกพร้อม label + ข้อความ error ใต้ช่อง (เชื่อมกันด้วย aria-describedby จาก v.bind) */
function Field({ id, label, optional, v, k, hint, children, trailing }) {
  const hintId = hint ? `${id}-hint` : undefined;
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-ink mb-1.5">
        {label}
        {optional && <span className="ml-1 text-slate-500 font-normal text-xs">(ไม่บังคับ)</span>}
      </label>
      <div className="relative">
        {children(v.bind(k, { hintId }))}
        {trailing}
      </div>
      {hint && <FieldHint id={hintId}>{hint}</FieldHint>}
      <FieldError id={v.errId(k)} msg={v.errors[k]} />
    </div>
  );
}

function EyeToggle({ shown, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={shown ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
      aria-pressed={shown}
      className="absolute right-1.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-lg text-slate-500 hover:text-forest hover:bg-forest-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-forest flex items-center justify-center"
    >
      <i className={`fa-regular ${shown ? 'fa-eye-slash' : 'fa-eye'}`} aria-hidden="true"></i>
    </button>
  );
}

export default function UserAuth() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from; // หน้าที่ถูกพามาก่อน login (ถ้ามี)
  const goNext = (user) => navigate(from || homeFor(user), { replace: true });

  const [tab, setTab] = useState('login');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

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

  const lv = useFieldErrors(login, (f) => ({
    email: vEmail(f.email),
    password: f.password ? '' : 'กรอกรหัสผ่าน',
  }));
  const rv = useFieldErrors(reg, (f) => ({
    displayName: vPersonName(f.displayName),
    username: vUsername(f.username),
    email: vEmail(f.email),
    phone: vPhone(f.phone),
    password: vNewPassword(f.password),
    confirm: vConfirm(f.password, f.confirm),
  }));

  function switchTab(t) {
    setTab(t);
    setError('');
    setNotice('');
    lv.reset();
    rv.reset();
  }

  async function onLogin(e) {
    e.preventDefault();
    setError('');
    setNotice('');
    if (!lv.submit()) return;
    setBusy(true);
    try {
      const { token, user } = await api('/auth/login', {
        method: 'POST',
        body: { email: login.email.trim(), password: login.password },
      });
      setSession({ token, user });
      goNext(user);
    } catch (err) {
      if (err.status === 401) setError('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
      else if (err.status === 403) setError('บัญชีนี้ถูกระงับหรือยังรออนุมัติ — ติดต่อพนักงาน');
      else if (err.status === 400) {
        if (!lv.server(err)) setError(err.message);
      } else setError(err.message ?? 'เกิดข้อผิดพลาด');
    } finally {
      setBusy(false);
    }
  }

  async function onRegister(e) {
    e.preventDefault();
    setNotice('');
    setError('');
    if (!rv.submit()) return;
    setBusy(true);
    try {
      const { token, user } = await api('/auth/register', {
        method: 'POST',
        body: {
          username: reg.username.trim(),
          email: reg.email.trim(),
          password: reg.password,
          displayName: reg.displayName.trim() || undefined,
          phone: normalizePhone(reg.phone) || undefined,
        },
      });
      setSession({ token, user });
      goNext(user);
    } catch (err) {
      if (err.status === 409) {
        if (!rv.server(err)) rv.setErrors({ username: DUP_ACCOUNT_MSG, email: DUP_ACCOUNT_MSG });
      } else if (err.status === 400) {
        if (!rv.server(err)) setError(err.message);
      } else setError(err.message ?? 'เกิดข้อผิดพลาด');
    } finally {
      setBusy(false);
    }
  }

  const isLogin = tab === 'login';

  return (
    <div className="min-h-screen bg-cream-light lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] font-sans text-ink">
      {/* ---------- ซ้าย: แผงแบรนด์ (จอใหญ่เท่านั้น) ---------- */}
      <aside className="hidden lg:flex relative flex-col bg-forest text-cream overflow-hidden">
        <BoardBorder className="h-3 shrink-0" />
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.07] pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(#f5f5dc 1.2px, transparent 1.2px)',
            backgroundSize: '22px 22px',
          }}
        />
        <div className="relative flex-1 flex flex-col justify-between gap-10 px-12 xl:px-16 py-12">
          <Link
            to="/"
            className="self-start rounded-lg focus:outline-none focus-visible:ring-4 focus-visible:ring-mustard"
          >
            <Logo variant="light" size="md" showTagline />
          </Link>

          <div className="max-w-lg">
            <h1 className="font-heading text-4xl xl:text-5xl leading-[1.15]">
              โต๊ะว่าง เกมพร้อม
              <br />
              <span className="text-mustard">ขาดแค่คุณคนเดียว</span>
            </h1>
            <p className="mt-4 text-cream/80 text-base leading-relaxed">
              เข้าสู่ระบบเพื่อจองโต๊ะ เลือกเกม และดูการจองของคุณ — สมัครสมาชิกฟรีภายในไม่กี่วินาที
            </p>
            <ul className="mt-8 space-y-4">
              {PERKS.map(({ Icon, title, desc }) => (
                <li key={title} className="flex items-center gap-4">
                  <span className="w-14 h-14 shrink-0 rounded-2xl bg-cream border-2 border-ink flex items-center justify-center shadow-[3px_3px_0_0_#111c11]">
                    <Icon size={38} />
                  </span>
                  <span>
                    <span className="block font-heading text-lg leading-snug">{title}</span>
                    <span className="block text-sm text-cream/70">{desc}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <figure className="relative self-end w-[78%] max-w-md bg-cream-light p-3 pb-2 rounded-sm shadow-2xl rotate-2">
            <span
              aria-hidden="true"
              className="absolute -top-3 left-1/2 -translate-x-1/2 w-20 h-5 bg-mustard/70 -rotate-3 rounded-sm"
            />
            <Photo
              src="/images/signin.jpg"
              alt="เพื่อน ๆ กำลังเล่นบอร์ดเกมด้วยกันในร้าน"
              className="w-full aspect-[16/10]"
            />
            <figcaption className="font-heading text-ink text-sm text-center pt-2">
              เจอกันที่โต๊ะนะ!
            </figcaption>
            <span
              className="absolute -left-8 -bottom-6 -rotate-12 drop-shadow-lg"
              aria-hidden="true"
            >
              <DiceIcon size={60} />
            </span>
          </figure>
        </div>
        <BoardBorder className="h-3 shrink-0" />
      </aside>

      {/* ---------- ขวา: ฟอร์ม ---------- */}
      <main className="paper min-h-screen flex flex-col">
        <BoardBorder className="h-2 lg:hidden" />
        <div className="flex items-center justify-between gap-3 px-4 sm:px-8 pt-5">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-forest hover:text-forest-800 hover:underline underline-offset-4 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-forest"
          >
            <span aria-hidden="true">←</span> กลับหน้าแรก
          </Link>
          <Link to="/catalog" className="text-sm font-semibold text-slate-600 hover:text-forest">
            ดูคลังเกม
          </Link>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-8 py-8">
          <Link to="/" className="lg:hidden mb-6" aria-label="Boardgame Everyday หน้าแรก">
            <Logo size="md" showTagline />
          </Link>

          <div className="w-full max-w-md bg-cream-light rounded-3xl border-2 border-ink shadow-[6px_6px_0_0_#1f2a1f] p-5 sm:p-8">
            {/* แท็บ */}
            <div
              role="tablist"
              aria-label="เลือกการเข้าใช้งาน"
              className="grid grid-cols-2 p-1 rounded-full bg-white border-2 border-ink"
            >
              {[
                ['login', 'เข้าสู่ระบบ'],
                ['register', 'สมัครสมาชิก'],
              ].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  id={`auth-tab-${key}`}
                  aria-selected={tab === key}
                  aria-controls="auth-panel"
                  onClick={() => switchTab(key)}
                  className={`py-2.5 rounded-full text-sm font-bold transition focus:outline-none focus-visible:ring-4 focus-visible:ring-forest-200 ${
                    tab === key
                      ? 'bg-forest text-cream shadow-sm'
                      : 'text-slate-600 hover:text-forest'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div
              id="auth-panel"
              role="tabpanel"
              aria-labelledby={`auth-tab-${tab}`}
              className="mt-6"
            >
              <h2 className="font-heading text-2xl sm:text-3xl text-forest leading-tight">
                {isLogin ? 'ยินดีต้อนรับกลับมา!' : 'มาเป็นสมาชิกกันเถอะ'}
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                {isLogin
                  ? 'เข้าสู่ระบบเพื่อจองโต๊ะและดูการจองของคุณ'
                  : 'สมัครฟรี แล้วจองโต๊ะพร้อมเลือกเกมได้ทันที'}
              </p>

              {/* ข้อความแจ้งผล — อ่านออกเสียงโดย screen reader */}
              <div aria-live="polite" className="mt-4 empty:hidden">
                {error && (
                  <div
                    role="alert"
                    className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-brick-light border-2 border-brick text-brick-dark text-sm font-semibold"
                  >
                    <i className="fa-solid fa-triangle-exclamation mt-0.5" aria-hidden="true"></i>
                    <span>{error}</span>
                  </div>
                )}
                {notice && (
                  <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-teal-light border-2 border-teal text-teal-dark text-sm font-semibold">
                    <i className="fa-solid fa-circle-info mt-0.5" aria-hidden="true"></i>
                    <span>{notice}</span>
                  </div>
                )}
              </div>

              {isLogin ? (
                <form onSubmit={onLogin} noValidate className="mt-5 space-y-4">
                  <Field id="login-email" label="อีเมล" v={lv} k="email">
                    {(aria) => (
                      <input
                        id="login-email"
                        name="email"
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        maxLength={254}
                        placeholder="you@example.com"
                        className={inputCls()}
                        value={login.email}
                        onChange={setL('email')}
                        {...aria}
                      />
                    )}
                  </Field>

                  <Field
                    id="login-password"
                    label="รหัสผ่าน"
                    v={lv}
                    k="password"
                    trailing={<EyeToggle shown={showPw} onToggle={() => setShowPw((s) => !s)} />}
                  >
                    {(aria) => (
                      <input
                        id="login-password"
                        name="password"
                        type={showPw ? 'text' : 'password'}
                        autoComplete="current-password"
                        className={`${inputCls()} pr-12`}
                        value={login.password}
                        onChange={setL('password')}
                        {...aria}
                      />
                    )}
                  </Field>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setError('');
                        setNotice('ลืมรหัสผ่าน? แจ้งพนักงานที่ร้านให้ช่วยตั้งรหัสใหม่');
                      }}
                      className="text-sm font-semibold text-teal hover:text-teal-dark hover:underline underline-offset-4"
                    >
                      ลืมรหัสผ่าน?
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={busy}
                    className="w-full h-12 rounded-full bg-forest text-cream font-bold text-base shadow-[0_4px_0_0_#111c11] hover:bg-forest-800 active:translate-y-0.5 active:shadow-none focus:outline-none focus-visible:ring-4 focus-visible:ring-forest-300 disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
                  >
                    {busy ? (
                      <>
                        <i className="fa-solid fa-spinner fa-spin" aria-hidden="true"></i>
                        กำลังเข้าสู่ระบบ...
                      </>
                    ) : (
                      'เข้าสู่ระบบ'
                    )}
                  </button>

                  <p className="flex items-start gap-2 text-xs text-slate-600 bg-white/70 border border-slate-200 rounded-xl px-3 py-2.5">
                    <i className="fa-solid fa-id-badge text-forest mt-0.5" aria-hidden="true"></i>
                    <span>
                      พนักงานร้านใช้บัญชีเดียวกันเข้าสู่ระบบได้ที่นี่
                      ระบบจะพาไปหน้าหลังร้านให้อัตโนมัติ
                    </span>
                  </p>

                  <p className="text-center text-sm text-slate-600 pt-1">
                    ยังไม่มีบัญชีใช่ไหม?{' '}
                    <button
                      type="button"
                      onClick={() => switchTab('register')}
                      className="font-bold text-brick-dark hover:underline underline-offset-4"
                    >
                      สมัครสมาชิกฟรี
                    </button>
                  </p>
                </form>
              ) : (
                <form onSubmit={onRegister} noValidate className="mt-5 space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Field id="reg-display" label="ชื่อที่แสดง" optional v={rv} k="displayName">
                      {(aria) => (
                        <input
                          id="reg-display"
                          name="displayName"
                          type="text"
                          autoComplete="nickname"
                          maxLength={80}
                          placeholder="เช่น กวินท์"
                          className={inputCls()}
                          value={reg.displayName}
                          onChange={setR('displayName')}
                          {...aria}
                        />
                      )}
                    </Field>
                    <Field id="reg-username" label="ชื่อผู้ใช้" v={rv} k="username">
                      {(aria) => (
                        <input
                          id="reg-username"
                          name="username"
                          type="text"
                          autoComplete="username"
                          maxLength={32}
                          autoCapitalize="none"
                          spellCheck={false}
                          placeholder="gawin_dice"
                          className={inputCls()}
                          value={reg.username}
                          onChange={setR('username')}
                          {...aria}
                        />
                      )}
                    </Field>
                  </div>

                  <Field id="reg-email" label="อีเมล" v={rv} k="email">
                    {(aria) => (
                      <input
                        id="reg-email"
                        name="email"
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        maxLength={254}
                        placeholder="you@example.com"
                        className={inputCls()}
                        value={reg.email}
                        onChange={setR('email')}
                        {...aria}
                      />
                    )}
                  </Field>

                  <Field id="reg-phone" label="เบอร์โทรศัพท์" optional v={rv} k="phone">
                    {(aria) => (
                      <input
                        id="reg-phone"
                        name="phone"
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        maxLength={15}
                        placeholder="0812345678"
                        className={inputCls()}
                        value={reg.phone}
                        onChange={setR('phone')}
                        {...aria}
                      />
                    )}
                  </Field>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <Field
                      id="reg-password"
                      label="รหัสผ่าน"
                      v={rv}
                      k="password"
                      hint={PASSWORD_HINT}
                      trailing={<EyeToggle shown={showPw} onToggle={() => setShowPw((s) => !s)} />}
                    >
                      {(aria) => (
                        <input
                          id="reg-password"
                          name="password"
                          type={showPw ? 'text' : 'password'}
                          autoComplete="new-password"
                          maxLength={128}
                          placeholder="อย่างน้อย 8 ตัว"
                          className={`${inputCls()} pr-12`}
                          value={reg.password}
                          onChange={setR('password')}
                          {...aria}
                        />
                      )}
                    </Field>
                    <Field
                      id="reg-confirm"
                      label="ยืนยันรหัสผ่าน"
                      v={rv}
                      k="confirm"
                      trailing={
                        <EyeToggle shown={showConfirm} onToggle={() => setShowConfirm((s) => !s)} />
                      }
                    >
                      {(aria) => (
                        <input
                          id="reg-confirm"
                          name="confirm"
                          type={showConfirm ? 'text' : 'password'}
                          autoComplete="new-password"
                          placeholder="พิมพ์อีกครั้ง"
                          className={`${inputCls()} pr-12`}
                          value={reg.confirm}
                          onChange={setR('confirm')}
                          {...aria}
                        />
                      )}
                    </Field>
                  </div>

                  <button
                    type="submit"
                    disabled={busy}
                    className="w-full h-12 rounded-full bg-forest text-cream font-bold text-base shadow-[0_4px_0_0_#111c11] hover:bg-forest-800 active:translate-y-0.5 active:shadow-none focus:outline-none focus-visible:ring-4 focus-visible:ring-forest-300 disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
                  >
                    {busy ? (
                      <>
                        <i className="fa-solid fa-spinner fa-spin" aria-hidden="true"></i>
                        กำลังสร้างบัญชี...
                      </>
                    ) : (
                      'สมัครสมาชิก'
                    )}
                  </button>

                  <p className="text-center text-sm text-slate-600 pt-1">
                    มีบัญชีอยู่แล้วใช่ไหม?{' '}
                    <button
                      type="button"
                      onClick={() => switchTab('login')}
                      className="font-bold text-brick-dark hover:underline underline-offset-4"
                    >
                      เข้าสู่ระบบ
                    </button>
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>

        <p className="px-4 pb-6 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} Boardgame Everyday · คาเฟ่บอร์ดเกม
        </p>
      </main>
    </div>
  );
}
