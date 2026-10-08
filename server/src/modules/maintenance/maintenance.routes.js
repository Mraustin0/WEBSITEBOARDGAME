import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requirePermission } from '../../middleware/auth.js';
import { asyncHandler } from '../../lib/errors.js';
import { createBody, idParam, listQuery, updateBody } from './maintenance.schema.js';
import * as controller from './maintenance.controller.js';

const router = Router();
router.use(requireAuth, requirePermission('maintenance'));

router.get('/', validate({ query: listQuery }), asyncHandler(controller.list));
router.get('/summary', asyncHandler(controller.summary));
router.get('/:id', validate({ params: idParam }), asyncHandler(controller.detail));
router.post('/', validate({ body: createBody }), asyncHandler(controller.create));
router.patch(
  '/:id',
  validate({ params: idParam, body: updateBody }),
  asyncHandler(controller.update),
);
router.delete('/:id', validate({ params: idParam }), asyncHandler(controller.remove));

export default router;
