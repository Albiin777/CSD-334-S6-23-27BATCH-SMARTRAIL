import { supabase } from '../config/supabaseClient.js';

// Get Profile Info
export const getUserProfile = async (req, res) => {
    try {
        const { data: { user }, error } = await supabase.auth.admin.getUserById(req.user.id);

        if (error) throw error;
        
        // Return only safe fields
        res.json({
            id: user.id,
            email: user.email,
            phone: user.phone || '',
            name: user.user_metadata?.full_name || ''
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

        const { data, error } = await supabase.auth.admin.updateUserById(req.user.id, {
            email: email
        });

        if (error) throw error;

        res.json({ message: 'Email update initiated. Please check your inbox for verification links.' });
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

        const { data, error } = await supabase.auth.admin.updateUserById(req.user.id, {
            phone: phone
        });

        if (error) throw error;

        res.json({ message: 'Phone number updated successfully.' });
    } catch (error) {
        console.error('Update Phone Error:', error);
        res.status(500).json({ error: error.message });
    }
};
