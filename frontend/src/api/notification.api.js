import { supabase } from '../utils/supabaseClient';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

const getAuthHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    return {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
};

export const notificationApi = {
    // Get all notifications for the user
    getNotifications: async () => {
        const headers = await getAuthHeaders();
        const res = await fetch(`${API_BASE_URL}/notifications`, {
            headers
        });
        if (!res.ok) throw new Error('Failed to fetch notifications');
        return await res.json();
    },

    // Mark a single notification as read
    markAsRead: async (id) => {
        const headers = await getAuthHeaders();
        const res = await fetch(`${API_BASE_URL}/notifications/${id}/read`, {
            method: 'PUT',
            headers
        });
        if (!res.ok) throw new Error('Failed to mark notification as read');
        return await res.json();
    },

    // Mark all notifications as read
    markAllAsRead: async () => {
        const headers = await getAuthHeaders();
        const res = await fetch(`${API_BASE_URL}/notifications/read-all`, {
            method: 'PUT',
            headers
        });
        if (!res.ok) throw new Error('Failed to mark all as read');
        return await res.json();
    }
};
