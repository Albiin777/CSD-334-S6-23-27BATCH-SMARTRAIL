import StatCard from '../components/StatCard';
import { useSmartRail } from '../hooks/useSmartRail';
import { Users, CheckCircle, Clock, XCircle, ListOrdered, Banknote, Activity, ChevronRight, Navigation, ChevronDown, Train } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useState } from 'react';

export default function Dashboard() {
    const navigate = useNavigate();
    const { stats, tteInfo, logs, time, stations, stationIndex, nextStation, coaches, coachConfigs, selectedCoach, setSelectedCoach, seats } = useSmartRail();
    const [showCoachPicker, setShowCoachPicker] = useState(false);
    const totalSeats = stats?.totalSeats || 0;
    const booked = stats?.booked || 0;
    const occPct = totalSeats > 0 ? Math.round((booked / totalSeats) * 100) : 0;
    
    // Safely get coach config with fallback - uses real totalSeats from stats
    const currentCoachObj = coaches.find(c => c.id === selectedCoach);
    const currentCoachType = currentCoachObj?.type || 'SL';
    const coachCfg = {
        ...(coachConfigs?.[currentCoachType] || { label: 'Sleeper', color: '#eab308' }),
        berths: totalSeats // Use real seat count from backend
    };

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

            {/* Seat Heatmap — Real Coach Layout */}
            {(() => {
                const isChair = coachCfg?.isChair;
                const berthsPerBay = coachCfg?.berthsPerBay || 8;
                const hasSide = coachCfg?.hasSide ?? true;
                // Split seats into bays
                const bays = [];
                for (let i = 0; i < seats.length; i += berthsPerBay) {
                    bays.push(seats.slice(i, i + berthsPerBay));
                }
                const statusColor = (s) =>
                    s === 'booked' ? 'bg-red-500 border-red-600 text-white'
                    : s === 'rac' ? 'bg-amber-500 border-amber-600 text-black'
                    : s === 'waitlist' ? 'bg-orange-500 border-orange-600 text-black'
                    : 'bg-emerald-500/30 border-emerald-500/50 text-emerald-300';

                return (
                    <div className="bg-[#2B2B2B] rounded-2xl border border-[#D4D4D4]/10 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold text-[#B3B3B3] uppercase tracking-wider">
                                Coach {selectedCoach} — Seat Layout
                            </h3>
                            <span className="text-xs px-2 py-1 rounded-lg" style={{ background: `${coachCfg?.color}20`, color: coachCfg?.color }}>
                                {coachCfg?.label} • {coachCfg?.berths} berths
                            </span>
                        </div>

                        {/* Column headers */}
                        {!isChair && (
                            <div className="flex gap-1 mb-2">
                                <div className="w-8 shrink-0" />
                                <div className="flex-1 grid grid-cols-3 gap-1 text-[9px] font-bold text-[#6B7280] text-center uppercase tracking-wider">
                                    <span>Lower</span><span>Middle</span><span>Upper</span>
                                </div>
                                {hasSide && (
                                    <div className="w-1 bg-[#D4D4D4]/10 mx-1 rounded-full" />
                                )}
                                {hasSide && (
                                    <div className="flex gap-1" style={{ width: '4.5rem' }}>
                                        <span className="flex-1 text-[9px] font-bold text-[#6B7280] text-center uppercase tracking-wider">S.Low</span>
                                        <span className="flex-1 text-[9px] font-bold text-[#6B7280] text-center uppercase tracking-wider">S.Up</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Coach bays */}
                        <div className="overflow-x-auto">
                            <div className={`flex ${isChair ? 'flex-col gap-1' : 'flex-col gap-1'}`}>
                                {bays.map((bay, bi) => {
                                    if (isChair) {
                                        return (
                                            <div key={bi} className="flex items-center gap-1">
                                                <span className="text-[9px] font-bold text-[#6B7280] w-8 shrink-0 text-right pr-1">
                                                    {bi + 1}
                                                </span>
                                                <div className="flex gap-1 flex-1">
                                                    {bay.map((seat) => (
                                                        <div
                                                            key={seat.number}
                                                            title={`Seat ${seat.number} (${seat.typeShort}) — ${seat.status}`}
                                                            className={`flex-1 h-7 rounded border text-[8px] font-bold flex flex-col items-center justify-center cursor-default transition ${statusColor(seat.status)}`}
                                                        >
                                                            <span>{seat.number}</span>
                                                            <span className="opacity-60 text-[7px]">{seat.typeShort}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    }

                                    // Sleeper / AC coach: main berths (LB/MB/UB) + side berths (SL/SU)
                                    const mainBerths = hasSide ? bay.slice(0, berthsPerBay - 2) : bay;
                                    const sideBerths = hasSide ? bay.slice(berthsPerBay - 2) : [];

                                    return (
                                        <div key={bi} className="flex items-center gap-1">
                                            {/* Bay number */}
                                            <span className="text-[9px] font-bold text-[#6B7280] w-8 shrink-0 text-right pr-1">
                                                {bi + 1}
                                            </span>

                                            {/* Main berths: 2 sets of LB/MB/UB side-by-side */}
                                            <div className="flex-1 grid gap-1"
                                                style={{ gridTemplateColumns: `repeat(${mainBerths.length}, minmax(0,1fr))` }}>
                                                {mainBerths.map((seat) => (
                                                    <div
                                                        key={seat.number}
                                                        title={`Berth ${seat.number} (${seat.typeShort}) — ${seat.status}${seat.passenger ? ` · ${seat.passenger.name}` : ''}`}
                                                        className={`h-8 rounded border text-[8px] font-bold flex flex-col items-center justify-center cursor-default transition ${statusColor(seat.status)}`}
                                                    >
                                                        <span>{seat.number}</span>
                                                        <span className="opacity-60 text-[7px]">{seat.typeShort}</span>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Aisle divider */}
                                            {hasSide && <div className="w-px bg-[#D4D4D4]/15 self-stretch mx-0.5" />}

                                            {/* Side berths: SL / SU */}
                                            {hasSide && (
                                                <div className="flex gap-1" style={{ width: '4.5rem' }}>
                                                    {sideBerths.map((seat) => (
                                                        <div
                                                            key={seat.number}
                                                            title={`Berth ${seat.number} (${seat.typeShort}) — ${seat.status}${seat.passenger ? ` · ${seat.passenger.name}` : ''}`}
                                                            className={`flex-1 h-8 rounded border text-[8px] font-bold flex flex-col items-center justify-center cursor-default transition ${statusColor(seat.status)}`}
                                                        >
                                                            <span>{seat.number}</span>
                                                            <span className="opacity-60 text-[7px]">{seat.typeShort}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Legend */}
                        <div className="flex gap-4 mt-4 text-[10px] font-semibold text-[#9CA3AF]">
                            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-emerald-500/30 border border-emerald-500/50 inline-block" /> Available</span>
                            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-red-500 border border-red-600 inline-block" /> Booked</span>
                            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-amber-500 border border-amber-600 inline-block" /> RAC</span>
                            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-orange-500 border border-orange-600 inline-block" /> Waitlist</span>
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
