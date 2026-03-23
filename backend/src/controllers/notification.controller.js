import { adminDb, FieldValue } from '../config/firebaseAdmin.js';

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

    // For user-specific notifications, use is_read directly
    // For broadcasts, check if userId is in readBy array
    const notifications = [
      ...userNotifsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
      ...broadcastNotifsSnapshot.docs.map(doc => {
        const data = doc.data();
        const readBy = data.readBy || [];
        return { 
          id: doc.id, 
          ...data, 
          is_read: readBy.includes(userId) // Check if current user has read this broadcast
        };
      })
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

    if (!notifDoc.exists) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    const notifData = notifDoc.data();
    
    // Handle broadcast notifications (userId is null)
    if (notifData.userId === null) {
      // Add user to readBy array for broadcasts
      await notifRef.update({ 
        readBy: FieldValue.arrayUnion(userId) 
      });
      res.json({ id, ...notifData, is_read: true });
    } 
    // Handle user-specific notifications
    else if (notifData.userId === userId) {
      await notifRef.update({ is_read: true });
      res.json({ id, ...notifData, is_read: true });
    } 
    else {
      return res.status(403).json({ message: 'Access denied' });
    }
  } catch (error) {
    console.error('Error marking as read:', error);
    res.status(500).json({ message: 'Failed to mark as read', error: error.message });
  }
};

// Mark all user notifications as read
export const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    let updatedCount = 0;

    // 1. Mark user-specific notifications as read
    const unreadSnapshot = await adminDb.collection('notifications')
      .where('userId', '==', userId)
      .where('is_read', '==', false)
      .get();

    const batch = adminDb.batch();
    unreadSnapshot.docs.forEach(doc => {
      batch.update(doc.ref, { is_read: true });
      updatedCount++;
    });

    // 2. Mark broadcast notifications as read for this user
    const broadcastSnapshot = await adminDb.collection('notifications')
      .where('userId', '==', null)
      .get();

    broadcastSnapshot.docs.forEach(doc => {
      const readBy = doc.data().readBy || [];
      if (!readBy.includes(userId)) {
        batch.update(doc.ref, { readBy: FieldValue.arrayUnion(userId) });
        updatedCount++;
      }
    });

    if (updatedCount > 0) {
      await batch.commit();
    }

    res.json({ message: 'All notifications marked as read', updatedCount });
  } catch (error) {
    console.error('Error marking all as read:', error);
    res.status(500).json({ message: 'Failed to mark all as read', error: error.message });
  }
};

// Admin creating a broadcast notification
export const createAdminBroadcast = async (req, res) => {
  try {
    const { type, title, message, link, target = 'all' } = req.body;
    
    const notifData = { 
      userId: null, 
      type, 
      title, 
      message, 
      link,
      target, // 'all', 'passengers', or 'ttes'
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
