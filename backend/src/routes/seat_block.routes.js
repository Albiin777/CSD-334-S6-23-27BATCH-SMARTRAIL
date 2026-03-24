import express from 'express';
const router = express.Router();
import seatBlockController from '../controllers/seat_block.controller.js';
import { optionalAuth } from '../middlewares/auth.middleware.js';

router.post('/block', optionalAuth, seatBlockController.blockSeat);
router.post('/unblock', seatBlockController.unblockSeat);
router.get('/active', optionalAuth, seatBlockController.getActiveBlocks);

export default router;
