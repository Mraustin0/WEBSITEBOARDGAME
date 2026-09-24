import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { asyncHandler } from '../../lib/errors.js';
import { loginSchema, registerSchema } from './auth.schema.js';
import * as controller from './auth.controller.js';

const router = Router();

router.post('/register', validate({ body: registerSchema }), asyncHandler(controller.register));
router.post('/login',    validate({ body: loginSchema }),    asyncHandler(controller.login));
router.get('/me',        requireAuth,                        controller.me);

export default router;
