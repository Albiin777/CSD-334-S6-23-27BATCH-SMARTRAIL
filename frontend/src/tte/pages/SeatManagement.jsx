import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSmartRail } from '../hooks/useSmartRail';
import { User, X, Info, ChevronDown, CheckCircle, ArrowUp } from 'lucide-react';

const statusStyles = {
    booked: { bg: 'bg-red-500', border: 'border-red-400', text: 'text-white' },
    available: { bg: 'bg-gray-800', border: 'border-gray-600', text: 'text-gray-400' },
    rac: { bg: 'bg-amber-500', border: 'border-amber-400', text: 'text-white' },
    waitlist: { bg: 'bg-orange-500', border: 'border-orange-400', text: 'text-white' },
};

const BERTH_LABELS = {
    LB: "Lower", MB: "Middle", UB: "Upper",
    SL: "Side L", SU: "Side U",
    WS: "Window", MS: "Middle", AS: "Aisle",
    W: "Window", M: "Middle", A: "Aisle"
};

// Seat button component
function SeatCell({ seat, isSelected, onClick }) {
    if (!seat) return <div className="w-14 h-14 md:w-16 md:h-16" />;
    
    const style = statusStyles[seat.status] || statusStyles.available;
    const isOccupied = seat.status !== 'available';

    return (
        <button
            onClick={() => isOccupied && onClick(seat)}
            className={`
                relative w-14 h-14 md:w-16 md:h-16 rounded-lg flex flex-col items-center justify-center
                ${style.bg} ${style.text} border-2 ${style.border}
                ${isSelected ? 'ring-2 ring-cyan-400 scale-105 z-10' : ''}
                ${isOccupied ? 'cursor-pointer hover:scale-105' : 'cursor-default'}
                transition-all duration-150
            `}
            title={`${seat.number} - ${seat.type} (${seat.status})`}
        >
            <span className="text-lg font-bold">{seat.number}</span>
            <span className="text-[9px] font-medium opacity-80">{seat.typeShort}</span>
            {seat.passenger?.verified && (
                <CheckCircle className="absolute -top-1 -right-1 w-4 h-4 text-emerald-400 bg-gray-900 rounded-full" />
            )}
        </button>
    );
}

export default function SeatManagement() {
    const { seats, coaches, selectedCoach, setSelectedCoach, currentCoachType, currentConfig, coachConfigs, loading, error } = useSmartRail();
    const [selected, setSelected] = useState(null);
    const [showCoachList, setShowCoachList] = useState(false);
    const navigate = useNavigate();

    const coachCfg = coachConfigs?.[currentCoachType] || currentConfig;
    
    // Debug logging
    console.log("[SeatManagement] seats:", seats?.length, "coaches:", coaches?.length, "selectedCoach:", selectedCoach, "currentCoachType:", currentCoachType, "loading:", loading, "error:", error);
    
    // Build layout based on coach type from actual seat data - organized by bays
    const buildLayout = () => {
        if (!seats.length) {
            console.log("[SeatManagement] No seats available - returning empty layout");
            return { bays: [], type: 'unknown', label: 'Unknown', totalSeats: 0 };
        }
        
        // Detect coach type from berth types in data
        const firstBerth = seats[0]?.typeShort;
        const hasSideBerths = seats.some(s => ['SL', 'SU'].includes(s.typeShort));
        const isChairCar = ['WS', 'MS', 'AS', 'W', 'M', 'A'].includes(firstBerth);
        
        if (hasSideBerths) {
            // Sleeper/3A/2A - 8 berths per bay (LB,MB,UB,SL for left side | LB,MB,UB,SU for right side)
            const bays = [];
            for (let i = 0; i < seats.length; i += 8) {
                const baySeats = seats.slice(i, i + 8);
                const bayNumber = Math.floor(i / 8) + 1;
                bays.push({
                    bayNumber,
                    total: 8,
                    left: [baySeats[0], baySeats[1], baySeats[2]],      // Positions 1,2,3: LB, MB, UB
                    leftSide: [baySeats[3]],                             // Position 4: SL (Side Lower)
                    right: [baySeats[4], baySeats[5], baySeats[6]],     // Positions 5,6,7: LB, MB, UB
                    rightSide: [baySeats[7]]                             // Position 8: SU (Side Upper)
                });
            }
            return { bays, type: 'sleeper', label: coachCfg?.label || 'Sleeper', totalSeats: seats.length };
        } else if (isChairCar) {
            // 2S/CC - organize by rows (6 or 5 seats per row)
            const seatsPerRow = seats.length % 6 === 0 ? 6 : 5;
            const leftCount = seatsPerRow === 6 ? 3 : 2;
            
            const bays = [];
            for (let i = 0; i < seats.length; i += seatsPerRow) {
                const rowSeats = seats.slice(i, i + seatsPerRow);
                const rowNumber = Math.floor(i / seatsPerRow) + 1;
                bays.push({
                    bayNumber: rowNumber,
                    total: seatsPerRow,
                    left: rowSeats.slice(0, leftCount),
                    right: rowSeats.slice(leftCount),
                    leftSide: [],
                    rightSide: []
                });
            }
            return { bays, type: 'chair', label: coachCfg?.label || '2nd Sitting', totalSeats: seats.length };
        }
        
        // Fallback - generic 6 per row
        const bays = [];
        for (let i = 0; i < seats.length; i += 6) {
            const rowSeats = seats.slice(i, i + 6);
            const rowNumber = Math.floor(i / 6) + 1;
            bays.push({
                bayNumber: rowNumber,
                total: 6,
                left: rowSeats.slice(0, 3),
                right: rowSeats.slice(3),
                leftSide: [],
                rightSide: []
            });
        }
        return { bays, type: 'generic', label: coachCfg?.label || 'Coach', totalSeats: seats.length };
    };

    const layout = buildLayout();

    const legend = [
        { label: 'Available', style: statusStyles.available },
        { label: 'Booked', style: statusStyles.booked },
        { label: 'RAC', style: statusStyles.rac },
        { label: 'Waitlist', style: statusStyles.waitlist },
    ];

    // Show loading state
    if (loading) {
        return (
            <div className="flex items-center justify-center h-64 text-gray-400">
                <div className="text-center">
                    <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p>Loading seat layout...</p>
                </div>
            </div>
        );
    }

    // Show error state
    if (error) {
        return (
            <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 text-center">
                <p className="text-red-400 font-semibold">Error loading data</p>
                <p className="text-sm text-gray-400 mt-2">{error}</p>
            </div>
        );
    }

    // Show message if no coaches are assigned
    if (coaches.length === 0) {
        return (
            <div className="bg-[#2B2B2B] rounded-2xl border border-[#D4D4D4]/10 p-10 text-center">
                <p className="text-lg font-bold text-white mb-2">No Coaches Assigned</p>
                <p className="text-sm text-[#9CA3AF]">No coach assignments found for this TTE. Please check your TTE assignment in Firebase.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Coach Selector */}
            <div className="bg-[#2B2B2B] rounded-2xl border border-[#D4D4D4]/10 p-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    {/* Coach Dropdown */}
                    <div className="relative">
                        <button onClick={() => setShowCoachList(!showCoachList)}
                            className="flex items-center gap-3 px-4 py-3 bg-gray-900 rounded-xl border border-[#D4D4D4]/10 text-white font-semibold hover:border-cyan-500/50 transition min-w-[260px]">
                            <span className="w-4 h-4 rounded-full" style={{ background: coachCfg?.color || '#6B7280' }} />
                            <span className="flex-1 text-left">
                                {selectedCoach ? `Coach ${selectedCoach}` : 'Select Coach'}
                                {coachCfg && <span className="text-gray-400 ml-2 text-sm">({coachCfg.label})</span>}
                            </span>
                            <ChevronDown size={18} className={`text-gray-400 transition-transform ${showCoachList ? 'rotate-180' : ''}`} />
                        </button>
                        {showCoachList && (
                            <div className="absolute top-full mt-2 left-0 w-80 bg-gray-900 border border-[#D4D4D4]/20 rounded-xl shadow-2xl z-50 max-h-80 overflow-y-auto">
                                <div className="p-2 border-b border-gray-800">
                                    <span className="text-xs text-gray-500 uppercase font-bold px-2">Assigned Coaches</span>
                                </div>
                                {coaches.map(c => {
                                    const cfg = coachConfigs?.[c.type];
                                    return (
                                        <button key={c.id} onClick={() => { setSelectedCoach(c.id); setShowCoachList(false); setSelected(null); }}
                                            className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-800 transition ${selectedCoach === c.id ? 'bg-cyan-500/20 border-l-2 border-cyan-400' : ''}`}>
                                            <span className="w-3 h-3 rounded-full" style={{ background: cfg?.color || '#6B7280' }} />
                                            <span className="font-bold text-white">{c.id}</span>
                                            <span className="text-sm text-gray-400 flex-1">{cfg?.label || c.type}</span>
                                            {cfg && <span className="text-xs bg-gray-800 px-2 py-0.5 rounded text-gray-400">{cfg.berths || '—'}</span>}
                                        </button>
                                    );
                                })}
                                {coaches.length === 0 && (
                                    <div className="px-4 py-6 text-center text-gray-500 text-sm">No coaches assigned</div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Current Coach Info */}
                    <div className="flex items-center gap-3">
                        <div className="text-right">
                            <div className="text-2xl font-black text-white">{selectedCoach || '—'}</div>
                            <div className="text-sm text-gray-400">{layout.label} • {layout.totalSeats || 0} {layout.type === 'chair' ? 'seats' : 'berths'}</div>
                        </div>
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: coachCfg?.color || '#6B7280' }}>
                            <span className="text-xl font-black text-white">{currentCoachType?.charAt(0) || '?'}</span>
                        </div>
                    </div>

                    {/* Legend */}
                    <div className="flex gap-4">
                        {legend.map(l => (
                            <span key={l.label} className="flex items-center gap-2 text-xs font-semibold text-gray-400">
                                <span className={`w-4 h-4 rounded ${l.style.bg} border ${l.style.border}`} />
                                {l.label}
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            {currentCoachType === 'GEN' || currentCoachType === 'GN' ? (
                <div className="bg-[#2B2B2B] rounded-2xl border border-[#D4D4D4]/10 p-10 text-center">
                    <p className="text-lg font-bold text-white mb-2">General Coach — Unreserved</p>
                    <p className="text-sm text-[#9CA3AF]">No assigned seats in this coach.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    {/* Seat Layout */}
                    <div className="xl:col-span-2 bg-[#1D2332] rounded-2xl border border-white/5 p-6 shadow-2xl relative">
                        {/* Engine Direction */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-gray-700 text-gray-300 px-6 py-1.5 rounded-b-lg text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                            <ArrowUp size={14} /> Engine
                        </div>

                        <div className="mt-8">
                            {layout.bays.length > 0 ? (
                                <div className="space-y-4 overflow-y-auto max-h-[600px]">
                                    {layout.bays.map((bay, bayIdx) => (
                                        <div key={bayIdx} className="bg-gray-900/50 rounded-xl p-4 border border-gray-800">
                                            {/* Bay/Row Header */}
                                            <div className="mb-3 flex items-center justify-between">
                                                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                                                    {layout.type === 'sleeper' ? `BAY ${bay.bayNumber}` : `ROW ${bay.bayNumber}`}
                                                </span>
                                                <span className="text-[10px] text-gray-600">{bay.total} seats</span>
                                            </div>

                                            {/* Actual Physical Layout */}
                                            {layout.type === 'sleeper' ? (
                                                // Sleeper: Vertical stacking showing Upper/Middle/Lower arrangement
                                                <div className="flex items-stretch gap-4">
                                                    {/* LEFT COLUMN (3 berths stacked) */}
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-[9px] text-gray-600 font-semibold mb-1">Upper</span>
                                                        <SeatCell seat={bay.left[2]} isSelected={selected?.number === bay.left[2]?.number} onClick={setSelected} />
                                                        <span className="text-[9px] text-gray-600 font-semibold my-1">Middle</span>
                                                        <SeatCell seat={bay.left[1]} isSelected={selected?.number === bay.left[1]?.number} onClick={setSelected} />
                                                        <span className="text-[9px] text-gray-600 font-semibold my-1">Lower</span>
                                                        <SeatCell seat={bay.left[0]} isSelected={selected?.number === bay.left[0]?.number} onClick={setSelected} />
                                                    </div>

                                                    {/* LEFT SIDE BERTH */}
                                                    <div className="flex flex-col gap-1 border-l border-dashed border-gray-700 pl-3">
                                                        <span className="text-[9px] text-gray-600 font-semibold mb-1">Side</span>
                                                        <SeatCell seat={bay.leftSide[0]} isSelected={selected?.number === bay.leftSide[0]?.number} onClick={setSelected} />
                                                    </div>

                                                    {/* AISLE */}
                                                    <div className="w-6 flex-shrink-0">
                                                        <div className="w-0.5 h-full bg-gray-700 mx-auto rounded-full opacity-40"></div>
                                                    </div>

                                                    {/* RIGHT COLUMN (3 berths stacked) */}
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-[9px] text-gray-600 font-semibold mb-1">Upper</span>
                                                        <SeatCell seat={bay.right[2]} isSelected={selected?.number === bay.right[2]?.number} onClick={setSelected} />
                                                        <span className="text-[9px] text-gray-600 font-semibold my-1">Middle</span>
                                                        <SeatCell seat={bay.right[1]} isSelected={selected?.number === bay.right[1]?.number} onClick={setSelected} />
                                                        <span className="text-[9px] text-gray-600 font-semibold my-1">Lower</span>
                                                        <SeatCell seat={bay.right[0]} isSelected={selected?.number === bay.right[0]?.number} onClick={setSelected} />
                                                    </div>

                                                    {/* RIGHT SIDE BERTH */}
                                                    <div className="flex flex-col gap-1 border-l border-dashed border-gray-700 pl-3">
                                                        <span className="text-[9px] text-gray-600 font-semibold mb-1">Side</span>
                                                        <SeatCell seat={bay.rightSide[0]} isSelected={selected?.number === bay.rightSide[0]?.number} onClick={setSelected} />
                                                    </div>
                                                </div>
                                            ) : (
                                                // 2S/CC: Horizontal layout
                                                <div className="flex items-center gap-3 overflow-x-auto pb-2">
                                                    <div className="flex gap-2">
                                                        {bay.left.map((seat, i) => (
                                                            <div key={`l-${i}`}>
                                                                <SeatCell seat={seat} isSelected={selected?.number === seat?.number} onClick={setSelected} />
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <div className="w-4 flex-shrink-0">
                                                        <div className="w-0.5 h-10 bg-gray-700 mx-auto rounded-full opacity-50"></div>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        {bay.right.map((seat, i) => (
                                                            <div key={`r-${i}`}>
                                                                <SeatCell seat={seat} isSelected={selected?.number === seat?.number} onClick={setSelected} />
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex items-center justify-center h-64 text-gray-500">
                                    <div className="text-center">
                                        <p className="mb-2">No seat data available</p>
                                        <p className="text-xs">Select a coach or check backend connection</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Seat Detail Panel */}
                    <div className="bg-[#2B2B2B] rounded-2xl border border-[#D4D4D4]/10 p-6">
                        {selected ? (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between pb-3 border-b border-gray-700">
                                    <h3 className="text-white font-bold text-lg">Berth #{selected.number}</h3>
                                    <button onClick={() => setSelected(null)} className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/10">
                                        <X size={18} />
                                    </button>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-gray-900 rounded-xl p-3 border border-gray-800">
                                        <p className="text-[10px] font-bold text-gray-500 uppercase">Type</p>
                                        <p className="text-sm font-semibold text-white mt-0.5">{selected.type}</p>
                                    </div>
                                    <div className="bg-gray-900 rounded-xl p-3 border border-gray-800">
                                        <p className="text-[10px] font-bold text-gray-500 uppercase">Status</p>
                                        <p className={`text-sm font-semibold mt-0.5 ${selected.status === 'booked' ? 'text-red-400' : selected.status === 'available' ? 'text-emerald-400' : 'text-amber-400'}`}>
                                            {selected.status?.charAt(0).toUpperCase() + selected.status?.slice(1)}
                                        </p>
                                    </div>
                                    <div className="bg-gray-900 rounded-xl p-3 border border-gray-800">
                                        <p className="text-[10px] font-bold text-gray-500 uppercase">Coach</p>
                                        <p className="text-sm font-semibold text-white mt-0.5">{selectedCoach}</p>
                                    </div>
                                    <div className="bg-gray-900 rounded-xl p-3 border border-gray-800">
                                        <p className="text-[10px] font-bold text-gray-500 uppercase">Coach Type</p>
                                        <p className="text-sm font-semibold text-white mt-0.5">{coachCfg?.label || currentCoachType}</p>
                                    </div>
                                </div>
                                {selected.passenger ? (
                                    <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 space-y-3">
                                        <p className="text-xs font-bold text-gray-500 uppercase">Passenger Details</p>
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-cyan-500/20 rounded-full flex items-center justify-center">
                                                <User size={20} className="text-cyan-400" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-white">{selected.passenger.name}</p>
                                                <p className="text-xs text-gray-400">{selected.passenger.age}y • {selected.passenger.gender}</p>
                                            </div>
                                            {selected.passenger.verified && (
                                                <span className="ml-auto bg-emerald-500/20 text-emerald-400 text-xs font-bold px-2 py-1 rounded-full">Verified</span>
                                            )}
                                        </div>
                                        <div className="flex gap-2 mt-3">
                                            <button onClick={() => navigate(`/tte/verify?pnr=${selected.passenger.pnr}`)}
                                                className="flex-1 px-3 py-2 bg-cyan-500 hover:bg-cyan-400 text-white text-sm font-bold rounded-lg transition">
                                                Check Ticket
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-6 text-center space-y-4">
                                        <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                                            <User size={24} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-white mb-1">Unoccupied Seat</p>
                                            <p className="text-xs text-[#9CA3AF]">This seat is currently empty.</p>
                                        </div>
                                        <button 
                                            onClick={() => navigate(`/tte/issue-ticket?coach=${selectedCoach}&seat=${selected.number}&type=${currentCoachType || ''}`)}
                                            className="w-full bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
                                        >
                                            <CheckCircle size={14} /> Book This Seat
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="h-full flex items-center justify-center text-gray-500 py-16">
                                <div className="text-center">
                                    <Info size={32} className="mx-auto mb-3 opacity-50" />
                                    <p className="text-sm">Click on a booked berth to view details</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
