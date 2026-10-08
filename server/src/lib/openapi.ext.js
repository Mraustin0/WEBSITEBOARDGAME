// OpenAPI spec ของระบบหลังร้านที่ขยายตามดีไซน์ Admin
// (สิทธิ์ละเอียด, ผู้ใช้, คลังเกมรายกล่อง, dashboard, กะพนักงาน, audit) — ถูก spread เข้า openapi.js
const bearer = [{ bearerAuth: [] }];
const json = (schema) => ({ 'application/json': { schema } });
const ok = (schema, description = 'ok') => ({ description, content: json(schema) });
const err = (description) => ({ description });
const obj = (properties, extra = {}) => ({ type: 'object', properties, ...extra });
const q = (name, schema, description) => ({ name, in: 'query', schema, description });
const path = (name = 'id') => ({ name, in: 'path', required: true, schema: { type: 'string' } });
const body = (schema) => ({ required: true, content: json(schema) });
const s = { type: 'string' };
const n = { type: 'integer' };
const b = { type: 'boolean' };
const any = { type: 'object' };
const date = { type: 'string', example: '2026-10-12' };
const hhmm = { type: 'string', example: '18:00' };
const perm = obj({ key: s, view: b, edit: b, del: b, approve: b });
const op = (tag, summary, extra = {}) => ({ tags: [tag], summary, security: bearer, ...extra });

export const extPaths = {
  '/auth/me': {
    put: op('auth', 'แก้ไขโปรไฟล์ตัวเอง (หน้า 11)', {
      requestBody: body(
        obj({ username: s, email: s, displayName: s, phone: s, lineId: s, avatar: s }),
      ),
      responses: { 200: ok(any), 409: err('username/email ซ้ำ') },
    }),
  },
  '/admin/users/stats': {
    get: op('admin', 'การ์ดสรุปผู้ใช้: total, active, suspended, pending, staff, byTier', {
      responses: { 200: ok(any) },
    }),
  },
  '/admin/users/{id}/suspend': {
    parameters: [path()],
    patch: op('admin', 'ระงับบัญชี (ห้ามระงับตัวเอง / admin คนสุดท้าย)', {
      requestBody: { content: json(obj({ reason: s })) },
      responses: { 200: ok(any), 400: err('ตัวเอง / admin คนสุดท้าย') },
    }),
  },
  '/admin/users/{id}/unsuspend': {
    parameters: [path()],
    patch: op('admin', 'ปลดระงับบัญชี', { responses: { 200: ok(any) } }),
  },
  '/admin/users/{id}/approve': {
    parameters: [path()],
    patch: op('admin', 'อนุมัติบัญชี pending → active (สิทธิ์ users:approve)', {
      responses: { 200: ok(any), 409: err('ไม่ได้อยู่ในสถานะ pending') },
    }),
  },
  '/games/stats': {
    get: op('games', 'สรุปคลังเกมเป็นกล่อง: titles, totalCopies, inVault, inPlay, maintenance', {
      responses: {
        200: ok(obj({ titles: n, totalCopies: n, inVault: n, inPlay: n, maintenance: n })),
      },
    }),
  },
  '/games/export.csv': {
    get: op('games', 'ดาวน์โหลดคลังเกม CSV (filter เดียวกับ GET /games)', {
      responses: { 200: { description: 'text/csv (มี BOM สำหรับ Excel)' } },
    }),
  },
  '/games/{id}/copies': {
    parameters: [path()],
    patch: op('games', 'แก้จำนวนกล่อง / ชั้นวาง / สถานะ — สถานะเกมคำนวณใหม่อัตโนมัติ', {
      requestBody: body(obj({ copies: { type: 'integer', minimum: 1 }, shelf: s, status: s })),
      responses: { 200: ok(any) },
    }),
  },
  '/stats/dashboard': {
    get: op(
      'stats',
      'หน้า 12 Dashboard: overview + revenueTrend 7 วัน + topGames + upcoming + pendingConfirm + alerts + shifts',
      {
        parameters: [q('date', date)],
        responses: { 200: ok(any) },
      },
    ),
  },
  '/stats/alerts': {
    get: op('stats', 'Action Needed: items[] = { type, severity, title, count, link }', {
      responses: { 200: ok(any) },
    }),
  },
  '/reservations/admin/{id}/confirm': {
    parameters: [path()],
    patch: op(
      'reservations',
      'ยืนยันการจองออนไลน์ (หน้า 4) — ดูรายการรอยืนยัน: GET /reservations/admin?confirmed=false',
      {
        responses: { 200: ok(any), 409: err('ยืนยันแล้ว / สถานะไม่ใช่ booked, playing') },
      },
    ),
  },
  '/shifts': {
    get: op('shifts', 'กะพนักงานของวัน (default วันนี้) หรือ from..to — มี onDuty, onDutyNow', {
      parameters: [q('date', date), q('from', date), q('to', date)],
      responses: { 200: ok(obj({ items: { type: 'array', items: any }, onDutyNow: n })) },
    }),
    post: op('shifts', 'เพิ่มกะ (สิทธิ์ users:edit) — user ต้องเป็นพนักงาน', {
      requestBody: body(
        obj({ user: s, date, start: hhmm, end: hhmm, position: s, zone: s, note: s }),
      ),
      responses: { 201: ok(any, 'created'), 400: err('ไม่ใช่พนักงาน') },
    }),
  },
  '/shifts/{id}': {
    parameters: [path()],
    patch: op('shifts', 'แก้กะ', { requestBody: body(any), responses: { 200: ok(any) } }),
    delete: op('shifts', 'ลบกะ', { responses: { 200: ok(any) } }),
  },
  '/audit': {
    get: op('audit', 'หน้า 9 Activity Timeline', {
      parameters: [
        q('from', date),
        q('to', date),
        q('actor', s),
        q('action', s),
        q('module', s),
        q('q', s),
        q('page', n),
        q('limit', n),
      ],
      responses: { 200: ok(any) },
    }),
  },
  '/audit/summary': {
    get: op('audit', 'สรุปกิจกรรมของวัน: byAction, topActors', {
      parameters: [q('date', date)],
      responses: { 200: ok(any) },
    }),
  },
  '/audit/export.csv': {
    get: op('audit', 'ดาวน์โหลด CSV', {
      parameters: [q('from', date), q('to', date)],
      responses: { 200: { description: 'text/csv' } },
    }),
  },
  '/audit/verify': {
    get: op('audit', 'Integrity Verification Badge — ตรวจ hash chain', {
      responses: {
        200: ok(
          obj({ valid: b, checked: n, brokenAt: { type: 'object', nullable: true }, lastHash: s }),
        ),
      },
    }),
  },
  '/roles': {
    get: op('roles', 'บทบาททั้งหมด + memberCount + catalog (key ของ matrix)', {
      responses: { 200: ok(any) },
    }),
    post: op('roles', 'สร้างบทบาท', {
      requestBody: body(
        obj({ name: s, slug: s, description: s, permissions: { type: 'array', items: perm } }),
      ),
      responses: { 201: ok(any, 'created'), 409: err('ชื่อ/slug ซ้ำ') },
    }),
  },
  '/roles/{id}': {
    parameters: [path()],
    get: op('roles', 'รายละเอียด + สมาชิก', { responses: { 200: ok(any) } }),
    put: op('roles', 'แก้ไข (เปลี่ยน slug → ย้ายสมาชิกตามให้)', {
      requestBody: body(any),
      responses: { 200: ok(any) },
    }),
    delete: op('roles', 'ลบ (system role / มีสมาชิก ลบไม่ได้)', { responses: { 200: ok(any) } }),
  },
  '/roles/{id}/permissions': {
    parameters: [path()],
    put: op('roles', 'บันทึก matrix VIEW / EDIT / DELETE / APPROVE — มีผลทันที', {
      requestBody: body(obj({ permissions: { type: 'array', items: perm } })),
      responses: { 200: ok(any) },
    }),
  },
  '/roles/{id}/members': {
    parameters: [path()],
    post: op('roles', 'เพิ่มสมาชิกเข้าบทบาท', {
      requestBody: body(obj({ userIds: { type: 'array', items: s } })),
      responses: { 200: ok(any), 400: err('เปลี่ยนบทบาทตัวเอง / admin คนสุดท้าย') },
    }),
  },
  '/roles/{id}/members/{userId}': {
    parameters: [path(), path('userId')],
    delete: op('roles', 'ถอดออกจากบทบาท (กลับเป็น user)', { responses: { 200: ok(any) } }),
  },
};
