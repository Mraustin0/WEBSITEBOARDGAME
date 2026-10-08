import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requirePermission } from '../../middleware/auth.js';
import { asyncHandler } from '../../lib/errors.js';
import {
  createUserBody,
  idParam,
  listUsersQuery,
  suspendBody,
  updateRoleBody,
  updateUserBody,
} from './admin.schema.js';
import * as controller from './admin.controller.js';

const router = Router();

router.use(requireAuth, requirePermission('users'));

router.get('/users', validate({ query: listUsersQuery }), asyncHandler(controller.listUsers));
router.get('/users/stats', asyncHandler(controller.userStats));
router.post('/users', validate({ body: createUserBody }), asyncHandler(controller.createUser));
router.patch(
  '/users/:id',
  validate({ params: idParam, body: updateUserBody }),
  asyncHandler(controller.updateUser),
);
router.put(
  '/users/:id/role',
  validate({ params: idParam, body: updateRoleBody }),
  asyncHandler(controller.updateRole),
);
router.patch(
  '/users/:id/suspend',
  validate({ params: idParam, body: suspendBody }),
  asyncHandler(controller.suspend),
);
router.patch(
  '/users/:id/unsuspend',
  validate({ params: idParam }),
  asyncHandler(controller.unsuspend),
);
router.patch(
  '/users/:id/approve',
  requirePermission('users', 'approve'),
  validate({ params: idParam }),
  asyncHandler(controller.approve),
);
router.delete('/users/:id', validate({ params: idParam }), asyncHandler(controller.remove));

export default router;
