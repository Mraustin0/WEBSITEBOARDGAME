// ข้อมูลผู้ที่ล็อกอินอยู่ (token + user) เก็บใน localStorage ที่เดียว
// ทุกหน้าใช้ฟังก์ชันนี้แทนการอ่าน/เขียน localStorage เอง → state ตรงกันทั้งแอป
import { useEffect, useState } from 'react';

const EVENT = 'session-change';

function read(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function getToken() {
  return read('token');
}

export function getUser() {
  try {
    return JSON.parse(read('user') || 'null');
  } catch {
    return null;
  }
}

/** พนักงาน/แอดมิน = role อื่นที่ไม่ใช่สมาชิก (staff, manager, role ที่สร้างเอง) */
export const isStaff = (user) => Boolean(user?.role) && user.role !== 'user';

export function setSession({ token, user }) {
  try {
    if (token) localStorage.setItem('token', token);
    if (user) localStorage.setItem('user', JSON.stringify(user));
  } catch {
    /* private mode: ใช้ได้เฉพาะหน้าปัจจุบัน */
  }
  window.dispatchEvent(new Event(EVENT));
}

export function clearSession() {
  try {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(EVENT));
}

/** user ปัจจุบัน — re-render เมื่อ login/logout (รวมจากแท็บอื่น) */
export function useSession() {
  const [user, setUser] = useState(getUser);
  useEffect(() => {
    const sync = () => setUser(getUser());
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);
  return getToken() ? user : null;
}

/** หน้าแรกหลัง login ตาม role */
export const homeFor = (user) => (isStaff(user) ? '/admin' : '/catalog');
