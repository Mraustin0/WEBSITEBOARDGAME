import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { asyncHandler } from '../../lib/errors.js';
import { addBody, idParam } from './collection.schema.js';
import * as controller from './collection.controller.js';

const router = Router();
router.use(requireAuth);

router.get('/', asyncHandler(controller.list));
router.post('/', validate({ body: addBody }), asyncHandler(controller.add));
router.delete('/:id', validate({ params: idParam }), asyncHandler(controller.remove));

export default router;
