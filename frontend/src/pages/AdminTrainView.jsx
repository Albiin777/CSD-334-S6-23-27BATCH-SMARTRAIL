import { useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import api from "../api/train.api";
import { db } from "../utils/firebaseClient";
import { collection, query, where, getDocs } from "firebase/firestore";

// ── Berth-type display labels & colours ──────────────────────────────────────
const BERTH_LABEL = {
    LB: "LB", MB: "MB", UB: "UB",
    SL: "SL", SU: "SU",
    WS: "WS", MS: "MS", AS: "AS"
};

function SeatButton({ seat, passenger, isSelected, onClick }) {
    const isBooked = !!passenger;

    return (
        <button
            onClick={onClick}
            disabled={!isBooked}
            className={`
                relative h-12 w-12 md:h-14 md:w-14 rounded-lg flex items-center justify-center text-sm font-bold transition-all duration-200
                ${isBooked
                    ? isSelected
                        ? "text-white bg-blue-600 border-2 border-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.5)] scale-110 z-10"
                        : "text-white bg-[#383838] border border-gray-500 hover:border-gray-400 cursor-pointer shadow-md"
                    : "bg-transparent text-gray-500 border border-gray-700/50 cursor-not-allowed opacity-40"
                }
            `}
        >
            <span className="z-10">{seat.seatNumber}</span>
            <span
                className={`absolute -top-2 -right-2 text-[9px] font-mono px-1 rounded shadow-sm border ${isBooked && isSelected ? "bg-blue-800 text-blue-200 border-blue-500" : "bg-[#1D2332] border-gray-600 text-gray-400"}`}
            >
                {BERTH_LABEL[seat.berthType] ?? seat.berthType?.substring(0, 2)}
            </span>

            {/* Status dot if booked */}
            {isBooked && !isSelected && (
                <span className={`absolute bottom-1 right-1 w-2 h-2 rounded-full ${passenger.status === 'CNF' ? 'bg-green-500' : 'bg-orange-500'}`}></span>
            )}
        </button>
    );
}

function groupSeatsByRow(seats, rowStructure) {
    if (!rowStructure || rowStructure.length === 0) {
        const bays = [];
        for (let i = 0; i < seats.length; i += 8) {
            const bay = seats.slice(i, i + 8);
            bays.push({ leftSeats: bay.slice(0, 6), sideSeats: bay.slice(6, 8) });
        }
        return bays;
    }
    let seatIndex = 0;
    const rows = [];
    for (const rowDef of rowStructure) {
        const aislePos = rowDef.indexOf('AISLE');
        const leftDef = aislePos === -1 ? rowDef : rowDef.slice(0, aislePos);
        const sideDef = aislePos === -1 ? [] : rowDef.slice(aislePos + 1);

        const leftSeats = leftDef.map(() => seats[seatIndex++]).filter(Boolean);
        const sideSeats = sideDef.map(() => seats[seatIndex++]).filter(Boolean);

        if (leftSeats.length > 0 || sideSeats.length > 0) {
            rows.push({ leftSeats, sideSeats });
        }
    }
    if (seatIndex < seats.length) {
        const rest = seats.slice(seatIndex);
        rows.push({ leftSeats: rest, sideSeats: [] });
    }
    return rows;
}

export default function AdminTrainView({ tteMode = false, assignedCoaches = [], trainNoOverride = null, dateOverride = null }) {
    const params = useParams();
    const trainNumber = trainNoOverride || params.trainNumber;

    const [searchParams] = useSearchParams();
    const journeyDate = dateOverride || searchParams.get("date") || new Date().toISOString().split("T")[0];
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [layoutData, setLayoutData] = useState(null);
    const [selectedClass, setSelectedClass] = useState("SL");
    const [selectedCoachId, setSelectedCoachId] = useState(null);

    // DB Data
    const [passengersMap, setPassengersMap] = useState({});
    // ^ Mapping {"CoachId-SeatNum": passengerObj}

    const [selectedPassenger, setSelectedPassenger] = useState(null);

    // Initial Fetch
    useEffect(() => {
        const fetchLayoutAndData = async () => {
            try {
                setLoading(true);

                // 1. Fetch Layout
                const layout = await api.getSeatLayout(trainNumber);
                let finalCoaches = layout.coaches || [];

                // If TTE mode, strictly filter out non-assigned coaches
                if (tteMode && assignedCoaches.length > 0) {
                    finalCoaches = finalCoaches.filter(c => assignedCoaches.includes(c.coachId || c.coachNumber));
                }

                const normalizedCoaches = finalCoaches.map(c => ({
                    ...c,
                    coachId: c.coachId || c.coachNumber
                }));

                setLayoutData({ ...layout, coaches: normalizedCoaches });

                if (normalizedCoaches.length > 0) {
                    setSelectedCoachId(normalizedCoaches[0].coachId);
                    setSelectedClass(normalizedCoaches[0].classCode);
                }

                // 2. Fetch Passenger Information from Firestore
                const pnrSnap = await getDocs(query(collection(db, 'pnr_bookings'), where('trainNumber', '==', String(trainNumber))));
                
                const pMap = {};
                pnrSnap.forEach(bookingDoc => {
                    const booking = bookingDoc.data();
                    (booking.passengers || []).forEach(p => {
                        // Extract row number if seatNumber is formatted like "A1-12"
                        const seatNum = p.seatNumber ? p.seatNumber.split('-').pop() : null;
                        const coach = p.seatNumber ? p.seatNumber.split('-')[0] : null;

                        if (coach && seatNum) {
                            const seatId = `${coach}-${seatNum}`;
                            pMap[seatId] = {
                                ...p,
                                pnr_number: booking.pnr,
                                passenger_name: p.name,
                                passenger_age: p.age,
                                passenger_gender: p.gender,
                                seat_number: seatNum,
                                coach: coach,
                                booking_status: p.status,
                                train_no: trainNumber,
                                date: journeyDate,
                                berth_type: p.berthType || p.berth_type
                            };
                        }
                    });
                });
                setPassengersMap(pMap);

            } catch (err) {
                console.error("Failed to load train visualizer", err);
            } finally {
                setLoading(false);
            }
        };
        fetchLayoutAndData();
    }, [trainNumber, journeyDate, tteMode, assignedCoaches]);

    // Derived states
    // In TTE mode, only show classes that have assigned coaches
    let availableClasses = [];
    if (layoutData?.coaches) {
        availableClasses = [...new Set(layoutData.coaches.map(c => c.classCode))];
    }

    const handleClassChange = (cls) => {
        setSelectedClass(cls);
        const coachesInClass = layoutData.coaches.filter(c => c.classCode === cls);
        if (coachesInClass.length > 0) {
            setSelectedCoachId(coachesInClass[0].coachId);
            setSelectedPassenger(null);
        }
    };

    const handleCoachChange = (cId) => {
        setSelectedCoachId(cId);
        setSelectedPassenger(null); // reset tooltip when switching coach
    };

    if (loading) return (
        <div className="min-h-screen bg-[#0f172a] flex items-center justify-center text-gray-500">
            <div className="animate-spin text-4xl">...</div>
        </div>
    );

    const currentCoach = layoutData?.coaches?.find(c => c.coachId === selectedCoachId);
    const rows = currentCoach ? groupSeatsByRow(currentCoach.seats, currentCoach.rowStructure) : [];
    const hasSide = rows.some(r => r.sideSeats.length > 0);

    return (
        <div className="min-h-screen pt-20 pb-20 px-4 bg-[#0f172a] font-sans text-gray-100 relative">

            {/* Passenger Detail Modal with QR Code */}
            {selectedPassenger && (() => {
                const p = selectedPassenger;
                const qrData = JSON.stringify({
                    pnr: p.pnr_number, name: p.passenger_name, age: p.passenger_age,
                    gender: p.passenger_gender, seat: p.seat_number, coach: p.coach,
                    train: p.train_no || trainNumber, date: p.date || journeyDate,
                    berth: p.berth_type, status: p.booking_status
                });
                const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(qrData)}`;
                return (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setSelectedPassenger(null)}>
                        <div className="bg-[#1D2332] border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between mb-5">
                                <h3 className="text-white font-bold text-lg">Passenger Details</h3>
                                <button onClick={() => setSelectedPassenger(null)} className="text-gray-400 hover:text-white text-xl">✕</button>
                            </div>
                            <div className="flex gap-3 mb-4">
                                <div className="w-12 h-12 bg-gradient-to-br from-[#4ab86d]/30 to-blue-500/20 rounded-xl flex items-center justify-center text-xl font-bold text-white shrink-0">
                                    {p.passenger_name?.[0] || "?"}
                                </div>
                                <div>
                                    <div className="text-white font-bold text-lg">{p.passenger_name || "Unknown"}</div>
                                    <div className="text-gray-400 text-sm">{p.passenger_age} yrs • {p.passenger_gender}</div>
                                    <span className={`text-xs mt-1 font-semibold px-2 py-0.5 rounded-full inline-block ${p.booking_status === 'CONFIRMED' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'}`}>
                                        {p.booking_status}
                                    </span>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm mb-4">
                                {[{ l: 'PNR', v: p.pnr_number, m: true }, { l: 'Coach', v: p.coach }, { l: 'Seat', v: p.seat_number }, { l: 'Berth', v: p.berth_type }, { l: 'Train', v: p.train_no }, { l: 'Date', v: p.date }]
                                    .map(item => (
                                        <div key={item.l} className="bg-[#0f172a] rounded-xl p-2.5">
                                            <div className="text-gray-500 text-[10px] uppercase tracking-wide font-semibold">{item.l}</div>
                                            <div className={`text-white font-bold mt-0.5 text-sm ${item.m ? 'font-mono' : ''}`}>{item.v || '—'}</div>
                                        </div>
                                    ))
                                }
                            </div>
                            <div className="bg-white rounded-xl p-3 flex items-center justify-center">
                                <img src={qrUrl} alt="Passenger QR" className="w-40 h-40" />
                            </div>
                            <p className="text-gray-500 text-[10px] text-center mt-2">Scan to verify passenger</p>
                        </div>
                    </div>
                );
            })()}

            <div className="max-w-6xl mx-auto space-y-6">

                {/* Header */}
                <div style={{ backgroundColor: '#2B2B2B' }} className="rounded-2xl md:rounded-3xl p-4 sm:p-6 md:p-8 shadow-2xl relative overflow-hidden">
                    <div className="absolute -left-4 sm:-left-6 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-12 sm:h-12 rounded-full" style={{ backgroundColor: '#0f172a' }}></div>
                    <div className="absolute -right-4 sm:-right-6 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-12 sm:h-12 rounded-full" style={{ backgroundColor: '#0f172a' }}></div>

                    <div className="flex flex-col md:flex-row justify-between items-center relative z-10 px-2 sm:px-4 md:px-6 gap-4">
                        <div className="text-center md:text-left">
                            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2 tracking-wide">
                                Live Passenger Log
                            </h1>
                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 sm:gap-3 text-sm text-gray-400 font-mono">
                                <span className={`px-3 py-1 rounded-full border ${tteMode ? 'bg-[#1D2332] text-blue-400 border-blue-900/50' : 'bg-[#1D2332] text-orange-400 border-gray-700'}`}>
                                    {tteMode ? 'TTE Console' : 'Administrator'}
                                </span>
                                <span>•</span>
                                <span>Train #{trainNumber}</span>
                                <span>•</span>
                                <span>{new Date(journeyDate).toDateString()}</span>
                            </div>
                        </div>
                        <div className="text-center md:text-right border-t border-gray-700/50 md:border-t-0 md:border-l pt-4 md:pt-0 md:pl-6 w-full md:w-auto flex flex-col gap-3 items-end">
                            <button onClick={() => navigate(-1)} className="text-gray-500 text-sm hover:text-white transition-colors underline decoration-gray-700 underline-offset-4">
                                ← Back to Dashboard
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-end items-center gap-4 text-xs sm:text-sm text-gray-400 px-4 md:px-6">
                    <div className="flex flex-wrap gap-4">
                        <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded bg-transparent border border-gray-700/50"></div> Empty</div>
                        <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded bg-[#383838] border border-gray-500 flex items-center justify-center"><div className="w-1.5 h-1.5 rounded-full bg-green-500"></div></div> Occupied</div>
                    </div>
                </div>

                {/* Content Area */}
                {layoutData?.coaches?.length > 0 ? (
                    <div className="flex flex-col lg:flex-row gap-8">

                        {/* Sidebar: Class & Coach Selection */}
                        <div className="lg:w-1/4 flex flex-col gap-4">

                            {/* Class Selector */}
                            {availableClasses.length > 1 && (
                                <div className="bg-[#1D2332] rounded-2xl p-4 border border-white/5 shadow-xl">
                                    <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-3 ml-1">Class</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {availableClasses.map(cls => (
                                            <button
                                                key={cls}
                                                onClick={() => handleClassChange(cls)}
                                                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${selectedClass === cls ? 'bg-orange-600 text-white' : 'bg-[#0f172a] text-gray-400 hover:text-white border border-gray-700'}`}
                                            >
                                                {cls}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Coach Selector */}
                            <div className="bg-[#1D2332] rounded-2xl p-4 sticky top-24 border border-white/5 shadow-xl">
                                <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-4 ml-1">Assigned Coaches</h3>
                                <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                                    {layoutData.coaches.filter(c => c.classCode === selectedClass).map(coach => {
                                        // Calculate filled seats
                                        const totalSeatsIdString = `${coach.coachId}-%`;
                                        const filledSeats = Object.keys(passengersMap).filter(k => k.startsWith(coach.coachId + '-')).length;
                                        const totalCapacity = coach.seats?.length || 0;

                                        return (
                                            <button
                                                key={coach.coachId}
                                                onClick={() => handleCoachChange(coach.coachId)}
                                                className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-200 flex flex-col justify-center ${selectedCoachId === coach.coachId ? "bg-[#383838] border-l-4 border-blue-500 shadow-md" : "bg-transparent hover:bg-[#2B2B2B] border-l-4 border-transparent"}`}
                                            >
                                                <div className="flex justify-between items-center w-full">
                                                    <span className={`font-mono font-bold ${selectedCoachId === coach.coachId ? 'text-white' : 'text-gray-300'}`}>{coach.coachId}</span>
                                                    <span className="text-xs text-gray-500">{filledSeats}/{totalCapacity}</span>
                                                </div>

                                                {/* Progress Bar inside Coach button */}
                                                <div className="w-full h-1 bg-gray-800 rounded-full mt-2 overflow-hidden">
                                                    <div
                                                        className={`h-full ${filledSeats === totalCapacity ? 'bg-green-500' : 'bg-blue-500'}`}
                                                        style={{ width: `${totalCapacity === 0 ? 0 : (filledSeats / totalCapacity) * 100}%` }}
                                                    ></div>
                                                </div>
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Seat Map */}
                        <div className="lg:w-3/4">
                            <div className="bg-[#1D2332] border border-white/5 rounded-3xl p-6 md:p-8 min-h-[500px] shadow-2xl relative">
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-[#383838] text-gray-400 px-6 py-1 rounded-b-lg text-xs font-bold uppercase tracking-widest border border-t-0 border-[#1D2332]">
                                    {selectedCoachId} • Engine Direction ↑
                                </div>

                                {currentCoach ? (
                                    <div className="mt-8 flex flex-col items-center gap-4 max-w-2xl mx-auto pb-24 md:pb-0">
                                        {rows.map((row, rowIndex) => (
                                            <div
                                                key={rowIndex}
                                                className={`flex items-center gap-4 md:gap-8 border-b border-gray-700/40 pb-4 last:border-0 last:pb-0 w-full ${hasSide ? 'justify-between' : 'justify-center'}`}
                                            >
                                                {/* Main Compartment */}
                                                <div className="flex gap-2 md:gap-3">
                                                    {row.leftSeats.map(seat => {
                                                        const seatId = `${selectedCoachId}-${seat.seatNumber}`;
                                                        const passenger = passengersMap[seatId];
                                                        const isSelected = selectedPassenger?.seatNumber === seatId;

                                                        return (
                                                            <SeatButton
                                                                key={seat.seatNumber}
                                                                seat={seat}
                                                                passenger={passenger}
                                                                isSelected={isSelected}
                                                                onClick={() => {
                                                                    if (passenger) {
                                                                        setSelectedPassenger(isSelected ? null : { ...passenger, seatNumber: seatId });
                                                                    }
                                                                }}
                                                            />
                                                        );
                                                    })}
                                                </div>

                                                {/* Side Berths */}
                                                {hasSide && (
                                                    <div className="flex gap-2 md:gap-3 border-l border-dashed border-gray-700/50 pl-4 md:pl-8">
                                                        {row.sideSeats.length > 0 ? (
                                                            row.sideSeats.map(seat => {
                                                                const seatId = `${selectedCoachId}-${seat.seatNumber}`;
                                                                const passenger = passengersMap[seatId];
                                                                const isSelected = selectedPassenger?.seatNumber === seatId;

                                                                return (
                                                                    <SeatButton
                                                                        key={seat.seatNumber}
                                                                        seat={seat}
                                                                        passenger={passenger}
                                                                        isSelected={isSelected}
                                                                        onClick={() => {
                                                                            if (passenger) {
                                                                                setSelectedPassenger(isSelected ? null : { ...passenger, seatNumber: seatId });
                                                                            }
                                                                        }}
                                                                    />
                                                                );
                                                            })
                                                        ) : (
                                                            <div className="h-12 w-12 md:h-14 md:w-14 opacity-0 pointer-events-none" />
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center h-full text-gray-400 py-20">
                                        Select a coach to view seats
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="bg-[#1D2332] border border-white/5 rounded-3xl p-8 sm:p-12 text-center shadow-2xl min-h-[400px] flex flex-col items-center justify-center gap-4">
                        <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mb-2">
                            <span className="text-4xl">❌</span>
                        </div>
                        <h2 className="text-2xl font-bold text-white">No Assigned Coaches</h2>
                        <p className="text-gray-400 max-w-md mx-auto">There are no coaches available or assigned for this particular selection.</p>
                        <div className="mt-8">
                            <button
                                onClick={() => navigate(-1)}
                                className="px-6 py-3 bg-[#4ab86d] text-white font-bold rounded-xl hover:bg-green-600 transition shadow-lg"
                            >
                                Go Back
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
