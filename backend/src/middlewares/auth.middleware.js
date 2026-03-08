import { supabase } from '../config/supabaseClient.js';

/**
 * Middleware to verify Supabase JWT token and protect routes
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
        const { data: { user }, error } = await supabase.auth.getUser(token);
        
        if (error || !user) {
            return res.status(403).json({
                error: 'Invalid or expired token.'
            });
        }

        req.user = user; // Attach user info to request
        next();
    } catch (error) {
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
            const { data: { user }, error } = await supabase.auth.getUser(token);
            if (!error && user) {
                req.user = user;
            } else {
                req.user = null;
            }
        } catch (error) {
            req.user = null;
        }
    } else {
        req.user = null;
    }

    next();
};

export default { authenticateToken, optionalAuth };
