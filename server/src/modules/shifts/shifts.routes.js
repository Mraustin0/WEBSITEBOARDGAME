import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requirePermission } from '../../middleware/auth.js';
import { asyncHandler } from '../../lib/errors.js';
import { createBody, idParam, listQuery, updateBody } from './shifts.schema.js';
import * as controller from './shifts.controller.js';

// กะพนักงาน — พนักงานหน้าร้านดูได้, จัดกะต้องมีสิทธิ์จัดการผู้ใช้
const router = Router();
router.use(requireAuth);

router.get(
  '/',
  requirePermission('floor', 'view'),
  validate({ query: listQuery }),
  asyncHandler(controller.list),
);
router.post(
  '/',
  requirePermission('users', 'edit'),
  validate({ body: createBody }),
  asyncHandler(controller.create),
);
router.patch(
  '/:id',
  requirePermission('users', 'edit'),
  validate({ params: idParam, body: updateBody }),
  asyncHandler(controller.update),
);
router.delete(
  '/:id',
  requirePermission('users', 'del'),
  validate({ params: idParam }),
  asyncHandler(controller.remove),
);

export default router;
