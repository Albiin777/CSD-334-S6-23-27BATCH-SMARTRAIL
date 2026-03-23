import express from 'express';
import { adminDb } from '../config/firebaseAdmin.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = express.Router();

// =====================================================
// GET /api/complaints/admin/all
// Admin: Fetch ALL complaints (optionally filter by train)
// =====================================================
router.get('/admin/all', authenticateToken, async (req, res) => {
    try {
        const { train } = req.query;

        let queryRef = adminDb.collection('complaints').orderBy('created_at', 'desc');
        if (train) {
            queryRef = adminDb.collection('complaints')
                .where('train_number', '==', String(train))
                .orderBy('created_at', 'desc');
        }

        const snap = await queryRef.get();
        const complaints = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json(complaints);
    } catch (error) {
        console.error('Error fetching all complaints (admin):', error);
        res.status(500).json({ error: 'Failed to fetch complaints' });
    }
});

// =====================================================
// GET /api/complaints
// Fetch all complaints for the authenticated user
// =====================================================
router.get('/', authenticateToken, async (req, res) => {
    try {
        const user = req.user;

        const complaintsSnapshot = await adminDb.collection('complaints')
            .where('user_id', '==', user.id)
            .orderBy('created_at', 'desc')
            .get();

        const complaints = complaintsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        res.json(complaints);
    } catch (error) {
        console.error('Error fetching complaints:', error);
        res.status(500).json({ error: 'Failed to fetch complaints' });
    }
});

// =====================================================
// POST /api/complaints
// Create a new complaint
// =====================================================
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { subject, description, images, train_number, train_name } = req.body;
        const user = req.user;

        const complaintData = {
            user_id: user.id,
            subject,
            description,
            images: images || [],
            status: 'open',
            train_number: train_number || '',
            train_name: train_name || '',
            created_at: new Date().toISOString()
        };

        const docRef = await adminDb.collection('complaints').add(complaintData);
        
        res.status(201).json({ 
            complaint: { id: docRef.id, ...complaintData } 
        });
    } catch (error) {
        console.error('Error creating complaint:', error);
        res.status(500).json({ error: 'Failed to create complaint' });
    }
});

// =====================================================
// GET /api/complaints/:complaintId/replies
// Fetch all replies for a specific complaint
// =====================================================
router.get('/:complaintId/replies', authenticateToken, async (req, res) => {
    try {
        const { complaintId } = req.params;
        const user = req.user;

        console.log('📥 Fetching replies for complaint:', complaintId);

        // Verify user owns this complaint
        const complaintDoc = await adminDb.collection('complaints').doc(complaintId).get();

        if (!complaintDoc.exists || complaintDoc.data().user_id !== user.id) {
            console.log('❌ Complaint not found or access denied');
            return res.status(404).json({ error: 'Complaint not found or access denied' });
        }

        console.log('✅ Complaint found:', complaintId);

        // Fetch all replies for this complaint
        const repliesSnapshot = await adminDb.collection('complaint_replies')
            .where('complaint_id', '==', complaintId)
            .orderBy('created_at', 'asc')
            .get();

        const replies = repliesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        console.log('✅ Fetched', replies.length, 'replies');
        res.json({ replies });

    } catch (error) {
        console.error('💥 Error fetching replies:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// =====================================================
// POST /api/complaints/:complaintId/replies
// Add a new reply to a complaint
// =====================================================
router.post('/:complaintId/replies', authenticateToken, async (req, res) => {
    try {
        const { complaintId } = req.params;
        const { message, marks_resolved } = req.body;
        const user = req.user;

        console.log('📝 Creating reply for complaint:', complaintId, '| marks_resolved:', marks_resolved);

        if (!message || message.trim().length === 0) {
            return res.status(400).json({ error: 'Message is required' });
        }

        // Verify user owns this complaint
        const complaintRef = adminDb.collection('complaints').doc(complaintId);
        const complaintDoc = await complaintRef.get();

        if (!complaintDoc.exists || complaintDoc.data().user_id !== user.id) {
            console.log('❌ Complaint not found or access denied');
            return res.status(404).json({ error: 'Complaint not found or access denied' });
        }

        const complaintData = complaintDoc.data();
        console.log('✅ Complaint found, status:', complaintData.status);

        if (complaintData.status === 'closed') {
            return res.status(400).json({ error: 'Cannot reply to closed complaints' });
        }

        const replyData = {
            complaint_id: complaintId,
            user_id: user.id,
            message: message.trim(),
            is_admin_reply: false,
            marks_resolved: !!marks_resolved,
            created_at: new Date().toISOString()
        };

        console.log('📤 Inserting reply...');

        // Insert the reply
        const replyRef = await adminDb.collection('complaint_replies').add(replyData);
        
        console.log('✅ Reply created:', replyRef.id);

        // If marks_resolved was intended, update the complaint status
        if (marks_resolved) {
            await complaintRef.update({ 
                status: 'resolved',
                updated_at: new Date().toISOString()
            });
            console.log('✅ Complaint', complaintId, 'marked as resolved');
        }

        res.status(201).json({ 
            reply: { id: replyRef.id, ...replyData } 
        });

    } catch (error) {
        console.error('💥 Error creating reply:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

// =====================================================
// DELETE /api/complaints/:complaintId
// Delete a complaint and its replies
// =====================================================
router.delete('/:complaintId', authenticateToken, async (req, res) => {
    try {
        const { complaintId } = req.params;
        const user = req.user;

        // Verify user owns this complaint
        const complaintRef = adminDb.collection('complaints').doc(complaintId);
        const complaintDoc = await complaintRef.get();

        if (!complaintDoc.exists || complaintDoc.data().user_id !== user.id) {
            return res.status(404).json({ error: 'Complaint not found or access denied' });
        }

        // Delete all replies first
        const repliesSnapshot = await adminDb.collection('complaint_replies')
            .where('complaint_id', '==', complaintId)
            .get();
        
        const batch = adminDb.batch();
        repliesSnapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        
        // Delete the complaint
        batch.delete(complaintRef);
        
        await batch.commit();

        res.json({ message: 'Complaint deleted successfully' });
    } catch (error) {
        console.error('Error deleting complaint:', error);
        res.status(500).json({ error: 'Failed to delete complaint' });
    }
});

// =====================================================
// GET /api/complaints/:complaintId/replies/admin
// Admin: Fetch replies for any complaint (no ownership check)
// =====================================================
router.get('/:complaintId/replies/admin', authenticateToken, async (req, res) => {
    try {
        const { complaintId } = req.params;

        const repliesSnapshot = await adminDb.collection('complaint_replies')
            .where('complaint_id', '==', complaintId)
            .orderBy('created_at', 'asc')
            .get();

        const replies = repliesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json({ replies });
    } catch (error) {
        console.error('Error fetching admin replies:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// =====================================================
// POST /api/complaints/:complaintId/replies/admin
// Admin: Post a reply to any complaint (no ownership check)
// =====================================================
router.post('/:complaintId/replies/admin', authenticateToken, async (req, res) => {
    try {
        const { complaintId } = req.params;
        const { message, marks_resolved, new_status } = req.body;

        if (!message || !message.trim()) {
            return res.status(400).json({ error: 'Message is required' });
        }

        const complaintRef = adminDb.collection('complaints').doc(complaintId);
        const complaintDoc = await complaintRef.get();

        if (!complaintDoc.exists) {
            return res.status(404).json({ error: 'Complaint not found' });
        }

        const now = new Date().toISOString();
        const replyData = {
            complaint_id: complaintId,
            message: message.trim(),
            is_admin_reply: true,
            marks_resolved: !!marks_resolved,
            created_at: now
        };

        const replyRef = await adminDb.collection('complaint_replies').add(replyData);

        // Update complaint status
        const updateStatus = new_status || (marks_resolved ? 'resolved' : 'in-progress');
        await complaintRef.update({ status: updateStatus, updated_at: now });

        res.status(201).json({ reply: { id: replyRef.id, ...replyData } });
    } catch (error) {
        console.error('Error posting admin reply:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

export default router;
