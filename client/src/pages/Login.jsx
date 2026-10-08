import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import './login.css';

// POST /auth/login -> { token, user }  (เฉพาะ role = admin เข้าหลังบ้านได้)
export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setFieldErrors({});
    try {
      const { token, user } = await api('/auth/login', {
        method: 'POST',
        body: { email: form.email.trim(), password: form.password },
      });
      if (user?.role !== 'admin') {
        setError('บัญชีนี้ไม่ใช่ผู้ดูแลระบบ (admin)');
        return; // ยังไม่เก็บ token
      }
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      navigate('/admin', { replace: true });
    } catch (err) {
      if (err.status === 401) setError('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
      else if (err.status === 400) {
        setError(err.message);
        setFieldErrors(err.details ?? {});
      } else setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-page">
      <aside className="login-hero">
        <span className="badge-live">● Internal Operations</span>
        <h1>Boardgame Everyday</h1>
        <p>ระบบบริหารจัดการร้านบอร์ดเกมครบวงจร</p>
        <small>ผังโต๊ะ • คลังเกม • การจอง • รายงาน</small>
      </aside>

      <main className="login-form-wrap">
        <form className="login-form" onSubmit={onSubmit} noValidate>
          <h2>ยินดีต้อนรับกลับมา</h2>
          <p className="muted">เข้าสู่ระบบเพื่อจัดการร้านของคุณและบริการลูกค้า</p>
          {error && <div className="form-error">{error}</div>}

          <label className="field">
            <span>อีเมล</span>
            <input
              className="input"
              type="email"
              autoComplete="username"
              value={form.email}
              onChange={set('email')}
            />
            {fieldErrors.email && <small className="field-error">{fieldErrors.email[0]}</small>}
          </label>

          <label className="field">
            <span>รหัสผ่าน</span>
            <div className="pw-wrap">
              <input
                className="input"
                type={show ? 'text' : 'password'}
                autoComplete="current-password"
                value={form.password}
                onChange={set('password')}
              />
              <button type="button" className="btn-link" onClick={() => setShow((s) => !s)}>
                {show ? 'ซ่อน' : 'แสดง'}
              </button>
            </div>
            {fieldErrors.password && (
              <small className="field-error">{fieldErrors.password[0]}</small>
            )}
          </label>

          <button
            className="btn-primary"
            type="submit"
            disabled={busy || !form.email || !form.password}
          >
            {busy ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ →'}
          </button>
        </form>
      </main>
    </div>
  );
}
