# Boardgame Everyday

Web app จัดการคอลเลกชันบอร์ดเกม + บันทึกการเล่น + review เชื่อมกับ BoardGameGeek.
Course project **CP363205 ภาษาอนุกรมข้อมูลและการประยุกต์**.

## Stack

**Backend** (`server/`) — Node.js + Express + Mongoose + MongoDB + JWT + Zod + Pino + Swagger UI.
Feature-based, layered (routes → controller → service → model). Docker + Vitest + supertest tests.

**Frontend** (`client/`) — Vite + React (JS ล้วน ไม่มี TypeScript compile step). Scaffold ว่าง พร้อมให้เขียน UI.

**Tooling** — Prettier, ESLint 9 flat config, Husky + lint-staged, GitHub Actions CI, Docker Compose.

## Structure

```
.
├── package.json              root workspace (npm workspaces)
├── eslint.config.js
├── .prettierrc.json
├── docker-compose.yml        Mongo + server container
├── .github/workflows/ci.yml
├── docs/
│   └── PLAN.md               แผนโปรเจคเต็ม
├── server/
│   ├── package.json
│   ├── Dockerfile
│   ├── vitest.config.js
│   ├── src/
│   │   ├── index.js          entry (startup + graceful shutdown)
│   │   ├── app.js            express app factory (testable)
│   │   ├── config/env.js     Zod-validated env
│   │   ├── lib/              db, logger (pino), errors, openapi spec
│   │   ├── middleware/       auth, error, validate (Zod)
│   │   ├── models/           user, game, collection, play, review (per file)
│   │   └── modules/          feature-based
│   │       ├── auth/         {routes, controller, service, schema}
│   │       ├── games/
│   │       ├── collection/
│   │       ├── plays/
│   │       ├── reviews/
│   │       └── bgg/          BoardGameGeek proxy (external API)
│   ├── scripts/              seed + promote-admin
│   └── tests/                vitest + supertest
└── client/
    ├── package.json
    ├── vite.config.js        proxies /api → server:4000
    └── src/{main,App}.jsx    placeholder — UI ยังไม่ทำ
```

## Requirements

- Node.js ≥ 20
- MongoDB Atlas (หรือใช้ `docker compose up mongo` local)

## Setup

### 1. Install (root workspace)

```bash
npm install
npm run prepare        # setup husky pre-commit hook
```

### 2. Env

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
# แก้ MONGODB_URI + JWT_SECRET ใน server/.env
```

### 3. Dev

```bash
npm run dev            # server + client parallel
```

หรือแยก tab:

```bash
npm run dev:server     # http://localhost:4000 (+ /api/docs Swagger)
npm run dev:client     # http://localhost:5173
```

### 4. Utility scripts

```bash
npm run --workspace server seed                # เพิ่ม sample games
npm run --workspace server promote -- you@example.com    # ทำ user เป็น admin
```

## API Docs

รัน server แล้วเปิด http://localhost:4000/api/docs (Swagger UI, interactive).

Spec JSON ที่ http://localhost:4000/api/openapi.json.

## Testing

```bash
npm test                                       # vitest run
npm test -- --watch                            # watch mode
```

Auth integration tests รันต่อเมื่อมี `MONGODB_URI` env (skip อัตโนมัติถ้าไม่มี).

## Docker

Mongo local:

```bash
docker compose up mongo
```

Backend + Mongo ทั้ง stack:

```bash
docker compose --profile app up --build
```

## Quality checks

```bash
npm run lint           # eslint --max-warnings 0
npm run format:check   # prettier check
npm run format         # auto-format
```

Pre-commit hook รัน `lint-staged` (eslint --fix + prettier --write เฉพาะไฟล์ที่ stage).

CI: format check + lint + build + tests (with Mongo service).

## API Endpoints

ดู `docs/PLAN.md` section 5 หรือ Swagger UI ที่ `/api/docs`.
# WEBSITEBOARDGAME
