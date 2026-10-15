// เรียก GET /reservations/availability เมื่อเลือกวัน + เวลาครบ (debounce 300ms)
// ผลลัพธ์ที่มาช้ากว่าการเปลี่ยนค่าครั้งล่าสุดจะถูกทิ้ง (cleanup ตั้ง cancelled)
import { useEffect, useMemo, useState } from 'react';
import { fetchAvailability } from '../../../services/api.js';
import { startISO, thaiError } from '../../../lib/booking.js';

const IDLE = { status: 'idle', data: null, error: '' };

export function useSlotAvailability({ ymd, time, hours, players }) {
  const [state, setState] = useState(IDLE);
  const [retryKey, setRetryKey] = useState(0);
  const ready = Boolean(ymd && time && hours);
  const key = `${ymd}|${time}|${hours}|${players}`;

  useEffect(() => {
    if (!ready) {
      setState(IDLE);
      return undefined;
    }
    let cancelled = false;
    setState((s) => ({ status: 'loading', data: s.data, error: '' }));
    const timer = setTimeout(() => {
      fetchAvailability({
        startAt: startISO(ymd, time),
        durationHours: hours,
        players: players || undefined,
      })
        .then((data) => {
          if (!cancelled) setState({ status: 'ok', data, error: '', key });
        })
        .catch((err) => {
          if (!cancelled) setState({ status: 'error', data: null, error: thaiError(err) });
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [ready, key, ymd, time, hours, players, retryKey]);

  // game id → availability ของเกมนั้น (เฉพาะผลที่ตรงกับค่าที่เลือกอยู่ — กันผลเก่าค้างระหว่างเปลี่ยนค่า)
  const fresh = state.status === 'ok' && state.key === key;
  const byGame = useMemo(() => {
    if (!fresh || !state.data?.bookable) return null;
    return new Map((state.data.games ?? []).map((g) => [String(g._id), g]));
  }, [fresh, state.data]);

  return { ...state, byGame, retry: () => setRetryKey((k) => k + 1) };
}
