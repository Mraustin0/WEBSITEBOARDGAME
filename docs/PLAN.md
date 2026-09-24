# Boardgame Everyday — Project Plan

**Course:** CP363205 ภาษาอนุกรมข้อมูลและการประยุกต์
**Deadline นำเสนอ:** 12 ตุลาคม 2569
**ทีม:** (ใส่ชื่อสมาชิก)

---

## 1. ที่มาและปัญหา

คนเล่นบอร์ดเกมมักมีเกมสะสมเยอะ แต่:

- จำไม่ได้ว่ามีเกมอะไรบ้าง
- ไม่มีที่บันทึกว่าเล่นเกมไหนกับใคร ผลเป็นยังไง
- อยากรู้ข้อมูลเกม (ผู้เล่น, เวลา, complexity) จากแหล่งกลาง

โปรเจคนี้แก้ปัญหาด้วยเว็บที่ให้ผู้ใช้จัดการคอลเลกชันบอร์ดเกมส่วนตัว บันทึก play session และดูข้อมูลเกมจาก BoardGameGeek

## 2. วัตถุประสงค์

1. สร้างเว็บแอปจัดการคอลเลกชันบอร์ดเกมส่วนบุคคล
2. บันทึกและวิเคราะห์ประวัติการเล่น (play log)
3. เชื่อมข้อมูลเกมกับ BoardGameGeek (BGG) API
4. ฝึกใช้ Express + MongoDB + JSON/XML data serialization

## 3. ทฤษฎี/เครื่องมือ

- **Backend:** Node.js + Express + Mongoose (JavaScript, no compile step)
- **Validation:** Zod schemas ทุก request body/query/params ที่ boundary
- **Auth:** JWT (jsonwebtoken) + bcrypt — stateless, hashed passwords
- **Security:** Helmet + CORS จำกัด origin
- **Logging:** Pino + pino-http (structured JSON logs, redact secrets)
- **API docs:** Swagger UI ที่ `/api/docs` + OpenAPI spec JSON
- **Database:** MongoDB Atlas (production) / Docker Mongo (dev) + Mongoose ODM
- **Frontend:** React + Vite (JS, no compile)
- **External API:** BoardGameGeek XML API v2 (parse XML → JSON via `fast-xml-parser`)
- **Testing:** Vitest + supertest
- **Tooling:** ESLint 9 flat + Prettier + Husky + lint-staged
- **DevOps:** Docker + docker-compose + GitHub Actions CI

## 4. JSON Data Structure

```json
// User
{
  "_id": "ObjectId",
  "username": "string",
  "email": "string",
  "passwordHash": "string",
  "role": "user | admin",
  "createdAt": "ISODate"
}

// Game (master catalog)
{
  "_id": "ObjectId",
  "bggId": 13,
  "name": "Catan",
  "minPlayers": 3,
  "maxPlayers": 4,
  "playtimeMin": 90,
  "yearPublished": 1995,
  "thumbnail": "https://...",
  "description": "string",
  "createdBy": "ObjectId(User)",
  "createdAt": "ISODate"
}

// CollectionItem (user owns game)
{
  "_id": "ObjectId",
  "user": "ObjectId(User)",
  "game": "ObjectId(Game)",
  "condition": "new | good | worn",
  "notes": "string",
  "addedAt": "ISODate"
}

// PlaySession
{
  "_id": "ObjectId",
  "user": "ObjectId(User)",
  "game": "ObjectId(Game)",
  "playedAt": "ISODate",
  "players": ["Alice", "Bob"],
  "winner": "Alice",
  "durationMin": 75,
  "notes": "string"
}

// Review
{
  "_id": "ObjectId",
  "user": "ObjectId(User)",
  "game": "ObjectId(Game)",
  "rating": 1-10,
  "comment": "string",
  "createdAt": "ISODate"
}
```

## 5. API Map Structure

Base: `http://localhost:4000/api`

| Method | Path               | Role   | Description                    |
| ------ | ------------------ | ------ | ------------------------------ |
| POST   | `/auth/register`   | public | สมัคร (default role=user)      |
| POST   | `/auth/login`      | public | login → JWT                    |
| GET    | `/auth/me`         | any    | user info ปัจจุบัน             |
| GET    | `/games`           | public | list เกมทั้งหมด (search `?q=`) |
| GET    | `/games/:id`       | public | รายละเอียดเกม                  |
| POST   | `/games`           | admin  | สร้างเกมใหม่                   |
| PUT    | `/games/:id`       | admin  | แก้ไข                          |
| DELETE | `/games/:id`       | admin  | ลบ                             |
| GET    | `/collection`      | user   | คอลเลกชันของ user              |
| POST   | `/collection`      | user   | เพิ่มเกมเข้า collection        |
| DELETE | `/collection/:id`  | user   | ลบออก                          |
| GET    | `/plays`           | user   | play log ของ user              |
| POST   | `/plays`           | user   | log play                       |
| PUT    | `/plays/:id`       | user   | แก้ไข                          |
| DELETE | `/plays/:id`       | user   | ลบ                             |
| GET    | `/reviews/:gameId` | public | review ทั้งหมดของเกม           |
| POST   | `/reviews`         | user   | post review                    |
| GET    | `/bgg/search?q=`   | public | ค้นหาจาก BGG (external)        |
| GET    | `/bgg/game/:bggId` | public | ดึงข้อมูลเกมจาก BGG            |

**External API:** BoardGameGeek XML API v2 — `https://boardgamegeek.com/xmlapi2/`

## 6. ขอบเขต & Functions ตาม Role

### User (ผู้ใช้ทั่วไป)

- Register / Login / Logout
- Browse เกม + ค้นหา
- ดูรายละเอียดเกม + review
- เพิ่ม/ลบเกมใน collection ตัวเอง
- Log play session + แก้ไข/ลบ
- เขียน review + ให้ rating
- Import เกมจาก BGG มาเข้าระบบ (auto-fill data)

### Admin (ผู้ดูแลระบบ)

- ทุกอย่างของ user
- CRUD Game catalog (add/edit/delete master game)
- ดู user list
- ลบ review ที่ไม่เหมาะสม

## 7. Tech Stack Summary

```
client (Vite React SPA)  →  server (Express + Mongoose)  →  MongoDB Atlas
                                       ↓
                              BoardGameGeek XML API
```

## 8. Layering / Convention

Server ทุก module ตาม pattern เดียวกัน:

```
modules/<feature>/
  <feature>.routes.js       Express router + validate + auth
  <feature>.controller.js   thin — call service, return JSON
  <feature>.service.js      business logic, DB access, throws AppError
  <feature>.schema.js       Zod validators (body/query/params)
```

Rule: controllers ไม่ touch DB ตรง, services ไม่ touch req/res. Errors throw `AppError` → central `errorHandler` แปลง status code.

## 9. Milestones

1. **Week 1:** setup repo + connect DB + auth working
2. **Week 2:** games CRUD + BGG integration + frontend skeleton
3. **Week 3:** collection + plays + reviews
4. **Week 4:** admin, polish UI, seed data
5. **Week 5:** เขียนรายงาน + ซ้อมนำเสนอ

## 10. เกณฑ์การตัดสินตามโจทย์ (ต้องผ่านทุกข้อ)

- [x] Backend Express อย่างเดียว
- [x] MongoDB Compass/Atlas
- [x] External API ≥ 1 (BGG)
- [x] Login ≥ 2 roles (user, admin)
- [x] CRUD (games, collection, plays, reviews)
