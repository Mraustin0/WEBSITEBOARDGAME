import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { asyncHandler } from '../../lib/errors.js';
import { dayQuery, popularQuery, rangeQuery } from './stats.schema.js';
import * as controller from './stats.controller.js';

const router = Router();
const admin = [requireAuth, requireRole('admin')];

router.get(
  '/popular-games',
  validate({ query: popularQuery }),
  asyncHandler(controller.popularGames),
);
router.get('/me', requireAuth, asyncHandler(controller.mine));

router.get('/overview', ...admin, validate({ query: dayQuery }), asyncHandler(controller.overview));
router.get('/daily', ...admin, validate({ query: rangeQuery }), asyncHandler(controller.daily));
router.get('/hourly', ...admin, validate({ query: rangeQuery }), asyncHandler(controller.hourly));
router.get(
  '/tables',
  ...admin,
  validate({ query: rangeQuery }),
  asyncHandler(controller.tablesUsage),
);

export default router;
