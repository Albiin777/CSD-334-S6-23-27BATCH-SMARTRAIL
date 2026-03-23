import StatCard from '../components/StatCard';
import { useSmartRail } from '../hooks/useSmartRail';
import { Users, CheckCircle, Clock, XCircle, ListOrdered, Banknote, Activity, ChevronRight, Navigation, ChevronDown, Train, ArrowUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useState } from 'react';

export default function Dashboard() {
    const navigate = useNavigate();
    const { stats, tteInfo, logs, time, stations, stationIndex, nextStation, coaches, coachConfigs, selectedCoach, setSelectedCoach, seats, currentCoachType, currentConfig, loading, error } = useSmartRail();
    const [showCoachPicker, setShowCoachPicker] = useState(false);
    const totalSeats = stats?.totalSeats || 0;
    const booked = stats?.booked || 0;
    const occPct = totalSeats > 0 ? Math.round((booked / totalSeats) * 100) : 0;
    
    // Use currentCoachType and currentConfig from hook instead of recalculating
    const currentCoachObj = coaches.find(c => c.id === selectedCoach);
    const coachCfg = {
        ...(currentConfig || coachConfigs?.[currentCoachType] || { label: 'Unknown', color: '#6B7280' }),
        berths: totalSeats // Use real seat count from backend
    };
    
    console.log("[Dashboard] selectedCoach:", selectedCoach, "currentCoachType:", currentCoachType, "seats:", seats?.length, "coaches:", coaches?.length, "loading:", loading, "error:", error);

    // Show loading state
    if (loading) {
        return (
            <div className="flex items-center justify-center h-64 text-gray-400">
                <div className="text-center">
                    <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p>Loading dashboard data...</p>
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

    const infoList = [
        ['TTE Name', tteInfo?.name || '—'], 
        ['TTE ID', tteInfo?.id || '—'],
        ['Train No', tteInfo?.trainNo || '—'], 
        ['Train Name', tteInfo?.trainName || '—'],
        ['Route', tteInfo?.route || '—'], 
        ['Date', tteInfo?.date || '—'],
        ['Departure', tteInfo?.departure || '—'], 
        ['Arrival', tteInfo?.arrival || '—'],
        ['Duration', tteInfo?.duration || '—'], 
        ['Shift', tteInfo?.shift || '—'],
        ['Zone', tteInfo?.zone || '—'], 
        ['Rake', tteInfo?.rakeType || '—'],
        ['Pantry', tteInfo?.pantryAvailable || '—'], 
        ['Division', tteInfo?.division || '—'],
    ];

    return (
        <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                <StatCard label="Total Berths" value={stats.totalSeats} icon={Users} color="blue" />
                <StatCard label="Booked" value={stats.booked} icon={CheckCircle} color="green" />
                <StatCard label="Vacant" value={stats.vacant} icon={Clock} color="yellow" />
                <StatCard label="RAC" value={stats.rac} icon={ListOrdered} color="cyan" />
                <StatCard label="Waitlist" value={stats.waitlist} icon={XCircle} color="red" />
                <StatCard label="Fine Collected" value={`₹${stats?.fineCollected || 0}`} icon={Banknote} color="purple" />
            </div>

            {/* TTE Info + Coach Selector + Occupancy */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-[#2B2B2B] rounded-2xl border border-[#D4D4D4]/10 p-6">
                    <div className="flex items-center justify-between mb-5">
                        <h3 className="text-sm font-bold text-[#B3B3B3] uppercase tracking-wider flex items-center gap-2"><Train size={16} className="text-blue-400" /> Train & TTE Details</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-y-4 gap-x-8">
                        {infoList.map(([label, val]) => (
                            <div key={label}>
                                <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider">{label}</p>
                                <p className="text-sm font-semibold text-white mt-0.5">{val}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Active Coach Selector */}
                    <div className="bg-[#2B2B2B] rounded-2xl border border-[#D4D4D4]/10 p-6">
                        <h3 className="text-sm font-bold text-[#B3B3B3] uppercase tracking-wider mb-3">Active Coach</h3>
                        <div className="relative mb-4">
                            <button onClick={() => setShowCoachPicker(!showCoachPicker)}
                                className="w-full flex items-center gap-2 px-4 py-3 bg-gray-900 rounded-xl border border-[#D4D4D4]/10 text-white text-sm font-semibold hover:border-[#D4D4D4]/30 transition">
                                <span className="w-3 h-3 rounded-full" style={{ background: coachCfg?.color || '#fff' }} />
                                <span className="flex-1 text-left">
                                    {currentCoachObj?.label || '—'} 
                                    <span className="text-[#9CA3AF] ml-1 text-xs">({coachCfg?.label})</span>
                                </span>
                                <span className="text-[10px] text-[#9CA3AF] bg-black/30 px-2 py-0.5 rounded-full">{coachCfg?.berths} berths</span>
                                <ChevronDown size={16} className={`text-[#B3B3B3] transition-transform ${showCoachPicker ? 'rotate-180' : ''}`} />
                            </button>
                            {showCoachPicker && (
                                <div className="absolute top-full mt-1 left-0 right-0 bg-[#1a1a1a] border border-[#D4D4D4]/10 rounded-xl shadow-2xl z-50 max-h-56 overflow-y-auto">
                                    {coaches.map(c => {
                                        const cfg = coachConfigs[c.type];
                                        return (
                                            <button key={c.id} onClick={() => { setSelectedCoach(c.id); setShowCoachPicker(false); }}
                                                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left hover:bg-white/5 transition ${selectedCoach === c.id ? 'bg-white/10 text-white' : 'text-[#B3B3B3]'}`}>
                                                <span className="w-2.5 h-2.5 rounded-full" style={{ background: cfg?.color || '#6B7280' }} />
                                                <span className="font-semibold">{c.label}</span>
                                                <span className="text-[10px] text-[#6B7280] flex-1">{cfg?.label}</span>
                                                {cfg && <span className="text-[10px] text-[#6B7280]">{cfg.berths}</span>}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="bg-gray-900 rounded-xl p-2.5 border border-[#D4D4D4]/5">
                                <p className="text-[9px] font-bold text-[#9CA3AF] uppercase">Booked</p>
                                <p className="text-lg font-extrabold text-white">{stats.booked}</p>
                            </div>
                            <div className="bg-gray-900 rounded-xl p-2.5 border border-[#D4D4D4]/5">
                                <p className="text-[9px] font-bold text-[#9CA3AF] uppercase">Vacant</p>
                                <p className="text-lg font-extrabold text-emerald-400">{stats.vacant}</p>
                            </div>
                            <div className="bg-gray-900 rounded-xl p-2.5 border border-[#D4D4D4]/5">
                                <p className="text-[9px] font-bold text-[#9CA3AF] uppercase">Verified</p>
                                <p className="text-lg font-extrabold text-blue-400">{stats.verified}</p>
                            </div>
                        </div>
                    </div>

                    {/* Occupancy */}
                    <div className="bg-[#2B2B2B] rounded-2xl border border-[#D4D4D4]/10 p-6">
                        <h3 className="text-sm font-bold text-[#B3B3B3] uppercase tracking-wider mb-3">Coach Occupancy</h3>
                        <p className="text-4xl font-extrabold text-white mb-3">{occPct}%</p>
                        <div className="w-full h-3 rounded-full bg-black/40 border border-white/5">
                            <motion.div className="h-full rounded-full bg-emerald-400" initial={{ width: 0 }} animate={{ width: `${occPct}%` }} transition={{ duration: 1.2 }} />
                        </div>
                        <div className="flex justify-between mt-2 text-xs text-[#9CA3AF] font-medium">
                            <span>{stats.booked} booked</span>
                            <span>{stats.vacant} vacant</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Seat Heatmap — Bay Layout */}
            {(() => {
                // Build layout based on coach type from actual seat data - organized by bays
                const buildLayout = () => {
                    if (!seats.length) return { bays: [], type: 'unknown' };
                    
                    const firstBerth = seats[0]?.typeShort;
                    const hasSideBerths = seats.some(s => ['SL', 'SU'].includes(s.typeShort));
                    const isChairCar = ['WS', 'MS', 'AS', 'W', 'M', 'A'].includes(firstBerth);
                    
                    if (hasSideBerths) {
                        // Sleeper - 8 berths per bay
                        const bays = [];
                        for (let i = 0; i < seats.length; i += 8) {
                            const baySeats = seats.slice(i, i + 8);
                            const bayNumber = Math.floor(i / 8) + 1;
                            bays.push({
                                bayNumber,
                                total: 8,
                                left: [baySeats[0], baySeats[1], baySeats[2]],
                                leftSide: [baySeats[3]],
                                right: [baySeats[4], baySeats[5], baySeats[6]],
                                rightSide: [baySeats[7]]
                            });
                        }
                        return { bays, type: 'sleeper' };
                    } else if (isChairCar) {
                        // 2S/CC - 5-6 seats per row
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
                        return { bays, type: 'chair' };
                    }
                    
                    // Fallback
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
                    return { bays, type: 'generic' };
                };

                const layout = buildLayout();
                
                const statusStyles = {
                    booked: { bg: 'bg-red-500', border: 'border-red-400', text: 'text-white' },
                    available: { bg: 'bg-gray-800', border: 'border-gray-600', text: 'text-gray-400' },
                    rac: { bg: 'bg-amber-500', border: 'border-amber-400', text: 'text-white' },
                    waitlist: { bg: 'bg-orange-500', border: 'border-orange-400', text: 'text-white' },
                };

                const SeatCell = ({ seat }) => {
                    if (!seat) return <div className="w-10 h-10 md:w-11 md:h-11" />;
                    const style = statusStyles[seat.status] || statusStyles.available;
                    return (
                        <div
                            title={`${seat.number} - ${seat.typeShort} (${seat.status})`}
                            className={`w-10 h-10 md:w-11 md:h-11 rounded-lg flex flex-col items-center justify-center
                                ${style.bg} ${style.text} border ${style.border}`}
                        >
                            <span className="text-sm font-bold">{seat.number}</span>
                            <span className="text-[8px] opacity-75">{seat.typeShort}</span>
                        </div>
                    );
                };

                return (
                    <div className="bg-[#1D2332] rounded-2xl border border-white/5 p-6 shadow-2xl relative">
                        {/* Engine Direction */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-gray-700 text-gray-300 px-4 py-1 rounded-b-lg text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">
                            <ArrowUp size={10} /> Engine
                        </div>

                        {/* Header */}
                        <div className="flex items-center justify-between mb-4 mt-4">
                            <h3 className="text-sm font-bold text-[#B3B3B3] uppercase tracking-wider">
                                Coach {selectedCoach}
                            </h3>
                            <span className="text-xs px-2 py-1 rounded-lg font-semibold" style={{ background: `${coachCfg?.color}20`, color: coachCfg?.color }}>
                                {coachCfg?.label} • {seats.length} {layout.type === 'chair' ? 'seats' : 'berths'}
                            </span>
                        </div>

                        {/* Seat Layout Bays */}
                        {layout.bays.length > 0 ? (
                            <div className="space-y-3 max-h-[400px] overflow-y-auto">
                                {layout.bays.map((bay, bayIdx) => (
                                    <div key={bayIdx} className="bg-gray-900/50 rounded-lg p-3 border border-gray-800">
                                        {/* Bay Label */}
                                        <div className="mb-2 flex items-center justify-between">
                                            <span className="text-xs font-bold uppercase tracking-wider text-gray-600">
                                                BAY {bay.bayNumber}
                                            </span>
                                            <span className="text-[9px] text-gray-700">{bay.total} seats</span>
                                        </div>

                                        {/* Seats Layout */}
                                        {layout.type === 'sleeper' ? (
                                            // Sleeper: Vertical stacking showing Upper/Middle/Lower
                                            <div className="flex items-stretch gap-2">
                                                {/* Left column (Upper, Middle, Lower) */}
                                                <div className="flex flex-col gap-1">
                                                    <SeatCell seat={bay.left[2]} />
                                                    <SeatCell seat={bay.left[1]} />
                                                    <SeatCell seat={bay.left[0]} />
                                                </div>

                                                {/* Left side berth */}
                                                {bay.leftSide.length > 0 && (
                                                    <div className="border-l border-dashed border-gray-700 pl-1 flex flex-col gap-1">
                                                        <SeatCell seat={bay.leftSide[0]} />
                                                    </div>
                                                )}

                                                {/* Aisle */}
                                                <div className="w-2 flex-shrink-0">
                                                    <div className="w-0.5 h-14 bg-gray-700 mx-auto rounded-full opacity-50"></div>
                                                </div>

                                                {/* Right column (Upper, Middle, Lower) */}
                                                <div className="flex flex-col gap-1">
                                                    <SeatCell seat={bay.right[2]} />
                                                    <SeatCell seat={bay.right[1]} />
                                                    <SeatCell seat={bay.right[0]} />
                                                </div>

                                                {/* Right side berth */}
                                                {bay.rightSide.length > 0 && (
                                                    <div className="border-l border-dashed border-gray-700 pl-1 flex flex-col gap-1">
                                                        <SeatCell seat={bay.rightSide[0]} />
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            // Non-sleeper: Horizontal layout
                                            <div className="flex items-center gap-2 overflow-x-auto pb-1">
                                                {/* Left side */}
                                                <div className="flex gap-1">
                                                    {bay.left.map((seat, i) => (
                                                        <div key={`l-${i}`}>
                                                            <SeatCell seat={seat} />
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* Aisle */}
                                                <div className="w-3 flex-shrink-0">
                                                    <div className="w-0.5 h-8 bg-gray-700 mx-auto rounded-full opacity-50"></div>
                                                </div>

                                                {/* Right side */}
                                                <div className="flex gap-1">
                                                    {bay.right.map((seat, i) => (
                                                        <div key={`r-${i}`}>
                                                            <SeatCell seat={seat} />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-32 text-gray-500">
                                <p className="text-sm">No seat data available</p>
                            </div>
                        )}

                        {/* Legend */}
                        <div className="flex gap-4 mt-5 justify-center text-[10px] font-semibold text-[#9CA3AF]">
                            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-800 border border-gray-600" /> Available</span>
                            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500" /> Booked</span>
                            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-500" /> RAC</span>
                            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-500" /> Waitlist</span>
                        </div>
                    </div>
                );
            })()}

            {/* Station Progress */}
            <div className="bg-[#2B2B2B] rounded-2xl border border-[#D4D4D4]/10 p-6">
                <div className="flex items-center justify-between mb-5">
                    <h3 className="text-sm font-bold text-[#B3B3B3] uppercase tracking-wider flex items-center gap-2"><Navigation size={16} className="text-emerald-400" /> Station Progress</h3>
                    <button onClick={nextStation} className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition border border-[#D4D4D4]/10">
                        Next <ChevronRight size={14} />
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <div className="flex items-center gap-2 min-w-max">
                        {(stations || []).map((s, i) => (
                            <div key={s} className="flex items-center gap-2">
                                <div className="flex flex-col items-center">
                                    <div className={`w-4 h-4 rounded-full border-2 ${i <= stationIndex ? 'bg-emerald-400 border-emerald-400' : 'bg-transparent border-[#4B5563]'}`} />
                                    <span className={`text-[9px] mt-1 font-semibold whitespace-nowrap ${i === stationIndex ? 'text-emerald-400' : 'text-[#9CA3AF]'}`}>{s}</span>
                                </div>
                                {i < stations.length - 1 && <div className={`w-8 h-0.5 ${i < stationIndex ? 'bg-emerald-400' : 'bg-[#4B5563]'}`} />}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-[#2B2B2B] rounded-2xl border border-[#D4D4D4]/10 p-6">
                <h3 className="text-sm font-bold text-[#B3B3B3] uppercase tracking-wider mb-4">Recent Activity</h3>
                {logs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-[#B3B3B3]">
                        <Activity size={32} className="mb-2 opacity-50" /><p className="text-sm">No recent activity</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {logs.slice(0, 8).map((log, i) => (
                            <div key={i} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-900/50 transition">
                                <span className="font-mono text-[11px] w-12 shrink-0 text-[#9CA3AF]">{log.time}</span>
                                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: log.type === 'verify' ? '#34d399' : log.type === 'fine' ? '#fbbf24' : log.type === 'incident' ? '#ef4444' : '#60a5fa' }} />
                                <p className="text-sm text-white font-medium truncate">{log.action}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
