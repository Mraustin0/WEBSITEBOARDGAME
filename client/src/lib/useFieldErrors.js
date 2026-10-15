// hook ตรวจฟอร์มแบบเดียวกันทุกหน้า (ใช้คู่กับกฎใน ./validate.js และ <FieldError />)
//
//   const v = useFieldErrors(form, (f) => ({ email: vEmail(f.email), phone: vPhone(f.phone) }));
//   <input {...v.bind('email')} />  <FieldError id={v.errId('email')} msg={v.errors.email} />
//   onSubmit: if (!v.submit()) return;   catch (err) { if (!v.server(err)) setError(err.message) }
//
// - blur: ตรวจช่องนั้น (ช่องว่างที่ยังไม่ได้พิมพ์จะรอตรวจตอนกด submit)
// - ช่องที่ตรวจแล้ว: ตรวจใหม่ทุกครั้งที่พิมพ์ → error หายทันทีเมื่อแก้ถูก
// - submit: ตรวจทุกช่อง โฟกัสช่องแรกที่ผิด คืน false ถ้ายังผิด
// - server(err): วาง error 400 จาก server ลงช่องเดียวกัน (หายเมื่อแก้ค่าในช่องนั้น)
import { useId, useState } from 'react';
import { serverFieldErrors } from './validate.js';

const getPath = (obj, path) =>
  path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);

/** ข้อความ 409 "username or email already used" */
export const DUP_ACCOUNT_MSG = 'ชื่อผู้ใช้หรืออีเมลนี้ถูกใช้แล้ว';

const isEmpty = (v) => v == null || v === '' || (typeof v === 'string' && !v.trim());

export function useFieldErrors(values, rules) {
  const uid = useId().replace(/[^A-Za-z0-9_-]/g, '');
  const [touched, setTouched] = useState({});
  const [srv, setSrv] = useState({ errors: {}, snap: {} });

  const all = rules(values) || {};
  const errors = {};
  for (const [k, msg] of Object.entries(all)) if (msg && touched[k]) errors[k] = msg;
  for (const [k, msg] of Object.entries(srv.errors)) {
    if (!errors[k] && Object.is(getPath(values, k), srv.snap[k])) errors[k] = msg;
  }

  const errId = (k) => `${uid}-${k.replace(/[^A-Za-z0-9_-]/g, '_')}-err`;
  const tag = (k) => `${uid}:${k}`;

  /** โฟกัสช่องแรก (ตามลำดับในหน้า) ที่มี error */
  function focusFirst(errs) {
    const keys = Object.keys(errs);
    if (!keys.length) return;
    const nodes = document.querySelectorAll(`[data-vf^="${uid}:"]`);
    for (const el of nodes) {
      const k = el.getAttribute('data-vf').slice(uid.length + 1);
      if (errs[k]) {
        el.focus();
        if (typeof el.scrollIntoView === 'function') el.scrollIntoView({ block: 'center' });
        return;
      }
    }
  }

  const touch = (k) => setTouched((t) => (t[k] ? t : { ...t, [k]: true }));

  function setErrors(map) {
    const keys = Object.keys(map).filter((k) => map[k]);
    if (!keys.length) return false;
    const snap = Object.fromEntries(keys.map((k) => [k, getPath(values, k)]));
    setSrv({ errors: Object.fromEntries(keys.map((k) => [k, map[k]])), snap });
    setTimeout(() => focusFirst(map), 0);
    return true;
  }

  return {
    errors,
    errId,
    has: (k) => Boolean(errors[k]),
    /** props ที่ต้องใส่ใน input/select/textarea */
    bind(k, { onBlur, hintId } = {}) {
      const described = [errors[k] && errId(k), hintId].filter(Boolean).join(' ');
      return {
        'data-vf': tag(k),
        'aria-invalid': errors[k] ? true : undefined,
        'aria-describedby': described || undefined,
        onBlur: (e) => {
          if (touched[k] || !isEmpty(getPath(values, k))) touch(k);
          onBlur?.(e);
        },
      };
    },
    /** mark ช่องว่า "ตรวจแล้ว" (ใช้กับปุ่มเลือกที่ไม่มี blur) */
    touch,
    /** ตรวจทุกช่องก่อนส่ง — คืน true ถ้าผ่าน */
    submit() {
      const next = {};
      for (const k of Object.keys(all)) next[k] = true;
      setTouched((t) => ({ ...t, ...next }));
      setSrv({ errors: {}, snap: {} });
      const errs = Object.fromEntries(Object.entries(all).filter(([, m]) => m));
      focusFirst(errs);
      return Object.keys(errs).length === 0;
    },
    /**
     * วาง error 400 ของ server ลงช่อง — คืน true ถ้ามีอย่างน้อยหนึ่งช่องที่ตรง
     * map: เปลี่ยนชื่อ field ของ server เป็นชื่อช่องในฟอร์ม เช่น { 'customer.name': 'customerName' }
     */
    server(err, { map = {} } = {}) {
      // 409 duplicate key จาก MongoDB: details = { field: value } → ข้อความ "ถูกใช้แล้ว" ที่ช่องนั้น
      const raw =
        err?.status === 409 && err?.message === 'duplicate' && err.details
          ? Object.fromEntries(Object.keys(err.details).map((k) => [k, 'ค่านี้ถูกใช้แล้ว']))
          : serverFieldErrors(err);
      const known = new Set(Object.keys(all));
      const out = {};
      for (const [k, msg] of Object.entries(raw)) {
        const key = map[k] ?? k;
        if (known.has(key) && !out[key]) out[key] = msg;
      }
      return setErrors(out);
    },
    /** ตั้ง error เองจากผลของ server (เช่น 409 ชื่อซ้ำ) — คืน true ถ้ามีช่องที่ตั้ง */
    setErrors,
    /** ล้างสถานะ (เปิดฟอร์มใหม่ / ยกเลิก) */
    reset() {
      setTouched({});
      setSrv({ errors: {}, snap: {} });
    },
  };
}
