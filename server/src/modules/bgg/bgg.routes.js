import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../lib/errors.js';
import { requireAuth, requirePermission } from '../../middleware/auth.js';
import { bggIdParam, importBody, searchQuery } from './bgg.schema.js';
import * as controller from './bgg.controller.js';

const router = Router();

router.get('/hot', asyncHandler(controller.hot));
router.get('/search', validate({ query: searchQuery }), asyncHandler(controller.search));
router.get('/game/:bggId', validate({ params: bggIdParam }), asyncHandler(controller.detail));

// นำเข้าเกมจาก BGG ลงคลัง (สร้างใหม่ หรืออัปเดตรูป/เรตติ้ง/หมวดของเกมที่มี bggId นี้อยู่แล้ว)
router.post(
  '/import/:bggId',
  requireAuth,
  requirePermission('inventory', 'edit'),
  validate({ params: bggIdParam, body: importBody }),
  asyncHandler(controller.importGame),
);

export default router;
