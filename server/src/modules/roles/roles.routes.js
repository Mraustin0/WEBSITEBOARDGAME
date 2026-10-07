import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { asyncHandler } from '../../lib/errors.js';
import { createBody, idParam, membersBody, permissionsBody, updateBody } from './roles.schema.js';
import * as controller from './roles.controller.js';
import { z } from 'zod';

const router = Router();
router.use(requireAuth, requireRole('admin'));

const userIdParam = z.object({
  id: z.string().regex(/^[a-f0-9]{24}$/i),
  userId: z.string().regex(/^[a-f0-9]{24}$/i),
});

router.get('/', asyncHandler(controller.list));
router.get('/:id', validate({ params: idParam }), asyncHandler(controller.detail));
router.post('/', validate({ body: createBody }), asyncHandler(controller.create));
router.put(
  '/:id',
  validate({ params: idParam, body: updateBody }),
  asyncHandler(controller.update),
);
router.put(
  '/:id/permissions',
  validate({ params: idParam, body: permissionsBody }),
  asyncHandler(controller.setPermissions),
);
router.delete('/:id', validate({ params: idParam }), asyncHandler(controller.remove));
router.post(
  '/:id/members',
  validate({ params: idParam, body: membersBody }),
  asyncHandler(controller.addMembers),
);
router.delete(
  '/:id/members/:userId',
  validate({ params: userIdParam }),
  asyncHandler(controller.removeMember),
);

export default router;
