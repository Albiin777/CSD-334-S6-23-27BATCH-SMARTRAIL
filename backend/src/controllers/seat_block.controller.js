import { adminDb } from '../config/firebaseAdmin.js';
import bookingService from '../services/booking.service.js';

const blockSeat = async (req, res) => {
    try {
        const { trainNumber, journeyDate, seatId, source, destination } = req.body;
        const userId = req.user?.id || null;

        if (!trainNumber || !journeyDate || !seatId) {
            return res.status(400).json({ error: "Missing required details: trainNumber, journeyDate, seatId" });
        }

        const blockId = `${trainNumber}_${journeyDate}_${seatId}`;
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

        // 1. Check if already confirmed booked (with segment filtering)
        const bookedSeats = await bookingService.getBookedSeatsList(trainNumber, journeyDate, source, destination);
        if (bookedSeats.includes(seatId)) {
             return res.status(409).json({ error: "This seat is already booked." });
        }

        const result = await adminDb.runTransaction(async (transaction) => {
            const blockRef = adminDb.collection('seat_blocks').doc(blockId);
            const blockDoc = await transaction.get(blockRef);

            if (blockDoc.exists) {
                const data = blockDoc.data();
                const now = new Date().toISOString();
                // If there's an active block
                if (data.expires_at > now) {
                    // Prevent override only if held by a different LOGGED-IN user
                    // Guest blocks (null user_id) can be overridden for better UX
                    if (data.user_id !== null && data.user_id !== userId) {
                        throw new Error("Seat is already held by another user");
                    }
                }
            }

            const blockData = {
                train_number: String(trainNumber),
                journey_date: journeyDate,
                seat_id: seatId,
                user_id: userId,
                expires_at: expiresAt,
                updated_at: new Date().toISOString()
            };

            transaction.set(blockRef, blockData);
            return blockData;
        });

        res.status(200).json({ success: true, message: "Seat blocked successfully", data: result });
    } catch (err) {
        console.error("Seat Blocking Error:", err);
        if (err.message === "Seat is already held by another user") {
            return res.status(409).json({ error: err.message });
        }
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
