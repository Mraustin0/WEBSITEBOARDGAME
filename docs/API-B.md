# API คน B — Tables · Reservations · Reviews · Stats

สำหรับทีม frontend. Swagger ดูได้ที่ `http://localhost:4000/api/docs` (tag: tables, reservations, reviews, stats, settings, maintenance, assist).
ทุก request ที่ต้อง login ใส่ header `Authorization: Bearer <token>`.
Error ทุกตัวเป็น `{ "error": "ข้อความ", "details": {...} }` — 400 = input ผิด, 401 = ไม่ได้ login, 403 = ไม่ใช่ admin, 404 = ไม่เจอ, 409 = ชนกัน (จองซ้ำ/โต๊ะปิด/เกมซ่อม).

เวลาส่งเป็น ISO string เช่น `2026-10-12T13:00:00+07:00`. พารามิเตอร์ `date` ใช้ `YYYY-MM-DD` ตามเวลาไทย.

## สารบัญ

1. [วิธีใช้งาน (เริ่มต้น)](#วิธีใช้งาน-เริ่มต้น)
2. [กฎการจอง](#กฎการจอง-get-apireservationsrules) / [สถานะ](#สถานะ)
3. [ฝั่งผู้ใช้](#ฝั่งผู้ใช้-fe-user-2-คน) / [ฝั่งแอดมิน](#ฝั่งแอดมิน-fe-admin-2-คน) (รวมขอต่อเวลา / เรียก GM)
4. หน้าจอ admin: Walk-in / เช็คบิล / จัดการการจอง / ตั้งค่าร้าน / ซ่อมบำรุง / รายงาน
5. [Demo data](#demo-data)

## วิธีใช้งาน (เริ่มต้น)

### 1. รัน backend ในเครื่อง

```bash
npm install                                   # ที่ root ของ repo (ครั้งแรก / หลัง pull ที่มี package ใหม่)
cp server/.env.example server/.env            # แล้วแก้ MONGODB_URI + JWT_SECRET (ยาว ≥ 16 ตัว)
npm run --workspace server seed               # เกมตัวอย่าง
npm run --workspace server seed:tables        # โต๊ะ 10 ตัว
npm run --workspace server seed:demo          # (ไม่บังคับ) ข้อมูลย้อนหลังให้กราฟมีข้อมูล
npm run dev                                   # server :4000 + client :5173 พร้อมกัน
```

- API: `http://localhost:4000/api` — frontend (Vite) เรียก `/api/...` ได้เลย เพราะ `vite.config.js` proxy ไปที่ :4000 ให้แล้ว
- Swagger: `http://localhost:4000/api/docs`
- บัญชี admin: สมัครสมาชิกปกติก่อน แล้วรัน `npm run --workspace server promote -- <email>`
- บัญชีจาก `seed:demo` (รหัสผ่าน `demo1234` ทุกบัญชี)
  - admin: `demo_admin@demo.local`
  - สมาชิก: `demo_ploy@demo.local`, `demo_ton@demo.local`, `demo_mint@demo.local`, `demo_bank@demo.local`, `demo_fah@demo.local`

### 2. ลองยิง API ใน Swagger (ไม่ต้องเขียนโค้ด)

1. เปิด `/api/docs` → `POST /auth/login` → **Try it out** → ใส่ email/password → **Execute**
2. copy ค่า `token` จากผลลัพธ์
3. กดปุ่ม **Authorize** (ขวาบน) → วาง token → **Authorize**
4. ทุก endpoint ที่มีรูปกุญแจจะส่ง token ให้อัตโนมัติ

### 3. ตัวช่วยเรียก API ใน React (แนะนำให้ทุกคนใช้ไฟล์เดียวกัน)

`client/src/lib/api.js`

```js
const BASE = '/api'; // Vite proxy → http://localhost:4000/api

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
    const err = new Error(data?.error || res.statusText);
    err.status = res.status; // 400 / 401 / 403 / 404 / 409
    err.details = data?.details; // 400: { field: ['ข้อความ'] } ใช้โชว์ใต้ช่องกรอก
    throw err;
  }
  return data;
}
```

Login แล้วเก็บ token + แยกหน้าตาม role:

```js
const { token, user } = await api('/auth/login', { method: 'POST', body: { email, password } });
localStorage.setItem('token', token);
navigate(user.role === 'admin' ? '/admin' : '/catalog');
```

เจอ `err.status === 401` → token หมดอายุ (7 วัน) ให้ลบ token แล้วพาไปหน้า login

### 4. เรื่องเวลา (สำคัญ)

server เก็บเวลาเป็น UTC แต่ร้านใช้เวลาไทย — ส่ง/แสดงผลแบบนี้:

```js
// วันที่ (input type="date") + รอบเวลา → ส่งให้ API
const startAt = new Date(`${date}T${time}:00+07:00`).toISOString(); // date='2026-10-12', time='13:00'

// แสดงผล
new Date(r.startAt).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });

// วันนี้แบบ YYYY-MM-DD (ใช้กับ ?date= / ?from= / ?to=)
const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
```

### 5. ตัวอย่าง flow: สมาชิกจองโต๊ะ (หน้า 2–4 ฝั่ง user)

```js
// 1) ผู้ใช้เลือกวัน เวลา จำนวนคน → ดูว่าอะไรว่าง
const slot = { startAt, durationHours: 2, players: 4 };
const avail = await api('/reservations/availability', { query: slot });
if (!avail.bookable) alert(avail.reason); // เช่น เกิน 3 วัน / นอกเวลาทำการ

// 2) ผังโต๊ะช่วงเวลานั้น (การ์ดสี: available=ขาว-ฟ้า, reserved/occupied/closed=เทา)
const floor = await api('/tables/floor', { query: { startAt, durationHours: 2 } });

// 3) เลือกโต๊ะ + เกม → ราคา (กล่อง Price Calculator)
const body = { table: tableId, game: gameId ?? null, players: 4, startAt, durationHours: 2 };
const { price } = await api('/reservations/quote', { method: 'POST', body });

// 4) ยืนยัน
try {
  const reservation = await api('/reservations', { method: 'POST', body });
} catch (err) {
  if (err.status === 409)
    alert('มีคนจองตัดหน้าแล้ว: ' + err.message); // ให้โหลด availability ใหม่
  else if (err.status === 400) showFieldErrors(err.details ?? {}, err.message);
}
```

ปุ่ม "จองโต๊ะเล่นเกมนี้" บนการ์ดเกม → ส่ง `gameId` ไปหน้าจอง (`navigate('/booking?game=' + id)`) แล้วใช้เป็น `game` ใน body

Game Selector Modal → ใช้ `avail.games.filter((g) => g.available)` และค้นหาชื่อฝั่ง client
แต่ละเกมมี `copies` (จำนวนกล่อง), `copiesInRepair` (กล่องที่ซ่อมอยู่) และ `copiesLeft` (กล่องที่ว่างตลอดช่วงเวลานั้น) → ป้ายบนการ์ด: `copiesLeft > 1` = "X in Vault", `= 1` = "1 Copy Left", `= 0` = "In Use (A1, B2)" จาก `inUseAt`
เกมที่ไม่ว่างมี `reason` (`booked` / `maintenance` / `player_count`) และ `inUseAt` บอกว่าถูกใช้ที่โต๊ะไหน เช่น `[{ table: 'A1', status: 'playing', startAt, endAt }]` → แสดง "In Use (A1)"
แต่ละเกมมี `bggAverage` (เรตติ้ง), `bggWeight`, `categories` ให้แสดงบนการ์ดได้เลย

### 6. ตัวอย่าง flow: ประวัติการจอง + คืนเกม (หน้า 5 ฝั่ง user)

```js
const active = await api('/reservations', { query: { scope: 'active' } }); // กำลังเล่น
const upcoming = await api('/reservations', { query: { scope: 'upcoming' } }); // ล่วงหน้า
const past = await api('/reservations', { query: { scope: 'past', page: 1, limit: 20 } });
// ผลเป็น { items, total, page, limit, counts: { active, upcoming, past } }
// counts ใช้เป็นตัวเลขบนแท็บได้เลย (เรียกครั้งเดียวก็ได้ทั้ง 3 ตัว)

// ช่องค้นหา "ค้นหาห้อง หรือชื่อบอร์ดเกม" → ส่ง q (ค้นรหัส/ชื่อ/โซนโต๊ะ หรือชื่อเกม)
const found = await api('/reservations', { query: { scope: 'all', q: 'catan' } });

await api(`/reservations/${id}/return`, { method: 'PATCH' }); // เล่นเสร็จแล้ว / คืนเกม
// ยกเลิกเองได้ถึงก่อนเริ่ม 2 ชม. (rules.CANCEL_CUTOFF_HOURS) — ช้ากว่านั้นได้ 409 ให้ติดต่อพนักงาน
await api(`/reservations/${id}/cancel`, { method: 'PATCH', body: { reason: 'ติดธุระ' } });
await api(`/reservations/${id}`, { method: 'PUT', body: { startAt: newStart } }); // แก้เวลา
await api(`/reservations/${id}/game`, { method: 'PATCH', body: { game: newGameId } }); // เปลี่ยนเกม

// ปุ่ม "ขอต่อเวลา" — ทีละ 0.5 ชม. ถ้าโต๊ะ/เกมมีคิวต่อจะได้ 409
const extended = await api(`/reservations/${id}/extend`, { method: 'PATCH', body: { hours: 1 } });
// extended.endAt / durationHours / price.total อัปเดตแล้ว, extended.extensions = ประวัติการต่อ

// ปุ่ม "เรียก GM" — topic: tutorial | extension | game_issue | other (ได้เฉพาะตอนกำลังเล่น)
await api('/assist', {
  method: 'POST',
  body: { reservation: id, topic: 'tutorial', note: 'สอนกติกาหน่อย' },
});
const calls = await api('/assist/my', { query: { reservation: id } }); // status: open → acknowledged → resolved
await api(`/assist/${callId}/cancel`, { method: 'PATCH' }); // ยกเลิกคำขอ
```

### 7. ตัวอย่าง flow: admin เปิดโต๊ะ walk-in → เช็คบิล (หน้า 14–15)

```js
// เปิดโต๊ะทันที (ยังไม่เลือกเกมก็ได้)
const r = await api('/reservations/admin', {
  method: 'POST',
  body: { table: tableId, players: 4, durationHours: 2, customer: { name, phone } },
});
// เลือกเกมทีหลัง
await api(`/reservations/${r._id}/game`, { method: 'PATCH', body: { game: gameId } });

// เปิด modal เช็คบิล → แสดงเวลาเล่นจริง + ยอด
const { bill } = await api(`/reservations/${r._id}/checkout`);

// ปิดบิล + รับเงิน (ถ้าชำรุด ระบบเปิดใบแจ้งซ่อมให้เอง)
await api(`/reservations/${r._id}/return`, {
  method: 'PATCH',
  body: { condition: 'good', paymentMethod: 'cash' },
});
```

### 8. ดาวน์โหลด CSV (หน้า 13)

ต้องแนบ token จึงใช้ `<a href>` ตรง ๆ ไม่ได้:

```js
const res = await fetch(`/api/stats/export.csv?from=${from}&to=${to}`, {
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
});
const url = URL.createObjectURL(await res.blob());
Object.assign(document.createElement('a'), {
  href: url,
  download: `reservations_${from}_${to}.csv`,
}).click();
URL.revokeObjectURL(url);
```

### 9. ผังโต๊ะแบบ Real-time

ไม่มี websocket — ให้โหลดซ้ำทุก 30 วินาที:

```js
useEffect(() => {
  const load = () => api('/tables/floor').then(setFloor);
  load();
  const id = setInterval(load, 30_000);
  return () => clearInterval(id);
}, []);
```

วาดโต๊ะจาก `position` (เป็น %): `style={{ left: `${t.position.x}%`, top: `${t.position.y}%`, width: `${t.position.w}%`, height: `${t.position.h}%` }}` ใน container ที่ `position: relative`

## กฎการจอง (`GET /api/reservations/rules`)

> ค่าทั้งหมดในตารางนี้คือค่าเริ่มต้น admin แก้ได้ที่หน้า "ตั้งค่าร้าน" (`PUT /api/settings`) — frontend ควรอ่านค่าจริงจาก `GET /api/reservations/rules` หรือ `GET /api/settings`

| กฎ          | ค่า                                                                                             |
| ----------- | ----------------------------------------------------------------------------------------------- |
| ราคา        | `ชั่วโมง × (ผู้เล่น × 50 + extraPerHour ของโต๊ะ)` บาท                                           |
| จองล่วงหน้า | ไม่เกิน 3 วัน, เริ่มย้อนหลังได้ไม่เกิน 15 นาที (walk-in)                                        |
| ระยะเวลา    | 1–6 ชม. ทีละ 0.5                                                                                |
| แพ็กเกจ     | `hourly` (รายชั่วโมง) หรือ `flat3h` เหมา 3 ชม. = ผู้เล่น × 130 + 3 × ค่าโต๊ะ                    |
| เกินเวลา    | เกินไม่เกิน 10 นาทีไม่คิด เกินกว่านั้นคิดเพิ่มทีละครึ่งชั่วโมง (อัตรารายชั่วโมง)                |
| ผู้เล่น     | ≤ capacity ของโต๊ะ และอยู่ในช่วง min–max ของเกม                                                 |
| ยกเลิก      | สมาชิกยกเลิกเองได้ถึงก่อนเริ่ม 2 ชม. (`CANCEL_CUTOFF_HOURS`, 0 = ได้จนถึงเวลาเริ่ม)             |
| ชนกัน       | โต๊ะเดียวกัน / ผู้ใช้คนเดียวกัน ห้ามเวลาทับกัน. เกมเดียวกันใช้พร้อมกันได้ไม่เกิน `copies` กล่อง |

## สถานะ

- **Reservation:** `booked` (จองล่วงหน้า) → `playing` (ถึงเวลาเริ่ม — ระบบเปลี่ยนให้อัตโนมัติ) → `completed` (กดคืนเกม). ยกเลิกได้ → `cancelled`, ลูกค้าไม่มา (admin กด) → `no_show`
- **Game:** `available` → `in_use` (กำลังเล่นอยู่ครบทุกกล่อง) → `available` หลังคืนเกม. `maintenance` = ซ่อมอยู่ครบทุกกล่อง (หรือ admin ปิดจองเอง)
- **Table:** `active` / `closed`. บน floor plan มี `state`: `available` · `reserved` · `occupied` · `closed`

## ฝั่งผู้ใช้ (FE user 2 คน)

| หน้า                      | Endpoint                                                                                |
| ------------------------- | --------------------------------------------------------------------------------------- |
| เลือกเวลา → ดูว่าอะไรว่าง | `GET /api/reservations/availability?startAt=&durationHours=2&players=4`                 |
| Floor plan                | `GET /api/tables/floor?startAt=&durationHours=2` (ไม่ส่ง = ตอนนี้)                      |
| คำนวณราคาก่อนยืนยัน       | `POST /api/reservations/quote` (body เดียวกับจอง)                                       |
| ยืนยันจอง                 | `POST /api/reservations`                                                                |
| การจองของฉัน (3 แท็บ)     | `GET /api/reservations?scope=active` · `upcoming` · `past` (+ `counts`, ค้นด้วย `q`)    |
| แก้ไขการจอง               | `PUT /api/reservations/:id` (ได้เฉพาะ `booked`)                                         |
| ยกเลิก                    | `PATCH /api/reservations/:id/cancel` body `{ "reason": "..." }` (ก่อนเริ่ม ≥ 2 ชม.)     |
| เล่นเสร็จ / คืนเกม        | `PATCH /api/reservations/:id/return`                                                    |
| ขอต่อเวลา                 | `PATCH /api/reservations/:id/extend` body `{ "hours": 1 }`                              |
| เรียก GM / พนักงาน        | `POST /api/assist` · `GET /api/assist/my?reservation=` · `PATCH /api/assist/:id/cancel` |
| รีวิวเกม                  | `POST /api/reviews` · `GET /api/reviews/:gameId` · `GET /api/reviews/:gameId/summary`   |
| รีวิวของฉัน               | `GET /api/reviews/my`                                                                   |
| หน้าโปรไฟล์: สถิติ        | `GET /api/stats/me`                                                                     |
| หน้า Home: เกมยอดนิยม     | `GET /api/stats/popular-games?limit=6`                                                  |

Body การจอง:

```json
{
  "table": "<tableId>",
  "game": "<gameId หรือ null>",
  "players": 4,
  "startAt": "2026-10-12T13:00:00+07:00",
  "durationHours": 2,
  "note": "ขอโต๊ะใกล้หน้าต่าง"
}
```

ปุ่ม "จองโต๊ะเล่นเกมนี้" จากหน้าเกม → ส่ง `gameId` ไปหน้าจอง แล้วใส่เป็น `game` ใน body.

Availability response (ย่อ):

```json
{
  "bookable": true,
  "reason": null,
  "tables": [{ "_id": "...", "code": "A1", "capacity": 4, "available": false, "reason": "booked" }],
  "games": [
    { "_id": "...", "name": "Catan", "status": "available", "available": true, "reason": null }
  ]
}
```

`reason` ของโต๊ะ: `closed` · `booked` · `too_small` — ของเกม: `maintenance` · `booked` · `player_count`.

## ฝั่งแอดมิน (FE admin 2 คน)

| หน้า                              | Endpoint                                                                                                         |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Dashboard การ์ดตัวเลข             | `GET /api/stats/overview?date=2026-10-12`                                                                        |
| กราฟรายวัน                        | `GET /api/stats/daily?from=&to=` (default 7 วันล่าสุด)                                                           |
| กราฟช่วงเวลาคนเยอะ                | `GET /api/stats/hourly?from=&to=`                                                                                |
| การใช้งานแต่ละโต๊ะ                | `GET /api/stats/tables?from=&to=`                                                                                |
| ผังโต๊ะ + ดูว่าโต๊ะไหนเล่นเกมอะไร | `GET /api/tables/floor` → `tables[].current.game`                                                                |
| จัดการโต๊ะ                        | `GET/POST /api/tables` · `PUT/DELETE /api/tables/:id`                                                            |
| เปิด/ปิดปรับปรุงโต๊ะ              | `PATCH /api/tables/:id/status` body `{ "status": "closed" }`                                                     |
| รายการจองทั้งหมดของวัน            | `GET /api/reservations/admin?date=2026-10-12&status=playing`                                                     |
| รับคืนเกมที่เคาน์เตอร์            | `PATCH /api/reservations/:id/return`                                                                             |
| ยกเลิกการจองที่ไม่เหมาะสม         | `PATCH /api/reservations/:id/cancel` (admin ยกเลิกได้แม้กำลังเล่น)                                               |
| ลบการจอง                          | `DELETE /api/reservations/admin/:id`                                                                             |
| คิวเรียกพนักงาน (GM)              | `GET /api/assist` (default = ยังไม่เสร็จ, มี `counts.open`) — poll ทุก 15–30 วิ                                  |
| รับเรื่อง / เสร็จแล้ว             | `PATCH /api/assist/:id` body `{ "status": "acknowledged" }` หรือ `{ "status": "resolved", "resolution": "..." }` |
| ต่อเวลาให้ลูกค้า                  | `PATCH /api/reservations/:id/extend` (admin ต่อเกิน max ชม./นอกเวลาได้)                                          |
| ตั้งเกมเป็น maintenance           | `PUT /api/games/:id` body `{ "status": "maintenance" }` (module คน A)                                            |
| ดูรีวิว / ลบรีวิว                 | `GET /api/reviews?maxRating=3` · `DELETE /api/reviews/:id`                                                       |

Table body (`position` เป็น % ของพื้นที่ floor plan 0–100 — แก้ position ให้ส่งครบทั้ง x,y,w,h):

```json
{
  "code": "VIP1",
  "name": "Private Room",
  "zone": "VIP",
  "capacity": 8,
  "extraPerHour": 100,
  "shape": "rect",
  "position": { "x": 78, "y": 10, "w": 18, "h": 30 }
}
```

## หน้าจอ admin ชุดใหม่ (Walk-in / เช็คบิล / จัดการการจอง)

ตรงกับ Plan.docx ฝั่ง Admin หน้า 4, 14, 15

### หน้า 14 — เปิดโต๊ะ Walk-In

`POST /api/reservations/admin` (admin)

```json
{
  "table": "<tableId>",
  "players": 6,
  "durationHours": 3,
  "package": "flat3h",
  "customer": { "name": "คุณเอ", "phone": "0812345678" },
  "game": null
}
```

- ไม่ส่ง `startAt` = เริ่มเล่นทันที (สถานะ `playing`, `source: "walk_in"`)
- ส่ง `startAt` = เพิ่มการจองล่วงหน้าแทนลูกค้า (หน้า 4 ปุ่ม "+ เพิ่มการจองใหม่", `source: "admin"`)
- ลูกค้าเป็นสมาชิก → ส่ง `"user": "<userId>"` แทน `customer` (ต้องมีอย่างใดอย่างหนึ่ง)
- `players` เกิน capacity ของโต๊ะได้ 2 ที่ (เก้าอี้เสริม)
- ปุ่ม "เริ่มทันทีโดยไม่เลือกเกม" = ส่ง `game: null` แล้วค่อยเลือกทีหลังด้วย `PATCH /api/reservations/:id/game` body `{ "game": "<gameId>" }`

### หน้า 15 — เช็คบิล / คืนเกม

1. เปิด modal → `GET /api/reservations/:id/checkout` ได้ `bill` สำหรับกล่อง Session Time Summary / Total Balance

   ```json
   {
     "bill": {
       "startedAt": "...",
       "endedAt": "...",
       "actualMinutes": 135,
       "bookedHours": 2,
       "overtimeHours": 0.5,
       "bookedTotal": 400,
       "overtimeCharge": 100,
       "total": 500
     }
   }
   ```

2. กดปุ่ม "Clear Table" → `PATCH /api/reservations/:id/return`

   ```json
   { "condition": "damaged", "damageNote": "การ์ดหาย 2 ใบ", "paymentMethod": "cash" }
   ```

   - `condition: "damaged"` → เกมถูกตั้งเป็น `maintenance` อัตโนมัติ (ไม่ให้จองต่อ)
   - ส่ง `paymentMethod` (`cash` / `transfer` / `card` / `qr`) = รับเงินพร้อมปิดบิล, ไม่ส่ง = ค้างชำระ
   - ผลลัพธ์มี `checkout` (ยอดจริง, สภาพเกม, `inspectedBy`) และ `payment`

3. รับเงินทีหลัง → `PATCH /api/reservations/admin/:id/pay` body `{ "method": "qr" }`

สมาชิกกดคืนเกมเองได้เหมือนเดิม (ไม่ต้องส่ง body) แต่จ่ายเงินเองไม่ได้ ต้องจ่ายที่เคาน์เตอร์

### หน้า 4 — จัดการการจอง

| ส่วนบนหน้า                 | Endpoint                                                                       |
| -------------------------- | ------------------------------------------------------------------------------ |
| Table Schedule Grid        | `GET /api/tables/schedule?date=2026-10-12` → `zones[].tables[].reservations[]` |
| Today's Reservations List  | `GET /api/reservations/admin?date=2026-10-12`                                  |
| ดูรายสัปดาห์ / เดือน       | `GET /api/reservations/admin?from=2026-10-06&to=2026-10-12`                    |
| ค้นหาลูกค้า                | `GET /api/reservations/admin?q=0812` (ชื่อ/เบอร์ walk-in หรือ username สมาชิก) |
| กรองเพิ่ม                  | `status`, `zone`, `table`, `user`, `game`, `source`, `payment=unpaid`          |
| Booking Dashboard (ตัวเลข) | `GET /api/stats/overview?date=...` → `reservations.{booked,playing,...}`       |
| + เพิ่มการจองใหม่          | `POST /api/reservations/admin` พร้อม `startAt`                                 |

> ระบบไม่มีสถานะ Pending/Confirmed — การจองที่สร้างแล้วถือว่ายืนยันทันที (`booked`)

ชื่อที่แสดงของลูกค้า: `user?.username ?? customer.name ?? customer.phone`

## หน้าจอ admin ชุดที่ 3 (ตั้งค่าร้าน / ซ่อมบำรุง / รายละเอียด / รายงาน)

### หน้า 6 — ตั้งค่าร้าน

- อ่าน: `GET /api/settings` (public — ฝั่ง user ใช้แสดงราคาและเวลาเปิด-ปิดได้)
- บันทึก: `PUT /api/settings` (admin) ส่งเฉพาะหมวดที่แก้ ไม่ต้องส่งทั้งก้อน

```json
{
  "store": { "name": "Boardgame Everyday", "phone": "043-000000" },
  "pricing": { "perPersonHour": 60, "flat3hPerPerson": 150, "revenueTargetPerDay": 5000 },
  "booking": {
    "maxAdvanceDays": 3,
    "minHours": 1,
    "maxHours": 6,
    "overtimeGraceMin": 10,
    "extraSeats": 2,
    "cancelCutoffHours": 2
  },
  "operatingHours": {
    "enforce": true,
    "days": [
      { "day": 0, "open": "10:00", "close": "24:00", "closed": false },
      { "day": 1, "open": "10:00", "close": "22:00", "closed": true }
    ]
  },
  "noShow": { "graceMin": 30, "depositPerPerson": 0, "suspendAfter": 3 }
}
```

- `day`: 0 = อาทิตย์ … 6 = เสาร์ (ต้องส่งครบ 7 วัน) — `close` น้อยกว่า `open` = ปิดหลังเที่ยงคืน (เช่น 18:00–02:00)
- `operatingHours.enforce: true` → สมาชิกจองนอกเวลาทำการไม่ได้ (admin เปิดโต๊ะนอกเวลาได้)
- ปุ่ม Discard = โหลด `GET /api/settings` ใหม่
- ราคาใหม่มีผลกับการจองใหม่เท่านั้น (การจองเดิมเก็บราคาตอนจองไว้)

### หน้า 5 / 7 — รายละเอียดสมาชิก + No-show

| ส่วนบนหน้า                     | Endpoint                                                                                                                |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| Profile & Stats                | `GET /api/stats/members/:userId` → `user`, `visits`, `totalSpent`, `hoursPlayed`, `lastVisitAt`, `reservations.no_show` |
| Account Preferences            | ในผลเดียวกัน: `favoriteTable`, `favoriteGames`, `favoriteCategories`                                                    |
| Session & Gaming History       | `GET /api/reservations/admin?user=:userId`                                                                              |
| + เปิดโต๊ะให้สมาชิก (Check-in) | `POST /api/reservations/admin` body มี `"user": ":userId"`                                                              |
| ลูกค้าไม่มา                    | `PATCH /api/reservations/admin/:id/no-show`                                                                             |

`noShowLimit` = จำนวน no-show ที่ควรระงับบัญชี (จาก settings) — การระงับบัญชีจริงเป็น endpoint ของคน A (`/api/admin/users`)

### หน้า 3 — รายละเอียดเกม (ส่วนสถิติ)

`GET /api/stats/games/:gameId` → `sessions`, `hours`, `revenue`, `lastPlayedAt`, `rating`, `damageReports`, `maintenance` (ประวัติซ่อม), `recentSessions` (10 รอบล่าสุด)

ปุ่ม "บันทึกส่งซ่อม" → `POST /api/maintenance` (ดูหน้า 8)

### หน้า 8 — ติดตามการซ่อมบำรุง

| ส่วนบนหน้า          | Endpoint                                                                                       |
| ------------------- | ---------------------------------------------------------------------------------------------- |
| Status Dashboard    | `GET /api/maintenance/summary` → `pending`, `in_progress`, `resolved`, `totalCost`             |
| Kanban (3 คอลัมน์)  | `GET /api/maintenance?status=pending` / `in_progress` (กรอง `itemType=game\|table`)            |
| ลากการ์ดข้ามคอลัมน์ | `PATCH /api/maintenance/:id` body `{ "status": "in_progress" }`                                |
| ปิดงานซ่อม          | `PATCH /api/maintenance/:id` body `{ "status": "resolved", "cost": 200, "resolution": "..." }` |
| Repair History      | `GET /api/maintenance?status=resolved`                                                         |
| + แจ้งปัญหาใหม่     | `POST /api/maintenance`                                                                        |

```json
{
  "itemType": "game",
  "game": "<gameId>",
  "title": "การ์ดหาย",
  "description": "...",
  "priority": "high",
  "copies": 1
}
```

- เกม: ใส่ `copies` = เสียกี่กล่อง (default 1) → ปิดเฉพาะกล่องนั้น กล่องที่เหลือยังจองได้. เกมเป็น `maintenance` (จองไม่ได้) เมื่อซ่อมครบทุกกล่อง. แจ้งเกินจำนวนกล่องที่ยังดีได้ 400
- โต๊ะ: เป็น `closed` อัตโนมัติ
- ปิดงาน (`resolved`) หรือลบใบแจ้ง → กล่อง/โต๊ะกลับมาใช้ได้อัตโนมัติ (แก้จำนวนกล่องได้ด้วย `PATCH /api/maintenance/:id` body `{ "copies": 2 }`)
- `/availability` มี `copiesInRepair` = กล่องที่ซ่อมอยู่
- คืนเกมแบบ `condition: "damaged"` (หน้า 15) → ระบบเปิดใบแจ้งซ่อมให้เอง

### หน้า 12 — ภาพรวมร้าน

`GET /api/stats/overview?date=` เพิ่มค่าใหม่: `revenueTarget`, `revenueTargetPct`, `utilizationPct` (อัตราการใช้โต๊ะเทียบเวลาเปิดร้าน), `collected` (เงินที่รับแล้ว), `unpaid`, `walkIns`, `activeMembers7d`, `openMaintenance`, `popularGames` (ของวันนั้น), `reservations.no_show`

### หน้า 13 — รายงานและสถิติ

| ส่วนบนหน้า                        | Endpoint                                                                         |
| --------------------------------- | -------------------------------------------------------------------------------- |
| Date Range (วันนี้/7/30/กำหนดเอง) | ใส่ `?from=YYYY-MM-DD&to=YYYY-MM-DD` ทุก endpoint ด้านล่าง                       |
| KPI Cards + % เปลี่ยนแปลง         | `GET /api/stats/report` → `kpis`, `changePct`, `previous`                        |
| Revenue chart                     | ผลเดียวกัน → `revenueTrend[]`                                                    |
| Category pie                      | ผลเดียวกัน → `categories[]` (`category`, `sessions`, `revenue`, `pct`)           |
| Top Games                         | ผลเดียวกัน → `topGames[]`                                                        |
| Peak Hours Heatmap                | `GET /api/stats/heatmap` → `matrix[วัน 0-6][ชั่วโมง 0-23]`                       |
| Export                            | `GET /api/stats/export.csv` (ต้องแนบ token — ใช้ fetch แล้วสร้าง blob ดาวน์โหลด) |

`kpis`: `revenue`, `sessions`, `players`, `hours`, `avgPerSession`, `newMembers`, `repeatRatePct`

### ส่วนที่ backend B ไม่ได้ทำ

- รายได้อาหาร/เครื่องดื่ม, ส่งยอดเข้า POS, เก็บ/ริบเงินมัดจำจริง — ไม่มีในระบบ (settings เก็บแค่ค่า `depositPerPerson` ไว้แสดง)
- Audit log (หน้า 9), ศูนย์แจ้งเตือน (หน้า 10), สิทธิ์ละเอียด (หน้า 16), SSO — นอกขอบเขต B
- ระบบ Pending/Confirmed — การจองยืนยันทันที

## Demo data

```bash
npm run --workspace server seed          # เกมตัวอย่าง (คน A)
npm run --workspace server seed:tables   # ผังโต๊ะ 10 ตัว (Main / VIP / Outdoor)
npm run --workspace server seed:demo     # สมาชิก demo + การจองย้อนหลัง 21 วัน + รีวิว (ให้กราฟมีข้อมูล)
```
