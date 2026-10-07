import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { asyncHandler } from '../../lib/errors.js';
import { copiesBody, gameBody, gameBodyPartial, idParam, listQuery } from './games.schema.js';
import * as controller from './games.controller.js';

const router = Router();
const admin = [requireAuth, requireRole('admin')];

router.get('/', validate({ query: listQuery }), asyncHandler(controller.list));
router.get('/stats', ...admin, asyncHandler(controller.inventoryStats));
router.get(
  '/export.csv',
  ...admin,
  validate({ query: listQuery }),
  asyncHandler(controller.exportCsv),
);
router.get('/:id', validate({ params: idParam }), asyncHandler(controller.detail));
router.post('/', ...admin, validate({ body: gameBody }), asyncHandler(controller.create));
router.put(
  '/:id',
  ...admin,
  validate({ params: idParam, body: gameBodyPartial }),
  asyncHandler(controller.update),
);
router.patch(
  '/:id/copies',
  ...admin,
  validate({ params: idParam, body: copiesBody }),
  asyncHandler(controller.updateCopies),
);
router.delete('/:id', ...admin, validate({ params: idParam }), asyncHandler(controller.remove));

export default router;
