import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../lib/errors.js';
import { bggIdParam, searchQuery } from './bgg.schema.js';
import * as controller from './bgg.controller.js';

const router = Router();

router.get('/search',      validate({ query: searchQuery }),  asyncHandler(controller.search));
router.get('/game/:bggId', validate({ params: bggIdParam }), asyncHandler(controller.detail));

export default router;
