# API คน B — Tables · Reservations · Reviews · Stats

สำหรับทีม frontend. Swagger ดูได้ที่ `http://localhost:4000/api/docs` (tag: tables, reservations, reviews, stats).
ทุก request ที่ต้อง login ใส่ header `Authorization: Bearer <token>`.
Error ทุกตัวเป็น `{ "error": "ข้อความ", "details": {...} }` — 400 = input ผิด, 401 = ไม่ได้ login, 403 = ไม่ใช่ admin, 404 = ไม่เจอ, 409 = ชนกัน (จองซ้ำ/โต๊ะปิด/เกมซ่อม).

เวลาส่งเป็น ISO string เช่น `2026-10-12T13:00:00+07:00`. พารามิเตอร์ `date` ใช้ `YYYY-MM-DD` ตามเวลาไทย.

## กฎการจอง (`GET /api/reservations/rules`)

> ค่าทั้งหมดในตารางนี้คือค่าเริ่มต้น admin แก้ได้ที่หน้า "ตั้งค่าร้าน" (`PUT /api/settings`) — frontend ควรอ่านค่าจริงจาก `GET /api/reservations/rules` หรือ `GET /api/settings`

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

- **Reservation:** `booked` (จองล่วงหน้า) → `playing` (ถึงเวลาเริ่ม — ระบบเปลี่ยนให้อัตโนมัติ) → `completed` (กดคืนเกม). ยกเลิกได้ → `cancelled`, ลูกค้าไม่มา (admin กด) → `no_show`
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
    "extraSeats": 2
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
  "priority": "high"
}
```

- แจ้งซ่อม → เกมเป็น `maintenance` (จองไม่ได้) / โต๊ะเป็น `closed` อัตโนมัติ
- ปิดงาน (`resolved`) หรือลบใบแจ้ง → เปิดใช้งานคืนอัตโนมัติ (ถ้าไม่มีใบอื่นค้าง)
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
