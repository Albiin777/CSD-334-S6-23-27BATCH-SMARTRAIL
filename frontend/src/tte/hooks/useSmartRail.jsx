import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

const SmartRailContext = createContext(null);

/* ──────────────────────────────────────────────────────────
   Indian Railways Coach Classes & Berth Layouts
   ─────────────────────────────────────────────────────────
   1A  (First AC)      → 4/coupe × 6 coupes = 24 berths
   2A  (AC 2-Tier)     → 6/bay × 8 bays    = 48 berths
   3A  (AC 3-Tier)     → 8/bay × 9 bays    = 72 berths
   SL  (Sleeper)       → 8/bay × 9 bays    = 72 berths
   CC  (AC Chair Car)  → 78 seats
   2S  (Second Sitting) → 108 seats
   GEN (General)       → Unreserved
────────────────────────────────────────────────────────── */

const COACH_CONFIGS = {
    '1A': { label: 'First AC', berths: 24, berthsPerBay: 4, bays: 6, bayLabels: ['LB', 'UB', 'LB', 'UB'], hasSide: false, color: '#a855f7' },
    '2A': { label: 'AC 2-Tier', berths: 48, berthsPerBay: 6, bays: 8, bayLabels: ['LB', 'UB', 'LB', 'UB', 'SL', 'SU'], hasSide: true, color: '#3b82f6' },
    '3A': { label: 'AC 3-Tier', berths: 72, berthsPerBay: 8, bays: 9, bayLabels: ['LB', 'MB', 'UB', 'LB', 'MB', 'UB', 'SL', 'SU'], hasSide: true, color: '#22c55e' },
    'SL': { label: 'Sleeper', berths: 72, berthsPerBay: 8, bays: 9, bayLabels: ['LB', 'MB', 'UB', 'LB', 'MB', 'UB', 'SL', 'SU'], hasSide: true, color: '#eab308' },
    'CC': { label: 'AC Chair Car', berths: 78, berthsPerBay: 5, bays: 15, bayLabels: ['W', 'M', 'A', 'A', 'W'], hasSide: false, color: '#06b6d4', isChair: true },
    '2S': { label: '2nd Sitting', berths: 108, berthsPerBay: 6, bays: 18, bayLabels: ['W', 'M', 'A', 'A', 'M', 'W'], hasSide: false, color: '#f97316', isChair: true },
};

/* ── Utility functions ── */

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

/* Build seats for a given coach */
function buildCoachSeats(coachId, coachType, passengerList) {
    const cfg = COACH_CONFIGS[coachType];
    if (!cfg) return [];
    const coachPassengers = passengerList.filter(p => p.coach === coachId);
    return Array.from({ length: cfg.berths }, (_, i) => {
        const num = i + 1;
        const passenger = coachPassengers.find(p => p.seatNo === num);
        let status = 'available';
        if (passenger) {
            if (passenger.status === 'Confirmed') status = 'booked';
            else if (passenger.status === 'RAC') status = 'rac';
            else if (passenger.status === 'Waitlist') status = 'waitlist';
        }
        return {
            number: num,
            bay: getBay(num, coachType),
            type: getBerthFull(num, coachType),
            typeShort: getBerthLabel(num, coachType),
            isSide: isSideBerth(num, coachType),
            status,
            passenger: passenger || null,
        };
    });
}

/* Tamil Nadu SF Express stops */
const STATIONS = [
    'Chennai Central', 'Perambur', 'Arakkonam Jn', 'Renigunta Jn',
    'Vijayawada Jn', 'Warangal', 'Nagpur Jn', 'Bhopal Jn',
    'Jhansi Jn', 'Gwalior Jn', 'Agra Cantt', 'New Delhi',
];

/* ══════════════════════════════════════════════
   PROVIDER — Supabase only, no mock data
   ══════════════════════════════════════════════ */

export function SmartRailProvider({ children }) {
    const [time, setTime] = useState(new Date());
    const [stationIndex, setStationIndex] = useState(0);
    const [selectedCoach, setSelectedCoach] = useState(null);
    const [passengers, setPassengers] = useState([]);
    const [coaches, setCoaches] = useState([]);
    const [incidents, setIncidents] = useState([]);
    const [fines, setFines] = useState([]);
    const [dataSource, setDataSource] = useState('loading'); // 'supabase' | 'error' | 'loading'
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [trainId, setTrainId] = useState(null);
    const [trainDetails, setTrainDetails] = useState(null);
    const [tteDetails, setTteDetails] = useState(null);
    const [logs, setLogs] = useState([]);

    // addLog must be defined BEFORE the useEffect that uses it
    const addLog = (action, type = 'info') => {
        const t = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
        setLogs(prev => [{ time: t, action, type }, ...prev]);
    };

    // Clock
    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // ── Load everything from Supabase ──
    useEffect(() => {
        async function loadFromSupabase() {
            if (!supabase) {
                setError('Supabase is not configured. Check your .env file.');
                setDataSource('error');
                setLoading(false);
                return;
            }

            try {
                // 1. Find the train dynamically based on Admin Duty Assignment
                const tteEmail = localStorage.getItem('tteEmail');

                let assignedTrainNumber = null;

                if (tteEmail) {
                    // Look up duty assignment case-insensitively
                    const { data: assignmentData, error: assignmentErr } = await supabase
                        .from('tte_assignments')
                        .select('train_no, train_name, source_station, dest_station, tte_name, tte_id')
                        .ilike('tte_email', tteEmail)
                        .ilike('status', 'active')
                        .order('created_at', { ascending: false })
                        .limit(1)
                        .maybeSingle();

                    if (!assignmentErr && assignmentData) {
                        assignedTrainNumber = assignmentData.train_no;
                        setTteDetails({
                            name: assignmentData.tte_name,
                            id: assignmentData.tte_id,
                            trainName: assignmentData.train_name,
                            source: assignmentData.source_station,
                            destination: assignmentData.dest_station
                        });
                    }
                }

                // Fallback to localStorage or just finding the latest train if no active assignment
                if (!assignedTrainNumber) {
                    assignedTrainNumber = localStorage.getItem('tte_train_number');
                }

                let query = supabase.from('admin_trains').select('id, train_number, name, source, destination, departure_time, arrival_time');

                if (assignedTrainNumber) {
                    query = query.eq('train_number', assignedTrainNumber);
                } else {
                    query = query.order('id', { ascending: false }).limit(1);
                }

                const { data: trainDataList, error: trainErr } = await query;
                const trainData = trainDataList?.[0];

                if (trainErr || !trainData) {
                    setError(`No train found. Ensure you have an active assignment or book a ticket to initialize one. (Train No: ${assignedTrainNumber || 'None'})`);
                    setDataSource('error');
                    setLoading(false);
                    return;
                }

                setTrainId(trainData.id);
                setTrainDetails(trainData);
                // Save it for reference
                localStorage.setItem('tte_train_number', trainData.train_number);

                // 2. Load coaches
                const { data: coachData, error: coachErr } = await supabase
                    .from('coaches')
                    .select('*')
                    .eq('train_id', trainData.id)
                    .order('position');

                if (!coachErr && coachData && coachData.length > 0) {
                    const mapped = coachData.map(c => ({
                        id: c.coach_id,
                        type: c.coach_type,
                        label: c.label,
                        dbId: c.id,
                    }));
                    setCoaches(mapped);
                    // Default to first coach
                    setSelectedCoach(mapped[0]?.id || null);
                }

                // 3. Load TTE passengers for this train
                const today = new Date().toISOString().split('T')[0];
                const { data: paxData, error: paxErr } = await supabase
                    .from('tte_passengers')
                    .select('*')
                    .eq('train_id', trainData.id)
                    .order('coach_id')
                    .order('seat_no');

                let mapped = [];
                if (!paxErr && paxData) {
                    mapped = paxData.map(p => ({
                        id: p.id,
                        pnr: p.pnr,
                        name: p.name,
                        age: p.age,
                        gender: p.gender,
                        mobile: p.mobile,
                        seatNo: p.seat_no,
                        coach: p.coach_id,
                        boarding: p.boarding,
                        destination: p.destination,
                        status: p.status,
                        idProof: p.id_proof,
                        ticketClass: p.ticket_class,
                        verified: p.verified,
                        flags: p.flags || [],
                        fare: parseFloat(p.fare) || 0,
                    }));
                }
                setPassengers(mapped);
                console.log(`SmartRail: Loaded ${mapped.length} passengers from Supabase`);

                // 4. Load incidents
                const { data: incData, error: incErr } = await supabase
                    .from('incidents')
                    .select('*')
                    .eq('train_id', trainData.id)
                    .order('created_at', { ascending: false });

                if (!incErr && incData) {
                    setIncidents(incData.map(i => ({
                        id: i.id,
                        type: i.type,
                        description: i.description,
                        status: i.status,
                        time: new Date(i.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
                        coach: i.coach,
                        reporter: i.reporter_name || 'TTE',
                    })));
                }

                // 5. Load fines
                const { data: fineData, error: fineErr } = await supabase
                    .from('fines')
                    .select('*')
                    .eq('train_id', trainData.id)
                    .order('created_at', { ascending: false });

                if (!fineErr && fineData) {
                    setFines(fineData.map(f => ({
                        id: f.id,
                        passenger: f.passenger_name || 'Unknown',
                        reason: f.reason,
                        amount: parseFloat(f.amount),
                        method: 'Cash',
                        time: new Date(f.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
                        receipt: f.receipt_no || `FN-${String(f.id).padStart(3, '0')}`,
                    })));
                }

                setDataSource('supabase');
                addLog('Connected to Supabase — live data loaded', 'station');

            } catch (err) {
                console.error('SmartRail: Supabase load error', err);
                setError(err.message);
                setDataSource('error');
            } finally {
                setLoading(false);
            }
        }

        loadFromSupabase();
    }, []);

    const safeCoach = selectedCoach || '';
    const currentCoachObj = coaches.find(c => c.id === safeCoach) || null;
    const currentCoachType = currentCoachObj?.type || '3A';
    const currentConfig = COACH_CONFIGS[currentCoachType];
    const seats = buildCoachSeats(safeCoach, currentCoachType, passengers);

    // Stats for current coach
    const coachPassengers = passengers.filter(p => p.coach === safeCoach);
    const confirmed = coachPassengers.filter(p => p.status === 'Confirmed').length;
    const rac = coachPassengers.filter(p => p.status === 'RAC').length;
    const waitlist = coachPassengers.filter(p => p.status === 'Waitlist').length;
    const verifiedCount = coachPassengers.filter(p => p.verified).length;
    const totalSeats = currentConfig?.berths || 0;
    const booked = confirmed + rac;

    const stats = {
        totalSeats,
        booked,
        vacant: totalSeats - booked,
        rac,
        waitlist,
        noShows: passengers.filter(p => p.status === 'No-Show').length,
        fineCollected: fines.reduce((sum, f) => sum + f.amount, 0),
        totalPassengers: coachPassengers.length,
        verified: verifiedCount,
        unverified: coachPassengers.length - verifiedCount,
    };

    const tteInfo = {
        name: tteDetails?.name || 'TTE',
        id: tteDetails?.id || 'TTE1',
        trainNo: trainDetails?.train_number || localStorage.getItem('tte_train_number') || '12622',
        trainName: tteDetails?.trainName || trainDetails?.name || 'SmartRail Express',
        route: `${tteDetails?.source || trainDetails?.source || 'Source'} → ${tteDetails?.destination || trainDetails?.destination || 'Destination'}`,
        source: tteDetails?.source || trainDetails?.source || 'Station A',
        destination: tteDetails?.destination || trainDetails?.destination || 'Station B',
        date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        departure: trainDetails?.departure_time || '22:00',
        arrival: trainDetails?.arrival_time || '06:35 +1',
        duration: '32h 35m',
        shift: '06:00 — 22:00',
        coach: safeCoach || 'Loading...',
        coachType: currentCoachType,
        coachLabel: currentCoachObj?.label || (loading ? 'Loading...' : 'No coach'),
        zone: 'Southern Railway',
        division: 'Chennai Division',
        rakeType: 'LHB',
        pantryAvailable: 'Yes (Coach PC)',
        dataSource,
    };

    // addLog is also defined above — this stub kept for reference (already defined at top of provider)

    // ── CRUD Operations ──

    const verifyPassenger = useCallback(async (id) => {
        setPassengers(prev => prev.map(p => p.id === id ? { ...p, verified: true } : p));
        const p = passengers.find(x => x.id === id);
        if (p) addLog(`Verified: ${p.name} — Berth ${p.seatNo} (${getBerthLabel(p.seatNo, currentCoachType)}), Coach ${p.coach}`, 'verify');

        if (supabase) {
            try {
                await supabase.from('tte_passengers').update({ verified: true, verified_at: new Date().toISOString() }).eq('id', id);
                await supabase.from('verifications').insert({
                    passenger_id: id,
                    action: 'verified',
                    coach_id: p?.coach,
                    seat_no: p?.seatNo,
                    scanned_via: 'manual',
                });
            } catch (err) {
                console.error('Supabase verify error:', err);
            }
        }
    }, [passengers, currentCoachType]);

    const markNoShow = useCallback(async (id) => {
        setPassengers(prev => prev.map(p => p.id === id ? { ...p, status: 'No-Show' } : p));
        const p = passengers.find(x => x.id === id);
        if (p) addLog(`No-show: ${p.name} — Berth ${p.seatNo}, Coach ${p.coach}`, 'noshow');

        if (supabase) {
            try {
                await supabase.from('tte_passengers').update({ status: 'No-Show' }).eq('id', id);
                await supabase.from('no_shows').insert({
                    passenger_id: id,
                    train_id: trainId,
                    coach_id: p?.coach,
                    seat_no: p?.seatNo,
                });
            } catch (err) {
                console.error('Supabase no-show error:', err);
            }
        }
    }, [passengers, trainId]);

    const addFine = useCallback(async (fine) => {
        addLog(`Fine ₹${fine.amount}: ${fine.reason}`, 'fine');

        if (supabase) {
            try {
                const { data, error: fineErr } = await supabase.from('fines').insert({
                    train_id: trainId,
                    passenger_name: fine.passenger,
                    reason: fine.reason,
                    amount: fine.amount,
                    coach: fine.coach || selectedCoach,
                    receipt_no: `FN-${String(Date.now()).slice(-6)}`,
                }).select().single();

                if (!fineErr && data) {
                    setFines(prev => [{
                        id: data.id,
                        passenger: data.passenger_name || 'Unknown',
                        reason: data.reason,
                        amount: parseFloat(data.amount),
                        method: fine.method || 'Cash',
                        time: new Date(data.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
                        receipt: data.receipt_no,
                    }, ...prev]);
                }
            } catch (err) {
                console.error('Supabase fine error:', err);
            }
        }
    }, [trainId, selectedCoach]);

    const addIncident = useCallback(async (incident) => {
        addLog(`Incident: ${incident.type} — ${incident.description}`, 'incident');

        if (supabase) {
            try {
                const { data, error: incErr } = await supabase.from('incidents').insert({
                    train_id: trainId,
                    type: incident.type,
                    description: incident.description,
                    coach: incident.coach || selectedCoach,
                    reporter_name: 'TTE',
                }).select().single();

                if (!incErr && data) {
                    setIncidents(prev => [{
                        id: data.id,
                        type: data.type,
                        description: data.description,
                        status: data.status,
                        time: new Date(data.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
                        coach: data.coach,
                        reporter: data.reporter_name || 'TTE',
                    }, ...prev]);
                }
            } catch (err) {
                console.error('Supabase incident error:', err);
            }
        }
    }, [trainId, selectedCoach]);

    const upgradeRAC = useCallback(async (id) => {
        setPassengers(prev => prev.map(p => p.id === id ? { ...p, status: 'Confirmed' } : p));
        const p = passengers.find(x => x.id === id);
        if (p) addLog(`RAC Upgraded: ${p.name} — Berth ${p.seatNo}, Coach ${p.coach} → Confirmed`, 'verify');

        if (supabase) {
            try {
                await supabase.from('tte_passengers').update({ status: 'Confirmed' }).eq('id', id);
            } catch (err) {
                console.error('Supabase RAC upgrade error:', err);
            }
        }
    }, [passengers]);

    const nextStation = () => {
        if (stationIndex < STATIONS.length - 1) {
            setStationIndex(prev => prev + 1);
            addLog(`Arrived at ${STATIONS[stationIndex + 1]}`, 'station');
        }
    };

    const issueTicket = async (ticket) => {
        // Add local log immediately
        const logMsg = `Ticket issued: PNR ${ticket.pnr} — ${ticket.name} (${ticket.classLabel}) → ${ticket.to}`;
        addLog(logMsg, 'ticket');

        if (supabase) {
            try {
                const { error } = await supabase.from('issued_tickets').insert({
                    train_id: trainId,
                    pnr: ticket.pnr,
                    passenger_name: ticket.name,
                    age: parseInt(ticket.age, 10),
                    gender: ticket.gender,
                    mobile: ticket.mobile,
                    id_type: ticket.idType,
                    id_number: ticket.idNumber,
                    coach_id: ticket.coach,
                    ticket_class: ticket.classKey,
                    boarding: ticket.from,
                    destination: ticket.to,
                    distance: ticket.distance,
                    fare: ticket.fare,
                    payment_method: ticket.paymentMethod,
                    issued_by: tteInfo.name,
                    issued_at: ticket.issuedAt
                });

                if (error) {
                    console.error('Supabase issueTicket error:', error);
                    // It's still valid locally/on-screen, but failed to sync
                } else {
                    // Sync this new passenger into `passenger_details` so the Admin Dashboard gets it
                    // Also ideally it should be inside `tte_passengers` if we want TTE local reload to show it.
                    const todayStr = new Date().toISOString().split('T')[0];
                    await supabase.from('passenger_details').insert({
                        pnr_number: ticket.pnr,
                        train_no: ticket.trainNo,
                        date: todayStr,
                        coach: ticket.coach,
                        seat_number: 0, // Hard to assign actual seat without layout logic in frontend, so 0 / unsalotted
                        berth_type: 'SEAT',
                        passenger_name: ticket.name,
                        passenger_age: parseInt(ticket.age, 10),
                        passenger_gender: ticket.gender,
                        booking_status: 'CONFIRMED'
                    });

                    await supabase.from('tte_passengers').insert({
                        train_id: trainId,
                        journey_date: todayStr,
                        pnr: ticket.pnr,
                        name: ticket.name,
                        age: parseInt(ticket.age, 10),
                        gender: ticket.gender,
                        mobile: ticket.mobile,
                        coach_id: ticket.coach,
                        seat_no: 0,
                        boarding: ticket.from,
                        destination: ticket.to,
                        status: 'Confirmed',
                        id_proof: ticket.idType,
                        ticket_class: ticket.classKey,
                        verified: true // Issued by TTE means internally verified
                    });
                }
            } catch (err) {
                console.error('Supabase issueTicket exception:', err);
            }
        }
    };

    const value = {
        time, stats, tteInfo, passengers: coachPassengers, allPassengers: passengers, seats, incidents, fines, logs, stationIndex,
        stations: STATIONS, currentStation: STATIONS[stationIndex],
        coaches, coachConfigs: COACH_CONFIGS, selectedCoach, setSelectedCoach,
        currentCoachType, currentConfig,
        verifyPassenger, markNoShow, upgradeRAC, addFine, addIncident, nextStation, addLog, issueTicket,
        setPassengers, getBerthLabel, getBerthFull, getBay, isSideBerth,
        dataSource, loading, error, trainId,
    };

    return <SmartRailContext.Provider value={value}>{children}</SmartRailContext.Provider>;
}

export function useSmartRail() {
    const ctx = useContext(SmartRailContext);
    if (!ctx) throw new Error('useSmartRail must be used within SmartRailProvider');
    return ctx;
}
