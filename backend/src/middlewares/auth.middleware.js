import { adminAuth } from '../config/firebaseAdmin.js';

/**
 * Middleware to verify Firebase ID token and protect routes
 */
export const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({
            error: 'Access denied. No token provided.'
        });
    }

    try {
        // Verify Firebase ID Token
        const decodedToken = await adminAuth.verifyIdToken(token);
        
        if (decodedToken) {
            // Map Firebase user fields to match what the app expects
            req.user = {
                id: decodedToken.uid,
                uid: decodedToken.uid,
                email: decodedToken.email,
                phone: decodedToken.phone_number
            };
            next();
        } else {
            return res.status(403).json({
                error: 'Invalid or expired token.'
            });
        }
    } catch (error) {
        console.error("[Auth Middleware Error]:", error.message);
        return res.status(403).json({
            error: 'Authentication failed.'
        });
    }
};

/**
 * Optional authentication - doesn't fail if no token
 */
export const optionalAuth = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
        try {
            const decodedToken = await adminAuth.verifyIdToken(token);
            if (decodedToken) {
                req.user = {
                    id: decodedToken.uid,
                    uid: decodedToken.uid,
                    email: decodedToken.email,
                    phone: decodedToken.phone_number
                };
            }
        } catch (error) {
            console.error("[Optional Auth Error]:", error.message);
            req.user = null;
        }
    } else {
        req.user = null;
    }

    next();
};

export default { authenticateToken, optionalAuth };
