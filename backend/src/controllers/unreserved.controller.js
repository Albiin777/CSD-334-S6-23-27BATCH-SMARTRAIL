import { adminDb } from '../config/firebaseAdmin.js';

/**
 * Handles booking of Unreserved / General Sitting (GS/UR) tickets.
 * These tickets do not have an assigned seat or passenger manifest logic.
 */
export async function bookUnreservedTicket(req, res) {
    try {
        const { trainNumber, journeyDate, source, destination, passengerCount, totalFare } = req.body;

        if (!trainNumber || !journeyDate || !source || !destination || !passengerCount || !totalFare) {
            return res.status(400).json({ error: "Missing required booking details" });
        }

        const ticketData = {
            trainNumber,
            journeyDate,
            source,
            destination,
            passengerCount: parseInt(passengerCount, 10),
            totalFare: parseFloat(totalFare),
            status: 'VALID',
            created_at: new Date().toISOString()
        };

        const docRef = await adminDb.collection('unreserved_tickets').add(ticketData);

        return res.status(201).json({
            success: true,
            message: "Unreserved ticket booked successfully!",
            ticket: { id: docRef.id, ...ticketData }
        });

    } catch (err) {
        console.error("Unreserved ticket error:", err);
        return res.status(500).json({ error: "Internal Server Error during booking" });
    }
}

/**
 * Fetch all active unreserved tickets (for a user or general lookup)
 */
export async function getUnreservedTickets(req, res) {
    try {
        const snapshot = await adminDb.collection('unreserved_tickets')
            .orderBy('created_at', 'desc')
            .get();

        const tickets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        return res.json({ success: true, tickets });
    } catch (err) {
        console.error("Fetch unreserved tickets error:", err);
        return res.status(500).json({ error: "Internal Server Error fetching tickets" });
    }
}
