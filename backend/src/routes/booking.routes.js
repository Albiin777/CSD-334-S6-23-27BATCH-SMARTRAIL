import express from 'express';
const router = express.Router();
import bookingController from '../controllers/booking.controller.js';
import { authenticateToken, optionalAuth } from '../middlewares/auth.middleware.js';


// Define Routes
router.get('/booked-seats', bookingController.getBookedSeatsHandler);
router.post('/', authenticateToken, bookingController.createBookingHandler);
router.delete('/:pnr', authenticateToken, bookingController.cancelBookingHandler);
router.get('/history', authenticateToken, bookingController.getBookingHistoryHandler);
router.get('/:pnr', bookingController.getBookingStatusHandler);

export default router;
