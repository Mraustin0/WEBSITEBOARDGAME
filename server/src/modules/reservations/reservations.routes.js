import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { asyncHandler } from '../../lib/errors.js';
import {
  adminListQuery,
  availabilityQuery,
  bookingBody,
  cancelBody,
  idParam,
  listQuery,
  updateBody,
} from './reservations.schema.js';
import * as controller from './reservations.controller.js';

const router = Router();
const admin = [requireAuth, requireRole('admin')];

// public
router.get('/rules', controller.rules);
router.get(
  '/availability',
  validate({ query: availabilityQuery }),
  asyncHandler(controller.availability),
);

// admin (ต้องมาก่อน /:id)
router.get(
  '/admin',
  ...admin,
  validate({ query: adminListQuery }),
  asyncHandler(controller.adminList),
);
router.delete(
  '/admin/:id',
  ...admin,
  validate({ params: idParam }),
  asyncHandler(controller.adminRemove),
);

// member
router.use(requireAuth);
router.post('/quote', validate({ body: bookingBody }), asyncHandler(controller.quote));
router.post('/', validate({ body: bookingBody }), asyncHandler(controller.create));
router.get('/', validate({ query: listQuery }), asyncHandler(controller.listMine));
router.get('/:id', validate({ params: idParam }), asyncHandler(controller.detail));
router.put(
  '/:id',
  validate({ params: idParam, body: updateBody }),
  asyncHandler(controller.update),
);
router.patch(
  '/:id/cancel',
  validate({ params: idParam, body: cancelBody }),
  asyncHandler(controller.cancel),
);
router.patch('/:id/return', validate({ params: idParam }), asyncHandler(controller.returnGame));

export default router;
