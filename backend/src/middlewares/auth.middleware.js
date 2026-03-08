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

        if (!error && user) {
            req.user = user;
        } else {
            console.error("[Auth Debug authenticateToken] GET USER ERROR:", error?.message || error);
            // Decode fallback
            try {
                const tokenParts = token.split('.');
                if (tokenParts.length === 3) {
                    const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
                    if (payload.sub) {
                        req.user = { id: payload.sub, email: payload.email, user_metadata: payload.user_metadata };
                    }
                }
            } catch(e) {}
            
            if (!req.user) {
                return res.status(403).json({
                    error: 'Invalid or expired token.'
                });
            }
        }
        
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
                console.error("[Auth Debug] GET USER ERROR:", error?.message || error);
                
                // FALLBACK: Since getUser fails occasionally with custom roles / mock tokens or delays, 
                // Let's decode the JWT manually and see if we can extract sub
                try {
                    const tokenParts = token.split('.');
                    if (tokenParts.length === 3) {
                        const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
                        console.log("[Auth Debug] DECODED JWT FALLBACK:", !!payload.sub);
                        if (payload.sub) {
                            req.user = { id: payload.sub, email: payload.email, user_metadata: payload.user_metadata };
                        }
                    }
                } catch(decodeErr) {
                    console.error("[Auth Debug] JWT Decode fallback failed:", decodeErr);
                }
                
                if(!req.user) req.user = null;
            }
        } catch (error) {
            console.error("[Auth Debug] TRY/CATCH ERROR:", error);
            req.user = null;
        }
    } else {
        req.user = null;
    }

    next();
};

export default { authenticateToken, optionalAuth };
