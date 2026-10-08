import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import './profile.css';

const ROLE_TH = { admin: 'ผู้ดูแลระบบ', user: 'สมาชิก' };

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('th-TH', {
    timeZone: 'Asia/Bangkok',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function PasswordField({ label, hint, value, onChange, autoComplete }) {
  const [show, setShow] = useState(false);
  return (
    <label className="pf-field">
      <span>{label}</span>
      <div className="pf-pass">
        <input
          className="input"
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          maxLength={128}
        />
        <button
          type="button"
          className="pf-eye"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
        >
          {show ? 'ซ่อน' : 'แสดง'}
        </button>
      </div>
      {hint && <small className="pf-hint">{hint}</small>}
    </label>
  );
}

export default function Profile() {
  const [me, setMe] = useState(null);
  const [createdAt, setCreatedAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [form, setForm] = useState({
    displayName: '',
    username: '',
    email: '',
    phone: '',
    lineId: '',
  });
  const [saving, setSaving] = useState(false);

  const [pw, setPw] = useState({ oldPassword: '', newPassword: '', confirm: '' });
  const [pwBusy, setPwBusy] = useState(false);
  const [pwError, setPwError] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const u = await api('/auth/me');
        setMe(u);
        setForm({
          displayName: u.displayName || '',
          username: u.username || '',
          email: u.email || '',
          phone: u.phone || '',
          lineId: u.lineId || '',
        });
        setCreatedAt(u.createdAt || null);
        const m = await api(`/stats/members/${u.id ?? u._id}`).catch(() => null);
        if (m?.user?.createdAt) setCreatedAt(m.user.createdAt);
      } catch (err) {
        setError(err.message || 'โหลดโปรไฟล์ไม่สำเร็จ');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function saveProfile(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const updated = await api('/auth/me', { method: 'PUT', body: form });
      setMe(updated);
      localStorage.setItem('user', JSON.stringify(updated));
      setNotice('บันทึกโปรไฟล์แล้ว');
    } catch (err) {
      setError(err.message || 'บันทึกไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  }

  async function changePassword(e) {
    e.preventDefault();
    setPwError('');
    if (pw.newPassword.length < 6) {
      setPwError('รหัสผ่านใหม่อย่างน้อย 6 ตัวอักษร');
      return;
    }
    if (pw.newPassword !== pw.confirm) {
      setPwError('ยืนยันรหัสผ่านไม่ตรงกัน');
      return;
    }
    setPwBusy(true);
    try {
      await api('/auth/password', {
        method: 'PUT',
        body: { oldPassword: pw.oldPassword, newPassword: pw.newPassword },
      });
      setPw({ oldPassword: '', newPassword: '', confirm: '' });
      setNotice('เปลี่ยนรหัสผ่านแล้ว');
    } catch (err) {
      setPwError(err.message || 'เปลี่ยนรหัสผ่านไม่สำเร็จ');
    } finally {
      setPwBusy(false);
    }
  }

  if (loading) return <p className="muted">กำลังโหลด...</p>;

  return (
    <div className="pf">
      <div className="page-head">
        <div>
          <p className="muted">บัญชีของฉัน</p>
          <h1>
            โปรไฟล์ <span className="title-en">My Account</span>
          </h1>
        </div>
      </div>

      {error && <div className="pf-error">{error}</div>}
      {notice && <div className="pf-ok">{notice}</div>}

      <div className="pf-grid">
        <section className="pf-card">
          <h2>ข้อมูลส่วนตัว</h2>
          <div className="pf-identity">
            <div className="pf-avatar">{(me?.username || '?').charAt(0).toUpperCase()}</div>
            <div>
              <strong>{me?.displayName || me?.username}</strong>
              <p className="muted">
                {ROLE_TH[me?.role] || me?.role} · สมัครเมื่อ {formatDate(createdAt)}
              </p>
            </div>
          </div>
          <form onSubmit={saveProfile} className="pf-form">
            <label className="pf-field">
              <span>ชื่อที่แสดง</span>
              <input
                className="input"
                value={form.displayName}
                onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
              />
            </label>
            <label className="pf-field">
              <span>ชื่อผู้ใช้</span>
              <input
                className="input"
                value={form.username}
                onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                required
                minLength={3}
              />
            </label>
            <label className="pf-field">
              <span>อีเมล</span>
              <input
                className="input"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                required
              />
            </label>
            <label className="pf-field">
              <span>เบอร์โทร</span>
              <input
                className="input"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </label>
            <label className="pf-field">
              <span>LINE ID</span>
              <input
                className="input"
                value={form.lineId}
                onChange={(e) => setForm((f) => ({ ...f, lineId: e.target.value }))}
              />
            </label>
            <button type="submit" className="btn primary" disabled={saving}>
              {saving ? 'กำลังบันทึก...' : 'บันทึกโปรไฟล์'}
            </button>
          </form>
        </section>

        <section className="pf-card">
          <h2>เปลี่ยนรหัสผ่าน</h2>
          <form onSubmit={changePassword} className="pf-form">
            <PasswordField
              label="รหัสผ่านปัจจุบัน"
              value={pw.oldPassword}
              onChange={(e) => setPw((p) => ({ ...p, oldPassword: e.target.value }))}
              autoComplete="current-password"
            />
            <PasswordField
              label="รหัสผ่านใหม่"
              hint="อย่างน้อย 6 ตัวอักษร"
              value={pw.newPassword}
              onChange={(e) => setPw((p) => ({ ...p, newPassword: e.target.value }))}
              autoComplete="new-password"
            />
            <PasswordField
              label="ยืนยันรหัสผ่านใหม่"
              value={pw.confirm}
              onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))}
              autoComplete="new-password"
            />
            {pwError && <div className="pf-error">{pwError}</div>}
            <button type="submit" className="btn primary" disabled={pwBusy}>
              {pwBusy ? 'กำลังเปลี่ยน...' : 'เปลี่ยนรหัสผ่าน'}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
