import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

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
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <div
        style={{
          flex: 1,
          backgroundColor: '#134e35',
          color: 'white',
          padding: '3rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <div
            style={{
              display: 'inline-block',
              backgroundColor: '#166534',
              padding: '0.25rem 0.75rem',
              borderRadius: '999px',
              fontSize: '0.75rem',
              fontWeight: 'bold',
              marginBottom: '2rem',
            }}
          >
            ● INTERNAL OPERATIONS NODE
          </div>
          <h1 style={{ margin: 0, fontSize: '2rem' }}>BoardGame SomeDay</h1>
          <p style={{ color: '#86efac', fontSize: '0.875rem', fontWeight: 'bold' }}>
            ENTERPRISE ADMIN HUB
          </p>
        </div>
      </div>
      <div
        style={{
          flex: 1,
          backgroundColor: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
        }}
      >
        <div style={{ width: '100%', maxWidth: '420px' }}>
          <h2>ยินดีต้อนรับกลับมา</h2>
          {errorMsg && <div style={{ color: 'red', marginBottom: '1rem' }}>{errorMsg}</div>}
          <form
            onSubmit={handleLogin}
            style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
          >
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="อีเมล"
              style={{ padding: '0.75rem', borderRadius: '6px', border: '1px solid #ccc' }}
            />
            <input
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="รหัสผ่าน"
              style={{ padding: '0.75rem', borderRadius: '6px', border: '1px solid #ccc' }}
            />
            <button
              type="submit"
              disabled={loading}
              style={{
                backgroundColor: '#134e35',
                color: 'white',
                padding: '0.75rem',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
