# API ที่เพิ่ม/ขยาย ตามดีไซน์ Admin

## 1. Auth

| Method | Path           | คำอธิบาย                                                                 |
| ------ | -------------- | ------------------------------------------------------------------------ |
| PUT    | `/api/auth/me` | แก้ไขโปรไฟล์ตัวเอง (displayName, phone, lineId, avatar, username, email) |

Login จะ reject ถ้า `status` เป็น `suspended` หรือ `pending`

---

## 2. Admin Users (`/api/admin`)

| Method | Path                   | คำอธิบาย                                          |
| ------ | ---------------------- | ------------------------------------------------- |
| GET    | `/users`               | list + filter: q, role, status, tier, page, limit |
| GET    | `/users/stats`         | total, active, suspended, pending, staff, byTier  |
| POST   | `/users`               | สร้าง user โดย admin                              |
| PATCH  | `/users/:id`           | แก้ profile / tier / phone / lineId               |
| PUT    | `/users/:id/role`      | เปลี่ยน role (string)                             |
| PATCH  | `/users/:id/suspend`   | ระงับบัญชี `{ reason? }`                          |
| PATCH  | `/users/:id/unsuspend` | ปลดระงับ                                          |
| PATCH  | `/users/:id/approve`   | อนุมัติ (pending → active)                        |
| DELETE | `/users/:id`           | ลบ                                                |

User model เพิ่ม: `status`, `tier`, `displayName`, `phone`, `lineId`, `avatar`, `noShowCount`, `playCount`, `suspendedAt`, `suspendedReason`, `lastActiveAt`

---

## 3. Games (`/api/games`)

| Method | Path          | คำอธิบาย                                                               |
| ------ | ------------- | ---------------------------------------------------------------------- |
| GET    | `/`           | list + filter shelf, weight + **counts** (available/inUse/maintenance) |
| GET    | `/stats`      | inventory stats (titles, totalCopies, available, inUse, maintenance)   |
| GET    | `/export.csv` | export CSV                                                             |
| PATCH  | `/:id/copies` | ปรับ copies / status / shelf                                           |

Game model เพิ่ม: `copies`, `shelf`, `sku`, `barcode`, `publisher`, `notes`

---

## 4. Stats (`/api/stats`)

| Method | Path         | คำอธิบาย                                         |
| ------ | ------------ | ------------------------------------------------ |
| GET    | `/dashboard` | overview + upcoming + alerts + openTickets       |
| GET    | `/alerts`    | noShows, openTickets, endingSoon, overduePlaying |

---

## 5. Audit (`/api/audit`) — ใหม่

| Method | Path          | คำอธิบาย                                             |
| ------ | ------------- | ---------------------------------------------------- |
| GET    | `/`           | list logs (from, to, actor, action, module, q, page) |
| GET    | `/summary`    | สรุปตามวัน                                           |
| GET    | `/export.csv` | export                                               |

---

## 6. Roles (`/api/roles`) — ใหม่

| Method | Path                   | คำอธิบาย                        |
| ------ | ---------------------- | ------------------------------- |
| GET    | `/`                    | list roles + permission catalog |
| GET    | `/:id`                 | detail + members                |
| POST   | `/`                    | สร้าง role                      |
| PUT    | `/:id`                 | แก้ role                        |
| PUT    | `/:id/permissions`     | ตั้ง permission matrix          |
| DELETE | `/:id`                 | ลบ (ห้าม system roles)          |
| POST   | `/:id/members`         | `{ userIds: [] }` เพิ่มสมาชิก   |
| DELETE | `/:id/members/:userId` | ถอดสมาชิก                       |

System roles ที่ seed อัตโนมัติ: `admin` (Super Admin), `user` (Member)

---

## 7. Settings

Schema ขยายรองรับ:

- pricing.peakEnabled / peakPerPersonHour / peakStart / peakEnd
- pricing.studentDiscountEnabled / studentDiscountPercent
- noShow.depositPerTable / autoRefundDeposit / notifyEnabled
- notifications.bookingReminderHours / smsEnabled / lineNotifyEnabled
- operatingHours.days[].label

ยังใช้ `GET/PUT /api/settings` เหมือนเดิม

---

## 8. ส่วนที่ต่อยอดเพิ่ม (Oat ช่วย A — 8 ต.ค.)

### สิทธิ์ละเอียดใช้งานได้จริง (หน้า 16)

- ทุก endpoint หลังร้านเช็คสิทธิ์จาก permission matrix ของบทบาท (`admin` ผ่านเสมอ, `user` = สมาชิก ไม่มีสิทธิ์หลังร้าน)
- action มาจาก HTTP method: `GET` = VIEW, `POST/PUT/PATCH` = EDIT, `DELETE` = DELETE, อนุมัติบัญชี = APPROVE
- แก้ matrix (`PUT /api/roles/:id/permissions`) มีผลทันที
- ตอน start server จะสร้างบทบาทตัวอย่าง (ครั้งเดียว แก้/ลบได้): `manager` (Store Manager — ทุกอย่างยกเว้นแก้สิทธิ์), `staff` (Game Master — ผังโต๊ะ, เช็คบิล, ดูคลังเกม, แจ้งซ่อม)

| key ใน matrix | ใช้กับ                                                                     |
| ------------- | -------------------------------------------------------------------------- |
| `floor`       | โต๊ะ, การจองฝั่งร้าน (walk-in, ยืนยัน, no-show), เรียก GM, แจ้งเตือน, ดูกะ |
| `checkout`    | รับชำระเงิน / เช็คบิล                                                      |
| `inventory`   | จัดการเกม, รีวิว                                                           |
| `users`       | จัดการผู้ใช้, จัดกะพนักงาน                                                 |
| `reports`     | `/api/stats/*` (dashboard, รายงาน)                                         |
| `settings`    | ตั้งค่าร้าน                                                                |
| `maintenance` | งานซ่อม                                                                    |
| `roles`       | จัดการบทบาท/สิทธิ์                                                         |
| `audit`       | บันทึกกิจกรรม                                                              |

กันพลาด: กำหนด role ที่ไม่มีอยู่ไม่ได้ (400), เปลี่ยน role / ระงับ / ลบ admin คนสุดท้ายไม่ได้, เปลี่ยน slug ของบทบาท → สมาชิกย้ายตาม, `memberCount` นับสดจากผู้ใช้

### ผู้ใช้ (หน้า 5)

- `GET /api/admin/users` แต่ละคนมี `playCount`, `noShowCount`, `lastVisitAt` (นับจากการจองจริง) และ `shouldSuspend` (no-show ถึงเกณฑ์ `settings.noShow.suspendAfter`)
- ลบสมาชิกที่ยังมีการจองค้างไม่ได้ (409), approve ได้เฉพาะบัญชี `pending` (409)

### คลังเกมรายกล่อง (หน้า 2–3)

- `copies` ต้อง ≥ 1
- `GET /api/games` และ `GET /api/games/:id` แต่ละเกมมี `copiesInVault` (บนชั้น), `copiesInPlay` (กำลังเล่น), `copiesInRepair` (ซ่อม)
- `GET /api/games/stats` → `{ titles, totalCopies, inVault, inPlay, maintenance }` (นับเป็นกล่อง)
- แก้ `copies` → สถานะเกมคำนวณใหม่อัตโนมัติ, ลบเกมที่มีการจองค้างไม่ได้ (409), CSV มี BOM เปิดใน Excel ภาษาไทยไม่เพี้ยน

### Dashboard / Alerts (หน้า 12)

`GET /api/stats/dashboard` = overview + `revenueTrend` (7 วัน), `topGames`, `upcoming`, `pendingConfirm`, `alerts`, `openTickets`, `shifts`, `onDutyNow`

`alerts[]` = `{ type, severity, title, count, link }` — type: `overdue`, `assist`, `ending_soon`, `pending_confirm`, `maintenance`, `no_show`, `suspend_candidate`, `pending_user`

### ยืนยันการจอง (หน้า 4)

- `GET /api/reservations/admin?confirmed=false` = การจองออนไลน์ที่ยังไม่ได้ยืนยัน
- `PATCH /api/reservations/admin/:id/confirm` → `confirmedAt`, `confirmedBy` (walk-in / จองแทนลูกค้า = ยืนยันอัตโนมัติ)
- แจ้งเตือน "การจองใหม่" มีปุ่ม "ยืนยัน" แล้ว

### กะพนักงาน (`/api/shifts`)

| Method | Path      | คำอธิบาย                                                                     |
| ------ | --------- | ---------------------------------------------------------------------------- |
| GET    | `/?date=` | กะของวัน (หรือ `from`, `to`) + `onDuty` รายคน + `onDutyNow`                  |
| POST   | `/`       | `{ user, date, start, end, position?, zone?, note? }` (user ต้องเป็นพนักงาน) |
| PATCH  | `/:id`    | แก้กะ                                                                        |
| DELETE | `/:id`    | ลบกะ                                                                         |

`end` ≤ `start` = เลิกหลังเที่ยงคืน

### ราคา Peak (หน้า 6)

ตั้ง `pricing.peakEnabled / peakPerPersonHour / peakStart / peakEnd` แล้วราคาคิดจริง: ชั่วโมงที่ทับช่วง peak ใช้ราคา peak (แพ็กเกจเหมาไม่คิด) — `price.peakHours`, `price.peakPerPersonHour` อยู่ในการจอง
(ส่วนลดนักศึกษา, มัดจำ, SMS/LINE ยังเป็นค่าตั้งเก็บไว้แสดง ไม่ได้คำนวณ)

### Audit Trail (หน้า 9)

- บันทึกกิจกรรมพนักงานครบทุกโมดูล (การจอง, โต๊ะ, ตั้งค่า, ซ่อม, เรียก GM, ผู้ใช้, เกม, สิทธิ์, กะ)
- `GET /api/audit/verify` → `{ valid, checked, brokenAt }` — ตรวจ hash chain (Tamper-Proof Log) ถ้ามีการแก้/ลบย้อนหลังจะเจอ

## 9. BoardGameGeek (`/api/bgg`) — Oat แก้ให้ A (13 ต.ค.)

> ต้องตั้ง `BGG_TOKEN` ใน `server/.env` (ขอที่ https://boardgamegeek.com/applications) — ห้าม commit token

### Error ที่อ่านรู้เรื่อง

ทุก endpoint ของ `/api/bgg` ตอบ `{ error, details: { code } }` ให้ FE แยกข้อความได้

| HTTP | `details.code`      | ความหมาย / ต้องทำอะไร                                        |
| ---- | ------------------- | ------------------------------------------------------------ |
| 503  | `BGG_TOKEN_MISSING` | ยังไม่ได้ตั้ง `BGG_TOKEN` → ใส่ใน `server/.env` แล้ว restart |
| 503  | `BGG_TOKEN_INVALID` | BGG ปฏิเสธ token (ผิด / หมดอายุ / แอปยังไม่อนุมัติ)          |
| 503  | `BGG_BUSY`          | BGG ตอบ 202 (กำลังเตรียมข้อมูล) เกิน 3 รอบ → ลองใหม่         |
| 429  | `BGG_RATE_LIMIT`    | เรียกถี่เกิน → รอสักครู่                                     |
| 502  | `BGG_UNREACHABLE`   | ต่อ BGG ไม่ได้ (เน็ต / DNS) · `BGG_TIMEOUT` เกิน 10 วิ       |
| 502  | `BGG_ERROR`         | BGG ตอบ error อื่น                                           |

### นำเข้าเกมในคำสั่งเดียว

`POST /api/bgg/import/:bggId` (สิทธิ์ `inventory:edit`) body ไม่บังคับ `{ overwrite?: boolean }`

- เกมใหม่ → **201** สร้างพร้อม `image` (รูปเต็ม), `thumbnail`, `bggAverage`, `bggRating`, `bggWeight`, `categories`, `mechanics`, `designers`, ผู้เล่น, เวลาเล่น, คำอธิบาย (`copies` = 1)
- มี `bggId` นี้ในคลังแล้ว → **200** อัปเดตเฉพาะข้อมูลจาก BGG (รูป, เรตติ้ง, หมวด, ปี) **ไม่แตะ** ชื่อ / คำอธิบาย / ผู้เล่น / เวลาเล่น / `copies` / `shelf` ที่ร้านแก้ไว้
- `overwrite: true` → ทับชื่อ / คำอธิบาย / ผู้เล่น / เวลาเล่น ด้วยข้อมูล BGG ด้วย
- ตอบเป็น game object เหมือน `GET /api/games/:id` · ไม่มีบน BGG → 404

### รูปเกม

- `thumbnail` = รูปเล็ก ~200px ใช้กับตาราง/รายการ · `image` = รูปเต็ม ใช้กับการ์ด/หน้า detail
- FE แสดงการ์ดด้วย `game.image || game.thumbnail` (ไม่ใช่ `thumbnail` อย่างเดียว → จะเบลอ)
- `GET /api/bgg/hot` มีแค่ `thumbnail` (BGG ไม่ส่งรูปเต็มใน hot list) — กด import แล้วจะได้รูปเต็ม

### Seed / เติมรูปให้เกมที่มีอยู่

- `npm run seed` — ถ้ามี `BGG_TOKEN` จะดึงรูป/เรตติ้ง/หมวดให้ 6 เกมตัวอย่างอัตโนมัติ (ไม่มี token ก็ยัง seed ได้ แค่ไม่มีรูป)
- `npm run bgg:refresh` — เติมข้อมูล BGG ให้ทุกเกมในคลังที่มี `bggId` แต่ยังไม่มีรูป (`-- --all` = อัปเดตทุกเกม) ดึงทีละ 20 เกม เว้น 5 วิ

## 10. แก้บั๊ก / ช่องโหว่ + หน้าเว็บสมาชิกใช้ API จริง (Oat — 14 ต.ค.)

### Backend (ที่ทีมต้องรู้)

| เรื่อง                                                      | เดิม                                                                   | ตอนนี้                                                                                                                               |
| ----------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| บัญชี admin                                                 | พนักงานที่มีสิทธิ์ `users` / `roles` สร้าง/ตั้ง/แก้/ระงับ/ลบ admin ได้ | เฉพาะ admin เท่านั้น → อื่น ๆ ได้ `403 only admin can manage admin accounts` (ทั้ง `/api/admin/users*` และ `/api/roles/:id/members`) |
| อนุมัติบัญชีผ่าน `PATCH /admin/users/:id {status:'active'}` | ไม่เช็ค `users:approve`                                                | ต้องมี `users:approve` เหมือน `/approve`                                                                                             |
| รหัสผ่านเดิมผิด (`PUT /auth/password`)                      | 401 (หน้าเว็บเตะออก)                                                   | **400** `old password incorrect`                                                                                                     |
| เปลี่ยนรหัสผ่าน                                             | token เก่าใช้ต่อได้ 7 วัน                                              | token เก่าใช้ไม่ได้ทันที — response มี `token` ใหม่ ให้เก็บแทน                                                                       |
| `POST /auth/register`                                       | รับแค่ username/email/password                                         | รับ `displayName`, `phone` เพิ่ม (ไม่บังคับ)                                                                                         |
| JSON เสีย / body > 1MB                                      | 500                                                                    | 400 / 413                                                                                                                            |
| `GET /api/games`, `/api/games/:id`                          | ส่ง `createdBy` (id admin)                                             | ไม่ส่งแล้ว                                                                                                                           |
| ชื่อ role ภาษาไทยล้วน                                       | สร้างไม่ได้ (slug ว่าง)                                                | ได้ slug อัตโนมัติ `role-xxxx`                                                                                                       |
| ราคา                                                        | ส่วนลดนักศึกษา/มัดจำในหน้าตั้งค่าไม่มีผล                               | คิดจริง — ดู docs/API-B.md ตาราง "กฎการจอง"                                                                                          |
| ลบเกม / ลบผู้ใช้                                            | รีวิวค้าง                                                              | ลบรีวิวที่เกี่ยวข้องด้วย                                                                                                             |
| audit hash chain                                            | รัน seed ระหว่าง server เปิด → verify พัง                              | อ่าน head จาก DB ทุกครั้ง + `seq` unique                                                                                             |

### ตั้งค่า env ใหม่ (`server/.env`)

- `TRUST_PROXY` — จำนวน proxy ข้างหน้า (ค่าเริ่มต้น 0). deploy หลัง proxy (Render/Railway) ตั้ง `1`
- `CLIENT_ORIGIN` — ใส่หลาย origin คั่นด้วย `,` ได้ (dev อนุญาต localhost:5173/5174 ให้อัตโนมัติ)
- production: `JWT_SECRET` ต้องสุ่มยาว ≥ 32 ตัว (ค่าตัวอย่างจะ start ไม่ขึ้น), `seed:demo` รันไม่ได้

### Seed

- `npm run seed` ไม่ทับข้อมูลเกมที่มีอยู่แล้ว (เดิมรีเซ็ตจำนวนกล่อง/ชื่อทุกครั้ง) และไม่ใส่ URL รูปปลอม — รูปมาจาก BGG (ต้องมี `BGG_TOKEN`) หรือ `npm run bgg:refresh`

### หน้าเว็บสมาชิก

- URL: `/catalog` (คลังเกม) · `/booking` (จองโต๊ะ, รับ `?game=&date=&time=&hours=&players=&table=`) · `/reservations` · `/profile` · `/signin`
- สมาชิกเข้า `/admin` ไม่ได้ · พนักงานทุก role ล็อกอินหลังร้านที่ `/login` ได้
- ตัวช่วยกลาง: `lib/session.js` (login/logout/useSession), `lib/booking.js` (วัน/รอบเวลาตามกฎร้าน, ข้อความ error ภาษาไทย), `services/api.js` (API ฝั่งสมาชิกทั้งหมด), `components/user/Toast.jsx`, `components/user/ReviewForm.jsx`
