import express from 'express';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import { getUserProfile, updateEmail, updatePhone } from '../controllers/profile.controller.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/', getUserProfile);
router.put('/update-email', updateEmail);
router.put('/update-phone', updatePhone);

export default router;
