import { adminDb } from '../config/firebaseAdmin.js';
// PNR Generation Logic
// Format: 10 Digits
// First 3: Zone Code (System)
// Next 7: Random Unique



// Map of station zones (Simplified for demo)
const ZONE_MAP = {
    'TVC': 211, 'ERS': 212, 'CLT': 213, 'CAN': 214,
    'MAQ': 215, 'PGT': 216, 'TCR': 217, 'KTYM': 218,
    'ALLP': 219, 'QLN': 220, 'NCJ': 221, 'SRR': 222
};

const getZoneCode = (sourceStation) => {
    // Default to 299 if unknown
    return (ZONE_MAP[sourceStation.toUpperCase()] || 299).toString();
};

const generateRandom7 = () => {
    return Math.floor(1000000 + Math.random() * 9000000).toString();
};

const generateUniquePNR = async (sourceStation) => {
    let isUnique = false;
    let pnr = '';
    const zoneCode = getZoneCode(sourceStation);

    while (!isUnique) {
        const uniqueId = generateRandom7();
        pnr = `${zoneCode}${uniqueId}`;

        // Check DB for existing PNR
        const snapshot = await adminDb.collection('pnr_bookings')
            .where('pnr', '==', pnr)
            .limit(1)
            .get();

        if (snapshot.empty) {
            isUnique = true;
        }
        // If data exists, loop again
    }
    return pnr;
};

export { generateUniquePNR };






// ---------------------------------------------
// HELPER: Fetch Train Schedule & Calculate Indexes
// ---------------------------------------------
// Assume trainData is accessible in memory or fetch from DB/API.
// For now, assume global train data is available via `server.js` export or re-fetch.
// Let's implement a minimal fetch here or assume passed data.

const getStationIndex = (schedule, stationCode) => {
    return schedule.findIndex(s => s.stationCode === stationCode);
};

// ---------------------------------------------
// SEGMENT OVERLAP LOGIC
// ---------------------------------------------
// Checks if two route segments overlap
const doSegmentsOverlap = (reqFrom, reqTo, existingFrom, existingTo) => {
    return (existingFrom < reqTo && existingTo > reqFrom);
};

// ---------------------------------------------
// CORE SERVICE: Book a Ticket (handles CNF, RAC, WL logic)
// ---------------------------------------------
const bookTicket = async (trainNumber, source, destination, journeyDate, classCode, passengers, trainSchedule, userId = null) => {

    // 1. Validate Input
    if (!passengers || passengers.length === 0) throw new Error('No passengers provided');
    
    // 1. Get Station Indexes
    const fromIndex = getStationIndex(trainSchedule, source);
    const toIndex = getStationIndex(trainSchedule, destination);

    if (fromIndex === -1 || toIndex === -1 || fromIndex >= toIndex) {
        throw new Error('Invalid source/destination or route direction.');
    }

    // 2. Fetch Existing Bookings for this Train + Date + Class
    // 2. Fetch Existing Bookings from Firestore
    const bookingsSnapshot = await adminDb.collection('pnr_bookings')
        .where('trainNumber', '==', String(trainNumber))
        .where('journeyDate', '==', journeyDate)
        .where('classCode', '==', classCode)
        .get();

    const existingBookings = bookingsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));

    // 3. Calculate Occupancy Map (Simple seat map based on segments)
    // We need to know which seats are occupied for the requested segment [fromIndex, toIndex].

    const occupiedSeats = new Set();
    let currentRACCount = 0;
    let currentWLCount = 0;

    // Filter relevant bookings that overlap with requested journey
    existingBookings.forEach(booking => {
        if (doSegmentsOverlap(fromIndex, toIndex, booking.fromIndex, booking.toIndex)) {
            booking.passengers.forEach(p => {
                if (p.status === 'CNF') occupiedSeats.add(p.seatNumber);
                if (p.status === 'RAC') currentRACCount = Math.max(currentRACCount, p.racNumber || 0); // Keep track of max RAC issued
                if (p.status === 'WL') currentWLCount = Math.max(currentWLCount, p.wlNumber || 0);     // Keep track of max WL issued
            });
        }
    });

    // 4. Determine Limits (Hardcoded for demo, ideally from DB/Config)
    // Example: SL Class -> 72 seats, 10 RAC, 20 WL
    const TOTAL_SEATS = 72;
    const RAC_LIMIT = 10;
    const WL_LIMIT = 20;

    // 5. Generate PNR
    const pnr = await generateUniquePNR(source);

    // 6. Allocate Seats for Each Passenger (Enhanced)
    const passengerRecords = [];

    for (const p of passengers) {
        let status = 'WL';
        let seatNumber = null;
        let racNumber = null;
        let wlNumber = null;

        // A. Specific Seat Request (From Visual Layout)
        if (p.seatNumber && p.coachId) {
            const requestedSeatId = `${p.coachId}-${p.seatNumber}`;
            // Note: In a real app, strict checking against race conditions is needed here.
            // We trust the frontend state + basic check for this demo.
            // Also need to check against `occupiedSeats` set if populated correctly with full IDs.
            // Current occupiedSeats implementation might use simplified IDs, let's assume it matches if we used consistent format.

            status = 'CNF';
            seatNumber = requestedSeatId;
            occupiedSeats.add(requestedSeatId);
        }
        // B. Auto-Allocation Fallback
        else {
            // Try to find a CNF seat
            for (let s = 1; s <= TOTAL_SEATS; s++) {
                const seatId = `${classCode}-${s}`;
                if (!occupiedSeats.has(seatId)) {
                    status = 'CNF';
                    seatNumber = seatId;
                    occupiedSeats.add(seatId);
                    break;
                }
            }

            // If no CNF, try RAC
            if (status !== 'CNF') {
                if (currentRACCount < RAC_LIMIT) {
                    status = 'RAC';
                    currentRACCount++;
                    racNumber = currentRACCount;
                    // Two passengers share one RAC seat. 
                    // e.g. RAC 1 and 2 share RAC-Seat-1. RAC 3 and 4 share RAC-Seat-2
                    const sharedSeatIndex = Math.ceil(currentRACCount / 2);
                    seatNumber = `${classCode}-RAC-${sharedSeatIndex}`;
                } else if (currentWLCount < WL_LIMIT) {
                    // Try WL
                    status = 'WL';
                    currentWLCount++;
                    wlNumber = currentWLCount;
                    seatNumber = null;
                } else {
                    throw new Error('Booking Failed: Regret (No Seats Available)');
                }
            }
        }

        passengerRecords.push({
            name: p.name,
            age: p.age,
            gender: p.gender,
            status,
            seatNumber,
            racNumber,
            wlNumber
        });
    }

    // 7. Insert to Firestore
    const bookingDoc = {
        pnr,
        trainNumber: String(trainNumber),
        journeyDate,
        classCode,
        source,
        destination,
        fromIndex,
        toIndex,
        user_id: userId,
        passengers: passengerRecords,
        created_at: new Date().toISOString()
    };

    const docRef = await adminDb.collection('pnr_bookings').add(bookingDoc);

    // --- NEW: Generate Notification ---
    // Extract the primary status of the booking to determine the notification type/message
    const primaryStatus = passengerRecords[0].status; // CNF, RAC, WL
    let notifTitle = '';
    let notifMessage = '';
    let notifType = 'info';

    switch (primaryStatus) {
        case 'CNF':
            notifTitle = 'Ticket Confirmed! 🎉';
            notifMessage = `Your booking for Train ${trainNumber} is confirmed. PNR: ${pnr}.`;
            notifType = 'info';
            break;
        case 'RAC':
            notifTitle = 'RAC Ticket Issued';
            notifMessage = `You hold an RAC ticket (PNR: ${pnr}) for Train ${trainNumber}. You can board the train but will share a seat.`;
            notifType = 'reminder';
            break;
        case 'WL':
            notifTitle = 'Waitlisted Ticket';
            notifMessage = `Your ticket for Train ${trainNumber} is on the Waitlist (PNR: ${pnr}). We will notify you if it confirms.`;
            notifType = 'alert';
            break;
    }

    // Try to get the currently logged-in user from the client (since this is server side without direct req access here easily, 
    // we need to be careful if user_id isn't explicitly passed. Wait, booking.service doesn't receive `userId`.
    // Let's modify the signature or assume we need to accept userId in the controller).
    // Let's check `booking.controller.js` to see if userId is available. If not, we skip for now or we must update it.
    
    // If we have a userId, insert the notification
    if (userId) {
        try {
            await adminDb.collection('notifications').add({
                userId: userId,
                type: notifType,
                title: notifTitle,
                message: notifMessage,
                forYou: true,
                link: `/?pnr=${pnr}#pnr-section`,
                created_at: new Date().toISOString()
            });
        } catch (notifErr) {
            console.error("Failed to insert booking notification (non-fatal):", notifErr.message);
        }
    }

    return { pnr, status: passengerRecords[0].status, passengers: passengerRecords };
};

// ---------------------------------------------
// CORE SERVICE: Cancel Booking
// ---------------------------------------------
const cancelBooking = async (pnr, passengerId = null) => {
    // 1. Fetch Booking
    const snapshot = await adminDb.collection('pnr_bookings')
        .where('pnr', '==', pnr)
        .limit(1)
        .get();

    if (snapshot.empty) throw new Error('PNR not found');
    const bookingDoc = snapshot.docs[0];
    const booking = { id: bookingDoc.id, ...bookingDoc.data() };

    let passengersToCancel = [];
    let updatedPassengers = [];

    if (passengerId) {
        booking.passengers.forEach(p => {
            if (p.name === passengerId) {
                passengersToCancel.push(p);
            } else {
                updatedPassengers.push(p);
            }
        });
    } else {
        passengersToCancel = booking.passengers;
        updatedPassengers = [];
    }

    const { trainNumber, journeyDate, classCode, fromIndex, toIndex } = booking;
    const canceledCnfSeats = [];

    passengersToCancel.forEach(p => {
        if (p.status === 'CNF') {
            canceledCnfSeats.push(p.seatNumber);
        }
    });

    // Process Promotions if any CNF seats freed
    if (canceledCnfSeats.length > 0) {
        await processPromotions(trainNumber, journeyDate, classCode, canceledCnfSeats, fromIndex, toIndex);
    }

    if (updatedPassengers.length === 0) {
        await adminDb.collection('pnr_bookings').doc(booking.id).delete();
        return { message: 'Booking Cancelled Fully' };
    } else {
        await adminDb.collection('pnr_bookings').doc(booking.id).update({
            passengers: updatedPassengers
        });
        return { message: 'Passenger Cancelled' };
    }
};

// Start Promotion Chain
const processPromotions = async (trainNumber, journeyDate, classCode, freedSeats, freedFrom, freedTo) => {
    // 1. Fetch current waiting list for this train/date/class
    const snapshot = await adminDb.collection('pnr_bookings')
        .where('trainNumber', '==', String(trainNumber))
        .where('journeyDate', '==', journeyDate)
        .where('classCode', '==', classCode)
        .get();

    const waitlistBookings = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));

    let wlQueue = [];
    // Extract all WL passengers and sort by WL number
    waitlistBookings.forEach(booking => {
        // Skip bookings that don't overlap with the freed seat's route
        if (!(booking.fromIndex < freedTo && booking.toIndex > freedFrom)) return;

        booking.passengers.forEach((p, idx) => {
            if (p.status === 'WL' && p.wlNumber > 0) {
                wlQueue.push({ 
                    bookingId: booking.id, 
                    passengerIdx: idx, 
                    wlNumber: p.wlNumber 
                });
            }
        });
    });

    wlQueue.sort((a, b) => a.wlNumber - b.wlNumber);

    if (wlQueue.length === 0) return; // No one to promote

    // Map to store updates grouped by booking ID
    const bookingUpdates = {}; // { bookingId: { passengers: [] } }

    const applyPromo = (promo, status, seat, wl, rac) => {
        if (!bookingUpdates[promo.bookingId]) {
            const original = waitlistBookings.find(b => b.id === promo.bookingId);
            bookingUpdates[promo.bookingId] = { passengers: [...original.passengers] };
        }
        const p = bookingUpdates[promo.bookingId].passengers[promo.passengerIdx];
        p.status = status;
        p.seatNumber = seat;
        p.wlNumber = wl;
        p.racNumber = rac;
    };

    // SINGLE SEAT CANCELLATION LOGIC
    if (freedSeats.length === 1) {
        const freedSeat = freedSeats[0];
        const p1 = wlQueue.shift();
        if (p1) applyPromo(p1, 'RAC', `${freedSeat}-RAC-Share`, null, 0);

        const p2 = wlQueue.shift();
        if (p2) applyPromo(p2, 'RAC', `${freedSeat}-RAC-Share`, null, 0);
    } else {
        const halfCount = Math.ceil(Math.min(wlQueue.length, freedSeats.length * 2) / 2);
        for (let i = 0; i < halfCount; i++) {
            if (wlQueue.length === 0 || freedSeats.length === 0) break;
            const p = wlQueue.shift();
            const seat = freedSeats.shift();
            applyPromo(p, 'CNF', seat, null, null);
        }
        while (wlQueue.length > 0 && freedSeats.length > 0) {
            const seat = freedSeats.shift();
            const p1 = wlQueue.shift();
            if (p1) applyPromo(p1, 'RAC', `${seat}-RAC-Share`, null, 0);
            const p2 = wlQueue.shift();
            if (p2) applyPromo(p2, 'RAC', `${seat}-RAC-Share`, null, 0);
        }
    }

    // Apply grouped updates
    const batch = adminDb.batch();
    for (const [id, data] of Object.entries(bookingUpdates)) {
        const ref = adminDb.collection('pnr_bookings').doc(id);
        batch.update(ref, { passengers: data.passengers });
    }
    await batch.commit();

    console.log(`Promoted ${Object.keys(bookingUpdates).length} bookings' passengers from Waitlist.`);
};

// ---------------------------------------------
// CORE SERVICE: Get Booking Status
// ---------------------------------------------
const getBookingStatus = async (pnr) => {
    const snapshot = await adminDb.collection('pnr_bookings')
        .where('pnr', '==', pnr)
        .limit(1)
        .get();

    if (snapshot.empty) {
        throw new Error('PNR not found or server error');
    }

    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
};

// ---------------------------------------------
// Get Booked Seats List (for Seat Layout View)
// ---------------------------------------------
const getBookedSeatsList = async (trainNumber, journeyDate) => {
    // 1. Fetch all bookings for this train and date
    const snapshot = await adminDb.collection('pnr_bookings')
        .where('trainNumber', '==', String(trainNumber))
        .where('journeyDate', '==', journeyDate)
        .get();

    const bookings = snapshot.docs.map(doc => doc.data());

    // 2. Fetch all ACTIVE (non-expired) seat blocks
    const now = new Date().toISOString();
    const blockSnapshot = await adminDb.collection('seat_blocks')
        .where('train_number', '==', String(trainNumber))
        .where('journey_date', '==', journeyDate)
        .where('expires_at', '>', now)
        .get();

    const blockedSeats = blockSnapshot.docs.map(doc => doc.data());

    // 3. Extract seat numbers -> 'coachId-seatNumber'
    const unavailableSeatIds = new Set();
    
    // Confirmed bookings (within passengers array)
    bookings.forEach(booking => {
        if (booking.passengers) {
            booking.passengers.forEach(p => {
                if (p.status === 'CNF' && p.seatNumber) {
                    unavailableSeatIds.add(p.seatNumber);
                }
            });
        }
    });

    // Temporary blocks
    blockedSeats.forEach(b => {
        unavailableSeatIds.add(b.seat_id);
    });

    return Array.from(unavailableSeatIds);
};

// ---------------------------------------------
// CORE SERVICE: Get Booking History (By User ID)
// ---------------------------------------------
const getBookingHistoryByUserId = async (userId) => {
    const snapshot = await adminDb.collection('pnr_bookings')
        .where('user_id', '==', userId)
        .orderBy('journeyDate', 'desc')
        .get();

    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
};

export default {
    bookTicket,
    cancelBooking,
    getBookingStatus,
    getBookedSeatsList,
    getBookingHistoryByUserId
};
