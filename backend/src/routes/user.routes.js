import { Router } from 'express';
import {
    signupWithEmail,
    verifyEmailOTP,
    signupWithPhone,
    verifyPhoneOTP,
    loginWithEmail,
    loginWithPhone,
    resendOTP,
    logout,
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
router.post('/verify-email-otp', verifyEmailOTP);
router.post('/signup-phone', signupWithPhone);
router.post('/verify-phone-otp', verifyPhoneOTP);
router.post('/login-email', loginWithEmail);
router.post('/login-phone', loginWithPhone);
router.post('/resend-otp', resendOTP);
router.post('/logout', authenticateToken, logout);
router.get('/profile', authenticateToken, getProfile);

// Custom Email OTP Routes
router.post('/send-custom-email-otp', sendCustomEmailOTP);
router.post('/verify-custom-email-otp', verifyCustomEmailOTP);
router.post('/verify-custom-email-update-otp', verifyCustomEmailUpdateOTP);

// Profile Sync (bypasses Supabase RLS using service role)
router.post('/sync-profile', syncProfile);

// Pre-auth check: does this email/phone exist in profiles?
router.post('/check-identifier', checkIdentifier);

export default router;
