import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requirePermission } from '../../middleware/auth.js';
import { asyncHandler } from '../../lib/errors.js';
import { settingsBody } from './settings.schema.js';
import * as controller from './settings.controller.js';

const router = Router();

// public: frontend ใช้แสดงราคา / เวลาเปิด-ปิด
router.get('/', asyncHandler(controller.get));
router.put(
  '/',
  requireAuth,
  requirePermission('settings', 'edit'),
  validate({ body: settingsBody }),
  asyncHandler(controller.update),
);

export default router;
