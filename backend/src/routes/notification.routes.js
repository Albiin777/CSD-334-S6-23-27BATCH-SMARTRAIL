import express from 'express';
import { 
    getUserNotifications, 
    markAsRead, 
    markAllAsRead, 
    createAdminBroadcast 
} from '../controllers/notification.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = express.Router();

// All routes require the user to be logged in
router.use(authenticateToken);

router.get('/', getUserNotifications);
router.put('/read-all', markAllAsRead);
router.put('/:id/read', markAsRead);

// Admin route (Ideally protected by an admin middleware, but using protect for now)
router.post('/broadcast', createAdminBroadcast);

export default router;
