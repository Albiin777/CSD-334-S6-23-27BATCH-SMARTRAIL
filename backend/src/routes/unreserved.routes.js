import express from 'express';
export const router = express.Router();
import { bookUnreservedTicket, getUnreservedTickets } from '../controllers/unreserved.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

// Define Routes
router.post('/book', authenticateToken, bookUnreservedTicket);
router.get('/', authenticateToken, getUnreservedTickets);

export default router;
