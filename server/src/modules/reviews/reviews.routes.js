import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requirePermission } from '../../middleware/auth.js';
import { asyncHandler } from '../../lib/errors.js';
import { adminListQuery, gameIdParam, idParam, upsertBody } from './reviews.schema.js';
import * as controller from './reviews.controller.js';

const router = Router();

// static paths ก่อน /:gameId
router.get('/my', requireAuth, asyncHandler(controller.listMine));
router.get(
  '/',
  requireAuth,
  requirePermission('inventory', 'view'),
  validate({ query: adminListQuery }),
  asyncHandler(controller.adminList),
);

router.get('/:gameId', validate({ params: gameIdParam }), asyncHandler(controller.listForGame));
router.get('/:gameId/summary', validate({ params: gameIdParam }), asyncHandler(controller.summary));
router.post('/', requireAuth, validate({ body: upsertBody }), asyncHandler(controller.upsert));
router.delete('/:id', requireAuth, validate({ params: idParam }), asyncHandler(controller.remove));

export default router;
