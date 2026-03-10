import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import { adminAuth, adminDb } from '../config/firebaseAdmin.js';

dotenv.config();

/**
 * Generate JWT token (Backend session - optional if using Firebase ID tokens everywhere)
 */
const generateToken = (userId, email) => {
    return jwt.sign(
        { userId, email },
        process.env.JWT_SECRET || 'fallback_secret',
        { expiresIn: '7d' }
    );
};

/**
 * Sign up with email and password (Firebase Migration)
 */
export const signupWithEmail = async (req, res) => {
    try {
        const { email, password, fullName } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const userRecord = await adminAuth.createUser({
            email,
            password,
            displayName: fullName || ''
        });

        res.status(200).json({
            message: 'Signup successful!',
            user: {
                id: userRecord.uid,
                email: userRecord.email
            }
        });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(400).json({ error: error.message });
    }
};

/**
 * Login with email and password (Firebase Admin - usually done client side, but we provide it for API)
 * Note: Firebase Admin SDK doesn't support "login" directly. 
 * Usually, the client handles login and sends an ID token.
 */
export const loginWithEmail = async (req, res) => {
    // For a full migration, we suggest doing login on the client side using Firebase Client SDK.
    // If the backend MUST handle it, we'd need to use the Firebase REST API or similar.
    // For now, we point the user to the Custom Email OTP flow which is already migrated.
    res.status(400).json({ error: 'Please use the custom-email-otp flow or client-side Firebase login.' });
};

/**
 * Get current user profile (Firebase Admin fetch)
 */
export const getProfile = async (req, res) => {
    try {
        const userId = req.user.id; // From authenticateToken middleware
        const user = await adminAuth.getUser(userId);
        
        // Also fetch from 'profiles' collection if synchronized
        const profileDoc = await adminDb.collection('profiles').doc(userId).get();
        const profileData = profileDoc.exists ? profileDoc.data() : {};

        res.status(200).json({
            user: {
                id: user.uid,
                email: user.email,
                phone: user.phoneNumber,
                fullName: user.displayName || profileData.full_name,
                createdAt: user.metadata.creationTime,
                ...profileData
            }
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
};

/**
 * Custom Email OTP - Send OTP
 */
export const sendCustomEmailOTP = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        // Generate 6 digit OTP
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Expiration time (10 minutes from now)
        const expiresAt = new Date(Date.now() + 10 * 60000).toISOString();

        // Save to Firestore (upsert based on email)
        const emailLower = email.toLowerCase();
        await adminDb.collection('email_otps').doc(emailLower).set({
            email: emailLower,
            otp_code: otpCode,
            expires_at: expiresAt
        });

        // Setup Nodemailer
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        // Send Email
        await transporter.sendMail({
            from: `"SmartRail Authentication" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Your SmartRail Login Code',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
                    <h2>Welcome to SmartRail!</h2>
                    <p>Your verification code is:</p>
                    <h1 style="color: #4F46E5; letter-spacing: 5px; font-size: 32px; background: #f3f4f6; padding: 10px 20px; border-radius: 8px; display: inline-block;">${otpCode}</h1>
                    <p>This code will expire in 10 minutes.</p>
                    <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">If you didn't request this code, you can safely ignore this email.</p>
                </div>
            `
        });

        res.status(200).json({ message: 'OTP sent successfully to ' + email });
    } catch (error) {
        console.error('Send Custom OTP Error:', error);
        res.status(500).json({ error: 'Failed to send OTP email' });
    }
};

/**
 * Custom Email OTP - Verify OTP & Mint Custom Firebase Token
 */
export const verifyCustomEmailOTP = async (req, res) => {
    try {
        const { email, token } = req.body;
        if (!email || !token) {
            return res.status(400).json({ error: 'Email and OTP token are required' });
        }

        const emailLower = email.toLowerCase();

        // 1. Check OTP in Firestore
        const otpDoc = await adminDb.collection('email_otps').doc(emailLower).get();

        if (!otpDoc.exists) {
            return res.status(400).json({ error: 'Invalid or expired OTP' });
        }
        const data = otpDoc.data();

        // 2. Validate Code & Expiration
        if (data.otp_code !== token) {
            return res.status(400).json({ error: 'Incorrect OTP code' });
        }

        if (new Date(data.expires_at) < new Date()) {
            return res.status(400).json({ error: 'OTP has expired' });
        }

        // 3. Clear the used OTP
        await adminDb.collection('email_otps').doc(emailLower).delete();

        // 4. Ensure Firebase User Exists (Create if not)
        let firebaseUid;
        try {
            const userRecord = await adminAuth.getUserByEmail(emailLower);
            firebaseUid = userRecord.uid;
        } catch (error) {
            if (error.code === 'auth/user-not-found') {
                const newUser = await adminAuth.createUser({
                    email: emailLower,
                    emailVerified: true
                });
                firebaseUid = newUser.uid;
            } else {
                throw error;
            }
        }

        // 5. Mint Custom Firebase Token
        const customToken = await adminAuth.createCustomToken(firebaseUid);

        // 6. Generate Backend JWT (Optional)
        const jwtToken = generateToken(firebaseUid, emailLower);

        res.status(200).json({
            message: 'Email verified successfully',
            customToken: customToken,
            token: jwtToken,
            user: {
                id: firebaseUid,
                email: emailLower
            }
        });

    } catch (error) {
        console.error('Verify Custom OTP Error:', error);
        res.status(500).json({ error: 'Internal server error during verification' });
    }
};

/**
 * Sync Profile to Firestore
 */
export const syncProfile = async (req, res) => {
    try {
        const { uid, email, phone, full_name, dob, gender } = req.body;
        if (!uid) return res.status(400).json({ error: 'UID is required' });

        const profileRef = adminDb.collection('profiles').doc(uid);
        const doc = await profileRef.get();
        const isNew = !doc.exists;
        const existingData = doc.exists ? doc.data() : {};

        const profileData = {
            id: uid,
            ...(email ? { email: email.toLowerCase() } : {}),
            ...(phone ? { phone } : {}),
            ...(full_name ? { full_name } : {}),
            ...(dob ? { dob } : {}),
            ...(gender ? { gender } : {}),
            ...(isNew ? { role: 'user' } : { role: existingData.role || 'user' }),
            updated_at: new Date().toISOString()
        };

        await profileRef.set(profileData, { merge: true });

        res.status(200).json({ message: 'Profile synced' });
    } catch (error) {
        console.error('[syncProfile] Error:', error);
        res.status(500).json({ error: 'Failed to sync profile' });
    }
};

/**
 * Check Identifier (Firestore check)
 */
export const checkIdentifier = async (req, res) => {
    try {
        const { email, phone } = req.body;
        if (!email && !phone) return res.status(400).json({ error: 'Email or phone required' });

        let query = adminDb.collection('profiles');
        if (email) query = query.where('email', '==', email.toLowerCase());
        else if (phone) query = query.where('phone', '==', phone);

        const snapshot = await query.limit(1).get();
        const exists = !snapshot.empty;
        const data = exists ? { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } : null;

        res.json({ exists, profile: data });
    } catch (error) {
        res.status(500).json({ error: 'Failed to check identifier' });
    }
};

export default {
    signupWithEmail,
    loginWithEmail,
    getProfile,
    sendCustomEmailOTP,
    verifyCustomEmailOTP,
    syncProfile,
    checkIdentifier
};
