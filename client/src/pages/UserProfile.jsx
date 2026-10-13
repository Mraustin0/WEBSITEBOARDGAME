// ตั้งค่าบัญชีสมาชิก (หน้าแยก ไม่มี UserLayout): ข้อมูลส่วนตัว / เปลี่ยนรหัสผ่าน / ออกจากระบบ
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { clearSession, getUser, setSession } from '../lib/session.js';
import { useToast } from '../components/user/Toast.jsx';
import { BTN, CARD, INPUT } from '../components/user/brandUi.js';
import { BoardBorder, Logo } from '../components/brand/Brand.jsx';
import { MeepleIcon } from '../components/brand/BrandIcons.jsx';

const labelCls = 'block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5';
const inputCls = `${INPUT} py-2.5`;

export default function UserProfile() {
  const navigate = useNavigate();

  const getStored = () => getUser() ?? {};

  const [stored, setStored] = useState(getStored);
  const [profile, setProfile] = useState({
    username: stored.username ?? '',
    displayName: stored.displayName ?? '',
    email: stored.email ?? '',
    phone: stored.phone ?? '',
    lineId: stored.lineId ?? '',
  });
  const [pw, setPw] = useState({ oldPassword: '', newPassword: '', confirm: '' });
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [busyProfile, setBusyProfile] = useState(false);
  const [busyPw, setBusyPw] = useState(false);
  const [toastEl, showToast] = useToast();

  // ดึงข้อมูลล่าสุดจาก DB เมื่อเปิดหน้า
  useEffect(() => {
    api('/auth/me')
      .then((user) => {
        const merged = { ...getStored(), ...user };
        setSession({ user: merged });
        setStored(merged);
        setProfile({
          username: user.username ?? '',
          displayName: user.displayName ?? '',
          email: user.email ?? '',
          phone: user.phone ?? '',
          lineId: user.lineId ?? '',
        });
      })
      .catch(() => {});
  }, []);

  const setP = (k) => (e) => setProfile((f) => ({ ...f, [k]: e.target.value }));
  const setPW = (k) => (e) => setPw((f) => ({ ...f, [k]: e.target.value }));

  async function saveProfile(e) {
    e.preventDefault();
    setBusyProfile(true);
    try {
      const body = {};
      if (profile.username !== stored.username) body.username = profile.username;
      if (profile.displayName !== stored.displayName) body.displayName = profile.displayName;
      if (profile.email !== stored.email) body.email = profile.email;
      if (profile.phone !== stored.phone) body.phone = profile.phone;
      if (profile.lineId !== stored.lineId) body.lineId = profile.lineId;

      if (Object.keys(body).length === 0) {
        showToast('ไม่มีอะไรเปลี่ยนแปลง');
        return;
      }

      const user = await api('/auth/me', { method: 'PUT', body });
      const merged = { ...stored, ...user };
      setSession({ user: merged });
      setStored(merged);
      showToast('บันทึกข้อมูลแล้ว');
    } catch (err) {
      showToast(
        err.status === 409
          ? 'ชื่อผู้ใช้หรืออีเมลนี้มีคนใช้แล้ว'
          : (err.message ?? 'บันทึกไม่สำเร็จ'),
        false,
      );
    } finally {
      setBusyProfile(false);
    }
  }

  async function changePassword(e) {
    e.preventDefault();
    if (pw.newPassword !== pw.confirm) {
      showToast('รหัสผ่านใหม่ไม่ตรงกัน', false);
      return;
    }
    setBusyPw(true);
    try {
      const res = await api('/auth/password', {
        method: 'PUT',
        body: { oldPassword: pw.oldPassword, newPassword: pw.newPassword },
      });
      // token เดิมถูกยกเลิกหลังเปลี่ยนรหัส → ใช้ token ใหม่ที่ server ส่งมา
      if (res?.token) setSession({ token: res.token });
      showToast('เปลี่ยนรหัสผ่านแล้ว');
      setPw({ oldPassword: '', newPassword: '', confirm: '' });
    } catch (err) {
      const msg = /old password incorrect/.test(err.message)
        ? 'รหัสผ่านเดิมไม่ถูกต้อง'
        : /must differ/.test(err.message)
          ? 'รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสเดิม'
          : err.details?.newPassword
            ? 'รหัสผ่านใหม่ต้องยาวอย่างน้อย 6 ตัวอักษร'
            : (err.message ?? 'เปลี่ยนรหัสผ่านไม่สำเร็จ');
      showToast(msg, false);
    } finally {
      setBusyPw(false);
    }
  }

  function logout() {
    clearSession();
    navigate('/signin', { replace: true });
  }

  const initials = (profile.username || profile.email || '?').slice(0, 2).toUpperCase();

  return (
    <div className="paper min-h-screen font-sans text-ink">
      {toastEl}

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-ink/10 bg-cream-light/95 backdrop-blur">
        <BoardBorder className="h-1.5" />
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between gap-3 px-4 sm:px-6">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex shrink-0 items-center gap-1.5 rounded-full px-2 py-1.5 text-sm font-semibold text-forest transition hover:bg-cream focus:outline-none focus-visible:ring-2 focus-visible:ring-forest"
          >
            <span aria-hidden="true">←</span> กลับ
          </button>
          <Link
            to="/"
            aria-label="Boardgame Everyday หน้าแรก"
            className="min-w-0 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-forest"
          >
            <Logo size="sm" />
          </Link>
          <button
            type="button"
            onClick={logout}
            aria-label="ออกจากระบบ"
            className="flex shrink-0 items-center gap-1.5 rounded-full px-2 py-1.5 text-sm font-semibold text-brick-dark transition hover:bg-brick-light/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-forest"
          >
            <i className="fa-solid fa-right-from-bracket text-xs" aria-hidden="true" />
            <span className="hidden sm:inline">ออกจากระบบ</span>
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
        <div>
          <h1 className="font-heading text-3xl leading-tight text-forest sm:text-4xl">
            ตั้งค่าบัญชี
          </h1>
          <p className="text-sm text-slate-600">
            แก้ข้อมูลติดต่อ เปลี่ยนรหัสผ่าน และจัดการการเข้าสู่ระบบ
          </p>
        </div>

        {/* Avatar + info */}
        <div className={`${CARD} flex items-center gap-4 p-5 sm:gap-5 sm:p-6`}>
          <div className="relative shrink-0">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-ink/80 bg-forest font-heading text-xl text-white shadow-card">
              {initials}
            </div>
            <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border border-ink/15 bg-cream">
              <MeepleIcon size={18} fill="#cd5c5c" />
            </span>
          </div>
          <div className="min-w-0">
            <div className="truncate font-heading text-xl text-forest">
              {profile.displayName || profile.username}
            </div>
            <div className="truncate text-sm text-slate-600">{profile.email}</div>
            <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-teal px-2.5 py-1 text-xs font-semibold text-white">
              <i className="fa-solid fa-circle-check text-[10px]" aria-hidden="true" />
              {stored.role === 'staff'
                ? 'พนักงาน'
                : stored.role === 'admin'
                  ? 'ผู้ดูแลร้าน'
                  : 'สมาชิก'}
            </div>
          </div>
        </div>

        {/* Profile form */}
        <form onSubmit={saveProfile} className={`${CARD} space-y-5 p-5 sm:p-6`}>
          <h2 className="flex items-center gap-2 font-heading text-xl text-forest">
            <i className="fa-solid fa-user text-base text-brick-dark" aria-hidden="true" />{' '}
            ข้อมูลส่วนตัว
          </h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="pf-username" className={labelCls}>
                ชื่อผู้ใช้
              </label>
              <input
                id="pf-username"
                className={inputCls}
                value={profile.username}
                onChange={setP('username')}
              />
            </div>
            <div>
              <label htmlFor="pf-display" className={labelCls}>
                ชื่อที่แสดง
              </label>
              <input
                id="pf-display"
                className={inputCls}
                value={profile.displayName}
                onChange={setP('displayName')}
                placeholder="ชื่อที่อยากให้แสดง"
              />
            </div>
          </div>

          <div>
            <label htmlFor="pf-email" className={labelCls}>
              อีเมล
            </label>
            <input
              id="pf-email"
              className={inputCls}
              type="email"
              value={profile.email}
              onChange={setP('email')}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="pf-phone" className={labelCls}>
                เบอร์โทรศัพท์
              </label>
              <input
                id="pf-phone"
                className={inputCls}
                type="tel"
                value={profile.phone}
                onChange={setP('phone')}
                placeholder="081-234-5678"
              />
            </div>
            <div>
              <label htmlFor="pf-line" className={labelCls}>
                LINE ID
              </label>
              <input
                id="pf-line"
                className={inputCls}
                value={profile.lineId}
                onChange={setP('lineId')}
                placeholder="@yourline"
              />
            </div>
          </div>

          <button type="submit" disabled={busyProfile} className={`${BTN.primary} w-full`}>
            {busyProfile ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
          </button>
        </form>

        {/* Password form */}
        <form onSubmit={changePassword} className={`${CARD} space-y-5 p-5 sm:p-6`}>
          <h2 className="flex items-center gap-2 font-heading text-xl text-forest">
            <i className="fa-solid fa-lock text-base text-brick-dark" aria-hidden="true" />{' '}
            เปลี่ยนรหัสผ่าน
          </h2>

          <div>
            <label htmlFor="pw-old" className={labelCls}>
              รหัสผ่านเดิม
            </label>
            <div className="relative">
              <input
                id="pw-old"
                className={`${inputCls} pr-11`}
                type={showOld ? 'text' : 'password'}
                autoComplete="current-password"
                value={pw.oldPassword}
                onChange={setPW('oldPassword')}
              />
              <button
                type="button"
                aria-label={showOld ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 hover:bg-cream hover:text-forest focus:outline-none focus-visible:ring-2 focus-visible:ring-forest"
                onClick={() => setShowOld((s) => !s)}
              >
                <i
                  className={`fa-regular ${showOld ? 'fa-eye-slash' : 'fa-eye'} text-sm`}
                  aria-hidden="true"
                />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="pw-new" className={labelCls}>
                รหัสผ่านใหม่
              </label>
              <div className="relative">
                <input
                  id="pw-new"
                  className={`${inputCls} pr-11`}
                  type={showNew ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={pw.newPassword}
                  onChange={setPW('newPassword')}
                  placeholder="ขั้นต่ำ 6 ตัวอักษร"
                />
                <button
                  type="button"
                  aria-label={showNew ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                  className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 hover:bg-cream hover:text-forest focus:outline-none focus-visible:ring-2 focus-visible:ring-forest"
                  onClick={() => setShowNew((s) => !s)}
                >
                  <i
                    className={`fa-regular ${showNew ? 'fa-eye-slash' : 'fa-eye'} text-sm`}
                    aria-hidden="true"
                  />
                </button>
              </div>
            </div>
            <div>
              <label htmlFor="pw-confirm" className={labelCls}>
                ยืนยันรหัสผ่านใหม่
              </label>
              <input
                id="pw-confirm"
                className={inputCls}
                type="password"
                autoComplete="new-password"
                value={pw.confirm}
                onChange={setPW('confirm')}
                placeholder="พิมพ์อีกครั้ง"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={busyPw || !pw.oldPassword || !pw.newPassword || !pw.confirm}
            className={`${BTN.primary} w-full`}
          >
            {busyPw ? 'กำลังเปลี่ยน...' : 'เปลี่ยนรหัสผ่าน'}
          </button>
        </form>

        {/* Danger zone */}
        <div className="rounded-2xl border border-brick/30 bg-brick-light/40 p-5 shadow-card sm:p-6">
          <h2 className="mb-3 flex items-center gap-2 font-heading text-xl text-brick-dark">
            <i className="fa-solid fa-triangle-exclamation text-base" aria-hidden="true" />{' '}
            ออกจากระบบ
          </h2>
          <p className="mb-4 text-sm text-slate-700">
            ออกจากระบบบนอุปกรณ์นี้ ครั้งหน้าต้องเข้าสู่ระบบใหม่
          </p>
          <button type="button" onClick={logout} className={`${BTN.danger} w-full`}>
            <i className="fa-solid fa-right-from-bracket" aria-hidden="true" />
            ออกจากระบบ
          </button>
        </div>
      </div>
    </div>
  );
}
