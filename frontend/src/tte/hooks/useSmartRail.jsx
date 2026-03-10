import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { auth, db } from '../../utils/firebaseClient';
import { onAuthStateChanged } from 'firebase/auth';
import { 
    collection, 
    query, 
    where, 
    getDocs, 
    limit, 
    orderBy, 
    doc, 
    getDoc, 
    updateDoc, 
    addDoc, 
    serverTimestamp 
} from 'firebase/firestore';

const SmartRailContext = createContext(null);

const COACH_CONFIGS = {
    '1A': { label: 'First AC', berths: 24, berthsPerBay: 4, bays: 6, bayLabels: ['LB', 'UB', 'LB', 'UB'], hasSide: false, color: '#a855f7' },
    '2A': { label: 'AC 2-Tier', berths: 48, berthsPerBay: 6, bays: 8, bayLabels: ['LB', 'UB', 'LB', 'UB', 'SL', 'SU'], hasSide: true, color: '#3b82f6' },
    '3A': { label: 'AC 3-Tier', berths: 72, berthsPerBay: 8, bays: 9, bayLabels: ['LB', 'MB', 'UB', 'LB', 'MB', 'UB', 'SL', 'SU'], hasSide: true, color: '#22c55e' },
    'SL': { label: 'Sleeper', berths: 72, berthsPerBay: 8, bays: 9, bayLabels: ['LB', 'MB', 'UB', 'LB', 'MB', 'UB', 'SL', 'SU'], hasSide: true, color: '#eab308' },
    'CC': { label: 'AC Chair Car', berths: 78, berthsPerBay: 5, bays: 15, bayLabels: ['W', 'M', 'A', 'A', 'W'], hasSide: false, color: '#06b6d4', isChair: true },
    '2S': { label: '2nd Sitting', berths: 108, berthsPerBay: 6, bays: 18, bayLabels: ['W', 'M', 'A', 'A', 'M', 'W'], hasSide: false, color: '#f97316', isChair: true },
};

const getBerthLabel = (num, coachType) => {
    const cfg = COACH_CONFIGS[coachType];
    if (!cfg) return '—';
    const pos = ((num - 1) % cfg.berthsPerBay);
    return cfg.bayLabels[pos] || '—';
};

const getBerthFull = (num, coachType) => {
    const short = getBerthLabel(num, coachType);
    const map = { LB: 'Lower Berth', MB: 'Middle Berth', UB: 'Upper Berth', SL: 'Side Lower', SU: 'Side Upper', W: 'Window', M: 'Middle', A: 'Aisle' };
    return map[short] || short;
};

const getBay = (num, coachType) => {
    const cfg = COACH_CONFIGS[coachType];
    if (!cfg) return 1;
    return Math.ceil(num / cfg.berthsPerBay);
};

const isSideBerth = (num, coachType) => {
    const cfg = COACH_CONFIGS[coachType];
    if (!cfg || !cfg.hasSide) return false;
    const pos = ((num - 1) % cfg.berthsPerBay);
    return pos >= (cfg.berthsPerBay - 2);
};

function buildCoachSeats(coachId, coachType, passengerList, backendBerths) {
    const cfg = COACH_CONFIGS[coachType];
    const coachPassengers = passengerList.filter(p => p.coach === coachId);
    const totalSeats = backendBerths?.length || cfg?.berths || 0;
    if (totalSeats === 0) return [];

    return Array.from({ length: totalSeats }, (_, i) => {
        const num = i + 1;
        const passenger = coachPassengers.find(p => p.seatNo === num);
        const backendBerth = backendBerths?.[i];
        const berthTypeFull = backendBerth
            ? (() => {
                const map = { LB: 'Lower Berth', MB: 'Middle Berth', UB: 'Upper Berth', SL: 'Side Lower', SU: 'Side Upper', W: 'Window', M: 'Middle', A: 'Aisle', SEAT: 'Seat' };
                return map[backendBerth.berthType] || backendBerth.berthType;
              })()
            : getBerthFull(num, coachType);
        const berthTypeShort = backendBerth?.berthType || getBerthLabel(num, coachType);
        const bay = Math.ceil(num / (cfg?.berthsPerBay || 8));

        let status = 'available';
        if (passenger) {
            if (['Confirmed', 'CNF'].includes(passenger.status)) status = 'booked';
            else if (passenger.status === 'RAC') status = 'rac';
            else if (['Waitlist', 'WL'].includes(passenger.status)) status = 'waitlist';
        }
        return {
            number: num, bay, type: berthTypeFull, typeShort: berthTypeShort,
            isSide: ['SL', 'SU'].includes(berthTypeShort),
            status, passenger: passenger || null,
        };
    });
}

const STATIONS = [
    'Chennai Central', 'Perambur', 'Arakkonam Jn', 'Renigunta Jn',
    'Vijayawada Jn', 'Warangal', 'Nagpur Jn', 'Bhopal Jn',
    'Jhansi Jn', 'Gwalior Jn', 'Agra Cantt', 'New Delhi',
];

export function SmartRailProvider({ children }) {
    const [time, setTime] = useState(new Date());
    const [stationIndex, setStationIndex] = useState(0);
    const [selectedCoach, setSelectedCoach] = useState(null);
    const [passengers, setPassengers] = useState([]);
    const [coaches, setCoaches] = useState([]);
    const [incidents, setIncidents] = useState([]);
    const [fines, setFines] = useState([]);
    const [reviews, setReviews] = useState([]);
    const [complaints, setComplaints] = useState([]);
    const [backendCoachMap, setBackendCoachMap] = useState({});
    const [dataSource, setDataSource] = useState('loading');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [trainId, setTrainId] = useState(null);
    const [trainDetails, setTrainDetails] = useState(null);
    const [tteDetails, setTteDetails] = useState(null);
    const [logs, setLogs] = useState([]);

    const addLog = (action, type = 'info') => {
        const t = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
        setLogs(prev => [{ time: t, action, type }, ...prev]);
    };

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        let unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
            if (unsubscribeAuth) unsubscribeAuth();
            if (!currentUser && !localStorage.getItem('tteEmail')) {
                setLoading(false);
                return;
            }

            async function loadFromFirestore() {
                try {
                    let profileName = null;
                    let tteEmail = currentUser?.email || localStorage.getItem('tteEmail');

                    if (currentUser?.uid) {
                        const pDoc = await getDoc(doc(db, 'profiles', currentUser.uid));
                        if (pDoc.exists()) {
                            profileName = pDoc.data().full_name;
                            if (pDoc.data().email) tteEmail = pDoc.data().email;
                        }
                    }

                    let assignedTrainNumber = null;
                    let assignedCoachId = null;
                    let assignmentData = null;

                    if (tteEmail) {
                        const q = query(collection(db, 'tte_assignments'), where('tte_email', '==', tteEmail), where('status', '==', 'active'), limit(1));
                        const qSnap = await getDocs(q);
                        if (!qSnap.empty) {
                            assignmentData = qSnap.docs[0].data();
                            assignedTrainNumber = assignmentData.train_no;
                            assignedCoachId = assignmentData.coach_ids?.[0];
                            setTteDetails({
                                name: profileName || currentUser?.displayName || assignmentData.tte_name || 'TTE',
                                id: assignmentData.tte_id,
                                trainName: assignmentData.train_name,
                                source: assignmentData.source_station,
                                destination: assignmentData.dest_station,
                                assignedCoachId,
                                assignedCoaches: assignmentData.coach_ids || []
                            });
                        }
                    }

                    if (!assignedTrainNumber) assignedTrainNumber = localStorage.getItem('tte_train_number');

                    const trainsSnap = await getDocs(query(collection(db, 'trains'), where('train_number', '==', String(assignedTrainNumber)), limit(1)));
                    if (trainsSnap.empty) {
                        setError(`No train found: ${assignedTrainNumber}`);
                        setDataSource('error');
                        setLoading(false);
                        return;
                    }

                    const tData = { id: trainsSnap.docs[0].id, ...trainsSnap.docs[0].data() };
                    setTrainId(tData.id);
                    setTrainDetails(tData);

                    const coachSnap = await getDocs(query(collection(db, 'coaches'), where('train_id', '==', tData.id), orderBy('position')));
                    let mappedCoaches = coachSnap.docs.map(d => ({ id: d.data().coach_id, type: d.data().coach_type, label: d.data().label, dbId: d.id }));
                    
                    if (assignedCoachId && assignmentData?.coach_ids?.length > 0) {
                        mappedCoaches = mappedCoaches.filter(c => assignmentData.coach_ids.includes(c.id));
                    }
                    
                    setCoaches(mappedCoaches);
                    setSelectedCoach(assignedCoachId || mappedCoaches[0]?.id);

                    const pnrSnap = await getDocs(query(collection(db, 'pnr_bookings'), where('trainNumber', '==', String(tData.train_number))));
                    let allPax = [];
                    pnrSnap.forEach(doc => {
                        const b = doc.data();
                        (b.passengers || []).forEach(p => {
                            allPax.push({
                                id: `${doc.id}_${p.name}`,
                                pnr: b.pnr,
                                name: p.name,
                                age: p.age,
                                gender: p.gender,
                                seatNo: p.seatNumber ? parseInt(p.seatNumber.split('-').pop()) : 0,
                                coach: p.seatNumber ? p.seatNumber.split('-')[0] : '',
                                status: p.status,
                                verified: p.verified || false,
                                fare: b.totalFare || 0
                            });
                        });
                    });
                    setPassengers(allPax);

                    setDataSource('firestore');
                } catch (err) {
                    console.error('Loader error:', err);
                    setError(err.message);
                    setDataSource('error');
                } finally {
                    setLoading(false);
                }
            }
            await loadFromFirestore();
        });
        return () => unsubscribeAuth();
    }, []);

    const verifyPassenger = useCallback(async (paxId) => {
        setPassengers(prev => prev.map(p => p.id === paxId ? { ...p, verified: true } : p));
        const p = passengers.find(x => x.id === paxId);
        if (!p) return;
        const bRef = doc(db, 'pnr_bookings', p.id.split('_')[0]);
        const bDoc = await getDoc(bRef);
        if (bDoc.exists()) {
            const updated = bDoc.data().passengers.map(px => px.name === p.name ? { ...px, verified: true } : px);
            await updateDoc(bRef, { passengers: updated });
        }
    }, [passengers]);

    const nextStation = () => {
        setStationIndex(prev => (prev + 1) % STATIONS.length);
        addLog(`Arrived at ${STATIONS[(stationIndex + 1) % STATIONS.length]}`, 'success');
    };

    const safeCoach = selectedCoach || '';
    const currentCoachObj = coaches.find(c => c.id === safeCoach) || null;
    const currentCoachType = currentCoachObj?.type || '3A';
    const currentConfig = COACH_CONFIGS[currentCoachType];
    const seats = buildCoachSeats(safeCoach, currentCoachType, passengers, backendCoachMap[safeCoach]?.berths);

    const coachPassengers = passengers.filter(p => p.coach === safeCoach);
    const stats = {
        totalSeats: currentConfig?.berths || 0,
        booked: coachPassengers.filter(p => ['Confirmed', 'CNF', 'RAC'].includes(p.status)).length,
        verified: coachPassengers.filter(p => p.verified).length,
        vacant: (currentConfig?.berths || 0) - coachPassengers.filter(p => ['Confirmed', 'CNF', 'RAC'].includes(p.status)).length,
    };

    const tteInfo = {
        name: tteDetails?.name || 'TTE',
        id: tteDetails?.id || '—',
        trainNo: trainDetails?.train_number || '—',
        trainName: tteDetails?.trainName || trainDetails?.name || '—',
        route: `${tteDetails?.source || trainDetails?.source || '—'} → ${tteDetails?.destination || trainDetails?.destination || '—'}`,
        date: new Date().toLocaleDateString('en-IN'),
        coach: safeCoach,
        coachType: currentCoachType,
        dataSource
    };

    const value = {
        time, passengers: coachPassengers, allPassengers: passengers, coaches, incidents, fines, reviews, complaints,
        selectedCoach, setSelectedCoach, tteInfo, stats, seats, dataSource, loading, error,
        verifyPassenger, addLog, logs, getBerthLabel, getBerthFull, getBay, isSideBerth,
        stations: STATIONS, stationIndex, nextStation, coachConfigs: COACH_CONFIGS
    };

    return <SmartRailContext.Provider value={value}>{children}</SmartRailContext.Provider>;
}

export function useSmartRail() {
    const ctx = useContext(SmartRailContext);
    if (!ctx) throw new Error('useSmartRail must be used within SmartRailProvider');
    return ctx;
}
