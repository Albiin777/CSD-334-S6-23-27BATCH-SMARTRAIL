import { Router } from 'express';
import {
    signupWithEmail,
    loginWithEmail,
    getProfile,
    sendCustomEmailOTP,
    verifyCustomEmailOTP,
    verifyCustomEmailUpdateOTP,
    syncProfile,
    checkIdentifier
} from '../controllers/user.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = Router();

router.post('/signup-email', signupWithEmail);
router.post('/login-email', loginWithEmail);
router.get('/profile', authenticateToken, getProfile);

// Custom Email OTP Routes
router.post('/send-custom-email-otp', sendCustomEmailOTP);
router.post('/verify-custom-email-otp', verifyCustomEmailOTP);
router.post('/verify-custom-email-update-otp', verifyCustomEmailUpdateOTP);

// Profile Sync
router.post('/sync-profile', syncProfile);

// Pre-auth check
router.post('/check-identifier', checkIdentifier);

export default router;
