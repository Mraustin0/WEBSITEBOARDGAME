// OpenAPI spec ของ module คน B (tables, reservations, reviews, stats)
// แยกไฟล์เพื่อลด merge conflict กับ openapi.js — ถูก spread เข้าไปใน openapi.js
const bearer = [{ bearerAuth: [] }];
const ref = (name) => ({ $ref: `#/components/schemas/${name}` });
const json = (schema) => ({ 'application/json': { schema } });
const ok = (schema, description = 'ok') => ({ description, content: json(schema) });
const err = (description) => ({ description, content: json(ref('Error')) });
const idPath = (name = 'id') => ({
  name,
  in: 'path',
  required: true,
  schema: { type: 'string' },
});
const q = (name, schema, description) => ({ name, in: 'query', schema, description });
const date = { type: 'string', example: '2026-10-12', description: 'YYYY-MM-DD (เวลาไทย)' };
const paged = (item) => ({
  type: 'object',
  properties: {
    items: { type: 'array', items: item },
    total: { type: 'integer' },
    page: { type: 'integer' },
    limit: { type: 'integer' },
  },
});

export const bSchemas = {
  Table: {
    type: 'object',
    properties: {
      _id: { type: 'string' },
      code: { type: 'string', example: 'T-01' },
      name: { type: 'string' },
      zone: { type: 'string', example: 'VIP' },
      capacity: { type: 'integer', example: 4 },
      status: { type: 'string', enum: ['active', 'closed'] },
      extraPerHour: { type: 'number', example: 0 },
      shape: { type: 'string', enum: ['rect', 'round'] },
      position: {
        type: 'object',
        description: 'ตำแหน่งบน floor plan เป็น % (0-100)',
        properties: {
          x: { type: 'number' },
          y: { type: 'number' },
          w: { type: 'number' },
          h: { type: 'number' },
        },
      },
      notes: { type: 'string' },
    },
  },
  TableInput: {
    type: 'object',
    required: ['code', 'capacity'],
    properties: {
      code: { type: 'string', example: 'T-01' },
      name: { type: 'string' },
      zone: { type: 'string', example: 'Main' },
      capacity: { type: 'integer', example: 4 },
      status: { type: 'string', enum: ['active', 'closed'] },
      extraPerHour: { type: 'number', example: 0 },
      shape: { type: 'string', enum: ['rect', 'round'] },
      position: {
        type: 'object',
        properties: {
          x: { type: 'number' },
          y: { type: 'number' },
          w: { type: 'number' },
          h: { type: 'number' },
        },
      },
      notes: { type: 'string' },
    },
  },
  FloorTable: {
    allOf: [
      ref('Table'),
      {
        type: 'object',
        properties: {
          state: { type: 'string', enum: ['available', 'reserved', 'occupied', 'closed'] },
          current: { type: 'object', nullable: true, description: 'การเล่นที่กำลังเกิดขึ้น' },
          reservations: { type: 'array', items: { type: 'object' } },
        },
      },
    ],
  },
  Price: {
    type: 'object',
    properties: {
      total: { type: 'number', example: 300 },
      perPersonHour: { type: 'number', example: 50 },
      tableExtraPerHour: { type: 'number', example: 0 },
      players: { type: 'integer' },
      hours: { type: 'number' },
    },
  },
  BookingInput: {
    type: 'object',
    required: ['table', 'players', 'startAt', 'durationHours'],
    properties: {
      table: { type: 'string', description: 'Table _id' },
      game: { type: 'string', nullable: true, description: 'Game _id (optional)' },
      players: { type: 'integer', example: 4 },
      startAt: { type: 'string', format: 'date-time', example: '2026-10-12T13:00:00+07:00' },
      durationHours: { type: 'number', example: 2, description: '1-6 ชม. ทีละ 0.5' },
      package: {
        type: 'string',
        enum: ['hourly', 'flat3h'],
        default: 'hourly',
        description: 'flat3h = เหมา 3 ชม. (durationHours ต้องเป็น 3)',
      },
      note: { type: 'string' },
    },
  },
  AdminBookingInput: {
    type: 'object',
    required: ['table', 'players', 'durationHours'],
    description: 'ต้องมี user (สมาชิก) หรือ customer.name/phone (ลูกค้าไม่มีบัญชี)',
    properties: {
      table: { type: 'string' },
      game: { type: 'string', nullable: true },
      players: {
        type: 'integer',
        example: 4,
        description: 'เกิน capacity ได้ 2 ที่ (เก้าอี้เสริม)',
      },
      startAt: {
        type: 'string',
        format: 'date-time',
        description: 'ไม่ส่ง = เริ่มทันที (walk-in)',
      },
      durationHours: { type: 'number', example: 2 },
      package: { type: 'string', enum: ['hourly', 'flat3h'] },
      user: { type: 'string', description: 'User _id ของสมาชิก (optional)' },
      customer: {
        type: 'object',
        properties: { name: { type: 'string' }, phone: { type: 'string' } },
      },
      note: { type: 'string' },
    },
  },
  Bill: {
    type: 'object',
    properties: {
      startedAt: { type: 'string', format: 'date-time' },
      endedAt: { type: 'string', format: 'date-time' },
      actualMinutes: { type: 'integer' },
      bookedHours: { type: 'number' },
      overtimeHours: { type: 'number' },
      bookedTotal: { type: 'number' },
      overtimeCharge: { type: 'number' },
      total: { type: 'number' },
    },
  },
  Reservation: {
    type: 'object',
    properties: {
      _id: { type: 'string' },
      user: { type: 'object', properties: { username: { type: 'string' } } },
      table: ref('Table'),
      game: { ...ref('Game'), nullable: true },
      players: { type: 'integer' },
      startAt: { type: 'string', format: 'date-time' },
      endAt: { type: 'string', format: 'date-time' },
      durationHours: { type: 'number' },
      price: ref('Price'),
      status: { type: 'string', enum: ['booked', 'playing', 'completed', 'cancelled', 'no_show'] },
      source: { type: 'string', enum: ['online', 'walk_in', 'admin'] },
      customer: {
        type: 'object',
        properties: { name: { type: 'string' }, phone: { type: 'string' } },
      },
      checkout: { type: 'object', description: 'ยอดจริงตอนคืนเกม + สภาพเกม' },
      payment: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['unpaid', 'paid'] },
          method: { type: 'string', enum: ['cash', 'transfer', 'card', 'qr'] },
          amount: { type: 'number' },
          paidAt: { type: 'string', format: 'date-time' },
        },
      },
      note: { type: 'string' },
      startedAt: { type: 'string', format: 'date-time', nullable: true },
      returnedAt: { type: 'string', format: 'date-time', nullable: true },
      cancelledAt: { type: 'string', format: 'date-time', nullable: true },
      cancelReason: { type: 'string' },
      extensions: {
        type: 'array',
        description: 'ประวัติการต่อเวลา (ราคาส่วนที่ต่อรวมอยู่ใน price.total แล้ว)',
        items: {
          type: 'object',
          properties: {
            hours: { type: 'number' },
            charge: { type: 'number' },
            at: { type: 'string', format: 'date-time' },
            by: { type: 'string' },
          },
        },
      },
    },
  },
  Review: {
    type: 'object',
    properties: {
      _id: { type: 'string' },
      user: { type: 'object', properties: { username: { type: 'string' } } },
      game: { type: 'string' },
      rating: { type: 'integer', minimum: 1, maximum: 10 },
      comment: { type: 'string' },
    },
  },
};

const tablesPaths = {
  '/tables': {
    get: {
      tags: ['tables'],
      summary: 'List tables',
      parameters: [q('zone', { type: 'string' }), q('status', { type: 'string' })],
      responses: { 200: ok({ type: 'array', items: ref('Table') }) },
    },
    post: {
      tags: ['tables'],
      summary: 'Create table (admin)',
      security: bearer,
      requestBody: { required: true, content: json(ref('TableInput')) },
      responses: { 201: ok(ref('Table'), 'created'), 409: err('code already exists') },
    },
  },
  '/tables/floor': {
    get: {
      tags: ['tables'],
      summary: 'Interactive floor plan — สถานะโต๊ะในช่วงเวลา (default: ตอนนี้ + 1 ชม.)',
      parameters: [
        q('startAt', { type: 'string', format: 'date-time' }),
        q('durationHours', { type: 'number', default: 1 }),
      ],
      responses: {
        200: ok({
          type: 'object',
          properties: {
            startAt: { type: 'string' },
            endAt: { type: 'string' },
            zones: { type: 'array', items: { type: 'string' } },
            tables: { type: 'array', items: ref('FloorTable') },
          },
        }),
      },
    },
  },
  '/tables/schedule': {
    get: {
      tags: ['tables'],
      summary: 'ตารางเวลาจองโต๊ะของวัน แยกตามโซน (admin)',
      security: bearer,
      parameters: [q('date', date)],
      responses: { 200: { description: 'ok' } },
    },
  },
  '/tables/{id}': {
    parameters: [idPath()],
    get: { tags: ['tables'], summary: 'Table detail', responses: { 200: ok(ref('Table')) } },
    put: {
      tags: ['tables'],
      summary: 'Update table (admin)',
      security: bearer,
      requestBody: { content: json(ref('TableInput')) },
      responses: { 200: ok(ref('Table')) },
    },
    delete: {
      tags: ['tables'],
      summary: 'Delete table (admin) — ห้ามถ้ามีการจองค้าง',
      security: bearer,
      responses: { 200: { description: 'ok' }, 409: err('has active reservations') },
    },
  },
  '/tables/{id}/status': {
    parameters: [idPath()],
    patch: {
      tags: ['tables'],
      summary: 'เปิด/ปิดปรับปรุงโต๊ะ (admin)',
      security: bearer,
      requestBody: {
        required: true,
        content: json({
          type: 'object',
          properties: { status: { type: 'string', enum: ['active', 'closed'] } },
        }),
      },
      responses: { 200: ok(ref('Table')) },
    },
  },
};

const reservationsPaths = {
  '/reservations/rules': {
    get: {
      tags: ['reservations'],
      summary: 'ค่าคงที่ของระบบจอง (ราคา/ชม., จองล่วงหน้าได้กี่วัน ฯลฯ)',
      responses: { 200: { description: 'ok' } },
    },
  },
  '/reservations/availability': {
    get: {
      tags: ['reservations'],
      summary: 'เลือกช่วงเวลา → ดูโต๊ะและเกมที่ว่าง',
      parameters: [
        { ...q('startAt', { type: 'string', format: 'date-time' }), required: true },
        q('durationHours', { type: 'number', default: 1 }),
        q('players', { type: 'integer' }),
      ],
      responses: {
        200: ok({
          type: 'object',
          properties: {
            bookable: { type: 'boolean' },
            reason: { type: 'string', nullable: true },
            tables: { type: 'array', items: { type: 'object' } },
            games: {
              type: 'array',
              description:
                'เกมทั้งหมด + available/reason + copies/copiesLeft + bggAverage, bggWeight, categories และ inUseAt = โต๊ะที่ใช้เกมนี้ในช่วงนั้น',
              items: {
                type: 'object',
                properties: {
                  copies: {
                    type: 'integer',
                    example: 3,
                    description: 'จำนวนกล่องทั้งหมด (ไม่มี = 1)',
                  },
                  copiesLeft: {
                    type: 'integer',
                    example: 1,
                    description: 'กล่องที่ยังว่างตลอดช่วงเวลานั้น (0 = reason booked)',
                  },
                  available: { type: 'boolean' },
                  reason: {
                    type: 'string',
                    nullable: true,
                    enum: ['booked', 'maintenance', 'player_count', null],
                  },
                  inUseAt: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        table: { type: 'string', example: 'A1' },
                        status: { type: 'string', enum: ['booked', 'playing'] },
                        startAt: { type: 'string', format: 'date-time' },
                        endAt: { type: 'string', format: 'date-time' },
                      },
                    },
                  },
                },
              },
            },
          },
        }),
      },
    },
  },
  '/reservations/quote': {
    post: {
      tags: ['reservations'],
      summary: 'คำนวณราคา + ตรวจว่าจองได้ (ยังไม่บันทึก)',
      security: bearer,
      requestBody: { required: true, content: json(ref('BookingInput')) },
      responses: {
        200: ok({ type: 'object', properties: { price: ref('Price') } }),
        400: err('invalid'),
        409: err('conflict'),
      },
    },
  },
  '/reservations': {
    get: {
      tags: ['reservations'],
      summary: 'การจองของฉัน',
      security: bearer,
      parameters: [
        q(
          'scope',
          { type: 'string', enum: ['active', 'upcoming', 'past', 'all'], default: 'all' },
          'active=กำลังเล่น, upcoming=ล่วงหน้า, past=จบ/ยกเลิก',
        ),
        q('q', { type: 'string' }, 'ค้นรหัส/ชื่อ/โซนโต๊ะ หรือชื่อเกม'),
        q('page', { type: 'integer', default: 1 }),
        q('limit', { type: 'integer', default: 20 }),
      ],
      responses: {
        200: ok({
          allOf: [
            paged(ref('Reservation')),
            {
              type: 'object',
              properties: {
                counts: {
                  type: 'object',
                  description: 'ตัวเลขบนแท็บ (นับตาม q เดียวกัน)',
                  properties: {
                    active: { type: 'integer' },
                    upcoming: { type: 'integer' },
                    past: { type: 'integer' },
                  },
                },
              },
            },
          ],
        }),
      },
    },
    post: {
      tags: ['reservations'],
      summary: 'ยืนยันการจองโต๊ะ (+ผูกเกม)',
      security: bearer,
      requestBody: { required: true, content: json(ref('BookingInput')) },
      responses: {
        201: ok(ref('Reservation'), 'created'),
        400: err('นอกช่วงเวลา / เกินความจุ / จำนวนผู้เล่นไม่ตรงเกม'),
        409: err('โต๊ะหรือเกมถูกจองแล้ว / โต๊ะปิด / เกม maintenance'),
      },
    },
  },
  '/reservations/{id}': {
    parameters: [idPath()],
    get: {
      tags: ['reservations'],
      summary: 'รายละเอียด (เจ้าของ หรือ admin)',
      security: bearer,
      responses: { 200: ok(ref('Reservation')), 404: err('not found') },
    },
    put: {
      tags: ['reservations'],
      summary: 'แก้ไขการจอง (เฉพาะสถานะ booked)',
      security: bearer,
      requestBody: { content: json(ref('BookingInput')) },
      responses: { 200: ok(ref('Reservation')), 409: err('conflict') },
    },
  },
  '/reservations/{id}/cancel': {
    parameters: [idPath()],
    patch: {
      tags: ['reservations'],
      summary:
        'ยกเลิก (สมาชิก: เฉพาะ booked และก่อนเริ่มอย่างน้อย booking.cancelCutoffHours = 2 ชม., admin: booked/playing ได้ตลอด)',
      security: bearer,
      requestBody: {
        content: json({ type: 'object', properties: { reason: { type: 'string' } } }),
      },
      responses: {
        200: ok(ref('Reservation')),
        409: err('cannot cancel / can cancel at most 2 hours before start'),
      },
    },
  },
  '/reservations/{id}/extend': {
    parameters: [idPath()],
    patch: {
      tags: ['reservations'],
      summary: 'ขอต่อเวลา (booked/playing) — คิดเพิ่มตามอัตราตอนจอง, ต้องไม่ชนคิวถัดไป',
      description:
        'สมาชิก: รวมแล้วไม่เกิน MAX_HOURS และอยู่ในเวลาทำการ (ถ้าเปิด enforce). admin ข้ามข้อจำกัดนี้ได้',
      security: bearer,
      requestBody: {
        required: true,
        content: json({
          type: 'object',
          required: ['hours'],
          properties: { hours: { type: 'number', example: 1, description: 'ทีละ 0.5 ชม.' } },
        }),
      },
      responses: {
        200: ok(ref('Reservation')),
        400: err('เกินจำนวนชั่วโมงสูงสุด / นอกเวลาทำการ / hours ไม่ถูกต้อง'),
        409: err('โต๊ะ/เกม/ผู้ใช้ มีคิวต่อ หรือสถานะไม่ใช่ booked/playing'),
      },
    },
  },
  '/reservations/{id}/return': {
    parameters: [idPath()],
    patch: {
      tags: ['reservations'],
      summary: 'เล่นเสร็จแล้ว / คืนเกม (เช็คบิล) → completed',
      description:
        'condition=damaged → เกมเป็น maintenance, admin ส่ง paymentMethod = รับเงินพร้อมปิดบิล',
      security: bearer,
      requestBody: {
        content: json({
          type: 'object',
          properties: {
            condition: { type: 'string', enum: ['good', 'damaged'], default: 'good' },
            damageNote: { type: 'string' },
            paymentMethod: { type: 'string', enum: ['cash', 'transfer', 'card', 'qr'] },
          },
        }),
      },
      responses: { 200: ok(ref('Reservation')), 409: err('not playing') },
    },
  },
  '/reservations/{id}/checkout': {
    parameters: [idPath()],
    get: {
      tags: ['reservations'],
      summary: 'ดูยอดก่อนเช็คบิล (เวลาเล่นจริง + ค่าเกินเวลา)',
      security: bearer,
      responses: {
        200: ok({
          type: 'object',
          properties: { reservation: ref('Reservation'), bill: ref('Bill') },
        }),
      },
    },
  },
  '/reservations/{id}/game': {
    parameters: [idPath()],
    patch: {
      tags: ['reservations'],
      summary: 'เลือก/เปลี่ยนเกม (ได้ทั้งก่อนเริ่มและระหว่างเล่น)',
      security: bearer,
      requestBody: {
        required: true,
        content: json({
          type: 'object',
          properties: { game: { type: 'string', nullable: true } },
        }),
      },
      responses: { 200: ok(ref('Reservation')), 409: err('game busy') },
    },
  },
  '/reservations/admin': {
    post: {
      tags: ['reservations'],
      summary: 'เปิดโต๊ะ walk-in / เพิ่มการจองแทนลูกค้า (admin)',
      security: bearer,
      requestBody: { required: true, content: json(ref('AdminBookingInput')) },
      responses: { 201: ok(ref('Reservation'), 'created'), 409: err('conflict') },
    },
    get: {
      tags: ['reservations'],
      summary: 'การจองทั้งหมด (admin) — กรองตามวัน/สถานะ/โต๊ะ',
      security: bearer,
      parameters: [
        q('date', date),
        q('from', date, 'ใช้คู่กับ to สำหรับดูรายสัปดาห์/เดือน'),
        q('to', date),
        q('status', {
          type: 'string',
          enum: ['booked', 'playing', 'completed', 'cancelled', 'no_show'],
        }),
        q('table', { type: 'string' }),
        q('zone', { type: 'string' }),
        q('user', { type: 'string' }),
        q('game', { type: 'string' }),
        q('source', { type: 'string', enum: ['online', 'walk_in', 'admin'] }),
        q('payment', { type: 'string', enum: ['unpaid', 'paid'] }),
        q('q', { type: 'string' }, 'ค้นชื่อ/เบอร์ลูกค้า หรือ username/email สมาชิก'),
        q('page', { type: 'integer', default: 1 }),
        q('limit', { type: 'integer', default: 20 }),
      ],
      responses: { 200: ok(paged(ref('Reservation'))) },
    },
  },
  '/reservations/admin/{id}/pay': {
    parameters: [idPath()],
    patch: {
      tags: ['reservations'],
      summary: 'รับชำระเงิน (admin) — หลังคืนเกมแล้ว',
      security: bearer,
      requestBody: {
        required: true,
        content: json({
          type: 'object',
          properties: { method: { type: 'string', enum: ['cash', 'transfer', 'card', 'qr'] } },
        }),
      },
      responses: { 200: ok(ref('Reservation')), 409: err('already paid / not checked out') },
    },
  },
  '/reservations/admin/{id}': {
    parameters: [idPath()],
    delete: {
      tags: ['reservations'],
      summary: 'ลบรายการจอง (admin)',
      security: bearer,
      responses: { 200: { description: 'ok' } },
    },
  },
};

const reviewsPaths = {
  '/reviews': {
    get: {
      tags: ['reviews'],
      summary: 'รีวิวทั้งหมด (admin) — กรองตามเกม / คะแนนต่ำ',
      security: bearer,
      parameters: [
        q('game', { type: 'string' }),
        q('maxRating', { type: 'integer' }),
        q('page', { type: 'integer', default: 1 }),
        q('limit', { type: 'integer', default: 20 }),
      ],
      responses: { 200: ok(paged(ref('Review'))) },
    },
    post: {
      tags: ['reviews'],
      summary: 'เขียน/แก้รีวิวของฉัน (1 คนต่อ 1 เกม)',
      security: bearer,
      requestBody: {
        required: true,
        content: json({
          type: 'object',
          required: ['game', 'rating'],
          properties: {
            game: { type: 'string' },
            rating: { type: 'integer', minimum: 1, maximum: 10 },
            comment: { type: 'string' },
          },
        }),
      },
      responses: { 201: ok(ref('Review'), 'saved'), 404: err('game not found') },
    },
  },
  '/reviews/{gameId}': {
    parameters: [idPath('gameId')],
    get: {
      tags: ['reviews'],
      summary: 'รีวิวทั้งหมดของเกม',
      responses: { 200: ok({ type: 'array', items: ref('Review') }) },
    },
  },
  '/reviews/my': {
    get: {
      tags: ['reviews'],
      summary: 'รีวิวของฉัน',
      security: bearer,
      responses: { 200: ok({ type: 'array', items: ref('Review') }) },
    },
  },
  '/reviews/{gameId}/summary': {
    parameters: [idPath('gameId')],
    get: {
      tags: ['reviews'],
      summary: 'คะแนนเฉลี่ย + จำนวน + distribution',
      responses: {
        200: ok({
          type: 'object',
          properties: {
            average: { type: 'number', nullable: true },
            count: { type: 'integer' },
            distribution: { type: 'object', additionalProperties: { type: 'integer' } },
          },
        }),
      },
    },
  },
  '/reviews/{id}': {
    parameters: [idPath()],
    delete: {
      tags: ['reviews'],
      summary: 'ลบรีวิว (เจ้าของ หรือ admin)',
      security: bearer,
      responses: { 200: { description: 'ok' } },
    },
  },
};

const statsPaths = {
  '/stats/popular-games': {
    get: {
      tags: ['stats'],
      summary: 'เกมที่ถูกจองบ่อยสุด + คะแนนเฉลี่ย (public)',
      parameters: [q('from', date), q('to', date), q('limit', { type: 'integer', default: 10 })],
      responses: { 200: { description: 'ok' } },
    },
  },
  '/stats/me': {
    get: {
      tags: ['stats'],
      summary: 'สถิติส่วนตัว (จำนวนครั้ง, ชั่วโมง, ยอดใช้จ่าย, เกมโปรด, การจองถัดไป)',
      security: bearer,
      responses: { 200: { description: 'ok' } },
    },
  },
  '/stats/overview': {
    get: {
      tags: ['stats'],
      summary: 'Admin dashboard ของวัน',
      security: bearer,
      parameters: [q('date', date)],
      responses: { 200: { description: 'ok' } },
    },
  },
  '/stats/daily': {
    get: {
      tags: ['stats'],
      summary: 'กราฟรายวัน: การจอง/รายได้ (default 7 วันล่าสุด)',
      security: bearer,
      parameters: [q('from', date), q('to', date)],
      responses: { 200: { description: 'ok' } },
    },
  },
  '/stats/hourly': {
    get: {
      tags: ['stats'],
      summary: 'ช่วงเวลาที่มีคนจองเยอะ (0-23 น.)',
      security: bearer,
      parameters: [q('from', date), q('to', date)],
      responses: { 200: { description: 'ok' } },
    },
  },
  '/stats/tables': {
    get: {
      tags: ['stats'],
      summary: 'การใช้งานแต่ละโต๊ะ',
      security: bearer,
      parameters: [q('from', date), q('to', date)],
      responses: { 200: { description: 'ok' } },
    },
  },
};

const settingsPaths = {
  '/settings': {
    get: {
      tags: ['settings'],
      summary: 'การตั้งค่าร้าน (public): ราคา, กฎการจอง, เวลาทำการ, no-show',
      responses: { 200: { description: 'ok' } },
    },
    put: {
      tags: ['settings'],
      summary: 'แก้การตั้งค่าร้าน (admin) — ส่งเฉพาะส่วนที่แก้',
      security: bearer,
      requestBody: {
        required: true,
        content: json({
          type: 'object',
          example: {
            pricing: { perPersonHour: 60, flat3hPerPerson: 150, revenueTargetPerDay: 5000 },
            booking: {
              maxAdvanceDays: 3,
              minHours: 1,
              maxHours: 6,
              overtimeGraceMin: 10,
              cancelCutoffHours: 2,
            },
            operatingHours: {
              enforce: true,
              days: [{ day: 0, open: '10:00', close: '24:00', closed: false }],
            },
            noShow: { graceMin: 30, suspendAfter: 3 },
          },
        }),
      },
      responses: { 200: { description: 'ok' }, 400: err('invalid') },
    },
  },
};

const ticket = {
  type: 'object',
  properties: {
    _id: { type: 'string' },
    itemType: { type: 'string', enum: ['game', 'table'] },
    game: { type: 'object', nullable: true },
    table: { type: 'object', nullable: true },
    title: { type: 'string' },
    description: { type: 'string' },
    priority: { type: 'string', enum: ['low', 'medium', 'high'] },
    status: { type: 'string', enum: ['pending', 'in_progress', 'resolved'] },
    cost: { type: 'number' },
    resolution: { type: 'string' },
    reportedBy: { type: 'object' },
    resolvedAt: { type: 'string', format: 'date-time', nullable: true },
  },
};

const assist = {
  type: 'object',
  properties: {
    _id: { type: 'string' },
    reservation: { type: 'object' },
    table: { type: 'object', properties: { code: { type: 'string' }, zone: { type: 'string' } } },
    user: { type: 'object', properties: { username: { type: 'string' } } },
    topic: { type: 'string', enum: ['tutorial', 'extension', 'game_issue', 'other'] },
    note: { type: 'string' },
    status: { type: 'string', enum: ['open', 'acknowledged', 'resolved', 'cancelled'] },
    acknowledgedAt: { type: 'string', format: 'date-time' },
    resolvedAt: { type: 'string', format: 'date-time' },
    resolution: { type: 'string' },
    createdAt: { type: 'string', format: 'date-time' },
  },
};

const assistPaths = {
  '/assist': {
    post: {
      tags: ['assist'],
      summary: 'เรียกพนักงาน / GM จากโต๊ะที่กำลังเล่น (เจ้าของการจองเท่านั้น)',
      security: bearer,
      requestBody: {
        required: true,
        content: json({
          type: 'object',
          required: ['reservation', 'topic'],
          properties: {
            reservation: { type: 'string' },
            topic: { type: 'string', enum: ['tutorial', 'extension', 'game_issue', 'other'] },
            note: { type: 'string', example: 'สอนกติกาช่วงจบเทิร์นหน่อย' },
          },
        }),
      },
      responses: {
        201: ok(assist, 'created'),
        404: err('ไม่พบการจอง / ไม่ใช่ของเรา'),
        409: err('ยังไม่ได้เริ่มเล่น / เรียกหัวข้อนี้ไปแล้วรอพนักงาน'),
      },
    },
    get: {
      tags: ['assist'],
      summary: 'คิวคำขอ (admin) — default active = open + acknowledged เรียงเก่าสุดก่อน',
      security: bearer,
      parameters: [
        q('status', {
          type: 'string',
          enum: ['active', 'open', 'acknowledged', 'resolved', 'cancelled'],
          default: 'active',
        }),
        q('topic', { type: 'string', enum: ['tutorial', 'extension', 'game_issue', 'other'] }),
        q('table', { type: 'string' }),
        q('page', { type: 'integer', default: 1 }),
        q('limit', { type: 'integer', default: 50 }),
      ],
      responses: {
        200: ok({
          allOf: [
            paged(assist),
            {
              type: 'object',
              properties: {
                counts: {
                  type: 'object',
                  properties: { open: { type: 'integer' }, acknowledged: { type: 'integer' } },
                },
              },
            },
          ],
        }),
      },
    },
  },
  '/assist/my': {
    get: {
      tags: ['assist'],
      summary: 'คำขอของฉัน (ใช้แสดง "พนักงานรับเรื่องแล้ว" บนการ์ด)',
      security: bearer,
      parameters: [q('reservation', { type: 'string' })],
      responses: { 200: ok({ type: 'array', items: assist }) },
    },
  },
  '/assist/{id}/cancel': {
    parameters: [idPath()],
    patch: {
      tags: ['assist'],
      summary: 'สมาชิกยกเลิกคำขอที่ยังไม่เสร็จ',
      security: bearer,
      responses: { 200: ok(assist), 409: err('เสร็จ/ยกเลิกไปแล้ว') },
    },
  },
  '/assist/{id}': {
    parameters: [idPath()],
    patch: {
      tags: ['assist'],
      summary: 'admin รับเรื่อง (acknowledged) / เสร็จแล้ว (resolved)',
      security: bearer,
      requestBody: {
        required: true,
        content: json({
          type: 'object',
          required: ['status'],
          properties: {
            status: { type: 'string', enum: ['acknowledged', 'resolved'] },
            resolution: { type: 'string' },
          },
        }),
      },
      responses: { 200: ok(assist), 409: err('สถานะไม่ถูกต้อง') },
    },
  },
};

const maintenancePaths = {
  '/maintenance': {
    get: {
      tags: ['maintenance'],
      summary: 'รายการแจ้งซ่อม (admin) — Kanban / ประวัติ (status=resolved)',
      security: bearer,
      parameters: [
        q('status', { type: 'string', enum: ['pending', 'in_progress', 'resolved'] }),
        q('itemType', { type: 'string', enum: ['game', 'table'] }),
        q('game', { type: 'string' }),
        q('table', { type: 'string' }),
        q('priority', { type: 'string', enum: ['low', 'medium', 'high'] }),
      ],
      responses: { 200: ok(paged(ticket)) },
    },
    post: {
      tags: ['maintenance'],
      summary: 'แจ้งปัญหาใหม่ — เกมจะเป็น maintenance / โต๊ะจะถูกปิด',
      security: bearer,
      requestBody: {
        required: true,
        content: json({
          type: 'object',
          required: ['itemType', 'title'],
          properties: {
            itemType: { type: 'string', enum: ['game', 'table'] },
            game: { type: 'string' },
            table: { type: 'string' },
            title: { type: 'string' },
            description: { type: 'string' },
            priority: { type: 'string', enum: ['low', 'medium', 'high'] },
            cost: { type: 'number' },
          },
        }),
      },
      responses: { 201: ok(ticket, 'created') },
    },
  },
  '/maintenance/summary': {
    get: {
      tags: ['maintenance'],
      summary: 'ตัวเลขสรุป pending / in_progress / resolved + ค่าซ่อมรวม',
      security: bearer,
      responses: { 200: { description: 'ok' } },
    },
  },
  '/maintenance/{id}': {
    parameters: [idPath()],
    get: {
      tags: ['maintenance'],
      summary: 'รายละเอียด',
      security: bearer,
      responses: { 200: ok(ticket) },
    },
    patch: {
      tags: ['maintenance'],
      summary: 'อัปเดต (ย้ายคอลัมน์ Kanban) — resolved = เปิดใช้งานของคืนอัตโนมัติ',
      security: bearer,
      requestBody: {
        content: json({
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['pending', 'in_progress', 'resolved'] },
            priority: { type: 'string' },
            cost: { type: 'number' },
            resolution: { type: 'string' },
          },
        }),
      },
      responses: { 200: ok(ticket) },
    },
    delete: {
      tags: ['maintenance'],
      summary: 'ลบใบแจ้งซ่อม',
      security: bearer,
      responses: { 200: { description: 'ok' } },
    },
  },
};

const moreStatsPaths = {
  '/stats/report': {
    get: {
      tags: ['stats'],
      summary: 'รายงาน: KPI + % เทียบช่วงก่อนหน้า, กราฟรายได้, สัดส่วนหมวดหมู่, เกมยอดนิยม',
      security: bearer,
      parameters: [q('from', date), q('to', date)],
      responses: { 200: { description: 'ok' } },
    },
  },
  '/stats/heatmap': {
    get: {
      tags: ['stats'],
      summary: 'Peak hours heatmap: matrix[วัน 0-6][ชั่วโมง 0-23]',
      security: bearer,
      parameters: [q('from', date), q('to', date)],
      responses: { 200: { description: 'ok' } },
    },
  },
  '/stats/export.csv': {
    get: {
      tags: ['stats'],
      summary: 'ดาวน์โหลดการจองในช่วงวันเป็น CSV',
      security: bearer,
      parameters: [q('from', date), q('to', date)],
      responses: { 200: { description: 'text/csv' } },
    },
  },
  '/stats/members/{userId}': {
    parameters: [idPath('userId')],
    get: {
      tags: ['stats'],
      summary: 'รายละเอียดสมาชิก (admin): ยอดใช้จ่าย, จำนวนครั้ง, ชั่วโมง, no-show, ของโปรด',
      security: bearer,
      responses: { 200: { description: 'ok' } },
    },
  },
  '/stats/games/{gameId}': {
    parameters: [idPath('gameId')],
    get: {
      tags: ['stats'],
      summary: 'สถิติเกม (admin): จำนวนรอบ, คะแนน, ประวัติชำรุด/ซ่อม, รอบล่าสุด',
      security: bearer,
      responses: { 200: { description: 'ok' } },
    },
  },
  '/reservations/admin/{id}/no-show': {
    parameters: [idPath()],
    patch: {
      tags: ['reservations'],
      summary: 'ลูกค้าไม่มา (admin) → no_show, ปล่อยโต๊ะ/เกมคืน',
      security: bearer,
      responses: { 200: ok(ref('Reservation')), 409: err('not booked/playing') },
    },
  },
};

export const bPaths = {
  ...tablesPaths,
  ...reservationsPaths,
  ...reviewsPaths,
  ...statsPaths,
  ...moreStatsPaths,
  ...settingsPaths,
  ...maintenancePaths,
  ...assistPaths,
};
