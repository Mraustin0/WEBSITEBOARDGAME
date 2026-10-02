import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { asyncHandler } from '../../lib/errors.js';
import { createBody, idParam, listQuery, myQuery, updateBody } from './assist.schema.js';
import * as controller from './assist.controller.js';

// เรียกพนักงาน / Game Master จากโต๊ะที่กำลังเล่น
const router = Router();
const admin = requireRole('admin');
router.use(requireAuth);

// member
router.post('/', validate({ body: createBody }), asyncHandler(controller.create));
router.get('/my', validate({ query: myQuery }), asyncHandler(controller.listMine));
router.patch('/:id/cancel', validate({ params: idParam }), asyncHandler(controller.cancel));

// admin
router.get('/', admin, validate({ query: listQuery }), asyncHandler(controller.list));
router.patch(
  '/:id',
  admin,
  validate({ params: idParam, body: updateBody }),
  asyncHandler(controller.update),
);

export default router;
