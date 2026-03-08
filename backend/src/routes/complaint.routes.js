import express from 'express';
import { supabase, supabaseAdmin } from '../config/supabaseClient.js';

const router = express.Router();

// =====================================================
// POST /api/complaints
// Create a new complaint
// =====================================================
router.post('/', async (req, res) => {
    try {
        const { subject, description, images, train_number, train_name } = req.body;
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: userError } = await supabase.auth.getUser(token);

        if (userError || !user) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        const { data, error } = await supabaseAdmin
            .from('complaints')
            .insert({
                user_id: user.id,
                subject,
                description,
                images: images || [],
                status: 'open',
                train_number,
                train_name
            })
            .select()
            .single();

        if (error) {
            throw error;
        }

        res.status(201).json({ complaint: data });
    } catch (error) {
        console.error('Error creating complaint:', error);
        res.status(500).json({ error: 'Failed to create complaint' });
    }
});

// =====================================================
// GET /api/complaints/:complaintId/replies
// Fetch all replies for a specific complaint
// =====================================================
router.get('/:complaintId/replies', async (req, res) => {
    try {
        const { complaintId } = req.params;
        const authHeader = req.headers.authorization;

        console.log('📥 Fetching replies for complaint:', complaintId);

        if (!authHeader) {
            console.log('❌ No auth header provided');
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const token = authHeader.replace('Bearer ', '');

        // Verify user
        const { data: { user }, error: userError } = await supabase.auth.getUser(token);

        if (userError || !user) {
            console.log('❌ Invalid token or user error:', userError);
            return res.status(401).json({ error: 'Invalid token' });
        }

        console.log('✅ User authenticated:', user.id);

        // Verify user owns this complaint (using admin client to bypass RLS)
        const { data: complaint, error: complaintError } = await supabaseAdmin
            .from('complaints')
            .select('id, user_id')
            .eq('id', complaintId)
            .eq('user_id', user.id)
            .single();

        if (complaintError || !complaint) {
            console.log('❌ Complaint query error:', complaintError);
            console.log('   Looking for complaint:', complaintId, 'for user:', user.id);
            return res.status(404).json({ error: 'Complaint not found or access denied' });
        }

        console.log('✅ Complaint found:', complaint.id);

        // Fetch all replies for this complaint (using admin client)
        const { data: replies, error: repliesError } = await supabaseAdmin
            .from('complaint_replies')
            .select('*')
            .eq('complaint_id', complaintId)
            .order('created_at', { ascending: true });

        if (repliesError) {
            console.log('❌ Replies fetch error:', repliesError);
            return res.status(500).json({ error: 'Failed to fetch replies' });
        }

        console.log('✅ Fetched', replies?.length || 0, 'replies');
        res.json({ replies: replies || [] });

    } catch (error) {
        console.error('💥 Error fetching replies:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// =====================================================
// POST /api/complaints/:complaintId/replies
// Add a new reply to a complaint
// =====================================================
router.post('/:complaintId/replies', async (req, res) => {
    try {
        const { complaintId } = req.params;
        const { message, marks_resolved } = req.body;
        const authHeader = req.headers.authorization;

        console.log('📝 Creating reply for complaint:', complaintId, '| marks_resolved:', marks_resolved);

        if (!authHeader) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        if (!message || message.trim().length === 0) {
            return res.status(400).json({ error: 'Message is required' });
        }

        const token = authHeader.replace('Bearer ', '');

        // Verify user
        const { data: { user }, error: userError } = await supabase.auth.getUser(token);

        if (userError || !user) {
            console.log('❌ Auth error:', userError);
            return res.status(401).json({ error: 'Invalid token' });
        }

        console.log('✅ User authenticated:', user.id);

        // Verify user owns this complaint
        const { data: complaint, error: complaintError } = await supabaseAdmin
            .from('complaints')
            .select('id, user_id, status')
            .eq('id', complaintId)
            .eq('user_id', user.id)
            .single();

        if (complaintError || !complaint) {
            console.log('❌ Complaint error:', complaintError);
            return res.status(404).json({ error: 'Complaint not found or access denied' });
        }

        console.log('✅ Complaint found, status:', complaint.status);

        if (complaint.status === 'closed') {
            return res.status(400).json({ error: 'Cannot reply to closed complaints' });
        }

        // Build the insert object — ALWAYS insert with marks_resolved: false
        // to avoid triggering the broken DB trigger (which references a non-existent
        // updated_at column on complaints). We update marks_resolved separately after.
        const replyData = {
            complaint_id: complaintId,
            user_id: user.id,
            message: message.trim(),
            is_admin_reply: false,
            marks_resolved: false
        };

        console.log('📤 Inserting reply...');

        // Insert the reply
        const { data: newReply, error: insertError } = await supabaseAdmin
            .from('complaint_replies')
            .insert(replyData)
            .select()
            .single();

        if (insertError) {
            console.error('❌ Insert error:', insertError.message, '| Code:', insertError.code);
            return res.status(500).json({
                error: 'Failed to create reply',
                details: insertError.message
            });
        }

        console.log('✅ Reply created:', newReply.id);

        // If marks_resolved was intended, update the reply and complaint status separately
        // (UPDATE doesn't trigger the AFTER INSERT trigger, so this is safe)
        if (marks_resolved) {
            // Update the reply to mark it as resolved
            await supabaseAdmin
                .from('complaint_replies')
                .update({ marks_resolved: true })
                .eq('id', newReply.id);

            // Update the complaint status to 'resolved'
            const { error: statusError } = await supabaseAdmin
                .from('complaints')
                .update({ status: 'resolved' })
                .eq('id', complaintId);

            if (statusError) {
                console.error('⚠️ Status update error:', statusError.message);
            } else {
                console.log('✅ Complaint', complaintId, 'marked as resolved');
            }

            // Return the reply with the correct marks_resolved value
            newReply.marks_resolved = true;
        }

        res.status(201).json({ reply: newReply });

    } catch (error) {
        console.error('💥 Error creating reply:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

export default router;
