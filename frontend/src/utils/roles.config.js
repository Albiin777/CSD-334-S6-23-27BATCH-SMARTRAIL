/**
 * roles.config.js
 * Centralized list of authorized emails for Admin and TTE roles.
 * Adjust these lists to grant/revoke access.
 */

export const AUTHORIZED_ADMINS = [
    'hashlinairah@gmail.com',
    'albynklpra33@gmail.com'
];

export const AUTHORIZED_TTES = [
    { email: 'raishahashly15@gmail.com', phone: '+919446824103' },
    { email: 'joshuaspy007@gmail.com', phone: '+919946284615' },
    { email: 'fidhasafar1903@gmail.com', phone: '+919400711671' }
];

/**
 * Utility to check if an email has a specific role
 */
export const hasRole = (email, role) => {
    if (!email) return false;
    const lowerEmail = email.toLowerCase();

    if (role === 'admin') return AUTHORIZED_ADMINS.includes(lowerEmail);
    if (role === 'tte') {
        const isAuthorized = AUTHORIZED_TTES.some(t =>
            (typeof t === 'string' ? t.toLowerCase() : t.email.toLowerCase()) === lowerEmail
        );
        return isAuthorized || lowerEmail.includes('tte');
    }

    return false;
};
