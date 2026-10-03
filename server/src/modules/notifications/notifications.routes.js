import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { asyncHandler } from '../../lib/errors.js';
import { idParam, listQuery, prefsBody } from './notifications.schema.js';
import * as controller from './notifications.controller.js';

// ศูนย์การแจ้งเตือนของพนักงาน/แอดมิน
const router = Router();
router.use(requireAuth, requireRole('admin'));

router.get('/', validate({ query: listQuery }), asyncHandler(controller.list));
router.get('/unread-count', asyncHandler(controller.unreadCount));
router.patch('/read-all', asyncHandler(controller.markAllRead));
router.get('/preferences', asyncHandler(controller.getPrefs));
router.put('/preferences', validate({ body: prefsBody }), asyncHandler(controller.setPrefs));
router.patch('/:id/read', validate({ params: idParam }), asyncHandler(controller.markRead));

export default router;
