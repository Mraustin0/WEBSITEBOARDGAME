# Task Breakdown — Backend + Frontend + Report

แบ่ง 2 คน. Effort: **S**=<1h · **M**=1-3h · **L**=3-6h · **XL**=>6h.
Task id prefix: `A*` = คน A · `B*` = คน B · `S*` = shared/ทำด้วยกัน.

---

## Phase 0 — Setup (both, ทำครั้งเดียว)

- [ ] `S1` (S) clone repo + `npm install` + `cp .env.example .env` (server + client)
- [ ] `S2` (S) สมัคร MongoDB Atlas → เอา URI ใส่ `server/.env` — [Atlas free tier](https://www.mongodb.com/atlas)
- [ ] `S3` (S) `npm run --workspace server seed` ตรวจว่าเชื่อม DB ได้
- [ ] `S4` (S) `npm run dev` แล้วเปิด `http://localhost:4000/api/docs` เห็น Swagger
- [ ] `S5` (S) แบ่ง branch: คน A ใช้ `Develop`, คน B ใช้ `Tindevelop` (หรือทั้งคู่สร้าง `feature/*` ใหม่จาก `Develop`)

---

## Phase 1 — Backend (scaffold มีแล้ว → ต้อง polish + เพิ่ม)

### คน A — Auth + Games + BGG + Infra

**A1. Auth polish** (M)
- [ ] เพิ่ม endpoint `POST /api/auth/logout` (optional — JWT stateless แค่ frontend ทิ้ง token)
- [ ] เพิ่ม endpoint `PUT /api/auth/password` เปลี่ยนรหัสผ่าน (require old + new password)
- [ ] test: register + login + wrong password + duplicate email
- ไฟล์: `modules/auth/*`, `tests/auth.test.js`

**A2. Games — search + filter** (M)
- [ ] ตอนนี้ `?q=` ใช้ MongoDB text index. เพิ่ม fallback substring search ถ้า text ไม่เจอ
- [ ] เพิ่ม query param filters: `?minPlayers=`, `?maxPlayers=`, `?year=`
- [ ] เพิ่ม pagination `?page=1&limit=20` return `{ items, total, page }`
- ไฟล์: `modules/games/{schema,service,controller}.js`, `lib/openapi.js`

**A3. Games — sort + top games** (S)
- [ ] เพิ่ม `?sort=name|year|createdAt&order=asc|desc`
- ไฟล์: `modules/games/service.js`

**A4. Admin — user management** (M)
- [ ] `GET /api/admin/users` list users (admin only)
- [ ] `PUT /api/admin/users/:id/role` เปลี่ยน role
- [ ] `DELETE /api/admin/users/:id` ลบ user (soft delete หรือ hard delete)
- สร้าง module ใหม่: `modules/admin/{routes,controller,service,schema}.js`
- ไฟล์: `app.js` (register route), `lib/openapi.js`

**A5. BGG — Hot list** (S)
- [ ] `GET /api/bgg/hot` proxy ไปยัง `https://boardgamegeek.com/xmlapi2/hot?type=boardgame`
- [ ] parse XML → return array of trending games
- ไฟล์: `modules/bgg/{routes,service,controller}.js`

**A6. BGG — expand fields** (M)
- [ ] ใน `bgg.service.js` `detail()` เพิ่มดึง: `image` (full size), `average`, `usersrated`, `averageweight`, `link` (categories, mechanics, designers)
- [ ] update `Game` schema เพิ่ม field: `image`, `bggAverage`, `bggWeight`, `categories: [String]`, `mechanics: [String]`, `designers: [String]`
- ไฟล์: `models/game.model.js`, `modules/bgg/service.js`

**A7. BGG — response cache** (S)
- [ ] เพิ่ม in-memory cache 1 ชั่วโมง สำหรับ BGG responses (Map + timestamp)
- [ ] BGG API rate limit ยิ่งเยอะยิ่งช้า → cache ช่วยเยอะ
- ไฟล์: `lib/cache.js` (สร้างใหม่), `modules/bgg/service.js`
- Note: comment `// ponytail: in-memory Map, ใช้ Redis ถ้า scale`

**A8. Rate limiting** (S)
- [ ] เพิ่ม `express-rate-limit` middleware สำหรับ `/api/auth/*` (10 req/นาที) + `/api/bgg/*` (30 req/นาที)
- [ ] แก้ `app.js`

**A9. Docker verification** (S)
- [ ] `docker compose up mongo` local Mongo รันได้
- [ ] `docker compose --profile app up --build` full stack รันได้
- [ ] เพิ่ม `Dockerfile` health check line

**A10. Tests — auth + games + bgg** (M)
- [ ] test games CRUD (public list, admin create/update/delete, non-admin ห้ามสร้าง)
- [ ] test BGG search proxy (mock fetch)
- ไฟล์: `tests/games.test.js`, `tests/bgg.test.js`

---

### คน B — Collection + Plays + Reviews

**B1. Collection — polish** (M)
- [ ] เพิ่ม `PUT /api/collection/:id` แก้ `condition` + `notes`
- [ ] เพิ่ม `?condition=` filter ใน list
- [ ] validate: game must exist before add (ไม่ให้ add game id ที่ไม่มี)
- ไฟล์: `modules/collection/{schema,service,controller,routes}.js`

**B2. Collection — stats** (M)
- [ ] `GET /api/collection/stats` สรุป: จำนวนเกม, จำนวนตาม condition, ปีที่ collect
- ไฟล์: `modules/collection/service.js`

**B3. Plays — polish** (M)
- [ ] เพิ่ม `?gameId=` filter ใน list plays (ดูประวัติเล่นเกมนี้)
- [ ] เพิ่ม `?from=YYYY-MM-DD&to=` date range filter
- [ ] pagination `?page=1&limit=20`
- ไฟล์: `modules/plays/{schema,service,controller}.js`

**B4. Plays — stats** (M)
- [ ] `GET /api/plays/stats` สรุป: จำนวน sessions, เกมที่เล่นบ่อยสุด, ผู้ชนะบ่อยสุด, เวลาเล่นรวม
- [ ] `GET /api/plays/stats/monthly` chart data (grouped by month)
- ไฟล์: `modules/plays/service.js`

**B5. Reviews — polish** (M)
- [ ] `GET /api/reviews/my` list review ทั้งหมดของ user ปัจจุบัน
- [ ] `GET /api/games/:id/rating` return average rating + count (aggregation)
- [ ] admin: report review (ตั้ง flag) — optional
- ไฟล์: `modules/reviews/{schema,service,controller,routes}.js`, `modules/games/service.js`

**B6. Aggregation — game popularity** (M)
- [ ] `GET /api/games/popular` เกมที่คน collect เยอะสุด (top 10) — join CollectionItem + Game
- [ ] ใช้ mongoose `.aggregate()` — `$group` count by game
- ไฟล์: `modules/games/service.js`, `modules/games/routes.js`

**B7. Play log — export** (S)
- [ ] `GET /api/plays/export.csv` return CSV ของ play log ตัวเอง (ไม่ต้อง lib — string builder ธรรมดา)
- [ ] header: `date,game,players,winner,duration,notes`
- ไฟล์: `modules/plays/controller.js`

**B8. Search — combined** (M)
- [ ] `GET /api/search?q=` ค้นพร้อมกัน: games (in DB), plays (own), reviews (own). ประกอบผลลัพธ์
- [ ] สร้าง module ใหม่: `modules/search/{routes,controller,service,schema}.js`
- ไฟล์: `app.js`, `lib/openapi.js`

**B9. Tests — collection + plays + reviews** (M)
- [ ] test add to collection, prevent duplicate
- [ ] test log play, edit, delete
- [ ] test review upsert (upsert แล้วได้ 1 review ต่อ user+game)
- [ ] test admin ลบ review ของคนอื่นได้
- ไฟล์: `tests/collection.test.js`, `tests/plays.test.js`, `tests/reviews.test.js`

**B10. OpenAPI docs** (S)
- [ ] update `lib/openapi.js` เพิ่ม spec ของ endpoint ที่ B ทำใหม่
- [ ] check ที่ `/api/docs` เห็นครบ

---

### Shared (ต้องคุยก่อนแตะ)

**S6. Deploy backend** (M) — คน A ทำ, คน B ช่วย test
- [ ] เลือก 1: Render, Railway, Fly.io (มี free tier)
- [ ] ผูก GitHub repo → auto-deploy on push
- [ ] ตั้ง env vars (MONGODB_URI จาก Atlas, JWT_SECRET, CLIENT_ORIGIN)

**S7. Sample data** (M) — คน A/B ทำร่วมกัน
- [ ] ขยาย `seed.js` ให้มี ≥20 games หลากหลาย category
- [ ] เพิ่ม script `seed-demo.js` สร้าง sample user + collection + plays + reviews สำหรับ demo

---

## Phase 2 — Frontend

Backend ทำจบ 60-70% ค่อยเริ่ม UI (ไม่งั้นเปลี่ยน contract หลัง UI ทำเสร็จจะเสียเวลา).

### แบ่งตาม endpoint ownership

### คน A — pages ที่ต่อ endpoint ของ A

- [ ] `A-UI-1` (M) Login + Register page
- [ ] `A-UI-2` (M) Games list page + search + filters (bar for minPlayers, playtime, year)
- [ ] `A-UI-3` (L) Game detail page — พร้อมโชว์ปก, BGG rating badge, categories, mechanics
- [ ] `A-UI-4` (L) Admin — Games CRUD form + list + delete
- [ ] `A-UI-5` (M) Admin — BGG import UI (search BGG → click → auto-fill form → save)
- [ ] `A-UI-6` (S) Admin — User list + change role + delete
- [ ] `A-UI-7` (S) Hot list widget บนหน้า Home

### คน B — pages ที่ต่อ endpoint ของ B

- [ ] `B-UI-1` (M) My Collection page — grid ของเกมที่ owned + condition filter + delete
- [ ] `B-UI-2` (M) Add-to-collection modal (search games → เลือก → save)
- [ ] `B-UI-3` (L) Play log page — table + form add play + edit/delete inline
- [ ] `B-UI-4` (M) Play stats page — chart (Chart.js/Recharts) จาก `/api/plays/stats/monthly`
- [ ] `B-UI-5` (M) Review form บน Game detail (ใช้ endpoint upsert) — แสดง rating เฉลี่ยจาก B5
- [ ] `B-UI-6` (S) Export plays CSV button
- [ ] `B-UI-7` (S) Popular games section หน้า Home

### Shared UI

- [ ] `S-UI-1` (M) Nav bar + routing + AuthContext (คนไหนเสร็จก่อนทำ)
- [ ] `S-UI-2` (M) ProtectedRoute + role-based (redirect ถ้าไม่ใช่ admin)
- [ ] `S-UI-3` (M) Design system: color tokens, spacing, typography — Anti-template look (อย่าใช้ default MUI/shadcn ธรรมดา)

---

## Phase 3 — Report + Slide (ตามโจทย์ 3.a-f)

รายงาน ~15-25 หน้า. แต่ละคนเขียน section ของตัวเอง.

### คน A

- [ ] `A-DOC-1` (M) Section 3.a — ที่มา + ปัญหา (background)
- [ ] `A-DOC-2` (S) Section 3.b — วัตถุประสงค์
- [ ] `A-DOC-3` (L) Section 3.c — ทฤษฎี/เครื่องมือ (Express, Mongoose, JWT, Zod, Pino) — สรุป ไม่เกิน 2-3 slide
- [ ] `A-DOC-4` (L) Section 3.e — API Map Structure (ดู `docs/PLAN.md` section 5 + Swagger)
- [ ] `A-DOC-5` (M) เขียนหัวข้อ Auth + Games + BGG ใน chapter การทำงานระบบ (4.a-c)
- [ ] `A-DOC-6` (S) หน้าปก + คำนำ + สารบัญ

### คน B

- [ ] `B-DOC-1` (L) Section 3.d — JSON Map Structure (ทุก model + example doc)
- [ ] `B-DOC-2` (L) Section 3.f — ขอบเขต + Functions ตาม role (user vs admin)
- [ ] `B-DOC-3` (M) เขียนหัวข้อ Collection + Plays + Reviews ใน chapter การทำงานระบบ
- [ ] `B-DOC-4` (M) Section 4.iii — Specifications ของระบบที่ทดลอง (Node version, MongoDB, browser, OS)
- [ ] `B-DOC-5` (S) Section 4.iv — บรรณานุกรม (BGG API docs URL, MongoDB docs, Express docs)
- [ ] `B-DOC-6` (M) capture screenshot demo (5-10 หน้าสำคัญ) ใส่ในรายงาน

### Slide (แบ่งครึ่ง — คนละ 5-6 slide)

- [ ] คน A: intro, motivation, tech stack, API map, auth flow demo
- [ ] คน B: JSON schema, features per role, collection/plays demo, stats chart, conclusion

---

## Phase 4 — Demo prep (both)

- [ ] `S8` (S) test flow เต็ม: register user → login → browse → add to collection → log play → review → admin CRUD → BGG import (2 คนช่วยกัน)
- [ ] `S9` (S) ซ้อมนำเสนอ 2 รอบ (15 นาที + Q&A 5 นาที) — จับเวลา
- [ ] `S10` (S) เตรียม backup plan ถ้า demo fail (video record + local screenshots)
- [ ] `S11` (S) ตรวจสอบทั้ง 2 users test ready: 1 user, 1 admin, ทั้งคู่มี data
- [ ] `S12` (S) upload code + report ตามที่โจทย์กำหนด (Google Drive public link ใต้ private comment)

---

## Timeline แนะนำ (5 สัปดาห์ก่อน 12 ต.ค.)

| Week | คน A | คน B |
|---|---|---|
| **1 (25 ส.ค. - 31 ส.ค.)** | Phase 0 + A1-A3 | Phase 0 + B1-B3 |
| **2 (1 ก.ย. - 7 ก.ย.)** | A4-A7 + Deploy | B4-B6 + OpenAPI update |
| **3 (8 ก.ย. - 14 ก.ย.)** | A-UI-1,2,3 | B-UI-1,2,3 |
| **4 (15 ก.ย. - 21 ก.ย.)** | A-UI-4,5,6,7 + Doc A | B-UI-4,5,6,7 + Doc B |
| **5 (22 ก.ย. - 5 ต.ค.)** | Report finalize + slide + ซ้อม | Report finalize + slide + ซ้อม |
| **6 (6-11 ต.ค.)** | Buffer + demo prep | Buffer + demo prep |

**หลัก:** อย่าให้ frontend ทำก่อน backend ตกลง contract เสร็จ. ทำ backend ให้ Swagger เขียวก่อน แล้ว UI ค่อยเริ่ม.

---

## Merge conflict avoidance

**Golden rule:** ห้ามแตะไฟล์ของโมดูลอีกคนโดยไม่คุย.

**ไฟล์ที่ทั้งคู่ต้องแตะบ่อย:**
- `server/src/app.js` — ใครสร้าง module ใหม่ append 1 บรรทัด commit เดี่ยว push ก่อน
- `server/src/lib/openapi.js` — append ที่ท้าย paths object แยก path ของตัวเอง
- `docs/PLAN.md`, `README.md` — แก้แล้ว pull ก่อนเสมอ

**ก่อน push:** `git pull --rebase origin Develop` ทุกครั้ง.

**PR flow:** feature branch → PR ไป `Develop` → อีกคน review → merge (ไม่ต้อง merge ตัวเอง)
