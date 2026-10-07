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
