import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../../api/train.api";
import { supabase } from "../../utils/supabaseClient";

const today = new Date().toISOString().split("T")[0];

function addDays(base, n) {
    const d = new Date(base);
    d.setDate(d.getDate() + n);
    return d.toISOString().split("T")[0];
}

// Build 30-day date list from today
const DATES = Array.from({ length: 30 }, (_, i) => addDays(today, i));

export default function SeatManagement() {
    const [step, setStep] = useState(1); // 1=train, 2=date, 3=coach, 4=seats
    const [searchQ, setSearchQ] = useState("");
    const [trains, setTrains] = useState([]);
    const [trainLoading, setTrainLoading] = useState(false);
    const [selectedTrain, setSelectedTrain] = useState(null);
    const [selectedDate, setSelectedDate] = useState(today);
    const [layoutData, setLayoutData] = useState(null);
    const [selectedCoach, setSelectedCoach] = useState(null);
    const [passengerMap, setPassengerMap] = useState({});
    const [selectedSeat, setSelectedSeat] = useState(null);
    const [layoutLoading, setLayoutLoading] = useState(false);

    const [searchParams] = useSearchParams();
    const initialTrainNo = searchParams.get('train');

    // Auto-load if train passed in URL
    useEffect(() => {
        if (initialTrainNo && !selectedTrain) {
            (async () => {
                setTrainLoading(true);
                try {
                    const res = await api.searchTrains(initialTrainNo);
                    const train = res.find(t => t.trainNumber === initialTrainNo || t.trainNumber.includes(initialTrainNo)) || res[0];
                    if (train) {
                        setSelectedTrain(train);
                        setStep(2);
                        setSearchQ(train.trainName);
                    }
                } catch { }
                setTrainLoading(false);
            })();
        }
    }, [initialTrainNo]);

    // Search trains
    useEffect(() => {
        if (searchQ.length < 1) { setTrains([]); return; }
        const t = setTimeout(async () => {
            setTrainLoading(true);
            try {
                const res = await api.searchTrains(searchQ);
                setTrains(res.slice(0, 20));
            } catch { setTrains([]); }
            setTrainLoading(false);
        }, 350);
        return () => clearTimeout(t);
    }, [searchQ]);

    // Load seat layout + passengers when reaching step 3
    useEffect(() => {
        if (step < 3 || !selectedTrain) return;
        (async () => {
            setLayoutLoading(true);
            try {
                const layout = await api.getSeatLayout(selectedTrain.trainNumber);
                if (layout?.coaches) {
                    setLayoutData(layout);
                    setSelectedCoach(layout.coaches[0]?.coachId || null);
                }
                // Load passengers for this train+date
                const { data } = await supabase
                    .from("passenger_details")
                    .select("*")
                    .eq("train_no", selectedTrain.trainNumber)
                    .eq("date", selectedDate);
                const pm = {};
                (data || []).forEach(p => { pm[`${p.coach}-${p.seat_number}`] = p; });
                setPassengerMap(pm);
            } catch { }
            setLayoutLoading(false);
        })();
    }, [step, selectedTrain, selectedDate]);

    const coach = layoutData?.coaches?.find(c => c.coachId === selectedCoach);
    const totalSeats = coach?.seats?.length || 0;
    const bookedSeats = coach?.seats?.filter(s => passengerMap[`${selectedCoach}-${s.seatNumber}`]).length || 0;
    const available = totalSeats - bookedSeats;

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#10b981] to-[#3b82f6] flex items-center justify-center text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
                </div>
                <div>
                    <h1 className="text-2xl md:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">Seat Management</h1>
                    <p className="text-gray-400 text-sm mt-1 font-medium tracking-wide">View layouts and passenger details</p>
                </div>
            </div>

            {/* Breadcrumb / Steps */}
            <div className="flex items-center gap-2 text-sm overflow-x-auto pb-1">
                {["Select Train", "Select Date", "View Layout"].map((s, i) => (
                    <div key={i} className="flex items-center gap-2 shrink-0">
                        <button
                            onClick={() => step > i + 1 && setStep(i + 1)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold text-xs transition ${step === i + 1 ? "bg-[#4ab86d] text-black" :
                                step > i + 1 ? "bg-[#4ab86d]/20 text-[#4ab86d] cursor-pointer hover:bg-[#4ab86d]/30" :
                                    "bg-white/5 text-gray-500"
                                }`}
                        >
                            <span>{i + 1}</span> <span>{s}</span>
                        </button>
                        {i < 2 && <span className="text-gray-600">›</span>}
                    </div>
                ))}
            </div>

            {/* STEP 1 — Train Selection */}
            {step === 1 && (
                <div className="bg-[#0a1120] border border-white/5 rounded-2xl shadow-xl overflow-hidden backdrop-blur-md">
                    <div className="p-5 border-b border-white/5 relative group">
                        <input
                            type="text"
                            placeholder="Search train name or number (e.g. Jan Shatabdi, 12082)..."
                            value={searchQ}
                            onChange={e => setSearchQ(e.target.value)}
                            className="w-full bg-[#111827] text-gray-200 border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-sm font-medium focus:outline-none focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981] transition-all duration-300 shadow-sm group-hover:border-white/20"
                        />
                        <span className="absolute left-9 top-1/2 -translate-y-1/2 text-gray-500 transition-colors group-hover:text-gray-300">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        </span>
                    </div>
                    {trainLoading && <div className="p-6 text-center text-gray-500 text-sm">Searching...</div>}
                    {!trainLoading && trains.length === 0 && searchQ.length >= 1 && (
                        <div className="p-6 text-center text-gray-500 text-sm">No trains found for "{searchQ}"</div>
                    )}
                    {!trainLoading && trains.length === 0 && searchQ.length === 0 && (
                        <div className="p-8 text-center text-gray-600 text-sm">Type train name or number to search all 198 trains.</div>
                    )}
                    <div className="divide-y divide-white/5">
                        {trains.map((t, i) => (
                            <button
                                key={i}
                                onClick={() => { setSelectedTrain(t); setStep(2); }}
                                className="w-full flex items-center gap-4 px-6 py-5 hover:bg-white/[0.03] text-left transition-all duration-300 group hover:pl-8 border-l-2 border-transparent hover:border-[#3b82f6]"
                            >
                                <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0 group-hover:bg-blue-500/20 transition-colors shadow-inner">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h14M5 8a2 2 0 00-2 2v8a2 2 0 002 2h14a2 2 0 002-2v-8a2 2 0 00-2-2H5z" /></svg>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-extrabold text-white text-base group-hover:text-blue-400 transition-colors">{t.trainName}</div>
                                    <div className="text-xs text-gray-400 mt-1 font-medium flex items-center gap-2">
                                        <span className="font-mono text-blue-400 bg-blue-400/10 px-1.5 py-0.5 rounded">{t.trainNumber}</span>
                                        <span className="w-1 h-1 rounded-full bg-gray-600"></span>
                                        <span className="truncate">{t.source}</span>
                                        <svg className="w-3 h-3 text-gray-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                        <span className="truncate">{t.destination}</span>
                                    </div>
                                </div>
                                <span className="text-gray-500 group-hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* STEP 2 — Date Selection */}
            {step === 2 && selectedTrain && (
                <div className="space-y-4">
                    <div className="bg-[#0a1120] border border-white/5 rounded-2xl p-6 shadow-xl relative overflow-hidden">
                        <div className="absolute -right-4 -top-4 opacity-10 blur-2xl w-32 h-32 rounded-full bg-blue-500" />
                        <div className="flex items-center gap-4 mb-1">
                            <div className="w-12 h-12 rounded-xl bg-[#3b82f6]/10 border border-[#3b82f6]/20 flex items-center justify-center text-[#3b82f6] shadow-inner">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h14M5 8a2 2 0 00-2 2v8a2 2 0 002 2h14a2 2 0 002-2v-8a2 2 0 00-2-2H5z" /></svg>
                            </div>
                            <div>
                                <div className="font-extrabold text-white text-xl">{selectedTrain.trainName}</div>
                                <div className="text-xs text-gray-400 font-medium mt-1 flex items-center gap-2">
                                    <span className="font-mono bg-white/5 px-1.5 py-0.5 rounded">{selectedTrain.trainNumber}</span>
                                    <span className="w-1 h-1 rounded-full bg-gray-500"></span>
                                    {selectedTrain.source} <svg className="w-3 h-3 text-gray-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg> {selectedTrain.destination}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-[#111827] border border-white/5 rounded-2xl p-5">
                        <h3 className="font-bold text-white mb-4">Select Journey Date</h3>
                        <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 gap-2">
                            {DATES.map(d => {
                                const dt = new Date(d);
                                const isSel = d === selectedDate;
                                return (
                                    <button
                                        key={d}
                                        onClick={() => setSelectedDate(d)}
                                        className={`flex flex-col items-center py-3 px-2 rounded-xl border font-bold transition text-center ${isSel
                                            ? "bg-[#4ab86d] text-black border-[#4ab86d]"
                                            : "bg-white/3 text-gray-300 border-white/5 hover:bg-white/8"
                                            }`}
                                    >
                                        <span className="text-[10px] uppercase tracking-wide opacity-70">
                                            {dt.toLocaleDateString("en-IN", { weekday: "short" })}
                                        </span>
                                        <span className="text-base font-black">{dt.getDate()}</span>
                                        <span className="text-[9px] opacity-60">{dt.toLocaleDateString("en-IN", { month: "short" })}</span>
                                    </button>
                                );
                            })}
                        </div>
                        <button
                            onClick={() => setStep(3)}
                            className="mt-5 w-full bg-[#4ab86d] hover:bg-[#3da85c] text-black font-black py-3 rounded-xl transition"
                        >
                            View Seat Layout for {new Date(selectedDate).toLocaleDateString("en-IN", { dateStyle: "long" })}
                        </button>
                    </div>
                </div>
            )}

            {/* STEP 3 — Layout + Seat View */}
            {step === 3 && selectedTrain && (
                <div className="space-y-4">
                    {/* Train + Date header */}
                    <div className="bg-[#0a1120] border border-white/5 rounded-2xl p-5 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#10b981]/20 to-[#3b82f6]/20 border border-white/5 flex items-center justify-center text-[#10b981]">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            </div>
                            <div>
                                <div className="font-extrabold text-white text-lg">{selectedTrain.trainName}</div>
                                <div className="text-xs text-gray-400 font-medium mt-1 flex items-center gap-2">
                                    <span className="font-mono bg-white/5 px-1.5 py-0.5 rounded text-gray-300">{selectedTrain.trainNumber}</span>
                                    <span className="w-1 h-1 rounded-full bg-gray-600"></span>
                                    <span className="text-[#10b981] font-bold">{new Date(selectedDate).toLocaleDateString("en-US", { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-2 text-xs font-bold">
                            <span className="px-3.5 py-2 rounded-xl bg-green-500/10 text-green-400 border border-green-500/20 shadow-sm">{available} Available</span>
                            <span className="px-3.5 py-2 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 shadow-sm">{bookedSeats} Booked</span>
                        </div>
                    </div>

                    {layoutLoading ? (
                        <div className="p-12 text-center text-gray-500">
                            <div className="w-8 h-8 border-2 border-[#4ab86d] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                            Loading seat layout...
                        </div>
                    ) : layoutData ? (
                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                            {/* Coach Selector */}
                            <div className="bg-[#111827] border border-white/5 rounded-2xl p-4">
                                <h3 className="font-bold text-white text-sm mb-3">Coaches</h3>
                                <div className="space-y-1.5 max-h-[60vh] overflow-y-auto pr-1">
                                    {layoutData.coaches.map(c => {
                                        const cBooked = c.seats.filter(s => passengerMap[`${c.coachId}-${s.seatNumber}`]).length;
                                        return (
                                            <button
                                                key={c.coachId}
                                                onClick={() => setSelectedCoach(c.coachId)}
                                                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-bold transition ${selectedCoach === c.coachId
                                                    ? "bg-[#4ab86d]/20 text-[#4ab86d] border border-[#4ab86d]/30"
                                                    : "bg-white/3 text-gray-300 border border-white/5 hover:bg-white/6"
                                                    }`}
                                            >
                                                <span>{c.coachId}</span>
                                                <div className="flex gap-1 items-center text-[10px]">
                                                    <span className="text-green-400">{c.seats.length - cBooked}✓</span>
                                                    <span className="text-gray-600">·</span>
                                                    <span className="text-red-400">{cBooked}✗</span>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Seat Grid */}
                            <div className="lg:col-span-3 bg-[#111827] border border-white/5 rounded-2xl p-4">
                                {coach && (
                                    <>
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="font-bold text-white">Coach {selectedCoach} <span className="text-xs text-gray-500 font-normal ml-2">{coach.classCode} · {totalSeats} total seats</span></h3>
                                            <div className="flex gap-3 text-xs">
                                                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded border border-green-500/50 bg-green-500/10 inline-block" />Available</span>
                                                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded border border-red-900/50 bg-[#4a2222] inline-block" />Booked</span>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2 max-h-[55vh] overflow-y-auto pr-1">
                                            {coach.seats.map(seat => {
                                                const key = `${selectedCoach}-${seat.seatNumber}`;
                                                const passenger = passengerMap[key];
                                                const isBooked = !!passenger;
                                                return (
                                                    <button
                                                        key={seat.seatNumber}
                                                        onClick={() => isBooked && setSelectedSeat(passenger)}
                                                        className={`relative flex flex-col items-center justify-center h-12 w-full rounded-lg border text-xs font-bold transition ${isBooked
                                                            ? "bg-[#4a2222] border-red-900/50 text-red-400 hover:border-red-500/60 cursor-pointer"
                                                            : "bg-transparent border-green-500/30 text-green-400 cursor-default"
                                                            }`}
                                                    >
                                                        <span>{seat.seatNumber}</span>
                                                        <span className="text-[9px] opacity-60">{seat.berthType}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="p-12 text-center text-gray-500">Failed to load layout data.</div>
                    )}
                </div>
            )}

            {/* Passenger Detail Modal */}
            {selectedSeat && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setSelectedSeat(null)}>
                    <div className="bg-[#111827] border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-black text-white text-lg">Passenger Details</h3>
                            <button onClick={() => setSelectedSeat(null)} className="text-gray-500 hover:text-white w-8 h-8 flex items-center justify-center rounded-lg bg-white/5">✕</button>
                        </div>
                        <div className="space-y-3">
                            {[
                                ["Name", selectedSeat.passenger_name],
                                ["Age", selectedSeat.passenger_age],
                                ["Gender", selectedSeat.passenger_gender],
                                ["Coach", selectedSeat.coach],
                                ["Seat No.", selectedSeat.seat_number],
                                ["Berth", selectedSeat.berth_type],
                                ["PNR", selectedSeat.pnr_number],
                                ["Status", selectedSeat.booking_status],
                            ].map(([k, v]) => (
                                <div key={k} className="flex justify-between items-center py-2 border-b border-white/5">
                                    <span className="text-xs text-gray-500 font-bold uppercase tracking-wide">{k}</span>
                                    <span className="text-sm font-bold text-white">{v || "—"}</span>
                                </div>
                            ))}
                        </div>
                        {/* QR */}
                        <div className="mt-4 flex justify-center">
                            <img
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=PNR:${selectedSeat.pnr_number}|${selectedSeat.passenger_name}|${selectedSeat.train_no}|${selectedSeat.coach}-${selectedSeat.seat_number}`}
                                alt="QR"
                                className="rounded-xl border border-white/10"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
