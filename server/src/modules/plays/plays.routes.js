import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { asyncHandler } from '../../lib/errors.js';
import { createBody, idParam, updateBody } from './plays.schema.js';
import * as controller from './plays.controller.js';

const router = Router();
router.use(requireAuth);

router.get('/', asyncHandler(controller.list));
router.post('/', validate({ body: createBody }), asyncHandler(controller.create));
router.put(
  '/:id',
  validate({ params: idParam, body: updateBody }),
  asyncHandler(controller.update),
);
router.delete('/:id', validate({ params: idParam }), asyncHandler(controller.remove));

export default router;
