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
