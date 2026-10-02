import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { asyncHandler } from '../../lib/errors.js';
import { idParam, listUsersQuery, updateRoleBody } from './admin.schema.js';
import * as controller from './admin.controller.js';

const router = Router();

router.use(requireAuth, requireRole('admin'));

router.get('/users', validate({ query: listUsersQuery }), asyncHandler(controller.listUsers));
router.put(
  '/users/:id/role',
  validate({ params: idParam, body: updateRoleBody }),
  asyncHandler(controller.updateRole),
);
router.delete('/users/:id', validate({ params: idParam }), asyncHandler(controller.remove));

export default router;
