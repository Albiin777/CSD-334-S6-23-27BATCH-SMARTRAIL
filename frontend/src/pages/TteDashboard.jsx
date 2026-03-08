import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../utils/supabaseClient";
import api from "../api/train.api";

// ── Berth-type display labels ─────────────────────────────────────
const BERTH_LABEL = { LB: "LB", MB: "MB", UB: "UB", SL: "SL", SU: "SU", WS: "WS", MS: "MS", AS: "AS" };

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
        const aislePos = rowDef.indexOf("AISLE");
        const leftDef = aislePos === -1 ? rowDef : rowDef.slice(0, aislePos);
        const sideDef = aislePos === -1 ? [] : rowDef.slice(aislePos + 1);
        const leftSeats = leftDef.map(() => seats[seatIndex++]).filter(Boolean);
        const sideSeats = sideDef.map(() => seats[seatIndex++]).filter(Boolean);
        if (leftSeats.length > 0 || sideSeats.length > 0) rows.push({ leftSeats, sideSeats });
    }
    if (seatIndex < seats.length) rows.push({ leftSeats: seats.slice(seatIndex), sideSeats: [] });
    return rows;
}

// Passenger info panel (shows on booked seat click)
function PassengerPanel({ passenger, onClose }) {
    if (!passenger) return null;
    const qrData = JSON.stringify({
        pnr: passenger.pnr_number, name: passenger.passenger_name,
        age: passenger.passenger_age, gender: passenger.passenger_gender,
        seat: passenger.seat_number, coach: passenger.coach,
        train: passenger.train_no, date: passenger.date
    });
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(qrData)}`;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-[#1D2332] border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-5">
                    <h3 className="text-white font-bold text-lg">Passenger Details</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">✕</button>
                </div>
                <div className="flex gap-4 mb-5">
                    <div className="w-14 h-14 bg-gradient-to-br from-[#4ab86d]/30 to-blue-500/20 rounded-xl flex items-center justify-center text-2xl font-bold text-white shrink-0">
                        {passenger.passenger_name?.[0]}
                    </div>
                    <div>
                        <div className="text-white font-bold text-xl">{passenger.passenger_name}</div>
                        <div className="text-gray-400 text-sm mt-0.5">{passenger.passenger_age} yrs • {passenger.passenger_gender}</div>
                        <div className={`text-xs mt-1 font-semibold px-2 py-0.5 rounded-full inline-block ${passenger.booking_status === "CONFIRMED" ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"}`}>
                            {passenger.booking_status}
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm mb-5">
                    {[
                        { label: "PNR", value: passenger.pnr_number, mono: true },
                        { label: "Coach", value: passenger.coach },
                        { label: "Seat No", value: passenger.seat_number },
                        { label: "Berth", value: passenger.berth_type },
                        { label: "Train", value: passenger.train_no },
                        { label: "Date", value: passenger.date }
                    ].map(item => (
                        <div key={item.label} className="bg-[#0f172a] rounded-xl p-3">
                            <div className="text-gray-500 text-[10px] uppercase tracking-wide font-semibold">{item.label}</div>
                            <div className={`text-white font-bold mt-0.5 ${item.mono ? "font-mono" : ""}`}>{item.value || "—"}</div>
                        </div>
                    ))}
                </div>
                <div className="bg-white rounded-xl p-3 flex items-center justify-center">
                    <img src={qrUrl} alt="Passenger QR Code" className="w-40 h-40" />
                </div>
                <p className="text-gray-500 text-[10px] text-center mt-2">Scan QR code to verify passenger details</p>
            </div>
        </div>
    );
}

export default function TteDashboard() {
    const navigate = useNavigate();
    const [tteUser, setTteUser] = useState(null);
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedAssignment, setSelectedAssignment] = useState(null);
    const [layoutData, setLayoutData] = useState(null);
    const [passengersMap, setPassengersMap] = useState({});
    const [selectedCoachId, setSelectedCoachId] = useState(null);
    const [selectedPassenger, setSelectedPassenger] = useState(null);
    const [layLoading, setLayLoading] = useState(false);

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (!user) { navigate("/?login=true"); return; }
            setTteUser(user);
            fetchAssignments(user.email);
        });
    }, []);

    const fetchAssignments = async (email) => {
        const today = new Date().toISOString().split("T")[0];
        const { data } = await supabase.from("tte_assignments")
            .select("*").eq("tte_email", email).gte("duty_date", today).order("duty_date");
        setAssignments(data || []);
        setLoading(false);
    };

    const loadTrainLayout = async (assignment) => {
        setSelectedAssignment(assignment);
        setLayLoading(true);
        setLayoutData(null);
        setPassengersMap({});
        setSelectedCoachId(null);

        try {
            const data = await api.getSeatLayout(assignment.train_no);
            const { data: pData } = await supabase.from("passenger_details")
                .select("*").eq("train_no", assignment.train_no).eq("date", assignment.duty_date);

            const pMap = {};
            if (pData) pData.forEach(p => { pMap[`${p.coach}-${p.seat_number}`] = p; });
            setPassengersMap(pMap);

            if (data?.coaches) {
                const assigned = assignment.coach_ids?.length > 0
                    ? data.coaches.filter(c => assignment.coach_ids.includes(c.coachId || c.coachNumber))
                    : data.coaches;
                const coaches = (assigned.length > 0 ? assigned : data.coaches).map(c => ({
                    ...c, coachId: c.coachId || c.coachNumber,
                    seats: c.seats.map(s => ({
                        ...s, isBooked: pMap[`${c.coachId || c.coachNumber}-${s.seatNumber}`] != null || s.isBooked
                    }))
                }));
                setLayoutData({ ...data, coaches });
                if (coaches.length > 0) setSelectedCoachId(coaches[0].coachId);
            }
        } catch (e) { console.error(e); }
        setLayLoading(false);
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate("/");
    };

    if (loading) return (
        <div className="min-h-screen bg-[#0f172a] flex items-center justify-center text-gray-400">Loading your assignments...</div>
    );

    const currentCoach = layoutData?.coaches?.find(c => c.coachId === selectedCoachId);
    const rows = currentCoach ? groupSeatsByRow(currentCoach.seats, currentCoach.rowStructure) : [];
    const hasSide = rows.some(r => r.sideSeats.length > 0);

    return (
        <div className="min-h-screen bg-[#0f172a] font-sans">
            {selectedPassenger && <PassengerPanel passenger={selectedPassenger} onClose={() => setSelectedPassenger(null)} />}

            {/* Top Bar */}
            <div className="bg-[#1D2332] border-b border-white/5 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#4ab86d]/20 rounded-xl flex items-center justify-center text-[#4ab86d] font-bold text-lg">T</div>
                    <div>
                        <div className="text-white font-bold">TTE Dashboard</div>
                        <div className="text-gray-400 text-xs">{tteUser?.email}</div>
                    </div>
                </div>
                <button onClick={handleLogout} className="text-xs text-gray-400 hover:text-white px-4 py-2 bg-white/5 rounded-xl hover:bg-white/10 transition border border-white/10">
                    Sign Out
                </button>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-6 md:py-8">
                {assignments.length === 0 ? (
                    <div className="text-center py-24 text-gray-400">
                        <div className="text-5xl mb-4">📋</div>
                        <h2 className="text-xl font-bold text-white mb-2">No Upcoming Duties</h2>
                        <p>You have no duty assignments scheduled. Please contact your admin.</p>
                    </div>
                ) : (
                    <div className="flex flex-col lg:flex-row gap-6">
                        {/* Assignment List */}
                        <div className="lg:w-80 shrink-0">
                            <h2 className="text-white font-bold text-lg mb-4">Your Duties</h2>
                            <div className="space-y-3">
                                {assignments.map(a => (
                                    <button key={a.id} onClick={() => loadTrainLayout(a)}
                                        className={`w-full text-left p-4 rounded-2xl border transition ${selectedAssignment?.id === a.id ? "bg-[#4ab86d]/10 border-[#4ab86d]/40" : "bg-[#1D2332] border-white/10 hover:border-white/20"}`}>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-white font-bold font-mono">{a.train_no}</span>
                                            <span className="text-xs text-[#4ab86d] bg-[#4ab86d]/10 px-2 py-0.5 rounded-full border border-[#4ab86d]/20">{a.status}</span>
                                        </div>
                                        {a.train_name && <div className="text-gray-300 text-sm mb-1">{a.train_name}</div>}
                                        <div className="text-gray-500 text-xs">{new Date(a.duty_date + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short" })}</div>
                                        {a.from_station && <div className="text-gray-500 text-xs mt-0.5">{a.from_station} → {a.to_station}</div>}
                                        {a.coach_ids?.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-2">
                                                {a.coach_ids.map(c => (
                                                    <span key={c} className="text-[10px] bg-blue-500/10 text-blue-300 border border-blue-500/20 px-1.5 py-0.5 rounded font-mono">{c}</span>
                                                ))}
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Seat Map */}
                        <div className="flex-1">
                            {!selectedAssignment ? (
                                <div className="bg-[#1D2332] border border-white/10 rounded-2xl p-12 text-center text-gray-400">
                                    <div className="text-4xl mb-3">🚂</div>
                                    <p>Select a duty from the left to view the seat map</p>
                                </div>
                            ) : layLoading ? (
                                <div className="bg-[#1D2332] border border-white/10 rounded-2xl p-12 text-center text-gray-400">Loading seat layout...</div>
                            ) : layoutData ? (
                                <div>
                                    <div className="bg-[#1D2332] border border-white/10 rounded-2xl p-4 mb-4">
                                        <div className="flex items-center justify-between flex-wrap gap-3">
                                            <div>
                                                <h3 className="text-white font-bold text-xl">Train #{selectedAssignment.train_no}</h3>
                                                {selectedAssignment.train_name && <div className="text-gray-400 text-sm">{selectedAssignment.train_name}</div>}
                                                <div className="text-gray-500 text-xs mt-1">{selectedAssignment.duty_date} • {selectedAssignment.shift_start}–{selectedAssignment.shift_end}</div>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                                                    <div className="w-3 h-3 rounded bg-[#4ab86d]"></div> Available
                                                </div>
                                                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                                                    <div className="w-3 h-3 rounded bg-[#4a2222] border border-red-900/50"></div> Booked (click for name)
                                                </div>
                                                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                                                    <div className="w-3 h-3 rounded bg-[#383838] border border-gray-600"></div> Reserved
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Coach Selector */}
                                    <div className="flex gap-2 overflow-x-auto pb-2 mb-4" style={{ scrollbarWidth: "none" }}>
                                        {layoutData.coaches.map(coach => {
                                            const avail = coach.seats?.filter(s => !s.isBooked && !passengersMap[`${coach.coachId}-${s.seatNumber}`]).length;
                                            return (
                                                <button key={coach.coachId} onClick={() => setSelectedCoachId(coach.coachId)}
                                                    style={{ backgroundColor: selectedCoachId === coach.coachId ? "#4ab86d" : "#1D2332" }}
                                                    className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold border transition ${selectedCoachId === coach.coachId ? "text-white border-transparent shadow-lg" : "text-gray-300 border-white/10 hover:border-white/20"}`}>
                                                    <span className="font-mono">{coach.coachId}</span>
                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${selectedCoachId === coach.coachId ? "bg-white/20" : "bg-white/10 text-gray-400"}`}>
                                                        {avail} free
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Seat Grid */}
                                    {currentCoach && (
                                        <div className="bg-[#1D2332] border border-white/10 rounded-2xl p-6 shadow-2xl relative">
                                            <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-[#383838] text-gray-400 px-6 py-1 rounded-b-lg text-xs font-bold uppercase tracking-widest border border-t-0 border-[#1D2332]">
                                                Engine Direction ↑
                                            </div>
                                            <div className="mt-6 flex flex-col items-center gap-3 max-w-2xl mx-auto overflow-y-auto max-h-[60vh] pr-1">
                                                {rows.map((row, rowIndex) => (
                                                    <div key={rowIndex}
                                                        className={`flex items-center gap-3 md:gap-6 border-b border-gray-700/40 pb-3 last:border-0 last:pb-0 w-full ${hasSide ? "justify-between" : "justify-center"}`}>
                                                        <div className="flex gap-2">
                                                            {row.leftSeats.map(seat => {
                                                                const seatId = `${selectedCoachId}-${seat.seatNumber}`;
                                                                const p = passengersMap[seatId];
                                                                const isBooked = !!p || seat.isBooked;
                                                                return (
                                                                    <button key={seat.seatNumber} onClick={() => p && setSelectedPassenger(p)}
                                                                        disabled={isBooked && !p}
                                                                        className={`relative h-11 w-11 rounded-lg flex items-center justify-center text-xs font-bold transition-all
                                      ${isBooked
                                                                                ? p ? "bg-[#4a2222] text-red-400 border border-red-900/50 hover:bg-red-900/40 cursor-pointer" : "bg-[#383838] text-gray-500 cursor-not-allowed opacity-50 border border-gray-600"
                                                                                : "bg-[#4ab86d]/15 text-[#4ab86d] border border-[#4ab86d]/40 cursor-default"
                                                                            }`}>
                                                                        {seat.seatNumber}
                                                                        <span className="absolute -top-1.5 -right-1.5 text-[8px] bg-[#1D2332] border border-gray-600 px-0.5 rounded">
                                                                            {BERTH_LABEL[seat.berthType] ?? seat.berthType?.substring(0, 2)}
                                                                        </span>
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                        {hasSide && (
                                                            <div className="flex gap-2 border-l border-dashed border-gray-700/50 pl-3 md:pl-6">
                                                                {row.sideSeats.length > 0 ? row.sideSeats.map(seat => {
                                                                    const seatId = `${selectedCoachId}-${seat.seatNumber}`;
                                                                    const p = passengersMap[seatId];
                                                                    const isBooked = !!p || seat.isBooked;
                                                                    return (
                                                                        <button key={seat.seatNumber} onClick={() => p && setSelectedPassenger(p)}
                                                                            disabled={isBooked && !p}
                                                                            className={`relative h-11 w-11 rounded-lg flex items-center justify-center text-xs font-bold transition-all
                                        ${isBooked
                                                                                    ? p ? "bg-[#4a2222] text-red-400 border border-red-900/50 hover:bg-red-900/40 cursor-pointer" : "bg-[#383838] text-gray-500 cursor-not-allowed opacity-50 border border-gray-600"
                                                                                    : "bg-[#4ab86d]/15 text-[#4ab86d] border border-[#4ab86d]/40 cursor-default"
                                                                                }`}>
                                                                            {seat.seatNumber}
                                                                            <span className="absolute -top-1.5 -right-1.5 text-[8px] bg-[#1D2332] border border-gray-600 px-0.5 rounded">
                                                                                {BERTH_LABEL[seat.berthType] ?? seat.berthType?.substring(0, 2)}
                                                                            </span>
                                                                        </button>
                                                                    );
                                                                }) : <div className="h-11 w-11 opacity-0 pointer-events-none" />}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="bg-[#1D2332] border border-white/10 rounded-2xl p-12 text-center text-gray-400">
                                    <div className="text-4xl mb-3">❗</div>
                                    <p>Could not load seat layout for this train. It may not be available.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
