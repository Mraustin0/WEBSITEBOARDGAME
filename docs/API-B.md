# API คน B — Tables · Reservations · Reviews · Stats

สำหรับทีม frontend. Swagger ดูได้ที่ `http://localhost:4000/api/docs` (tag: tables, reservations, reviews, stats).
ทุก request ที่ต้อง login ใส่ header `Authorization: Bearer <token>`.
Error ทุกตัวเป็น `{ "error": "ข้อความ", "details": {...} }` — 400 = input ผิด, 401 = ไม่ได้ login, 403 = ไม่ใช่ admin, 404 = ไม่เจอ, 409 = ชนกัน (จองซ้ำ/โต๊ะปิด/เกมซ่อม).

เวลาส่งเป็น ISO string เช่น `2026-10-12T13:00:00+07:00`. พารามิเตอร์ `date` ใช้ `YYYY-MM-DD` ตามเวลาไทย.

## กฎการจอง (`GET /api/reservations/rules`)

| กฎ          | ค่า                                                                              |
| ----------- | -------------------------------------------------------------------------------- |
| ราคา        | `ชั่วโมง × (ผู้เล่น × 50 + extraPerHour ของโต๊ะ)` บาท                            |
| จองล่วงหน้า | ไม่เกิน 3 วัน, เริ่มย้อนหลังได้ไม่เกิน 15 นาที (walk-in)                         |
| ระยะเวลา    | 1–6 ชม. ทีละ 0.5                                                                 |
| แพ็กเกจ     | `hourly` (รายชั่วโมง) หรือ `flat3h` เหมา 3 ชม. = ผู้เล่น × 130 + 3 × ค่าโต๊ะ     |
| เกินเวลา    | เกินไม่เกิน 10 นาทีไม่คิด เกินกว่านั้นคิดเพิ่มทีละครึ่งชั่วโมง (อัตรารายชั่วโมง) |
| ผู้เล่น     | ≤ capacity ของโต๊ะ และอยู่ในช่วง min–max ของเกม                                  |
| ชนกัน       | โต๊ะเดียวกัน / เกมเดียวกัน / ผู้ใช้คนเดียวกัน ห้ามเวลาทับกัน                     |

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

## Demo data

```bash
npm run --workspace server seed          # เกมตัวอย่าง (คน A)
npm run --workspace server seed:tables   # ผังโต๊ะ 10 ตัว (Main / VIP / Outdoor)
```
