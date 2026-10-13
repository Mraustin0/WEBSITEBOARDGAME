import { clearSession } from './session.js';

const BASE = '/api';

// 401 จาก endpoint พวกนี้ = กรอกข้อมูลผิด ไม่ใช่ token หมดอายุ → ไม่เตะออกจากระบบ
const NO_LOGOUT = ['/auth/login', '/auth/register', '/auth/password'];

export async function api(path, { method = 'GET', body, query } = {}) {
  let token = null;
  try {
    token = localStorage.getItem('token');
  } catch {
    /* ignore */
  }
  const qs = query
    ? '?' +
      new URLSearchParams(
        Object.entries(query).filter(([, v]) => v !== undefined && v !== null && v !== ''),
      )
    : '';
  const res = await fetch(`${BASE}${path}${qs}`, {
    method,
    headers: {
      ...(body && { 'Content-Type': 'application/json' }),
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    // 401 = token หมดอายุ/ถูกยกเลิก → ล้าง session แล้วพาไปหน้า login ที่ตรงกับฝั่งที่ใช้อยู่
    if (res.status === 401 && token && !NO_LOGOUT.includes(path)) {
      clearSession();
      const inAdmin = window.location.pathname.startsWith('/admin');
      const target = inAdmin ? '/login' : '/signin';
      if (window.location.pathname !== target) window.location.assign(target);
    }
    const err = new Error(data?.error || res.statusText);
    err.status = res.status;
    err.details = data?.details;
    throw err;
  }
  return data;
}
