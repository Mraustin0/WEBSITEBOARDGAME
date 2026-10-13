import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';

function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div
      className={`fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-5 py-3 rounded-2xl shadow-lg text-sm font-semibold text-white ${toast.ok ? 'bg-emerald-600' : 'bg-red-500'}`}
    >
      <i className={`fa-solid ${toast.ok ? 'fa-circle-check' : 'fa-circle-xmark'}`} />
      {toast.msg}
    </div>
  );
}

export default function UserProfile() {
  const navigate = useNavigate();

  const getStored = () => {
    try {
      return JSON.parse(localStorage.getItem('user')) ?? {};
    } catch {
      return {};
    }
  };

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
  const [toast, setToast] = useState(null);
  const timer = useRef(null);

  // ดึงข้อมูลล่าสุดจาก DB เมื่อเปิดหน้า
  useEffect(() => {
    api('/auth/me')
      .then((user) => {
        const merged = { ...getStored(), ...user };
        localStorage.setItem('user', JSON.stringify(merged));
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

  function showToast(msg, ok = true) {
    clearTimeout(timer.current);
    setToast({ msg, ok });
    timer.current = setTimeout(() => setToast(null), 3500);
  }

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
      localStorage.setItem('user', JSON.stringify(merged));
      setStored(merged);
      showToast('บันทึกข้อมูลเรียบร้อยแล้ว');
    } catch (err) {
      showToast(err.message ?? 'บันทึกไม่สำเร็จ', false);
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
      await api('/auth/password', {
        method: 'PUT',
        body: { oldPassword: pw.oldPassword, newPassword: pw.newPassword },
      });
      showToast('เปลี่ยนรหัสผ่านเรียบร้อยแล้ว');
      setPw({ oldPassword: '', newPassword: '', confirm: '' });
    } catch (err) {
      showToast(err.message ?? 'เปลี่ยนรหัสผ่านไม่สำเร็จ', false);
    } finally {
      setBusyPw(false);
    }
  }

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/signin', { replace: true });
  }

  const initials = (profile.username || profile.email || '?').slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <Toast toast={toast} />

      {/* Header */}
      <header className="h-16 bg-white border-b border-slate-200 shadow-sm px-6 flex items-center justify-between sticky top-0 z-40">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition text-sm font-semibold"
        >
          <i className="fa-solid fa-arrow-left text-xs" /> กลับ
        </button>
        <span className="font-bold text-slate-800">ตั้งค่าบัญชี</span>
        <button
          onClick={logout}
          className="text-sm text-red-500 hover:text-red-700 font-semibold transition flex items-center gap-1.5"
        >
          <i className="fa-solid fa-right-from-bracket text-xs" /> ออกจากระบบ
        </button>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Avatar + info */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 flex items-center gap-5">
          <div className="w-16 h-16 rounded-full bg-[#064e3b] text-white font-bold text-xl flex items-center justify-center shrink-0 shadow">
            {initials}
          </div>
          <div>
            <div className="font-bold text-lg text-slate-900">
              {profile.displayName || profile.username}
            </div>
            <div className="text-sm text-slate-400">{profile.email}</div>
            <div className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
              <i className="fa-solid fa-circle-check text-[10px]" />
              {stored.role === 'staff' ? 'Staff' : stored.role === 'admin' ? 'Admin' : 'Member'}
            </div>
          </div>
        </div>

        {/* Profile form */}
        <form
          onSubmit={saveProfile}
          className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5"
        >
          <h2 className="font-bold text-slate-800 text-base flex items-center gap-2">
            <i className="fa-solid fa-user text-[#064e3b] text-sm" /> ข้อมูลส่วนตัว
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                ชื่อผู้ใช้ (Handle)
              </label>
              <input
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#064e3b] focus:ring-1 focus:ring-[#064e3b]"
                value={profile.username}
                onChange={setP('username')}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                ชื่อที่แสดง
              </label>
              <input
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#064e3b] focus:ring-1 focus:ring-[#064e3b]"
                value={profile.displayName}
                onChange={setP('displayName')}
                placeholder="ชื่อจริง"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">อีเมล</label>
            <input
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#064e3b] focus:ring-1 focus:ring-[#064e3b]"
              type="email"
              value={profile.email}
              onChange={setP('email')}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                เบอร์โทรศัพท์
              </label>
              <input
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#064e3b] focus:ring-1 focus:ring-[#064e3b]"
                type="tel"
                value={profile.phone}
                onChange={setP('phone')}
                placeholder="081-234-5678"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">LINE ID</label>
              <input
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#064e3b] focus:ring-1 focus:ring-[#064e3b]"
                value={profile.lineId}
                onChange={setP('lineId')}
                placeholder="@yourline"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={busyProfile}
            className="w-full bg-[#064e3b] text-white py-2.5 rounded-xl font-bold text-sm hover:bg-emerald-900 transition disabled:opacity-50"
          >
            {busyProfile ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
          </button>
        </form>

        {/* Password form */}
        <form
          onSubmit={changePassword}
          className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5"
        >
          <h2 className="font-bold text-slate-800 text-base flex items-center gap-2">
            <i className="fa-solid fa-lock text-[#064e3b] text-sm" /> เปลี่ยนรหัสผ่าน
          </h2>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">
              รหัสผ่านเดิม
            </label>
            <div className="relative">
              <input
                className="w-full border border-slate-200 rounded-xl pl-3 pr-10 py-2.5 text-sm outline-none focus:border-[#064e3b] focus:ring-1 focus:ring-[#064e3b]"
                type={showOld ? 'text' : 'password'}
                autoComplete="current-password"
                value={pw.oldPassword}
                onChange={setPW('oldPassword')}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                onClick={() => setShowOld((s) => !s)}
              >
                <i className={`fa-regular ${showOld ? 'fa-eye-slash' : 'fa-eye'} text-sm`} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                รหัสผ่านใหม่
              </label>
              <div className="relative">
                <input
                  className="w-full border border-slate-200 rounded-xl pl-3 pr-10 py-2.5 text-sm outline-none focus:border-[#064e3b] focus:ring-1 focus:ring-[#064e3b]"
                  type={showNew ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={pw.newPassword}
                  onChange={setPW('newPassword')}
                  placeholder="ขั้นต่ำ 6 ตัวอักษร"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  onClick={() => setShowNew((s) => !s)}
                >
                  <i className={`fa-regular ${showNew ? 'fa-eye-slash' : 'fa-eye'} text-sm`} />
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                ยืนยันรหัสผ่านใหม่
              </label>
              <input
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#064e3b] focus:ring-1 focus:ring-[#064e3b]"
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
            className="w-full bg-slate-800 text-white py-2.5 rounded-xl font-bold text-sm hover:bg-slate-900 transition disabled:opacity-50"
          >
            {busyPw ? 'กำลังเปลี่ยน...' : 'เปลี่ยนรหัสผ่าน'}
          </button>
        </form>

        {/* Danger zone */}
        <div className="bg-white rounded-2xl border border-red-100 p-6">
          <h2 className="font-bold text-red-600 text-base flex items-center gap-2 mb-4">
            <i className="fa-solid fa-triangle-exclamation text-sm" /> ออกจากระบบ
          </h2>
          <p className="text-sm text-slate-500 mb-4">
            ออกจากระบบในอุปกรณ์นี้ — token จะถูกลบออกทันที
          </p>
          <button
            onClick={logout}
            className="w-full border border-red-200 text-red-500 hover:bg-red-50 py-2.5 rounded-xl font-bold text-sm transition"
          >
            <i className="fa-solid fa-right-from-bracket mr-2" />
            ออกจากระบบ
          </button>
        </div>
      </div>
    </div>
  );
}
