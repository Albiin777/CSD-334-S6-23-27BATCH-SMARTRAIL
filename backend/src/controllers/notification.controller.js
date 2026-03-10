import { adminDb } from '../config/firebaseAdmin.js';

// Get notifications for a user (including global broadcasts where user_id is null)
export const getUserNotifications = async (req, res) => {
  try {
    const userId = req.user.id;

    // Firestore doesn't support complex OR queries easily in earlier SDKs, 
    // and we remove orderBy to avoid index requirement issues during development
    const userNotifsSnapshot = await adminDb.collection('notifications')
      .where('userId', '==', userId)
      .get();

    const broadcastNotifsSnapshot = await adminDb.collection('notifications')
      .where('userId', '==', null)
      .get();

    const notifications = [
      ...userNotifsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
      ...broadcastNotifsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    ].sort((a, b) => {
        const dateA = new Date(a.created_at || a.timestamp || 0);
        const dateB = new Date(b.created_at || b.timestamp || 0);
        return dateB - dateA;
    });

    res.json(notifications);
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

    const notifRef = adminDb.collection('notifications').doc(id);
    const notifDoc = await notifRef.get();

    if (!notifDoc.exists || notifDoc.data().userId !== userId) {
      return res.status(404).json({ message: 'Notification not found or access denied' });
    }

    await notifRef.update({ is_read: true });
    
    res.json({ id, ...notifDoc.data(), is_read: true });
  } catch (error) {
    res.status(500).json({ message: 'Failed to mark as read', error: error.message });
  }
};

// Mark all user notifications as read
export const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;

    const unreadSnapshot = await adminDb.collection('notifications')
      .where('userId', '==', userId)
      .where('is_read', '==', false)
      .get();

    if (unreadSnapshot.empty) {
      return res.json({ message: 'No unread notifications', updatedCount: 0 });
    }

    const batch = adminDb.batch();
    unreadSnapshot.docs.forEach(doc => {
      batch.update(doc.ref, { is_read: true });
    });

    await batch.commit();

    res.json({ message: 'All notifications marked as read', updatedCount: unreadSnapshot.size });
  } catch (error) {
    console.error('Error marking all as read:', error);
    res.status(500).json({ message: 'Failed to mark all as read', error: error.message });
  }
};

// Admin creating a broadcast notification
export const createAdminBroadcast = async (req, res) => {
  try {
    const { type, title, message, link } = req.body;
    
    const notifData = { 
      userId: null, 
      type, 
      title, 
      message, 
      link,
      for_you: false,
      is_read: false,
      created_at: new Date().toISOString()
    };

    const docRef = await adminDb.collection('notifications').add(notifData);

    res.status(201).json({ id: docRef.id, ...notifData });
  } catch (error) {
    res.status(500).json({ message: 'Failed to broadcast notification', error: error.message });
  }
};
