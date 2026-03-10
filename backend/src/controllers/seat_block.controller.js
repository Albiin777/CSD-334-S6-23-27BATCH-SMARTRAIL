import { adminDb } from '../config/firebaseAdmin.js';

const blockSeat = async (req, res) => {
    try {
        const { trainNumber, journeyDate, seatId } = req.body;
        const userId = req.user?.id || null;

        if (!trainNumber || !journeyDate || !seatId) {
            return res.status(400).json({ error: "Missing required details: trainNumber, journeyDate, seatId" });
        }

        // Set expiry to 10 minutes from now
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

        // Use a composite ID for the document to handle the unique constraint
        const blockId = `${trainNumber}_${journeyDate}_${seatId}`;
        
        const blockData = {
            train_number: String(trainNumber),
            journey_date: journeyDate,
            seat_id: seatId,
            user_id: userId,
            expires_at: expiresAt,
            updated_at: new Date().toISOString()
        };

        await adminDb.collection('seat_blocks').doc(blockId).set(blockData);

        res.status(200).json({ success: true, message: "Seat blocked successfully", data: { id: blockId, ...blockData } });
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

        const blockId = `${trainNumber}_${journeyDate}_${seatId}`;
        await adminDb.collection('seat_blocks').doc(blockId).delete();

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
