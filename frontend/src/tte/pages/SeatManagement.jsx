import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSmartRail } from '../hooks/useSmartRail';
import { User, X, Info, ChevronDown, CheckCircle } from 'lucide-react';

const statusColors = {
    booked: 'bg-red-500 hover:bg-red-400',
    available: 'bg-emerald-500/40',
    rac: 'bg-amber-500 hover:bg-amber-400',
    waitlist: 'bg-orange-500 hover:bg-orange-400',
};

/* ──────────────────────────────────────
   Renders one Bay in Indian Railways style
   ─ 3A/SL: 6 main (3 left + 3 right with aisle) + 2 side
   ─ 2A:    4 main (2 left + 2 right) + 2 side
   ─ 1A:    4 per coupe (2 left + 2 right, no side)
   ─ CC/2S: row of seats
────────────────────────────────────── */
function BerthBay({ baySeats, bayNum, config, selected, onSelect }) {
    const isChair = config?.isChair;

    if (isChair) {
        return (
            <div className="flex items-center gap-1">
                <span className="text-[9px] font-bold text-[#6B7280] w-7 text-center shrink-0">R{bayNum}</span>
                {baySeats.map(seat => (
                    <SeatBtn key={seat.number} seat={seat} selected={selected} onSelect={onSelect} />
                ))}
            </div>
        );
    }

    const perBay = config.berthsPerBay;
    const mainCount = config.hasSide ? perBay - 2 : perBay;
    const half = mainCount / 2;
    const left = baySeats.slice(0, half);
    const right = baySeats.slice(half, mainCount);
    const side = config.hasSide ? baySeats.slice(mainCount) : [];

    return (
        <div className="flex items-stretch gap-0 bg-[#1a1a1a] rounded-xl border border-[#D4D4D4]/10 overflow-hidden">
            {/* Bay number */}
            <div className="flex items-center justify-center w-8 bg-black/30 border-r border-[#D4D4D4]/5 shrink-0">
                <span className="text-[9px] font-bold text-[#6B7280] -rotate-90 whitespace-nowrap">BAY {bayNum}</span>
            </div>

            {/* Left berths (stacked top to bottom: UB, MB, LB for 3A) */}
            <div className="flex flex-col-reverse gap-1 p-2">
                {left.map(seat => (
                    <SeatBtn key={seat.number} seat={seat} selected={selected} onSelect={onSelect} wide />
                ))}
            </div>

            {/* Aisle */}
            <div className="flex items-center justify-center w-6 shrink-0">
                <div className="w-px h-full bg-[#D4D4D4]/10" />
            </div>

            {/* Right berths */}
            <div className="flex flex-col-reverse gap-1 p-2">
                {right.map(seat => (
                    <SeatBtn key={seat.number} seat={seat} selected={selected} onSelect={onSelect} wide />
                ))}
            </div>

            {/* Side berths (separated by wall) */}
            {side.length > 0 && (
                <>
                    <div className="w-px bg-[#D4D4D4]/20 mx-1" />
                    <div className="flex flex-col-reverse gap-1 p-2">
                        {side.map(seat => (
                            <SeatBtn key={seat.number} seat={seat} selected={selected} onSelect={onSelect} wide isSide />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

function SeatBtn({ seat, selected, onSelect, wide, isSide }) {
    const isActive = seat.status !== 'available';
    const isSelected = selected?.number === seat.number;
    const isVerified = seat.passenger?.verified;

    return (
        <button
            onClick={() => isActive && onSelect(seat)}
            className={`relative flex flex-col items-center justify-center rounded-lg text-white text-xs font-bold transition-all duration-200
                ${wide ? 'w-20 h-10' : 'w-12 h-10'}
                ${statusColors[seat.status] || 'bg-gray-700/40'}
                ${isSelected ? 'ring-2 ring-white scale-105 shadow-lg z-10' : ''}
                ${isActive ? 'cursor-pointer hover:scale-105' : 'cursor-default opacity-60'}
                ${isSide ? 'border-l-2 border-dashed border-yellow-500/30' : ''}
            `}
        >
            <span className="text-sm leading-none">{seat.number}</span>
            <span className="text-[7px] opacity-70 leading-none mt-0.5">{seat.typeShort}</span>
            {isVerified && (
                <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full flex items-center justify-center border border-[#1a1a1a]">
                    <CheckCircle size={7} className="text-white" />
                </div>
            )}
        </button>
    );
}

export default function SeatManagement() {
    const { seats, coaches, selectedCoach, setSelectedCoach, currentCoachType, currentConfig, coachConfigs } = useSmartRail();
    const [selected, setSelected] = useState(null);
    const [showCoachList, setShowCoachList] = useState(false);
    const navigate = useNavigate();

    const legend = [
        { label: 'Available', color: 'bg-emerald-500/40' }, { label: 'Booked', color: 'bg-red-500' },
        { label: 'RAC', color: 'bg-amber-500' }, { label: 'Waitlist', color: 'bg-orange-500' },
    ];

    // Group seats by bay
    const bays = {};
    if (currentConfig) {
        seats.forEach(seat => {
            const bay = seat.bay;
            if (!bays[bay]) bays[bay] = [];
            bays[bay].push(seat);
        });
    }

    const coachCfg = coachConfigs[currentCoachType];

    return (
        <div className="space-y-6">
            {/* Coach Selector + Legend */}
            <div className="bg-[#2B2B2B] rounded-2xl border border-[#D4D4D4]/10 p-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    {/* Coach Dropdown */}
                    <div className="relative">
                        <button onClick={() => setShowCoachList(!showCoachList)}
                            className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 rounded-xl border border-[#D4D4D4]/10 text-white text-sm font-semibold hover:border-[#D4D4D4]/30 transition min-w-[220px]">
                            <span className="w-3 h-3 rounded-full shrink-0" style={{ background: coachCfg?.color || '#fff' }} />
                            <span className="flex-1 text-left">{coaches.find(c => c.id === selectedCoach)?.label}</span>
                            <ChevronDown size={16} className={`text-[#B3B3B3] transition-transform ${showCoachList ? 'rotate-180' : ''}`} />
                        </button>
                        {showCoachList && (
                            <div className="absolute top-full mt-1 left-0 w-72 bg-[#1a1a1a] border border-[#D4D4D4]/10 rounded-xl shadow-2xl z-50 max-h-80 overflow-y-auto">
                                {coaches.map(c => {
                                    const cfg = coachConfigs[c.type];
                                    return (
                                        <button key={c.id} onClick={() => { setSelectedCoach(c.id); setShowCoachList(false); setSelected(null); }}
                                            className={`w-full flex items-center gap-3 px-4 py-3 text-sm text-left hover:bg-white/5 transition ${selectedCoach === c.id ? 'bg-white/10 text-white' : 'text-[#B3B3B3]'}`}>
                                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: cfg?.color || '#6B7280' }} />
                                            <span className="font-semibold flex-1">{c.label}</span>
                                            {cfg && <span className="text-[10px] text-[#6B7280]">{cfg.berths} berths</span>}
                                            {!cfg && <span className="text-[10px] text-[#6B7280]">Unreserved</span>}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Coach info */}
                    {coachCfg && (
                        <div className="flex items-center gap-4 text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider">
                            <span>{coachCfg.label}</span>
                            <span>•</span>
                            <span>{coachCfg.berths} berths</span>
                            <span>•</span>
                            <span>{coachCfg.bays} bays</span>
                        </div>
                    )}

                    {/* Legend */}
                    <div className="flex gap-4">
                        {legend.map(l => (
                            <span key={l.label} className="flex items-center gap-1.5 text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider">
                                <span className={`w-3 h-3 rounded ${l.color}`} /> {l.label}
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            {currentCoachType === 'GEN' ? (
                <div className="bg-[#2B2B2B] rounded-2xl border border-[#D4D4D4]/10 p-10 text-center">
                    <p className="text-lg font-bold text-white mb-2">General Coach — Unreserved</p>
                    <p className="text-sm text-[#9CA3AF]">No assigned seats. Passengers travel without seat reservation.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Coach layout */}
                    <div className="lg:col-span-2 bg-[#2B2B2B] rounded-2xl border border-[#D4D4D4]/10 p-5 overflow-x-auto">
                        <div className="flex items-center gap-3 mb-5 pb-3 border-b border-[#D4D4D4]/10">
                            <h3 className="text-sm font-bold text-[#B3B3B3] uppercase tracking-wider">
                                Coach {selectedCoach} — {coachCfg?.label} Layout
                            </h3>
                            <span className="text-[10px] text-[#6B7280] bg-gray-900 px-2 py-0.5 rounded-full">{coachCfg?.isChair ? 'Seating' : 'Berth'} arrangement</span>
                        </div>

                        {coachCfg?.isChair ? (
                            /* Chair arrangement — rows */
                            <div className="space-y-1.5">
                                {Object.keys(bays).length > 0 ? (
                                    Object.entries(bays).map(([bayNum, baySeats]) => (
                                        <BerthBay key={bayNum} baySeats={baySeats} bayNum={bayNum} config={coachCfg} selected={selected} onSelect={setSelected} />
                                    ))
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-12 text-center">
                                        <p className="text-sm text-[#9CA3AF]">No seat data available for this coach</p>
                                        <p className="text-xs text-[#6B7280] mt-1">Check if backend server is running</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            /* Berth arrangement — bays */
                            <div className="space-y-3">
                                {Object.keys(bays).length > 0 ? (
                                    Object.entries(bays).map(([bayNum, baySeats]) => (
                                        <BerthBay key={bayNum} baySeats={baySeats} bayNum={bayNum} config={coachCfg} selected={selected} onSelect={setSelected} />
                                    ))
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-12 text-center">
                                        <p className="text-sm text-[#9CA3AF]">No berth data available for this coach</p>
                                        <p className="text-xs text-[#6B7280] mt-1">Check if backend server is running</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Seat Detail */}
                    <div className="bg-[#2B2B2B] rounded-2xl border border-[#D4D4D4]/10 p-6">
                        {selected ? (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between pb-3 border-b border-[#D4D4D4]/10">
                                    <h3 className="text-white font-bold">{coachCfg?.isChair ? 'Seat' : 'Berth'} #{selected.number}</h3>
                                    <button onClick={() => setSelected(null)} className="p-1 text-[#B3B3B3] hover:text-white rounded-lg hover:bg-white/10"><X size={16} /></button>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="bg-gray-900 rounded-xl p-3 border border-[#D4D4D4]/5">
                                        <p className="text-[10px] font-bold text-[#9CA3AF] uppercase">Type</p>
                                        <p className="text-sm font-semibold text-white mt-0.5">{selected.type}</p>
                                    </div>
                                    <div className="bg-gray-900 rounded-xl p-3 border border-[#D4D4D4]/5">
                                        <p className="text-[10px] font-bold text-[#9CA3AF] uppercase">Bay</p>
                                        <p className="text-sm font-semibold text-white mt-0.5">{coachCfg?.isChair ? `Row ${selected.bay}` : `Bay ${selected.bay}`}</p>
                                    </div>
                                    <div className="bg-gray-900 rounded-xl p-3 border border-[#D4D4D4]/5">
                                        <p className="text-[10px] font-bold text-[#9CA3AF] uppercase">Status</p>
                                        <p className={`text-sm font-semibold mt-0.5 ${selected.status === 'booked' ? 'text-red-400' : selected.status === 'available' ? 'text-emerald-400' : 'text-amber-400'}`}>
                                            {selected.status === 'booked' ? 'Booked' : selected.status === 'rac' ? 'RAC' : selected.status === 'waitlist' ? 'Waitlist' : 'Available'}
                                        </p>
                                    </div>
                                    <div className="bg-gray-900 rounded-xl p-3 border border-[#D4D4D4]/5">
                                        <p className="text-[10px] font-bold text-[#9CA3AF] uppercase">Coach</p>
                                        <p className="text-sm font-semibold text-white mt-0.5">{selectedCoach}</p>
                                    </div>
                                </div>
                                {selected.passenger ? (
                                    <div className="space-y-3 pt-2">
                                        <div className="flex items-center gap-3 p-3 bg-gray-900 rounded-xl border border-[#D4D4D4]/5">
                                            <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center shrink-0"><User size={18} className="text-[#B3B3B3]" /></div>
                                            <div>
                                                <p className="text-white font-semibold text-sm">{selected.passenger.name}</p>
                                                <p className="text-xs text-[#9CA3AF]">{selected.passenger.pnr} • {selected.passenger.ticketClass}</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            {[['Age', `${selected.passenger.age}yr`], ['Gender', selected.passenger.gender], ['From', selected.passenger.boarding], ['To', selected.passenger.destination], ['ID Proof', selected.passenger.idProof], ['Fare', `₹${selected.passenger.fare}`]].map(([l, v]) => (
                                                <div key={l} className="bg-gray-900 rounded-lg p-2.5 border border-[#D4D4D4]/5">
                                                    <p className="text-[9px] font-bold text-[#9CA3AF] uppercase">{l}</p>
                                                    <p className="text-xs font-semibold text-white">{v}</p>
                                                </div>
                                            ))}
                                        </div>
                                        {selected.passenger.flags.length > 0 && (
                                            <div className="space-y-1.5">
                                                <p className="text-[10px] font-bold text-[#9CA3AF] uppercase flex items-center gap-1"><Info size={12} /> Special Flags</p>
                                                {selected.passenger.flags.includes('senior') && <p className="text-xs text-blue-400 bg-blue-500/10 px-3 py-2 rounded-lg border border-blue-500/10">👴 Senior Citizen — Lower Berth priority</p>}
                                                {selected.passenger.flags.includes('pregnant') && <p className="text-xs text-amber-400 bg-amber-500/10 px-3 py-2 rounded-lg border border-amber-500/10">🤰 Pregnant — Lower Berth recommended</p>}
                                                {selected.passenger.flags.includes('medical') && <p className="text-xs text-red-400 bg-red-500/10 px-3 py-2 rounded-lg border border-red-500/10">🏥 Medical condition — Near facilities</p>}
                                                {selected.passenger.flags.includes('blacklisted') && <p className="text-xs text-red-400 bg-red-500/10 px-3 py-2 rounded-lg border border-red-500/10">⚠️ Blacklisted Passenger</p>}
                                            </div>
                                        )}
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
                                            onClick={() => {
                                                navigate(`/tte/issue-ticket?coach=${selectedCoach}&seat=${selected.number}&type=${coachCfg?.type || ''}`);
                                            }}
                                            className="w-full bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
                                        >
                                            <CheckCircle size={14} /> Book This Seat
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-64 text-[#B3B3B3]">
                                <User size={40} className="mb-3 opacity-30" />
                                <p className="text-sm font-medium">Click a berth to view details</p>
                                <p className="text-xs text-[#6B7280] mt-1">Red = Booked • Yellow = RAC</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
