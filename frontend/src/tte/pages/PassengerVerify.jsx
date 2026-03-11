import { useState, useEffect, useRef } from 'react';
import { useSmartRail } from '../hooks/useSmartRail';
import { Search, CheckCircle, XCircle, AlertTriangle, Shield, User, Armchair, ChevronDown, QrCode, Camera, Zap, Train, MapPin, Calendar, Clock, Ticket, X, Loader2 } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { db } from '../../utils/firebaseClient';
import { collection, query, where, getDocs } from 'firebase/firestore';
import QRCode from 'react-qr-code';

const statusColors = {
    booked: 'bg-red-500 hover:bg-red-400',
    available: 'bg-emerald-500/40',
    rac: 'bg-amber-500 hover:bg-amber-400',
    waitlist: 'bg-orange-500 hover:bg-orange-400',
};

/* Ticket Preview Modal - Shows full e-ticket after QR scan */
function TicketPreview({ booking, onClose, onVerify }) {
    if (!booking) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto relative animate-in fade-in zoom-in duration-300">
                {/* Close button */}
                <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition z-10">
                    <X size={18} className="text-gray-600" />
                </button>

                {/* Ticket Header */}
                <div className="bg-gradient-to-r from-emerald-500 to-green-600 px-6 py-5 rounded-t-3xl">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                            <Train size={24} className="text-white" />
                        </div>
                        <div>
                            <h3 className="text-white font-bold text-lg">{booking.trainName || `Train #${booking.trainNumber}`}</h3>
                            <p className="text-white/80 text-xs font-mono">#{booking.trainNumber}</p>
                        </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                        <CheckCircle size={16} className="text-white" />
                        <span className="text-white text-sm font-bold">E-Ticket Verified</span>
                    </div>
                </div>

                {/* Ticket Body */}
                <div className="px-6 py-5">
                    {/* PNR & Date */}
                    <div className="grid grid-cols-2 gap-4 mb-5">
                        <div>
                            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-1">PNR Number</p>
                            <p className="font-bold text-gray-900 font-mono text-lg">{booking.pnr}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-1">Journey Date</p>
                            <p className="font-bold text-gray-900">{booking.journeyDate ? new Date(booking.journeyDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}</p>
                        </div>
                    </div>

                    {/* Route */}
                    <div className="flex items-center justify-between gap-4 mb-5 bg-gray-50 rounded-xl p-4">
                        <div className="flex-1">
                            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-1 flex items-center gap-1">
                                <MapPin size={10} /> From
                            </p>
                            <p className="font-bold text-gray-900 text-sm">{booking.source || 'N/A'}</p>
                        </div>
                        <div className="flex flex-col items-center">
                            <div className="w-8 h-[2px] bg-gray-300"></div>
                            <Train size={14} className="text-gray-400 my-1" />
                            <div className="w-8 h-[2px] bg-gray-300"></div>
                        </div>
                        <div className="flex-1 text-right">
                            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-1 flex items-center gap-1 justify-end">
                                <MapPin size={10} /> To
                            </p>
                            <p className="font-bold text-gray-900 text-sm">{booking.destination || 'N/A'}</p>
                        </div>
                    </div>

                    {/* Class & Coach Info */}
                    <div className="grid grid-cols-3 gap-3 mb-5">
                        <div className="bg-gray-50 rounded-xl p-3 text-center">
                            <p className="text-[9px] text-gray-400 uppercase font-bold mb-0.5">Class</p>
                            <p className="font-bold text-gray-900 text-sm">{booking.classCode || 'N/A'}</p>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-3 text-center">
                            <p className="text-[9px] text-gray-400 uppercase font-bold mb-0.5">Coach</p>
                            <p className="font-bold text-gray-900 text-sm">{booking.passengers?.[0]?.seatNumber?.split('-')[0] || 'N/A'}</p>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-3 text-center">
                            <p className="text-[9px] text-gray-400 uppercase font-bold mb-0.5">Total Fare</p>
                            <p className="font-bold text-emerald-600 text-sm">₹{booking.totalFare || 0}</p>
                        </div>
                    </div>

                    {/* Dashed separator */}
                    <div className="relative my-6">
                        <div className="border-t-2 border-dashed border-gray-200"></div>
                        <div className="absolute -left-9 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#2B2B2B]"></div>
                        <div className="absolute -right-9 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#2B2B2B]"></div>
                    </div>

                    {/* Passengers */}
                    <div className="mb-5">
                        <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-3 flex items-center gap-1">
                            <User size={12} /> Passengers ({booking.passengers?.length || 0})
                        </p>
                        <div className="space-y-2">
                            {booking.passengers?.map((p, i) => (
                                <div key={i} className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-xs font-bold text-gray-600">
                                            {i + 1}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-900 text-sm">{p.name}</p>
                                            <p className="text-xs text-gray-500">{p.age}yr • {p.gender}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-gray-900 text-sm">{p.seatNumber || 'WL'}</p>
                                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                                            p.status === 'CNF' || p.status === 'Confirmed' 
                                                ? 'bg-emerald-100 text-emerald-700' 
                                                : p.status === 'RAC' 
                                                    ? 'bg-amber-100 text-amber-700' 
                                                    : 'bg-red-100 text-red-700'
                                        }`}>{p.status}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* QR Code */}
                    <div className="flex flex-col items-center py-4 border-t border-gray-100">
                        <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm mb-2">
                            <QRCode value={booking.pnr || ''} size={100} level="L" />
                        </div>
                        <p className="text-[10px] text-gray-400 font-medium">Scan for digital verification</p>
                    </div>
                </div>

                {/* Verify Button */}
                <div className="px-6 pb-6">
                    <button 
                        onClick={onVerify}
                        className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-emerald-500 text-white rounded-xl font-bold text-sm hover:bg-emerald-600 transition shadow-lg shadow-emerald-500/30"
                    >
                        <CheckCircle size={18} /> Mark All Passengers Verified
                    </button>
                </div>
            </div>
        </div>
    );
}

/* Integrated Camera QR Scanner component */
function QRScanner({ onScanResult, onBookingFound, allPassengers }) {
    const [scanning, setScanning] = useState(false);
    const [manualPnr, setManualPnr] = useState('');
    const [scanHistory, setScanHistory] = useState([]);
    const [loading, setLoading] = useState(false);

    // Fetch booking from Firestore by PNR
    const fetchBookingByPnr = async (pnr) => {
        setLoading(true);
        try {
            const bookingsSnap = await getDocs(query(
                collection(db, 'pnr_bookings'),
                where('pnr', '==', pnr)
            ));
            
            if (!bookingsSnap.empty) {
                const bookingDoc = bookingsSnap.docs[0];
                const bookingData = { id: bookingDoc.id, ...bookingDoc.data() };
                console.log('[QRScanner] Found booking:', bookingData);
                onBookingFound(bookingData);
                return bookingData;
            }
            return null;
        } catch (err) {
            console.error('[QRScanner] Error fetching booking:', err);
            return null;
        } finally {
            setLoading(false);
        }
    };

    // Parse QR code data - handles both JSON format and plain PNR
    const parseQRData = (decodedText) => {
        try {
            // Try parsing as JSON first (new format)
            const parsed = JSON.parse(decodedText);
            return {
                pnr: parsed.pnr,
                train: parsed.train,
                date: parsed.date,
                passengers: parsed.passengers,
                isJson: true
            };
        } catch {
            // Fall back to plain PNR string
            return {
                pnr: decodedText.trim(),
                isJson: false
            };
        }
    };

    useEffect(() => {
        if (!scanning) return;

        const scanner = new Html5QrcodeScanner(
            "reader",
            { fps: 10, qrbox: { width: 250, height: 250 } },
            /* verbose= */ false
        );

        scanner.render(async (decodedText) => {
            const qrData = parseQRData(decodedText);
            const pnrCode = qrData.pnr;
            
            // First, try to find in local passengers list
            const found = allPassengers.find(p => p.pnr === pnrCode);
            
            // Also fetch full booking from Firestore for ticket preview
            const booking = await fetchBookingByPnr(pnrCode);
            
            if (found || booking) {
                if (found) {
                    onScanResult(found);
                }
                setScanHistory(prev => [{ 
                    pnr: pnrCode, 
                    name: found?.name || booking?.passengers?.[0]?.name || 'Found', 
                    time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }), 
                    status: 'success' 
                }, ...prev].slice(0, 10));

                // Success: pause scan mode 
                scanner.clear().catch(console.error);
                setScanning(false);
            } else {
                setScanHistory(prev => [{ 
                    pnr: pnrCode.substring(0, 10), 
                    name: 'Not Found', 
                    time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }), 
                    status: 'error' 
                }, ...prev].slice(0, 10));
            }
        }, (errorMessage) => {
            // Ignore normal non-detection frames
        });

        return () => {
            try { scanner.clear().catch(e => { }); } catch (e) { }
        };
    }, [scanning, allPassengers, onScanResult, onBookingFound]);

    const handleManualEntry = async () => {
        if (!manualPnr.trim()) return;
        
        const pnrCode = manualPnr.trim();
        const found = allPassengers.find(p => p.pnr === pnrCode);
        
        // Also fetch full booking from Firestore
        const booking = await fetchBookingByPnr(pnrCode);
        
        if (found || booking) {
            if (found) {
                onScanResult(found);
            }
            setScanHistory(prev => [{ 
                pnr: pnrCode, 
                name: found?.name || booking?.passengers?.[0]?.name || 'Found', 
                time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }), 
                status: 'success' 
            }, ...prev].slice(0, 10));
        } else {
            setScanHistory(prev => [{ 
                pnr: pnrCode, 
                name: 'Not Found', 
                time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }), 
                status: 'error' 
            }, ...prev].slice(0, 10));
        }
        setManualPnr('');
    };

    return (
        <div className="space-y-5">
            {/* Loading overlay */}
            {loading && (
                <div className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center z-20">
                    <div className="flex flex-col items-center gap-2">
                        <Loader2 size={32} className="text-emerald-400 animate-spin" />
                        <p className="text-sm text-white font-semibold">Fetching ticket...</p>
                    </div>
                </div>
            )}
            
            {/* Scanner Viewfinder */}
            <div className="bg-[#1a1a1a] rounded-2xl border border-[#D4D4D4]/10 overflow-hidden relative">
                <div className="relative w-full aspect-[4/3] max-h-[400px] bg-black flex flex-col items-center justify-center overflow-hidden">
                    {scanning ? (
                        <div id="reader" className="w-full h-full [&>div]:!border-none [&>div>video]:!object-cover" />
                    ) : (
                        <div className="flex flex-col items-center opacity-50">
                            <QrCode size={64} className="mb-4" />
                            <p className="text-sm font-semibold">Ready to scan e-ticket</p>
                        </div>
                    )}
                </div>

                {/* Scan button */}
                <div className="p-5 space-y-4">
                    <button onClick={() => setScanning(!scanning)}
                        disabled={loading}
                        className={`w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-sm font-bold transition-all ${scanning
                            ? 'bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/20'
                            : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/20'} disabled:opacity-50`}>
                        {scanning ? <><Camera size={18} /> Stop Camera</> : <><Camera size={18} /> Start Camera</>}
                    </button>

                    {/* Manual PNR entry */}
                    <div className="flex gap-2">
                        <div className="flex-1 flex items-center bg-gray-900 rounded-xl px-3 py-2.5 gap-2 border border-[#D4D4D4]/10">
                            <QrCode size={14} className="text-[#B3B3B3] shrink-0" />
                            <input type="text" value={manualPnr} onChange={e => setManualPnr(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleManualEntry()}
                                placeholder="Enter PNR manually…"
                                disabled={loading}
                                className="bg-transparent text-sm text-white placeholder:text-[#9CA3AF] outline-none w-full disabled:opacity-50" />
                        </div>
                        <button onClick={handleManualEntry}
                            disabled={loading}
                            className="px-4 py-2.5 bg-blue-500 text-white rounded-xl text-xs font-bold hover:bg-blue-600 transition flex items-center gap-1.5 disabled:opacity-50">
                            {loading ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />} Lookup
                        </button>
                    </div>
                </div>
            </div>

            {/* Scan History */}
            {scanHistory.length > 0 && (
                <div className="bg-[#2B2B2B] rounded-2xl border border-[#D4D4D4]/10 p-5">
                    <h4 className="text-xs font-bold text-[#B3B3B3] uppercase tracking-wider mb-3">Scan History</h4>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                        {scanHistory.map((s, i) => (
                            <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-900/50 border border-[#D4D4D4]/5">
                                <div className={`w-2 h-2 rounded-full shrink-0 ${s.status === 'success' ? 'bg-emerald-400' : 'bg-red-400'}`} />
                                <span className="text-xs font-mono text-[#9CA3AF] w-20 shrink-0">{s.pnr}</span>
                                <span className={`text-xs font-semibold flex-1 truncate ${s.status === 'success' ? 'text-white' : 'text-red-400'}`}>{s.name}</span>
                                <span className="text-[10px] text-[#6B7280] shrink-0">{s.time}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function PassengerVerify() {
    const { passengers, allPassengers, seats, coaches, selectedCoach, setSelectedCoach, currentCoachType, currentConfig, coachConfigs, verifyPassenger, getBerthLabel } = useSmartRail();
    const [query, setQuery] = useState('');
    const [searchBy, setSearchBy] = useState('name');
    const [selected, setSelected] = useState(null);
    const [viewMode, setViewMode] = useState('table');
    const [showCoachList, setShowCoachList] = useState(false);
    const [scannedBooking, setScannedBooking] = useState(null); // Full booking data from Firestore

    const tabs = [
        { key: 'name', label: 'Name' }, { key: 'pnr', label: 'PNR' },
        { key: 'seat', label: 'Seat' }, { key: 'mobile', label: 'Mobile' },
    ];

    const filtered = passengers.filter(p => {
        if (!query) return true;
        const q = query.toLowerCase();
        if (searchBy === 'name') return p.name.toLowerCase().includes(q);
        if (searchBy === 'pnr') return p.pnr.toLowerCase().includes(q);
        if (searchBy === 'seat') return `${p.coach}-${p.seatNo}`.toLowerCase().includes(q);
        if (searchBy === 'mobile') return p.mobile.includes(q);
        return true;
    });

    const getAlerts = (p) => {
        const alerts = [];
        if (p.flags?.includes('blacklisted')) alerts.push({ type: 'danger', text: '⚠️ Blacklisted Passenger' });
        if (p.flags?.includes('senior')) alerts.push({ type: 'info', text: '👴 Senior Citizen — Verify priority seating' });
        if (p.flags?.includes('pregnant')) alerts.push({ type: 'warning', text: '🤰 Pregnant — Lower berth recommended' });
        if (p.flags?.includes('medical')) alerts.push({ type: 'warning', text: '🏥 Medical condition — Special attention' });
        return alerts;
    };

    const handleSeatClick = (seat) => {
        if (seat.status === 'available') return;
        if (seat.passenger) setSelected(seat.passenger);
    };

    // Handle verifying all passengers in a scanned booking
    const handleVerifyAllFromBooking = () => {
        if (scannedBooking?.passengers) {
            scannedBooking.passengers.forEach(p => {
                const matchedPassenger = allPassengers.find(ap => ap.pnr === scannedBooking.pnr && ap.name === p.name);
                if (matchedPassenger && !matchedPassenger.verified) {
                    verifyPassenger(matchedPassenger.id);
                }
            });
        }
        setScannedBooking(null);
    };

    const coachCfg = coachConfigs[currentCoachType];

    // Group seats by bay for the seat map
    const bays = {};
    seats.forEach(seat => {
        if (!bays[seat.bay]) bays[seat.bay] = [];
        bays[seat.bay].push(seat);
    });

    return (
        <div className="space-y-6">
            {/* Search Bar + View Toggle + Coach Selector */}
            <div className="bg-[#2B2B2B] rounded-2xl border border-[#D4D4D4]/10 p-6">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <div className="flex flex-wrap gap-2">
                        {tabs.map(t => (
                            <button key={t.key} onClick={() => setSearchBy(t.key)}
                                className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${searchBy === t.key ? 'bg-white text-[#2B2B2B]' : 'bg-white/10 text-[#B3B3B3] hover:text-white border border-[#D4D4D4]/10'}`}>
                                {t.label}
                            </button>
                        ))}
                    </div>
                    <div className="flex gap-2 items-center">
                        {/* Coach Selector */}
                        {viewMode !== 'qr' && (
                            <div className="relative">
                                <button onClick={() => setShowCoachList(!showCoachList)}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-gray-900 rounded-lg border border-[#D4D4D4]/10 text-white text-xs font-semibold hover:border-[#D4D4D4]/30 transition">
                                    <span className="w-2 h-2 rounded-full" style={{ background: coachCfg?.color || '#fff' }} />
                                    <span>{selectedCoach}</span>
                                    <ChevronDown size={12} className="text-[#B3B3B3]" />
                                </button>
                                {showCoachList && (
                                    <div className="absolute top-full mt-1 right-0 w-60 bg-[#1a1a1a] border border-[#D4D4D4]/10 rounded-xl shadow-2xl z-50 max-h-72 overflow-y-auto">
                                        {coaches.map(c => {
                                            const cfg = coachConfigs[c.type];
                                            return (
                                                <button key={c.id} onClick={() => { setSelectedCoach(c.id); setShowCoachList(false); }}
                                                    className={`w-full flex items-center gap-2 px-3 py-2.5 text-xs text-left hover:bg-white/5 transition ${selectedCoach === c.id ? 'bg-white/10 text-white' : 'text-[#B3B3B3]'}`}>
                                                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: cfg?.color || '#6B7280' }} />
                                                    <span className="font-semibold flex-1">{c.label}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
                        {/* View toggle */}
                        <div className="flex gap-1 bg-gray-900 rounded-xl p-1 border border-[#D4D4D4]/10">
                            <button onClick={() => setViewMode('table')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${viewMode === 'table' ? 'bg-white text-[#2B2B2B]' : 'text-[#B3B3B3] hover:text-white'}`}>
                                <Search size={14} className="inline mr-1" />Table
                            </button>
                            <button onClick={() => setViewMode('seat')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${viewMode === 'seat' ? 'bg-white text-[#2B2B2B]' : 'text-[#B3B3B3] hover:text-white'}`}>
                                <Armchair size={14} className="inline mr-1" />Seat Map
                            </button>
                            <button onClick={() => setViewMode('qr')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${viewMode === 'qr' ? 'bg-emerald-500 text-white' : 'text-[#B3B3B3] hover:text-white'}`}>
                                <QrCode size={14} className="inline mr-1" />QR Scan
                            </button>
                        </div>
                    </div>
                </div>
                {viewMode !== 'qr' && (
                    <div className="flex items-center bg-gray-900 rounded-xl px-4 py-3 gap-3 border border-[#D4D4D4]/10">
                        <Search size={18} className="text-[#B3B3B3]" />
                        <input type="text" value={query} onChange={e => setQuery(e.target.value)}
                            placeholder={`Search by ${searchBy}…`}
                            className="bg-transparent text-sm text-white placeholder:text-[#9CA3AF] outline-none w-full" />
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Panel: Table OR Seat Map OR QR Scanner */}
                <div className="lg:col-span-2">
                    {viewMode === 'qr' ? (
                        <QRScanner 
                            passengers={passengers} 
                            allPassengers={allPassengers} 
                            onScanResult={setSelected}
                            onBookingFound={setScannedBooking}
                        />
                    ) : viewMode === 'table' ? (
                        <div className="bg-[#2B2B2B] rounded-2xl border border-[#D4D4D4]/10 overflow-hidden">
                            <div className="p-5 border-b border-[#D4D4D4]/10">
                                <h3 className="text-sm font-bold text-[#B3B3B3] uppercase tracking-wider">
                                    Coach {selectedCoach} — {filtered.length} Passengers
                                </h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-black/20 text-[#B3B3B3] text-xs uppercase tracking-wider">
                                            <th className="p-4 font-semibold">PNR</th>
                                            <th className="p-4 font-semibold">Name</th>
                                            <th className="p-4 font-semibold">Berth</th>
                                            <th className="p-4 font-semibold">Type</th>
                                            <th className="p-4 font-semibold">Status</th>
                                            <th className="p-4 font-semibold">Verified</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#D4D4D4]/5">
                                        {filtered.map(p => (
                                            <tr key={p.id} onClick={() => setSelected(p)} className={`hover:bg-white/5 cursor-pointer transition ${selected?.id === p.id ? 'bg-white/5' : ''}`}>
                                                <td className="p-4 text-sm font-mono text-[#B3B3B3]">{p.pnr}</td>
                                                <td className="p-4 text-sm font-medium text-white">{p.name}</td>
                                                <td className="p-4 text-sm text-white font-semibold">{p.seatNo}</td>
                                                <td className="p-4 text-xs text-[#9CA3AF]">{getBerthLabel(p.seatNo, currentCoachType)}</td>
                                                <td className="p-4">
                                                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${p.status === 'Confirmed' ? 'bg-emerald-500/10 text-emerald-400' : p.status === 'RAC' ? 'bg-amber-500/10 text-amber-400' : p.status === 'Waitlist' ? 'bg-red-500/10 text-red-400' : 'bg-gray-500/10 text-gray-400'}`}>
                                                        {p.status}
                                                    </span>
                                                </td>
                                                <td className="p-4">{p.verified ? <CheckCircle size={16} className="text-emerald-400" /> : <XCircle size={16} className="text-[#6B7280]" />}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        /* Seat Map View — Indian Railways bay layout */
                        <div className="bg-[#2B2B2B] rounded-2xl border border-[#D4D4D4]/10 p-6">
                            <div className="flex items-center justify-between mb-5">
                                <h3 className="text-sm font-bold text-[#B3B3B3] uppercase tracking-wider flex items-center gap-2">
                                    <Armchair size={16} className="text-blue-400" /> Coach {selectedCoach} — {coachCfg?.label}
                                </h3>
                                <div className="flex gap-3 text-[10px] font-bold text-[#9CA3AF]">
                                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-red-500 inline-block" /> Booked</span>
                                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-amber-500 inline-block" /> RAC</span>
                                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-emerald-500/40 inline-block" /> Empty</span>
                                </div>
                            </div>

                            {currentCoachType === 'GEN' ? (
                                <p className="text-sm text-center text-[#9CA3AF] py-8">General Coach — No assigned seats</p>
                            ) : (
                                <div className="space-y-2.5">
                                    {Object.entries(bays).map(([bayNum, baySeats]) => {
                                        if (coachCfg?.isChair) {
                                            return (
                                                <div key={bayNum} className="flex items-center gap-1">
                                                    <span className="text-[9px] font-bold text-[#6B7280] w-7 text-center shrink-0">R{bayNum}</span>
                                                    {baySeats.map(seat => (
                                                        <button key={seat.number} onClick={() => handleSeatClick(seat)}
                                                            className={`w-12 h-9 rounded-lg flex flex-col items-center justify-center text-white text-xs font-bold transition-all ${statusColors[seat.status] || 'bg-gray-700/40'} ${selected?.id === seat.passenger?.id && seat.passenger ? 'ring-2 ring-white scale-105' : ''} ${seat.passenger ? 'cursor-pointer hover:scale-105' : 'opacity-60'}`}>
                                                            <span className="text-sm leading-none">{seat.number}</span>
                                                            <span className="text-[7px] opacity-70">{seat.typeShort}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            );
                                        }
                                        const mainCount = coachCfg.hasSide ? coachCfg.berthsPerBay - 2 : coachCfg.berthsPerBay;
                                        const half = mainCount / 2;
                                        const left = baySeats.slice(0, half);
                                        const right = baySeats.slice(half, mainCount);
                                        const side = coachCfg.hasSide ? baySeats.slice(mainCount) : [];
                                        return (
                                            <div key={bayNum} className="flex items-stretch gap-0 bg-[#1a1a1a] rounded-xl border border-[#D4D4D4]/10 overflow-hidden">
                                                <div className="flex items-center justify-center w-7 bg-black/30 border-r border-[#D4D4D4]/5 shrink-0">
                                                    <span className="text-[8px] font-bold text-[#6B7280] -rotate-90 whitespace-nowrap">BAY {bayNum}</span>
                                                </div>
                                                <div className="flex flex-col-reverse gap-1 p-1.5">
                                                    {left.map(s => (
                                                        <button key={s.number} onClick={() => handleSeatClick(s)}
                                                            className={`relative w-16 h-8 rounded-lg flex flex-col items-center justify-center text-white text-xs font-bold transition-all ${statusColors[s.status] || 'bg-gray-700/40'} ${selected?.id === s.passenger?.id && s.passenger ? 'ring-2 ring-white scale-105 z-10' : ''} ${s.passenger ? 'cursor-pointer hover:scale-105' : 'opacity-60'}`}>
                                                            <span className="text-xs leading-none">{s.number}</span>
                                                            <span className="text-[6px] opacity-70">{s.typeShort}</span>
                                                            {s.passenger?.verified && <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border border-[#1a1a1a] flex items-center justify-center"><CheckCircle size={6} className="text-white" /></div>}
                                                        </button>
                                                    ))}
                                                </div>
                                                <div className="flex items-center justify-center w-4 shrink-0"><div className="w-px h-full bg-[#D4D4D4]/10" /></div>
                                                <div className="flex flex-col-reverse gap-1 p-1.5">
                                                    {right.map(s => (
                                                        <button key={s.number} onClick={() => handleSeatClick(s)}
                                                            className={`relative w-16 h-8 rounded-lg flex flex-col items-center justify-center text-white text-xs font-bold transition-all ${statusColors[s.status] || 'bg-gray-700/40'} ${selected?.id === s.passenger?.id && s.passenger ? 'ring-2 ring-white scale-105 z-10' : ''} ${s.passenger ? 'cursor-pointer hover:scale-105' : 'opacity-60'}`}>
                                                            <span className="text-xs leading-none">{s.number}</span>
                                                            <span className="text-[6px] opacity-70">{s.typeShort}</span>
                                                            {s.passenger?.verified && <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border border-[#1a1a1a] flex items-center justify-center"><CheckCircle size={6} className="text-white" /></div>}
                                                        </button>
                                                    ))}
                                                </div>
                                                {side.length > 0 && (
                                                    <>
                                                        <div className="w-px bg-[#D4D4D4]/20 mx-0.5" />
                                                        <div className="flex flex-col-reverse gap-1 p-1.5">
                                                            {side.map(s => (
                                                                <button key={s.number} onClick={() => handleSeatClick(s)}
                                                                    className={`relative w-14 h-8 rounded-lg flex flex-col items-center justify-center text-white text-xs font-bold transition-all border-l-2 border-dashed border-yellow-500/30 ${statusColors[s.status] || 'bg-gray-700/40'} ${selected?.id === s.passenger?.id && s.passenger ? 'ring-2 ring-white scale-105 z-10' : ''} ${s.passenger ? 'cursor-pointer hover:scale-105' : 'opacity-60'}`}>
                                                                    <span className="text-xs leading-none">{s.number}</span>
                                                                    <span className="text-[6px] opacity-70">{s.typeShort}</span>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                            <p className="text-[10px] text-[#9CA3AF] mt-4 text-center">Click any booked berth to view passenger details & verify</p>
                        </div>
                    )}
                </div>

                {/* Detail Panel */}
                <div className="bg-[#2B2B2B] rounded-2xl border border-[#D4D4D4]/10 p-6">
                    {selected ? (
                        <div className="space-y-5">
                            {/* QR scan success badge */}
                            {viewMode === 'qr' && (
                                <div className="flex items-center gap-2 px-3 py-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                                    <QrCode size={16} className="text-emerald-400" />
                                    <p className="text-xs font-bold text-emerald-400">QR Scanned Successfully</p>
                                </div>
                            )}
                            <div className="flex items-center gap-3 pb-4 border-b border-[#D4D4D4]/10">
                                <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center">
                                    <User size={24} className="text-[#B3B3B3]" />
                                </div>
                                <div>
                                    <p className="text-white font-bold">{selected.name}</p>
                                    <p className="text-xs text-[#9CA3AF]">{selected.age}yr • {selected.gender}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    ['PNR', selected.pnr],
                                    ['Berth', `${selected.seatNo} (${getBerthLabel(selected.seatNo, currentCoachType)})`],
                                    ['Coach', selected.coach],
                                    ['Class', selected.ticketClass],
                                    ['Boarding', selected.boarding],
                                    ['Destination', selected.destination],
                                    ['ID Proof', selected.idProof],
                                    ['Fare', `₹${selected.fare}`],
                                ].map(([l, v]) => (
                                    <div key={l} className="bg-gray-900 rounded-xl p-3 border border-[#D4D4D4]/5">
                                        <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider">{l}</p>
                                        <p className="text-sm font-semibold text-white mt-0.5">{v}</p>
                                    </div>
                                ))}
                            </div>

                            {getAlerts(selected).length > 0 && (
                                <div className="space-y-2">
                                    <h4 className="text-xs font-bold text-[#B3B3B3] uppercase tracking-wider flex items-center gap-1.5"><AlertTriangle size={14} /> Smart Alerts</h4>
                                    {getAlerts(selected).map((a, i) => (
                                        <div key={i} className={`px-3 py-2 rounded-xl text-xs font-semibold border ${a.type === 'danger' ? 'bg-red-500/10 text-red-400 border-red-500/20' : a.type === 'warning' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                                            {a.text}
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="flex gap-2 pt-2">
                                {!selected.verified ? (
                                    <button onClick={() => { verifyPassenger(selected.id); setSelected({ ...selected, verified: true }); }}
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-emerald-500 text-white rounded-xl font-semibold text-sm hover:bg-emerald-600 transition">
                                        <CheckCircle size={16} /> Verify
                                    </button>
                                ) : (
                                    <div className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl font-semibold text-sm">
                                        <CheckCircle size={16} /> Verified ✓
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-64 text-[#B3B3B3]">
                            {viewMode === 'qr' ? (
                                <>
                                    <QrCode size={40} className="mb-3 opacity-30" />
                                    <p className="text-sm font-medium">Scan a QR code</p>
                                    <p className="text-xs text-[#6B7280] mt-1">Or enter PNR manually</p>
                                </>
                            ) : (
                                <>
                                    <Shield size={40} className="mb-3 opacity-30" />
                                    <p className="text-sm font-medium">Select a passenger or berth</p>
                                    <p className="text-xs text-[#6B7280] mt-1">Use the table or seat map to begin</p>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
            
            {/* Ticket Preview Modal - Shows when QR is scanned */}
            {scannedBooking && (
                <TicketPreview 
                    booking={scannedBooking} 
                    onClose={() => setScannedBooking(null)}
                    onVerify={handleVerifyAllFromBooking}
                />
            )}
        </div>
    );
}
