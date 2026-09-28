# API คน B — Tables · Reservations · Reviews · Stats

สำหรับทีม frontend. Swagger ดูได้ที่ `http://localhost:4000/api/docs` (tag: tables, reservations, reviews, stats).
ทุก request ที่ต้อง login ใส่ header `Authorization: Bearer <token>`.
Error ทุกตัวเป็น `{ "error": "ข้อความ", "details": {...} }` — 400 = input ผิด, 401 = ไม่ได้ login, 403 = ไม่ใช่ admin, 404 = ไม่เจอ, 409 = ชนกัน (จองซ้ำ/โต๊ะปิด/เกมซ่อม).

เวลาส่งเป็น ISO string เช่น `2026-10-12T13:00:00+07:00`. พารามิเตอร์ `date` ใช้ `YYYY-MM-DD` ตามเวลาไทย.

## กฎการจอง (`GET /api/reservations/rules`)

| กฎ          | ค่า                                                          |
| ----------- | ------------------------------------------------------------ |
| ราคา        | `ชั่วโมง × (ผู้เล่น × 50 + extraPerHour ของโต๊ะ)` บาท        |
| จองล่วงหน้า | ไม่เกิน 3 วัน, เริ่มย้อนหลังได้ไม่เกิน 15 นาที (walk-in)     |
| ระยะเวลา    | 1–6 ชม. ทีละ 0.5                                             |
| ผู้เล่น     | ≤ capacity ของโต๊ะ และอยู่ในช่วง min–max ของเกม              |
| ชนกัน       | โต๊ะเดียวกัน / เกมเดียวกัน / ผู้ใช้คนเดียวกัน ห้ามเวลาทับกัน |

## สถานะ

- **Reservation:** `booked` (จองล่วงหน้า) → `playing` (ถึงเวลาเริ่ม — ระบบเปลี่ยนให้อัตโนมัติ) → `completed` (กดคืนเกม). ยกเลิกได้ → `cancelled`
- **Game:** `available` → `in_use` (มีโต๊ะกำลังเล่น) → `available` หลังคืนเกม. `maintenance` = admin ปิดจอง
- **Table:** `active` / `closed`. บน floor plan มี `state`: `available` · `reserved` · `occupied` · `closed`

## ฝั่งผู้ใช้ (FE user 2 คน)

| หน้า                      | Endpoint                                                                              |
| ------------------------- | ------------------------------------------------------------------------------------- |
| เลือกเวลา → ดูว่าอะไรว่าง | `GET /api/reservations/availability?startAt=&durationHours=2&players=4`               |
| Floor plan                | `GET /api/tables/floor?startAt=&durationHours=2` (ไม่ส่ง = ตอนนี้)                    |
| คำนวณราคาก่อนยืนยัน       | `POST /api/reservations/quote` (body เดียวกับจอง)                                     |
| ยืนยันจอง                 | `POST /api/reservations`                                                              |
| การจองของฉัน (3 แท็บ)     | `GET /api/reservations?scope=active` · `upcoming` · `past`                            |
| แก้ไขการจอง               | `PUT /api/reservations/:id` (ได้เฉพาะ `booked`)                                       |
| ยกเลิก                    | `PATCH /api/reservations/:id/cancel` body `{ "reason": "..." }`                       |
| เล่นเสร็จ / คืนเกม        | `PATCH /api/reservations/:id/return`                                                  |
| รีวิวเกม                  | `POST /api/reviews` · `GET /api/reviews/:gameId` · `GET /api/reviews/:gameId/summary` |
| รีวิวของฉัน               | `GET /api/reviews/my`                                                                 |
| หน้าโปรไฟล์: สถิติ        | `GET /api/stats/me`                                                                   |
| หน้า Home: เกมยอดนิยม     | `GET /api/stats/popular-games?limit=6`                                                |

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

| หน้า                              | Endpoint                                                              |
| --------------------------------- | --------------------------------------------------------------------- |
| Dashboard การ์ดตัวเลข             | `GET /api/stats/overview?date=2026-10-12`                             |
| กราฟรายวัน                        | `GET /api/stats/daily?from=&to=` (default 7 วันล่าสุด)                |
| กราฟช่วงเวลาคนเยอะ                | `GET /api/stats/hourly?from=&to=`                                     |
| การใช้งานแต่ละโต๊ะ                | `GET /api/stats/tables?from=&to=`                                     |
| ผังโต๊ะ + ดูว่าโต๊ะไหนเล่นเกมอะไร | `GET /api/tables/floor` → `tables[].current.game`                     |
| จัดการโต๊ะ                        | `GET/POST /api/tables` · `PUT/DELETE /api/tables/:id`                 |
| เปิด/ปิดปรับปรุงโต๊ะ              | `PATCH /api/tables/:id/status` body `{ "status": "closed" }`          |
| รายการจองทั้งหมดของวัน            | `GET /api/reservations/admin?date=2026-10-12&status=playing`          |
| รับคืนเกมที่เคาน์เตอร์            | `PATCH /api/reservations/:id/return`                                  |
| ยกเลิกการจองที่ไม่เหมาะสม         | `PATCH /api/reservations/:id/cancel` (admin ยกเลิกได้แม้กำลังเล่น)    |
| ลบการจอง                          | `DELETE /api/reservations/admin/:id`                                  |
| ตั้งเกมเป็น maintenance           | `PUT /api/games/:id` body `{ "status": "maintenance" }` (module คน A) |
| ดูรีวิว / ลบรีวิว                 | `GET /api/reviews?maxRating=3` · `DELETE /api/reviews/:id`            |

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

## Demo data

```bash
npm run --workspace server seed          # เกมตัวอย่าง (คน A)
npm run --workspace server seed:tables   # ผังโต๊ะ 10 ตัว (Main / VIP / Outdoor)
```
