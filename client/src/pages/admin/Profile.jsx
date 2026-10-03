import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import './profile.css';

const ROLE_TH = { admin: 'ผู้ดูแลระบบ', user: 'สมาชิก' };

function formatDate(iso) {
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

/**
 * หน้าบัญชีของฉัน (ดีไซน์หน้า 11)
 * ใช้ GET /auth/me, GET /stats/members/:id (เอาวันที่สมัคร), PUT /auth/password
 * หมายเหตุ: backend ยังไม่มี endpoint แก้โปรไฟล์ (ชื่อ/อีเมล/เบอร์/รูป) จึงแสดงข้อมูลแบบอ่านอย่างเดียว
 */
export default function Profile() {
  const [me, setMe] = useState(null);
  const [createdAt, setCreatedAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwDone, setPwDone] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const u = await api('/auth/me');
        if (!alive) return;
        setMe(u);
        // วันที่สมัครไม่อยู่ใน /auth/me — ดึงจากสถิติสมาชิก (ถ้าไม่ได้ก็ข้ามไป)
        const m = await api(`/stats/members/${u.id ?? u._id}`).catch(() => null);
        if (alive && m?.user?.createdAt) setCreatedAt(m.user.createdAt);
      } catch (err) {
        if (alive) setError(err.message || 'โหลดข้อมูลบัญชีไม่สำเร็จ');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  async function changePassword(e) {
    e.preventDefault();
    setPwDone(false);
    if (newPw.length < 6) return setPwError('รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร');
    if (newPw === oldPw) return setPwError('รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสผ่านปัจจุบัน');
    if (newPw !== confirmPw) return setPwError('ยืนยันรหัสผ่านใหม่ไม่ตรงกัน');

    setBusy(true);
    setPwError('');
    try {
      await api('/auth/password', {
        method: 'PUT',
        body: { oldPassword: oldPw, newPassword: newPw },
      });
      setOldPw('');
      setNewPw('');
      setConfirmPw('');
      setPwDone(true);
    } catch (err) {
      setPwError(
        err.status === 401
          ? 'รหัสผ่านปัจจุบันไม่ถูกต้อง'
          : err.message || 'เปลี่ยนรหัสผ่านไม่สำเร็จ',
      );
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="pf-state">กำลังโหลด...</div>;
  if (error || !me) return <div className="pf-state">{error || 'โหลดข้อมูลบัญชีไม่สำเร็จ'}</div>;

  const id = String(me.id ?? me._id ?? '');
  const roleLabel = ROLE_TH[me.role] ?? me.role;

  return (
    <div className="pf">
      <div className="pf-head">
        <div>
          <h1>บัญชีของฉัน (My Account)</h1>
          <p className="pf-muted">จัดการข้อมูลส่วนตัวและความปลอดภัยของบัญชี {me.username}</p>
        </div>
        <span className="pf-online">● กำลังออนไลน์ (Active Session)</span>
      </div>

      <div className="pf-grid">
        <aside className="pf-card pf-side">
          <span className={'pf-avatar ' + me.role} aria-hidden="true">
            {me.username.charAt(0).toUpperCase()}
          </span>
          <h2>{me.username}</h2>
          <p className="pf-muted">ID: #{id.slice(-6).toUpperCase()}</p>
          <span className={'pf-role ' + me.role}>{roleLabel}</span>
          <dl className="pf-facts">
            {createdAt && (
              <div>
                <dt>สมัครเมื่อ</dt>
                <dd>{formatDate(createdAt)}</dd>
              </div>
            )}
            <div>
              <dt>ระดับสิทธิ์</dt>
              <dd>{roleLabel}</dd>
            </div>
          </dl>
        </aside>

        <div className="pf-main">
          <section className="pf-card">
            <h2>ข้อมูลส่วนบุคคลและการทำงาน</h2>
            <p className="pf-muted">ข้อมูลที่ใช้แสดงในระบบจัดการร้าน</p>

            <div className="pf-fields">
              <label className="pf-field">
                <span>ชื่อที่แสดงในระบบ (Display Name)</span>
                <input className="input" value={me.username} readOnly />
              </label>
              <label className="pf-field">
                <span>อีเมล (Email)</span>
                <input className="input" value={me.email} readOnly />
              </label>
              <label className="pf-field">
                <span>ตำแหน่งและสิทธิ์ (Role)</span>
                <input className="input" value={roleLabel} readOnly disabled />
                <small className="pf-hint">ล็อกโดยระบบ ปรับได้ที่หน้าจัดการผู้ใช้</small>
              </label>
            </div>
            <p className="pf-note">
              การแก้ไขชื่อและอีเมลยังไม่เปิดให้ใช้งาน เพราะระบบหลังบ้านยังไม่รองรับ
            </p>
          </section>

          <section className="pf-card">
            <h2>ความปลอดภัยและรหัสผ่าน (Security &amp; Password)</h2>
            <p className="pf-muted">
              เปลี่ยนรหัสผ่านเป็นระยะเพื่อป้องกันการเข้าถึงบัญชีโดยไม่ได้รับอนุญาต
            </p>

            <form className="pf-form" onSubmit={changePassword}>
              <PasswordField
                label="รหัสผ่านปัจจุบัน"
                value={oldPw}
                onChange={(e) => setOldPw(e.target.value)}
                autoComplete="current-password"
              />
              <PasswordField
                label="รหัสผ่านใหม่"
                hint="อย่างน้อย 6 ตัวอักษร และต้องไม่ซ้ำกับรหัสเดิม"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                autoComplete="new-password"
              />
              <PasswordField
                label="ยืนยันรหัสผ่านใหม่อีกครั้ง"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                autoComplete="new-password"
              />

              {pwError && <div className="pf-alert err">{pwError}</div>}
              {pwDone && <div className="pf-alert ok">เปลี่ยนรหัสผ่านเรียบร้อยแล้ว</div>}

              <button
                type="submit"
                className="btn-primary"
                disabled={busy || !oldPw || !newPw || !confirmPw}
              >
                {busy ? 'กำลังบันทึก...' : 'อัปเดตรหัสผ่าน (Update Password)'}
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
