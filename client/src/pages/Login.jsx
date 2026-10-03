import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('token')) {
      navigate('/inventory');
    }
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('token', data.token);
        navigate('/inventory');
      } else {
        setErrorMsg(data.error || 'กรุณาตรวจสอบข้อมูลเข้าสู่ระบบอีกครั้ง');
      }
    } catch (err) {
      setErrorMsg('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      {/* ฝั่งซ้าย (แบรนดิ้ง) */}
      <div className="login-left-panel">
        <div>
          <div className="login-badge">● INTERNAL OPERATIONS NODE</div>
          <h1 className="login-brand-title">BoardGame SomeDay</h1>
          <p className="login-brand-subtitle">ENTERPRISE ADMIN HUB</p>
        </div>
      </div>

      {/* ฝั่งขวา (ฟอร์มล็อกอิน) */}
      <div className="login-right-panel">
        <div className="login-form-container">
          <h2 className="login-title">
            ยินดีต้อนรับกลับมา
            <br />
            <span style={{ fontSize: '0.9rem', color: '#6b7280', fontWeight: 'normal' }}>
              demo_admin@demo.local / demo1234
            </span>
          </h2>

          {errorMsg && <div className="login-error">{errorMsg}</div>}

          <form onSubmit={handleLogin} className="login-form">
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="อีเมล"
              className="login-input"
            />
            <input
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="รหัสผ่าน"
              className="login-input"
            />
            <button type="submit" disabled={loading} className="login-btn">
              {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
