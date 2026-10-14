import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import { setSession } from '../../lib/session.js';
import './profile.css';
import FieldError, { PASSWORD_HINT } from '../../components/FieldError.jsx';
import { DUP_ACCOUNT_MSG, useFieldErrors } from '../../lib/useFieldErrors.js';
import {
  normalizePhone,
  vConfirm,
  vEmail,
  vLineId,
  vNewPassword,
  vPersonName,
  vPhone,
  vUsername,
} from '../../lib/validate.js';

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

function PasswordField({ label, hint, value, onChange, autoComplete, v, k }) {
  const [show, setShow] = useState(false);
  const hintId = hint ? `pf-${k}-hint` : undefined;
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
          {...v.bind(k, { hintId })}
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
      {hint && (
        <small id={hintId} className="pf-hint">
          {hint}
        </small>
      )}
      <FieldError variant="admin" id={v.errId(k)} msg={v.errors[k]} />
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

  const fv = useFieldErrors(form, (f) => ({
    displayName: vPersonName(f.displayName),
    username: vUsername(f.username),
    email: vEmail(f.email),
    phone: vPhone(f.phone),
    lineId: vLineId(f.lineId),
  }));
  const pv = useFieldErrors(pw, (f) => ({
    oldPassword: f.oldPassword ? '' : 'กรอกรหัสผ่านปัจจุบัน',
    newPassword:
      vNewPassword(f.newPassword) ||
      (f.oldPassword && f.newPassword === f.oldPassword ? 'รหัสผ่านใหม่ต้องไม่ซ้ำรหัสเดิม' : ''),
    confirm: vConfirm(f.newPassword, f.confirm),
  }));
  const setF = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

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
        setError(err.message || 'โหลดข้อมูลบัญชีไม่สำเร็จ');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function saveProfile(e) {
    e.preventDefault();
    setError('');
    setNotice('');
    if (!fv.submit()) return;
    setSaving(true);
    try {
      const body = {
        displayName: form.displayName.trim(),
        username: form.username.trim(),
        email: form.email.trim(),
        phone: normalizePhone(form.phone),
        lineId: form.lineId.trim(),
      };
      const updated = await api('/auth/me', { method: 'PUT', body });
      setMe(updated);
      localStorage.setItem('user', JSON.stringify(updated));
      setNotice('บันทึกข้อมูลแล้ว');
    } catch (err) {
      if (err.status === 400 && fv.server(err)) return;
      if (
        err.status === 409 &&
        (fv.server(err) || fv.setErrors({ username: DUP_ACCOUNT_MSG, email: DUP_ACCOUNT_MSG }))
      )
        return;
      setError(err.message || 'บันทึกไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  }

  async function changePassword(e) {
    e.preventDefault();
    setPwError('');
    if (!pv.submit()) return;
    setPwBusy(true);
    try {
      const res = await api('/auth/password', {
        method: 'PUT',
        body: { oldPassword: pw.oldPassword, newPassword: pw.newPassword },
      });
      // token เดิมถูกยกเลิกหลังเปลี่ยนรหัส → ใช้ token ใหม่ต่อ (ไม่ถูกเด้งออก)
      if (res?.token) setSession({ token: res.token });
      setPw({ oldPassword: '', newPassword: '', confirm: '' });
      pv.reset();
      setNotice('เปลี่ยนรหัสผ่านแล้ว');
    } catch (err) {
      if (/old password incorrect/.test(err.message)) {
        pv.setErrors({ oldPassword: 'รหัสผ่านเดิมไม่ถูกต้อง' });
      } else if (!(err.status === 400 && pv.server(err))) {
        setPwError(err.message || 'เปลี่ยนรหัสผ่านไม่สำเร็จ');
      }
    } finally {
      setPwBusy(false);
    }
  }

  if (loading) return <p className="muted">กำลังโหลด...</p>;

  return (
    <div className="pf">
      <div className="page-head">
        <div>
          <p className="muted">ข้อมูลส่วนตัวและรหัสผ่าน</p>
          <h1>บัญชีของฉัน</h1>
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
          <form onSubmit={saveProfile} className="pf-form" noValidate>
            <label className="pf-field">
              <span>ชื่อที่แสดง</span>
              <input
                className="input"
                value={form.displayName}
                onChange={setF('displayName')}
                autoComplete="nickname"
                maxLength={80}
                {...fv.bind('displayName')}
              />
              <FieldError
                variant="admin"
                id={fv.errId('displayName')}
                msg={fv.errors.displayName}
              />
            </label>
            <label className="pf-field">
              <span>ชื่อผู้ใช้</span>
              <input
                className="input"
                value={form.username}
                onChange={setF('username')}
                required
                maxLength={32}
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                {...fv.bind('username')}
              />
              <FieldError variant="admin" id={fv.errId('username')} msg={fv.errors.username} />
            </label>
            <label className="pf-field">
              <span>อีเมล</span>
              <input
                className="input"
                type="email"
                inputMode="email"
                autoComplete="email"
                maxLength={254}
                value={form.email}
                onChange={setF('email')}
                required
                {...fv.bind('email')}
              />
              <FieldError variant="admin" id={fv.errId('email')} msg={fv.errors.email} />
            </label>
            <label className="pf-field">
              <span>เบอร์โทร</span>
              <input
                className="input"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                maxLength={15}
                placeholder="0812345678"
                value={form.phone}
                onChange={setF('phone')}
                {...fv.bind('phone')}
              />
              <FieldError variant="admin" id={fv.errId('phone')} msg={fv.errors.phone} />
            </label>
            <label className="pf-field">
              <span>LINE ID</span>
              <input
                className="input"
                autoCapitalize="none"
                spellCheck={false}
                maxLength={21}
                value={form.lineId}
                onChange={setF('lineId')}
                {...fv.bind('lineId')}
              />
              <FieldError variant="admin" id={fv.errId('lineId')} msg={fv.errors.lineId} />
            </label>
            <button type="submit" className="btn primary" disabled={saving}>
              {saving ? 'กำลังบันทึก...' : 'บันทึก'}
            </button>
          </form>
        </section>

        <section className="pf-card">
          <h2>เปลี่ยนรหัสผ่าน</h2>
          <form onSubmit={changePassword} className="pf-form" noValidate>
            <PasswordField
              v={pv}
              k="oldPassword"
              label="รหัสผ่านปัจจุบัน"
              value={pw.oldPassword}
              onChange={(e) => setPw((p) => ({ ...p, oldPassword: e.target.value }))}
              autoComplete="current-password"
            />
            <PasswordField
              v={pv}
              k="newPassword"
              label="รหัสผ่านใหม่"
              hint={PASSWORD_HINT}
              value={pw.newPassword}
              onChange={(e) => setPw((p) => ({ ...p, newPassword: e.target.value }))}
              autoComplete="new-password"
            />
            <PasswordField
              v={pv}
              k="confirm"
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
