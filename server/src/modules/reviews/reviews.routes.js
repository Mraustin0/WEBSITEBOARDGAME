import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { asyncHandler } from '../../lib/errors.js';
import { gameIdParam, idParam, upsertBody } from './reviews.schema.js';
import * as controller from './reviews.controller.js';

const router = Router();

router.get('/:gameId', validate({ params: gameIdParam }), asyncHandler(controller.listForGame));
router.post('/',       requireAuth, validate({ body: upsertBody }), asyncHandler(controller.upsert));
router.delete('/:id',  requireAuth, validate({ params: idParam }),  asyncHandler(controller.remove));

export default router;
