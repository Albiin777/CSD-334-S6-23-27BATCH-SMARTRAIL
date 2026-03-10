import { adminAuth } from '../config/firebaseAdmin.js';

// Get Profile Info
export const getUserProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await adminAuth.getUser(userId);

        // Return only safe fields
        res.json({
            id: user.uid,
            email: user.email,
            phone: user.phoneNumber || '',
            name: user.displayName || ''
        });
    } catch (error) {
        console.error('Fetch Profile Error:', error);
        res.status(500).json({ error: 'Failed to fetch user profile' });
    }
};

// Update Email
export const updateEmail = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: 'Email is required' });

        await adminAuth.updateUser(req.user.id, {
            email: email
        });

        res.json({ message: 'Email updated successfully in Firebase.' });
    } catch (error) {
        console.error('Update Email Error:', error);
        res.status(500).json({ error: error.message });
    }
};

// Update Phone
export const updatePhone = async (req, res) => {
    try {
        const { phone } = req.body;
        if (!phone) return res.status(400).json({ error: 'Phone number is required' });

        await adminAuth.updateUser(req.user.id, {
            phoneNumber: phone
        });

        res.json({ message: 'Phone number updated successfully.' });
    } catch (error) {
        console.error('Update Phone Error:', error);
        res.status(500).json({ error: error.message });
    }
};
