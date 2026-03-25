import bookingService from '../services/booking.service.js';
import { dataStore } from '../../data/dataLoader.js';
import { sendBookingConfirmationEmail } from '../services/email.service.js';

const createBookingHandler = async (req, res) => {
    try {
        const { trainNumber, journeyDate, classCode, source, destination, passengers, totalFare } = req.body;

        if (!trainNumber || !journeyDate || !classCode || !source || !destination || !passengers) {
            return res.status(400).json({ error: "Missing required booking details." });
        }

        // Date Validation: 2 months (60 days) limit
        const journeyDateObj = new Date(journeyDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const maxBookingDate = new Date();
        maxBookingDate.setDate(today.getDate() + 60);
        maxBookingDate.setHours(23, 59, 59, 999);

        if (isNaN(journeyDateObj.getTime())) {
            return res.status(400).json({ error: "Invalid journey date format." });
        }

        if (journeyDateObj < today) {
            return res.status(400).json({ error: "Journey date cannot be in the past." });
        }

        if (journeyDateObj > maxBookingDate) {
            return res.status(400).json({ error: "Bookings are only allowed up to 2 months (60 days) in advance." });
        }

        // Fetch Schedule (Fallback to generic schedule if not in local mock DB due to RapidAPI migration)
        let trainSchedule = [];
        const train = dataStore.trains.find(t => t.trainNumber === String(trainNumber));

        if (train && train.schedule) {
            trainSchedule = train.schedule;
        } else {
            // Provide a bare minimum synthetic schedule to pass validation in bookingService
            trainSchedule = [
                { stationCode: source },
                { stationCode: destination }
            ];
        }

        const userId = req.user?.id || null; // Captured from optionalAuth if logged in

        const booking = await bookingService.bookTicket(
            trainNumber, 
            source, 
            destination, 
            journeyDate, 
            classCode, 
            passengers, 
            trainSchedule, 
            userId,
            totalFare
        );

        // --- Send Email Confirmation if logged in ---
        if (req.user?.email) {
            try {
                await sendBookingConfirmationEmail(req.user.email, {
                    pnr: booking.pnr,
                    trainNumber,
                    journeyDate,
                    source,
                    destination,
                    passengers: booking.passengers
                });
            } catch (emailErr) {
                console.error("[Booking Email Error] Failed to send confirmation:", emailErr.message);
                // We don't fail the request if just the email fails
            }
        }

        res.status(201).json(booking);
    } catch (err) {
        console.error("Booking Error:", err);
        res.status(500).json({ error: err.message });
    }
};

const cancelBookingHandler = async (req, res) => {
    try {
        const pnr = req.params.pnr;
        const result = await bookingService.cancelBooking(pnr);
        res.status(200).json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const getBookingStatusHandler = async (req, res) => {
    try {
        const pnr = req.params.pnr;
        const result = await bookingService.getBookingStatus(pnr);

        // Enhance with train details if possible (optional)
        const train = dataStore.trains.find(t => t.trainNumber === result.trainNumber);
        if (train) {
            result.trainName = train.trainName;
            result.departureTime = train.departureTime; // simple fallback
            // Try to find exact stations
            const src = train.schedule.find(s => s.stationCode === result.source);
            const dst = train.schedule.find(s => s.stationCode === result.destination);
            if (src) result.departureTime = src.departureTime;
            if (dst) result.arrivalTime = dst.arrivalTime;
            result.duration = "TBD"; // simplistic
        }

        res.status(200).json(result);
    } catch (err) {
        res.status(404).json({ error: err.message });
    }
};

const getBookedSeatsHandler = async (req, res) => {
    try {
        const { trainNumber, date, source, destination } = req.query;
        if (!trainNumber || !date) return res.status(400).json({ error: "Missing trainNumber or date" });

        const bookedIds = await bookingService.getBookedSeatsList(trainNumber, date, source, destination);
        res.status(200).json({ success: true, bookedSeats: bookedIds });
    } catch (err) {
        console.error("Get Booked Seats Error:", err);
        res.status(500).json({ error: err.message });
    }
};

const getBookingHistoryHandler = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: "Unauthorized" });

        const history = await bookingService.getBookingHistoryByUserId(userId);
        res.status(200).json(history);
    } catch (err) {
        console.error("Booking History Error:", err);
        res.status(500).json({ error: err.message });
    }
};

export default {
    createBookingHandler,
    cancelBookingHandler,
    getBookingStatusHandler,
    getBookedSeatsHandler,
    getBookingHistoryHandler
};
