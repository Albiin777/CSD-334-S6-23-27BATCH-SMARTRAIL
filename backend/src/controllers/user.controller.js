import { supabase, supabaseAdmin } from '../config/supabaseClient.js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import { adminAuth } from '../config/firebaseAdmin.js';

dotenv.config();

/**
 * Generate JWT token
 */
const generateToken = (userId, email) => {
    return jwt.sign(
        { userId, email },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );
};

/**
 * Sign up with email and send OTP
 */
export const signupWithEmail = async (req, res) => {
    try {
        const { email, password, fullName } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Sign up user with Supabase Auth
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName || '',
                },
                emailRedirectTo: `${process.env.FRONTEND_URL}/auth/callback`
            }
        });

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.status(200).json({
            message: 'Signup successful! Please check your email for verification.',
            user: {
                id: data.user?.id,
                email: data.user?.email
            }
        });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Verify email OTP
 */
export const verifyEmailOTP = async (req, res) => {
    try {
        const { email, token } = req.body;

        if (!email || !token) {
            return res.status(400).json({ error: 'Email and OTP token are required' });
        }

        const { data, error } = await supabase.auth.verifyOtp({
            email,
            token,
            type: 'email'
        });

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        // Generate our own JWT for session management
        const jwtToken = generateToken(data.user.id, data.user.email);

        res.status(200).json({
            message: 'Email verified successfully',
            token: jwtToken,
            user: {
                id: data.user.id,
                email: data.user.email,
                fullName: data.user.user_metadata?.full_name
            }
        });
    } catch (error) {
        console.error('Verify OTP error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Sign up with phone and send OTP
 */
export const signupWithPhone = async (req, res) => {
    try {
        const { phone, password, fullName } = req.body;

        if (!phone || !password) {
            return res.status(400).json({ error: 'Phone and password are required' });
        }

        const { data, error } = await supabase.auth.signUp({
            phone,
            password,
            options: {
                data: {
                    full_name: fullName || '',
                }
            }
        });

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.status(200).json({
            message: 'Signup successful! Please check your phone for OTP.',
            user: {
                id: data.user?.id,
                phone: data.user?.phone
            }
        });
    } catch (error) {
        console.error('Phone signup error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Verify phone OTP
 */
export const verifyPhoneOTP = async (req, res) => {
    try {
        const { phone, token } = req.body;

        if (!phone || !token) {
            return res.status(400).json({ error: 'Phone and OTP token are required' });
        }

        const { data, error } = await supabase.auth.verifyOtp({
            phone,
            token,
            type: 'sms'
        });

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        const jwtToken = generateToken(data.user.id, data.user.phone);

        res.status(200).json({
            message: 'Phone verified successfully',
            token: jwtToken,
            user: {
                id: data.user.id,
                phone: data.user.phone,
                fullName: data.user.user_metadata?.full_name
            }
        });
    } catch (error) {
        console.error('Verify phone OTP error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Login with email and password
 */
export const loginWithEmail = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const jwtToken = generateToken(data.user.id, data.user.email);

        res.status(200).json({
            message: 'Login successful',
            token: jwtToken,
            user: {
                id: data.user.id,
                email: data.user.email,
                fullName: data.user.user_metadata?.full_name
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Login with phone (sends OTP)
 */
export const loginWithPhone = async (req, res) => {
    try {
        const { phone } = req.body;

        if (!phone) {
            return res.status(400).json({ error: 'Phone number is required' });
        }

        const { data, error } = await supabase.auth.signInWithOtp({
            phone
        });

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.status(200).json({
            message: 'OTP sent to your phone',
            phone
        });
    } catch (error) {
        console.error('Phone login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Resend OTP
 */
export const resendOTP = async (req, res) => {
    try {
        const { email, phone, type } = req.body;

        if (!type || (type === 'email' && !email) || (type === 'sms' && !phone)) {
            return res.status(400).json({ error: 'Invalid request parameters' });
        }

        const { error } = await supabase.auth.resend({
            type: type === 'email' ? 'signup' : 'sms',
            email: type === 'email' ? email : undefined,
            phone: type === 'sms' ? phone : undefined
        });

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.status(200).json({
            message: `OTP resent successfully to your ${type === 'email' ? 'email' : 'phone'}`
        });
    } catch (error) {
        console.error('Resend OTP error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Logout user
 */
export const logout = async (req, res) => {
    try {
        const { error } = await supabase.auth.signOut();

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.status(200).json({
            message: 'Logout successful'
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Get current user profile
 */
export const getProfile = async (req, res) => {
    try {
        const userId = req.user.userId;

        const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);

        if (error) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.status(200).json({
            user: {
                id: data.user.id,
                email: data.user.email,
                phone: data.user.phone,
                fullName: data.user.user_metadata?.full_name,
                createdAt: data.user.created_at
            }
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ error: 'Internal server error' });
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

        // Save to Supabase (upsert based on email)
        const { error: dbError } = await supabaseAdmin
            .from('email_otps')
            .upsert({ email: email.toLowerCase(), otp_code: otpCode, expires_at: expiresAt }, { onConflict: 'email' });

        if (dbError) {
            console.error('Database Error:', dbError);
            return res.status(500).json({ error: 'Failed to generate OTP' });
        }

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

        // 1. Check OTP in Database
        const { data, error: dbError } = await supabaseAdmin
            .from('email_otps')
            .select('*')
            .eq('email', emailLower)
            .single();

        if (dbError || !data) {
            return res.status(400).json({ error: 'Invalid or expired OTP' });
        }

        // 2. Validate Code & Expiration
        if (data.otp_code !== token) {
            return res.status(400).json({ error: 'Incorrect OTP code' });
        }

        if (new Date(data.expires_at) < new Date()) {
            return res.status(400).json({ error: 'OTP has expired' });
        }

        // 3. Clear the used OTP
        await supabaseAdmin.from('email_otps').delete().eq('email', emailLower);

        // 4. Ensure Firebase User Exists (Create if not)
        let firebaseUid;
        try {
            const userRecord = await adminAuth.getUserByEmail(emailLower);
            firebaseUid = userRecord.uid;
        } catch (error) {
            if (error.code === 'auth/user-not-found') {
                // Create user
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

        // 6. Generate Backend JWT
        const jwtToken = generateToken(firebaseUid, emailLower);

        res.status(200).json({
            message: 'Email verified successfully',
            customToken: customToken, // This is explicitly sent to login to Firebase Client SDK
            token: jwtToken, // Backend session
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
 * Custom Email OTP - Verify Update OTP & Force Update Firebase + Supabase
 */
export const verifyCustomEmailUpdateOTP = async (req, res) => {
    try {
        const { email, token, uid } = req.body;
        if (!email || !token || !uid) {
            return res.status(400).json({ error: 'Email, OTP token, and User ID are required' });
        }

        const emailLower = email.toLowerCase();

        // 1. Check OTP in Database
        const { data, error: dbError } = await supabaseAdmin
            .from('email_otps')
            .select('*')
            .eq('email', emailLower)
            .single();

        if (dbError || !data) {
            return res.status(400).json({ error: 'Invalid or expired OTP' });
        }

        // 2. Validate Code & Expiration
        if (data.otp_code !== token) {
            return res.status(400).json({ error: 'Incorrect OTP code' });
        }

        if (new Date(data.expires_at) < new Date()) {
            return res.status(400).json({ error: 'OTP has expired' });
        }

        // 3. Clear the used OTP
        await supabaseAdmin.from('email_otps').delete().eq('email', emailLower);

        // 4. Force Update Firebase Auth User
        try {
             await adminAuth.updateUser(uid, {
                 email: emailLower,
                 emailVerified: true
             });
        } catch (fbError) {
             console.error("Firebase Admin Update Error:", fbError);
             return res.status(500).json({ error: fbError.message || "Failed to update Firebase email" });
        }

        // 5. Update Supabase Profile
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .update({ email: emailLower })
            .eq('id', uid);

        if (profileError) {
            console.error("Supabase Profile Update Error:", profileError);
            // Non-fatal, Firebase is updated, but might cause sync issues
        }

        // 6. Mint a fresh Custom Token so the frontend can silently re-authenticate
        // (Firebase revokes existing tokens when email changes via Admin SDK)
        const freshCustomToken = await adminAuth.createCustomToken(uid);

        res.status(200).json({
            message: 'Email updated successfully',
            customToken: freshCustomToken
        });

    } catch (error) {
        console.error('Verify Custom Update OTP Error:', error);
        res.status(500).json({ error: 'Internal server error during verification' });
    }
};

/**
 * Sync Profile to Supabase - uses supabaseAdmin to bypass RLS
 */
export const syncProfile = async (req, res) => {
    try {
        const { uid, email, phone, full_name, dob, gender } = req.body;
        if (!uid) return res.status(400).json({ error: 'UID is required' });

        const { data: existing } = await supabaseAdmin
            .from('profiles')
            .select('id, role')
            .eq('id', uid)
            .maybeSingle();

        const isNew = !existing;

        const profileData = {
            id: uid,
            ...(email ? { email: email.toLowerCase() } : {}),
            ...(phone ? { phone } : {}),
            ...(full_name ? { full_name } : {}),
            ...(dob ? { dob } : {}),
            ...(gender ? { gender } : {}),
            ...(isNew ? { role: 'user' } : {}),
            updated_at: new Date().toISOString()
        };

        const { error: upsertError } = await supabaseAdmin
            .from('profiles')
            .upsert(profileData, { onConflict: 'id' });

        if (upsertError) {
            console.error('[syncProfile] Upsert error:', upsertError.message);
            return res.status(500).json({ error: upsertError.message });
        }

        res.status(200).json({ message: 'Profile synced' });
    } catch (error) {
        console.error('[syncProfile] Error:', error);
        res.status(500).json({ error: 'Failed to sync profile' });
    }
};

/**
 * Check if an email or phone already exists in the profiles table
 */
export const checkIdentifier = async (req, res) => {
    try {
        const { email, phone } = req.body;
        if (!email && !phone) {
            return res.status(400).json({ error: 'Email or phone is required' });
        }

        let query = supabaseAdmin.from('profiles').select('id, email, phone');

        if (email) {
            query = query.eq('email', email.toLowerCase());
        } else if (phone) {
            query = query.eq('phone', phone);
        }

        const { data, error } = await query.maybeSingle();

        if (error) {
            console.error('[checkIdentifier] Error:', error.message);
            return res.status(500).json({ error: error.message });
        }

        res.status(200).json({ exists: !!data, profile: data || null });
    } catch (error) {
        console.error('[checkIdentifier] Error:', error);
        res.status(500).json({ error: 'Failed to check identifier' });
    }
};

export default {
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
    syncProfile
};
