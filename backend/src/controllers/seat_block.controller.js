import { supabase } from '../config/supabaseClient.js';

const blockSeat = async (req, res) => {
    try {
        const { trainNumber, journeyDate, seatId } = req.body;
        const userId = req.user?.id || null;

        if (!trainNumber || !journeyDate || !seatId) {
            return res.status(400).json({ error: "Missing required details: trainNumber, journeyDate, seatId" });
        }

        // Set expiry to 10 minutes from now
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

        const { data, error } = await supabase
            .from('seat_blocks')
            .upsert({
                train_number: String(trainNumber),
                journey_date: journeyDate,
                seat_id: seatId,
                user_id: userId,
                expires_at: expiresAt
            }, {
                onConflict: 'train_number,journey_date,seat_id'
            })
            .select();

        if (error) throw error;

        res.status(200).json({ success: true, message: "Seat blocked successfully", data });
    } catch (err) {
        console.error("Seat Blocking Error:", err);
        res.status(500).json({ error: err.message });
    }
};

const unblockSeat = async (req, res) => {
    try {
        const { trainNumber, journeyDate, seatId } = req.body;

        if (!trainNumber || !journeyDate || !seatId) {
            return res.status(400).json({ error: "Missing required details" });
        }

        const { error } = await supabase
            .from('seat_blocks')
            .delete()
            .match({
                train_number: String(trainNumber),
                journey_date: journeyDate,
                seat_id: seatId
            });

        if (error) throw error;

        res.status(200).json({ success: true, message: "Seat unblocked successfully" });
    } catch (err) {
        console.error("Seat Unblocking Error:", err);
        res.status(500).json({ error: err.message });
    }
};

export default {
    blockSeat,
    unblockSeat
};
