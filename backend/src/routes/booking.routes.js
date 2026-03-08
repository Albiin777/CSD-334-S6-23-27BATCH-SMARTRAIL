import express from 'express';
const router = express.Router();
import bookingController from '../controllers/booking.controller.js';
import { optionalAuth } from '../middlewares/auth.middleware.js';


// Define Routes
router.get('/booked-seats', bookingController.getBookedSeatsHandler);
router.post('/', optionalAuth, bookingController.createBookingHandler);
router.delete('/:pnr', bookingController.cancelBookingHandler);
router.get('/history', optionalAuth, bookingController.getBookingHistoryHandler);
router.get('/:pnr', bookingController.getBookingStatusHandler);

export default router;
