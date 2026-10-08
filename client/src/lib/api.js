const BASE = '/api';

export async function api(path, { method = 'GET', body, query } = {}) {
  const token = localStorage.getItem('token');
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
    // 401 (ยกเว้นตอน login ผิด) = token หมดอายุ/ใช้ไม่ได้ -> ลบ token แล้วพาไปหน้า login ตามเอกสาร API
    if (res.status === 401 && path !== '/auth/login') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') window.location.assign('/login');
    }
    const err = new Error(data?.error || res.statusText);
    err.status = res.status;
    err.details = data?.details;
    throw err;
  }
  return data;
}
