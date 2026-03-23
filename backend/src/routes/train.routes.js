
import { Router } from 'express';
import {
    getTrainDetails,
    getTrainSchedule,
    getTrainsBetween,
    searchStations,
    searchTrains,
    getSeatLayout,
    getAvailability,
    getStationDetails,
    getFare,
    getCoachAllocation,
    updateTrainDetails,
    getCoachTypes
} from '../controllers/train.controller.js';

const router = Router();

router.put('/admin/:trainNumber', updateTrainDetails);

router.get('/search', searchTrains);
router.get('/search/stations', searchStations);
router.get('/between-stations', getTrainsBetween);
router.get('/:trainNumber', getTrainDetails);
router.get('/:trainNumber/schedule', getTrainSchedule);
router.get('/:trainNumber/seat-layout', getSeatLayout);
router.get('/:trainNumber/availability', getAvailability);
router.get('/:trainNumber/coach-allocation', getCoachAllocation);
router.get('/:trainNumber/fare', getFare);
router.get('/station/:stationCode', getStationDetails);
router.get('/config/coach-types', getCoachTypes);

export default router;
