import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { auth, db, storage } from '../../utils/firebaseClient';
import { onAuthStateChanged } from 'firebase/auth';
import api from '../../api/train.api';
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
    serverTimestamp,
    onSnapshot 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

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
    
    console.log(`[buildCoachSeats] Coach: ${coachId}, Type: ${coachType}, Backend berths: ${backendBerths?.length || 0}, Config berths: ${cfg?.berths || 0}, Total: ${totalSeats}`);
    
    if (totalSeats === 0) return [];

    return Array.from({ length: totalSeats }, (_, i) => {
        const num = i + 1;
        const passenger = coachPassengers.find(p => p.seatNo === num);
        const backendBerth = backendBerths?.[i];
        
        // Use backend berth type if available, otherwise calculate from config
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

export function SmartRailProvider({ children }) {
    const [time, setTime] = useState(new Date());
    const [stationIndex, setStationIndex] = useState(0);
    const [selectedCoach, setSelectedCoach] = useState(null);
    const [passengers, setPassengers] = useState([]);
    const [coaches, setCoaches] = useState([]);
    const [stations, setStations] = useState([]); // Will be populated from train schedule API
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

    // Debug: log when coaches/selectedCoach changes
    useEffect(() => {
        console.log("[useSmartRail] State update - coaches:", coaches.length, "selectedCoach:", selectedCoach, "backendCoachMap keys:", Object.keys(backendCoachMap));
    }, [coaches, selectedCoach, backendCoachMap]);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
            // Remove instant unsubscribe to allow profile updates to reflect if auth changes or loads late
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
                            const pData = pDoc.data();
                            profileName = pData.full_name || pData.fullName || pData.name;
                            if (pData.email) tteEmail = pData.email;
                        }
                    }

                    // Fallback to searching by email if profile ID didn't match (e.g. legacy accounts or email search)
                    if (!profileName && tteEmail) {
                        try {
                            const profileQ = query(collection(db, 'profiles'), where('email', '==', tteEmail.toLowerCase()), limit(1));
                            const profileSnap = await getDocs(profileQ);
                            if (!profileSnap.empty) {
                                profileName = profileSnap.docs[0].data().full_name || profileSnap.docs[0].data().fullName || profileSnap.docs[0].data().name;
                            }
                        } catch (e) {
                            console.warn("[useSmartRail] Profile search by email failed:", e);
                        }
                    }

                    let assignedTrainNumber = null;
                    let assignedCoachId = null;
                    let assignmentData = null;

                    if (tteEmail) {
                        console.log("[useSmartRail] Looking for TTE assignment with email:", tteEmail);
                        const q = query(collection(db, 'tte_assignments'), where('tte_email', '==', tteEmail), where('status', '==', 'active'), limit(1));
                        const qSnap = await getDocs(q);
                        console.log("[useSmartRail] TTE assignment query result:", qSnap.size, "docs");
                        if (!qSnap.empty) {
                            assignmentData = qSnap.docs[0].data();
                            console.log("[useSmartRail] Assignment data:", assignmentData);
                            assignedTrainNumber = assignmentData.train_no;
                            assignedCoachId = assignmentData.coach_ids?.[0];
                            
                            const finalDisplayName = profileName || currentUser?.displayName || assignmentData.tte_name || 'TTE';

                            setTteDetails({
                                name: finalDisplayName,
                                id: assignmentData.tte_id || 'TTE-001',
                                trainName: assignmentData.train_name,
                                trainNo: assignmentData.train_no,
                                source: assignmentData.source_station,
                                destination: assignmentData.dest_station,
                                shift: assignmentData.shift || 'Full Journey',
                                coachLabel: assignmentData.coach_labels?.[0] || assignedCoachId || 'S1',
                                assignedCoachId,
                                assignedCoaches: assignmentData.coach_ids || [],
                                // Extra fields from assignment
                                journeyDate: assignmentData.duty_date || assignmentData.journey_date || assignmentData.date || null,
                                shiftStart: assignmentData.shift_start || null,
                                shiftEnd: assignmentData.shift_end || null,
                                zone: assignmentData.zone || null,
                                division: assignmentData.division || null,
                                pantry: assignmentData.pantry != null ? (assignmentData.pantry ? 'Yes' : 'No') : null,
                                rakeType: assignmentData.rake_type || assignmentData.rakeType || null,
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

                    try {
                        const scheduleRes = await api.getTrainSchedule(tData.train_number);
                        if (scheduleRes && scheduleRes.data && scheduleRes.data.length > 0) {
                            setStations(scheduleRes.data.map(s => s.stationName || s.stationCode));
                            // Extract departure from first stop, arrival from last stop
                            const firstStop = scheduleRes.data[0];
                            const lastStop = scheduleRes.data[scheduleRes.data.length - 1];
                            const deptTime = firstStop?.departureTime || firstStop?.arrivalTime || null;
                            const arrvTime = lastStop?.arrivalTime || lastStop?.departureTime || null;
                            // Calculate duration if both times are available
                            let durationStr = null;
                            if (deptTime && arrvTime) {
                                const toMins = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
                                let mins = toMins(arrvTime) - toMins(deptTime);
                                if (mins < 0) mins += 24 * 60; // overnight
                                durationStr = `${Math.floor(mins / 60)}h ${mins % 60}m`;
                            }
                            setTteDetails(prev => ({
                                ...prev,
                                departure: deptTime,
                                arrival: arrvTime,
                                duration: durationStr,
                                // Store actual station names from schedule
                                sourceFullName: firstStop?.stationName || firstStop?.stationCode || prev?.source,
                                destFullName: lastStop?.stationName || lastStop?.stationCode || prev?.destination,
                                sourceCode: firstStop?.stationCode || prev?.source,
                                destCode: lastStop?.stationCode || prev?.destination,
                            }));
                        }
                    } catch (e) {
                        console.warn("[useSmartRail] Failed to load schedule:", e);
                    }

                    let mappedCoaches = [];
                    let backendMap = {};
                    try {
                        console.log("[useSmartRail] Fetching seat layout for train:", tData.train_number);
                        const layoutRes = await api.getSeatLayout(tData.train_number);
                        console.log("[useSmartRail] Layout response:", layoutRes);
                        if (layoutRes && layoutRes.coaches) {
                            layoutRes.coaches.forEach((c, i) => {
                                backendMap[c.coachId] = c;
                                mappedCoaches.push({ id: c.coachId, type: c.classCode, label: c.coachId, dbId: `b_${i}` });
                            });
                            setBackendCoachMap(backendMap);
                            console.log("[useSmartRail] Loaded", mappedCoaches.length, "coaches from backend");
                        }
                    } catch (e) {
                         console.warn("[useSmartRail] Failed to load layout:", e);
                    }

                    if (mappedCoaches.length === 0) {
                        const coachSnap = await getDocs(query(collection(db, 'coaches'), where('train_id', '==', tData.id), orderBy('position')));
                        mappedCoaches = coachSnap.docs.map(d => ({ id: d.data().coach_id, type: d.data().coach_type, label: d.data().label || d.data().coach_id, dbId: d.id }));
                    }
                    
                    // Filter to only assigned coaches if TTE has assignments
                    if (assignmentData?.coach_ids?.length > 0) {
                        const targetIds = assignmentData.coach_ids.map(id => id.toUpperCase());
                        console.log("[useSmartRail] TTE assigned coaches:", targetIds);
                        const filtered = mappedCoaches.filter(c => targetIds.includes(c.id.toUpperCase()));
                        
                        // If no matches found from backend, create coaches from assigned IDs 
                        // and map them to real backend layout data by class type
                        if (filtered.length === 0) {
                            console.log("[useSmartRail] No matching coaches from backend, creating from assignment");
                            // Indian Railways coach naming: S=Sleeper, D=Sleeper, C=ChairCar, A=AC1, B=AC2, H=AC3, E=3E
                            const inferCoachType = (coachId) => {
                                const prefix = coachId.charAt(0).toUpperCase();
                                const typeMap = { 
                                    'S': 'SL',  // Sleeper
                                    'D': 'SL',  // Sleeper (D-coach series)
                                    'C': 'CC',  // AC Chair Car
                                    'A': '1A',  // First AC
                                    'B': '2A',  // AC 2-Tier
                                    'H': '3A',  // AC 3-Tier
                                    'E': '3E',  // 3-Economy
                                    'G': '2S',  // General/Second Sitting
                                };
                                return typeMap[prefix] || 'SL';
                            };
                            
                            // Group backend coaches by class type for layout data reuse
                            const backendByType = {};
                            Object.values(backendMap).forEach(coach => {
                                if (!backendByType[coach.classCode]) {
                                    backendByType[coach.classCode] = coach;
                                }
                            });
                            
                            mappedCoaches = assignmentData.coach_ids.map((id, i) => {
                                const coachType = inferCoachType(id);
                                // Map this assigned coach to real backend layout data of same type
                                const realLayout = backendByType[coachType];
                                if (realLayout) {
                                    backendMap[id] = { ...realLayout, coachId: id };
                                } else {
                                    // No backend data - create from COACH_CONFIGS
                                    const configData = COACH_CONFIGS[coachType];
                                    if (configData) {
                                        // Generate seats array from config
                                        const seats = Array.from({ length: configData.berths }, (_, seatIndex) => ({
                                            seatNumber: seatIndex + 1,
                                            berthType: configData.bayLabels[seatIndex % configData.berthsPerBay]
                                        }));
                                        backendMap[id] = { 
                                            coachId: id, 
                                            classCode: coachType, 
                                            totalSeats: configData.berths,
                                            seats 
                                        };
                                    }
                                }
                                return {
                                    id: id,
                                    type: coachType,
                                    label: id,
                                    dbId: `assigned_${i}`
                                };
                            });
                            setBackendCoachMap(backendMap);
                            console.log("[useSmartRail] Created coaches:", mappedCoaches.map(c => c.id));
                        } else {
                            mappedCoaches = filtered;
                            console.log("[useSmartRail] Using filtered coaches:", mappedCoaches.map(c => c.id));
                        }
                    }
                    
                    console.log("[useSmartRail] Final mappedCoaches:", mappedCoaches.length, mappedCoaches.map(c => `${c.id}(${c.type})`));
                    setCoaches(mappedCoaches);
                    // Select the first assigned coach as default
                    const initialCoach = mappedCoaches[0]?.id || null;
                    console.log("[useSmartRail] Setting selectedCoach to:", initialCoach);
                    setSelectedCoach(initialCoach);

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
                                fare: b.totalFare || 0,
                                wlNumber: p.wlNumber || null,
                                racNumber: p.racNumber || null,
                                boarding: b.source || null
                            });
                        });
                    });
                    setPassengers(allPax);

                    // Fetch reviews for this train (no orderBy to avoid index requirement)
                    try {
                        const reviewsSnap = await getDocs(query(
                            collection(db, 'reviews'), 
                            where('trainNumber', '==', String(tData.train_number)),
                            limit(100)
                        ));
                        console.log("[useSmartRail] Found", reviewsSnap.docs.length, "reviews for train", tData.train_number);
                        const loadedReviews = reviewsSnap.docs.map(d => {
                            const data = d.data();
                            // Handle Firestore Timestamp
                            let dateStr = '';
                            if (data.created_at) {
                                if (data.created_at.toDate) {
                                    dateStr = data.created_at.toDate().toLocaleDateString('en-IN');
                                } else if (data.created_at._seconds) {
                                    dateStr = new Date(data.created_at._seconds * 1000).toLocaleDateString('en-IN');
                                } else {
                                    dateStr = new Date(data.created_at).toLocaleDateString('en-IN');
                                }
                            }
                            return {
                                id: d.id,
                                passenger: data.passenger_name || data.passengerName || data.userName || 'Anonymous',
                                pnr: data.pnr || '',
                                coach: data.coach || '',
                                seat: data.seat || '',
                                rating: data.rating || 0,
                                category: data.category || 'General',
                                comment: data.comment || data.review || data.text || '',
                                helpful: data.helpful || 0,
                                date: dateStr,
                                created_at: data.created_at
                            };
                        });
                        // Sort by date descending (most recent first)
                        loadedReviews.sort((a, b) => {
                            const getTime = (item) => {
                                if (!item.created_at) return 0;
                                if (item.created_at.toDate) return item.created_at.toDate().getTime();
                                if (item.created_at._seconds) return item.created_at._seconds * 1000;
                                return new Date(item.created_at).getTime();
                            };
                            return getTime(b) - getTime(a);
                        });
                        setReviews(loadedReviews);
                    } catch (e) { console.warn("[useSmartRail] Reviews fetch failed:", e); }

                    // Fetch complaints for this train (no orderBy to avoid index requirement)
                    try {
                        const complaintsSnap = await getDocs(query(
                            collection(db, 'complaints'),
                            where('train_number', '==', String(tData.train_number)),
                            limit(100)
                        ));
                        const loadedComplaints = complaintsSnap.docs.map(d => {
                            const data = d.data();
                            // Handle Firestore Timestamp
                            let dateStr = '';
                            if (data.created_at) {
                                if (data.created_at.toDate) {
                                    dateStr = data.created_at.toDate().toLocaleDateString('en-IN');
                                } else if (data.created_at._seconds) {
                                    dateStr = new Date(data.created_at._seconds * 1000).toLocaleDateString('en-IN');
                                } else {
                                    dateStr = new Date(data.created_at).toLocaleDateString('en-IN');
                                }
                            }
                            return {
                                id: data.complaint_id || `CMP-${d.id.slice(0,6).toUpperCase()}`,
                                dbId: d.id,
                                passenger: data.passenger_name || data.passengerName || 'Anonymous',
                                pnr: data.pnr || '',
                                coach: data.coach || '',
                                category: data.category || 'General',
                                priority: data.priority || 'Medium',
                                status: data.status === 'open' ? 'Open' : data.status === 'in-progress' ? 'In Progress' : data.status === 'resolved' ? 'Resolved' : data.status || 'Open',
                                description: data.description || data.complaint || '',
                                responses: [],
                                date: dateStr,
                                created_at: data.created_at
                            };
                        });
                        // Sort by date descending
                        loadedComplaints.sort((a, b) => {
                            const getTime = (item) => {
                                if (!item.created_at) return 0;
                                if (item.created_at.toDate) return item.created_at.toDate().getTime();
                                if (item.created_at._seconds) return item.created_at._seconds * 1000;
                                return new Date(item.created_at).getTime();
                            };
                            return getTime(b) - getTime(a);
                        });
                        setComplaints(loadedComplaints);
                    } catch (e) { console.warn("[useSmartRail] Complaints fetch failed:", e); }

                    // Fetch incidents for this train (no orderBy to avoid index requirement)
                    try {
                        const incidentsSnap = await getDocs(query(
                            collection(db, 'incidents'),
                            where('train_number', '==', String(tData.train_number)),
                            limit(100)
                        ));
                        const loadedIncidents = incidentsSnap.docs.map(d => {
                            const data = d.data();
                            // Handle Firestore Timestamp
                            let timeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
                            let dateStr = new Date().toLocaleDateString('en-IN');
                            if (data.created_at) {
                                if (data.created_at.toDate) {
                                    timeStr = data.created_at.toDate().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
                                    dateStr = data.created_at.toDate().toLocaleDateString('en-IN');
                                } else if (data.created_at._seconds) {
                                    const dt = new Date(data.created_at._seconds * 1000);
                                    timeStr = dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
                                    dateStr = dt.toLocaleDateString('en-IN');
                                }
                            }
                            return {
                                id: d.id,
                                type: data.type || 'General',
                                description: data.description || '',
                                coach: data.coach || '',
                                reporter: data.reporter || 'TTE',
                                status: data.status || 'Active',
                                photo: data.photo_url || null,
                                time: data.created_at?.toDate ? 
                                    data.created_at.toDate().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) :
                                    new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
                                date: data.created_at?.toDate ? 
                                    data.created_at.toDate().toLocaleDateString('en-IN') : 
                                    new Date().toLocaleDateString('en-IN')
                            };
                        });
                        setIncidents(loadedIncidents);
                    } catch (e) { console.warn("[useSmartRail] Incidents fetch failed:", e); }

                    // Fetch fines for this train
                    try {
                        const finesSnap = await getDocs(query(
                            collection(db, 'fines'),
                            where('train_number', '==', String(tData.train_number)),
                            limit(100)
                        ));
                        const loadedFines = finesSnap.docs.map(d => {
                            const data = d.data();
                            let timeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
                            let dateStr = new Date().toLocaleDateString('en-IN');
                            if (data.created_at) {
                                if (data.created_at.toDate) {
                                    timeStr = data.created_at.toDate().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
                                    dateStr = data.created_at.toDate().toLocaleDateString('en-IN');
                                } else if (data.created_at._seconds) {
                                    const dt = new Date(data.created_at._seconds * 1000);
                                    timeStr = dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
                                    dateStr = dt.toLocaleDateString('en-IN');
                                }
                            }
                            return {
                                id: d.id,
                                receipt: data.receipt_number || `FINE-${d.id.slice(0,8)}`,
                                passenger: data.passenger || 'Unknown',
                                pnr: data.pnr || '',
                                reason: data.reason || '',
                                amount: data.amount || 0,
                                method: data.payment_method || 'Cash',
                                time: timeStr,
                                date: dateStr
                            };
                        });
                        // Sort by date (most recent first)
                        loadedFines.sort((a, b) => {
                            const aTime = new Date(`${a.date} ${a.time}`).getTime();
                            const bTime = new Date(`${b.date} ${b.time}`).getTime();
                            return bTime - aTime;
                        });
                        setFines(loadedFines);
                    } catch (e) { console.warn("[useSmartRail] Fines fetch failed:", e); }

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
        setStationIndex(prev => (prev + 1) % stations.length);
        addLog(`Arrived at ${stations[(stationIndex + 1) % stations.length]}`, 'success');
    };

    // Upgrade RAC passenger to CNF when a seat becomes available
    const upgradeRAC = useCallback(async (paxId) => {
        const p = passengers.find(x => x.id === paxId);
        if (!p || p.status !== 'RAC') return;
        
        // Update local state
        setPassengers(prev => prev.map(px => px.id === paxId ? { ...px, status: 'CNF' } : px));
        
        // Update Firestore
        try {
            const bookingId = p.id.split('_')[0];
            const bRef = doc(db, 'pnr_bookings', bookingId);
            const bDoc = await getDoc(bRef);
            if (bDoc.exists()) {
                const updated = bDoc.data().passengers.map(px => 
                    px.name === p.name ? { ...px, status: 'CNF' } : px
                );
                await updateDoc(bRef, { passengers: updated });
                addLog(`Upgraded ${p.name} from RAC to Confirmed`, 'success');
            }
        } catch (err) {
            console.error('RAC upgrade error:', err);
            addLog(`Failed to upgrade ${p.name}`, 'error');
        }
    }, [passengers, addLog]);

    const issueTicket = async (ticket) => {
        addLog(`Issued ticket to ${ticket.name} (PNR: ${ticket.pnr}) for ${ticket.from} \u2192 ${ticket.to}. Fare: \u20B9${ticket.fare}`, 'success');
        // In a real app we would push this to Firestore, just keeping state mock for now since it's just a demo dashboard
    };

    const safeCoach = selectedCoach || '';
    const currentCoachObj = coaches.find(c => c.id === safeCoach) || null;
    const currentCoachType = currentCoachObj?.type || 'SL';
    const currentConfig = COACH_CONFIGS[currentCoachType];
    // Use backend seats data (not "berths" - backend returns "seats" array)
    const backendCoachData = backendCoachMap[safeCoach];
    
    console.log("[useSmartRail] Rendering - coaches:", coaches.length, "selectedCoach:", safeCoach, "backendCoachData:", !!backendCoachData, "currentConfig:", !!currentConfig);
    
    const seats = buildCoachSeats(safeCoach, currentCoachType, passengers, backendCoachData?.seats);

    const coachPassengers = passengers.filter(p => p.coach === safeCoach);
    // Use real seat count from backend, fallback to config
    const realTotalSeats = backendCoachData?.totalSeats || backendCoachData?.seats?.length || currentConfig?.berths || 0;
    const stats = {
        totalSeats: realTotalSeats,
        booked: coachPassengers.filter(p => ['Confirmed', 'CNF', 'RAC'].includes(p.status)).length,
        verified: coachPassengers.filter(p => p.verified).length,
        vacant: realTotalSeats - coachPassengers.filter(p => ['Confirmed', 'CNF', 'RAC'].includes(p.status)).length,
    };

    // Format today's date or use assignment journey date
    const todayStr = (() => {
        if (tteDetails?.journeyDate) {
            try {
                const d = new Date(tteDetails.journeyDate);
                return d.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
            } catch { return tteDetails.journeyDate; }
        }
        // Show today's date (IST)
        return new Date().toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
    })();

    const tteInfo = {
        name: tteDetails?.name || auth.currentUser?.displayName || 'TTE',
        id: tteDetails?.id || '\u2014',
        trainNo: trainDetails?.train_number || trainDetails?.trainNumber || tteDetails?.trainNo || '\u2014',
        trainName: tteDetails?.trainName || tteDetails?.train_name || trainDetails?.train_name || trainDetails?.trainName || '\u2014',
        route: tteDetails?.sourceFullName
            ? `${tteDetails.sourceFullName} (${tteDetails.sourceCode}) \u2192 ${tteDetails.destFullName} (${tteDetails.destCode})`
            : `${tteDetails?.source || trainDetails?.source || '\u2014'} \u2192 ${tteDetails?.destination || trainDetails?.destination || '\u2014'}`,
        date: todayStr,
        departure: tteDetails?.departure || tteDetails?.shiftStart || '\u2014',
        arrival: tteDetails?.arrival || tteDetails?.shiftEnd || '\u2014',
        duration: tteDetails?.duration || '\u2014',
        shift: tteDetails?.shiftStart && tteDetails?.shiftEnd
            ? `${tteDetails.shiftStart} \u2013 ${tteDetails.shiftEnd}`
            : tteDetails?.shift || '\u2014',
        zone: tteDetails?.zone || trainDetails?.zone || '\u2014',
        rakeType: tteDetails?.rakeType || trainDetails?.rake_type || trainDetails?.type || '\u2014',
        pantryAvailable: tteDetails?.pantry || '\u2014',
        division: tteDetails?.division || trainDetails?.division || '\u2014',
        coachLabel: tteDetails?.coachLabel || '\u2014',
        coach: safeCoach,
        coachType: currentCoachType,
        dataSource
    };

    // Add incident to Firebase with optional photo upload
    const addIncident = useCallback(async (incident) => {
        try {
            let photoUrl = null;
            
            // Upload photo to Firebase Storage if provided (base64 data URL)
            if (incident.photo && incident.photo.startsWith('data:')) {
                const timestamp = Date.now();
                const trainNo = trainDetails?.train_number || 'unknown';
                const fileName = `incidents/${trainNo}/${timestamp}.jpg`;
                const storageRef = ref(storage, fileName);
                
                // Convert base64 to blob
                const response = await fetch(incident.photo);
                const blob = await response.blob();
                
                // Upload to Firebase Storage
                await uploadBytes(storageRef, blob);
                photoUrl = await getDownloadURL(storageRef);
            }
            
            // Create incident document in Firestore
            const incidentDoc = {
                type: incident.type,
                description: incident.description,
                coach: incident.coach || safeCoach,
                reporter: incident.reporter || tteInfo.name,
                reporter_id: tteDetails?.id || 'TTE',
                train_number: trainDetails?.train_number || '',
                train_name: trainDetails?.train_name || tteDetails?.trainName || '',
                photo_url: photoUrl,
                status: 'Active',
                created_at: serverTimestamp(),
                updated_at: serverTimestamp()
            };
            
            const docRef = await addDoc(collection(db, 'incidents'), incidentDoc);
            
            // Update local state
            const newIncident = {
                id: docRef.id,
                type: incident.type,
                description: incident.description,
                coach: incident.coach || safeCoach,
                reporter: incident.reporter || 'TTE',
                status: 'Active',
                photo: photoUrl,
                time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
                date: new Date().toLocaleDateString('en-IN')
            };
            
            setIncidents(prev => [newIncident, ...prev]);
            addLog(`Incident reported: ${incident.type}`, 'incident');
            
            return { success: true, id: docRef.id };
        } catch (error) {
            console.error('[useSmartRail] Failed to add incident:', error);
            addLog(`Failed to report incident: ${error.message}`, 'error');
            return { success: false, error: error.message };
        }
    }, [trainDetails, tteDetails, safeCoach, tteInfo.name, addLog]);

    // Add fine to Firebase
    const addFine = useCallback(async (fine) => {
        try {
            // Generate receipt number
            const receiptNo = `FINE-${Date.now().toString().slice(-8)}`;
            
            // Create fine document in Firestore
            const fineDoc = {
                passenger: fine.passenger,
                pnr: fine.pnr || '',
                reason: fine.reason,
                amount: fine.amount,
                payment_method: fine.method || 'Cash',
                receipt_number: receiptNo,
                train_number: trainDetails?.train_number || '',
                train_name: trainDetails?.train_name || tteDetails?.trainName || '',
                issued_by: tteInfo.name,
                issued_by_id: tteDetails?.id || 'TTE',
                coach: safeCoach,
                status: 'Paid',
                created_at: serverTimestamp()
            };
            
            const docRef = await addDoc(collection(db, 'fines'), fineDoc);
            
            // Update local state
            const newFine = {
                id: docRef.id,
                receipt: receiptNo,
                passenger: fine.passenger,
                pnr: fine.pnr || '',
                reason: fine.reason,
                amount: fine.amount,
                method: fine.method || 'Cash',
                time: fine.time || new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
                date: new Date().toLocaleDateString('en-IN')
            };
            
            setFines(prev => [newFine, ...prev]);
            addLog(`Fine issued: ₹${fine.amount} to ${fine.passenger}`, 'fine');
            
            return { success: true, id: docRef.id, receipt: receiptNo };
        } catch (error) {
            console.error('[useSmartRail] Failed to add fine:', error);
            addLog(`Failed to issue fine: ${error.message}`, 'error');
            return { success: false, error: error.message };
        }
    }, [trainDetails, tteDetails, safeCoach, tteInfo.name, addLog]);

    const value = {
        time, passengers: coachPassengers, allPassengers: passengers, coaches, incidents, fines, reviews, complaints,
        selectedCoach, setSelectedCoach, tteInfo, stats, seats, dataSource, loading, error,
        verifyPassenger, upgradeRAC, addLog, logs, getBerthLabel, getBerthFull, getBay, isSideBerth,
        stations, stationIndex, nextStation, issueTicket, coachConfigs: COACH_CONFIGS,
        // Additional exports for TTE pages
        currentCoachType, currentConfig,
        currentStation: stations[stationIndex] || stations[0],
        setFines, setIncidents, setComplaints,
        addFine,
        addIncident
    };

    return <SmartRailContext.Provider value={value}>{children}</SmartRailContext.Provider>;
}

export function useSmartRail() {
    const ctx = useContext(SmartRailContext);
    if (!ctx) throw new Error('useSmartRail must be used within SmartRailProvider');
    return ctx;
}
