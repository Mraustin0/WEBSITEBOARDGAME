import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requirePermission } from '../../middleware/auth.js';
import { asyncHandler } from '../../lib/errors.js';
import {
  floorQuery,
  idParam,
  listQuery,
  scheduleQuery,
  statusBody,
  tableBody,
  tableBodyPartial,
} from './tables.schema.js';
import * as controller from './tables.controller.js';

const router = Router();
const admin = [requireAuth, requirePermission('floor')];

router.get('/', validate({ query: listQuery }), asyncHandler(controller.list));
router.get('/floor', validate({ query: floorQuery }), asyncHandler(controller.floor));
router.get(
  '/schedule',
  ...admin,
  validate({ query: scheduleQuery }),
  asyncHandler(controller.schedule),
);
router.get('/:id', validate({ params: idParam }), asyncHandler(controller.detail));

router.post('/', ...admin, validate({ body: tableBody }), asyncHandler(controller.create));
router.put(
  '/:id',
  ...admin,
  validate({ params: idParam, body: tableBodyPartial }),
  asyncHandler(controller.update),
);
router.patch(
  '/:id/status',
  ...admin,
  validate({ params: idParam, body: statusBody }),
  asyncHandler(controller.setStatus),
);
router.delete('/:id', ...admin, validate({ params: idParam }), asyncHandler(controller.remove));

export default router;
