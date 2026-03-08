import { supabase } from '../config/supabaseClient.js';

// Get notifications for a user (including global broadcasts where user_id is null)
export const getUserNotifications = async (req, res) => {
  try {
    const userId = req.user.id;

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .or(`user_id.eq.${userId},user_id.is.null`)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Failed to fetch notifications', error: error.message });
  }
};

// Mark a specific notification as read
export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
      .eq('user_id', userId) // ensure user owns it
      .select()
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: 'Failed to mark as read', error: error.message });
  }
};

// Mark all user notifications as read
export const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;

    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false)
      .select();

    if (error) throw error;

    res.json({ message: 'All notifications marked as read', updatedCount: data?.length || 0 });
  } catch (error) {
    res.status(500).json({ message: 'Failed to mark all as read', error: error.message });
  }
};

// Admin creating a broadcast notification
export const createAdminBroadcast = async (req, res) => {
  try {
    const { type, title, message, link } = req.body;
    
    // In a real system, you might verify req.user.role === 'admin' here.
    // For SmartRail, we will just insert it as a broadcast (user_id = null)
    
    const { data, error } = await supabase
      .from('notifications')
      .insert([
        { 
          user_id: null, 
          type, 
          title, 
          message, 
          link,
          for_you: false 
        }
      ])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(data);
  } catch (error) {
    res.status(500).json({ message: 'Failed to broadcast notification', error: error.message });
  }
};
