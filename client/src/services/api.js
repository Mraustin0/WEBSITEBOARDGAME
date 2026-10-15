// API ฝั่งสมาชิก (หน้า Catalog / จองโต๊ะ / การจองของฉัน / รีวิว)
// ทุกฟังก์ชันคืนข้อมูลจาก server ตรง ๆ (ไม่มี mock) — error โยนต่อให้หน้าแสดงด้วย thaiError()
import { api } from '../lib/api.js';

// ---------- กฎร้าน ----------

let rulesCache = null;
let rulesAt = 0;

/** GET /reservations/rules (cache 1 นาที) — ราคา, จองล่วงหน้ากี่วัน, เวลาทำการ, ส่วนลดนักศึกษา */
export async function fetchRules({ fresh = false } = {}) {
  if (!fresh && rulesCache && Date.now() - rulesAt < 60_000) return rulesCache;
  rulesCache = await api('/reservations/rules');
  rulesAt = Date.now();
  return rulesCache;
}

// ---------- เกม ----------

/** แปลงเกมจาก API เป็นรูปแบบที่การ์ดใช้ */
export function mapGameToUI(g) {
  const vault = g.copiesInVault ?? g.copiesLeft ?? g.copies ?? 1;
  return {
    ...g,
    id: g._id,
    title: g.name,
    cover: g.image || g.thumbnail || '',
    thumbnail: g.thumbnail || g.image || '',
    rawCategories: g.categories || [],
    timeMin: g.playtimeMin ?? 60,
    rating: g.bggAverage != null ? Number(g.bggAverage).toFixed(1) : null,
    weight: g.bggWeight != null ? Number(g.bggWeight).toFixed(1) : null,
    stockCount: vault,
    copies: g.copies ?? 1,
  };
}

/** GET /games — รายการเกมในคลัง (สถานะ "ตอนนี้") */
export async function fetchGames(params = {}) {
  const data = await api('/games', { query: { limit: 100, ...params } });
  const items = Array.isArray(data) ? data : (data?.items ?? []);
  return items.map(mapGameToUI);
}

export async function fetchGame(id) {
  return mapGameToUI(await api(`/games/${id}`));
}

// ---------- โต๊ะ / ความว่าง ----------

/** GET /tables/floor — สถานะโต๊ะทุกตัวในช่วงเวลา: state = available | reserved | occupied | closed */
export function fetchFloor({ startAt, durationHours }) {
  return api('/tables/floor', { query: { startAt, durationHours } });
}

/**
 * GET /reservations/availability — โต๊ะและเกมที่ว่างตลอดช่วงเวลา
 * { bookable, reason, tables[{ available, reason }], games[{ available, copiesLeft, reason, inUseAt }] }
 */
export function fetchAvailability({ startAt, durationHours, players }) {
  return api('/reservations/availability', { query: { startAt, durationHours, players } });
}

// ---------- จอง ----------

/** body: { table, game?, players, startAt, durationHours, package?, student?, note? } */
const bookingBody = (b) => ({
  table: b.table,
  game: b.game || null,
  players: Number(b.players),
  startAt: b.startAt,
  durationHours: Number(b.durationHours),
  package: b.package || 'hourly',
  student: Boolean(b.student),
  note: b.note || '',
});

/** POST /reservations/quote — ราคาจริงจาก server (ต้อง login) */
export function quoteBooking(b) {
  return api('/reservations/quote', { method: 'POST', body: bookingBody(b) });
}

/** POST /reservations — ยืนยันการจอง */
export function createBooking(b) {
  return api('/reservations', { method: 'POST', body: bookingBody(b) });
}

// ---------- การจองของฉัน ----------

/** GET /reservations — { items, total, page, limit, counts: { active, upcoming, past } } */
export function fetchMyReservations({ scope = 'all', q, page = 1, limit = 20 } = {}) {
  return api('/reservations', { query: { scope, q, page, limit } });
}

export function cancelReservation(id, reason = 'ลูกค้ายกเลิกการจอง') {
  return api(`/reservations/${id}/cancel`, { method: 'PATCH', body: { reason } });
}

export function extendReservation(id, hours = 1) {
  return api(`/reservations/${id}/extend`, { method: 'PATCH', body: { hours: Number(hours) } });
}

/** GET /reservations/:id/checkout — ยอดก่อนคืนเกม { reservation, bill } */
export function checkoutPreview(id) {
  return api(`/reservations/${id}/checkout`);
}

export function returnGame(id, condition = 'good', damageNote = '') {
  return api(`/reservations/${id}/return`, {
    method: 'PATCH',
    body: { condition, damageNote },
  });
}

/** PUT /reservations/:id — แก้เวลา/จำนวนคน (เฉพาะที่ยังไม่เริ่ม) */
export function updateReservation(id, patch) {
  return api(`/reservations/${id}`, { method: 'PUT', body: patch });
}

/** PATCH /reservations/:id/game — เปลี่ยนเกม (ก่อนเริ่มหรือระหว่างเล่น), null = ไม่เลือกเกม */
export function changeGame(id, gameId) {
  return api(`/reservations/${id}/game`, { method: 'PATCH', body: { game: gameId || null } });
}

// ---------- เรียก GM ----------

/** topic: tutorial | extension | game_issue | other */
export function callGM(reservationId, topic = 'tutorial', note = '') {
  return api('/assist', { method: 'POST', body: { reservation: reservationId, topic, note } });
}

export function fetchMyAssist(reservationId) {
  return api('/assist/my', { query: { reservation: reservationId } });
}

export function cancelAssist(id) {
  return api(`/assist/${id}/cancel`, { method: 'PATCH' });
}

// ---------- รีวิว (คะแนน 1–10) ----------

export function fetchGameReviews(gameId) {
  return api(`/reviews/${gameId}`);
}

/** { average, count, distribution } */
export function fetchReviewSummary(gameId) {
  return api(`/reviews/${gameId}/summary`);
}

export function fetchMyReviews() {
  return api('/reviews/my');
}

/** สร้างหรือแก้รีวิวของตัวเอง (1 คน 1 รีวิวต่อเกม) */
export function submitReview({ game, rating, comment = '' }) {
  return api('/reviews', { method: 'POST', body: { game, rating: Number(rating), comment } });
}

export function deleteReview(id) {
  return api(`/reviews/${id}`, { method: 'DELETE' });
}
