import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requirePermission } from '../../middleware/auth.js';
import { asyncHandler } from '../../lib/errors.js';
import { dayQuery, exportQuery, listQuery } from './audit.schema.js';
import * as controller from './audit.controller.js';

const router = Router();
router.use(requireAuth, requirePermission('audit'));

router.get('/', validate({ query: listQuery }), asyncHandler(controller.list));
router.get('/summary', validate({ query: dayQuery }), asyncHandler(controller.summary));
router.get('/verify', asyncHandler(controller.verify));
router.get('/export.csv', validate({ query: exportQuery }), asyncHandler(controller.exportCsv));

export default router;
