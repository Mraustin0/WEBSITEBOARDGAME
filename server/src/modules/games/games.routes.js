import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { asyncHandler } from '../../lib/errors.js';
import { gameBody, gameBodyPartial, idParam, listQuery } from './games.schema.js';
import * as controller from './games.controller.js';

const router = Router();

router.get('/', validate({ query: listQuery }), asyncHandler(controller.list));
router.get('/:id', validate({ params: idParam }), asyncHandler(controller.detail));
router.post(
  '/',
  requireAuth,
  requireRole('admin'),
  validate({ body: gameBody }),
  asyncHandler(controller.create),
);
router.put(
  '/:id',
  requireAuth,
  requireRole('admin'),
  validate({ params: idParam, body: gameBodyPartial }),
  asyncHandler(controller.update),
);
router.delete(
  '/:id',
  requireAuth,
  requireRole('admin'),
  validate({ params: idParam }),
  asyncHandler(controller.remove),
);

export default router;
