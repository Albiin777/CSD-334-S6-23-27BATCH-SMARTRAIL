import { useSmartRail } from '../hooks/useSmartRail';
import { BarChart3, TrendingUp, Users, AlertTriangle } from 'lucide-react';

export default function Analytics() {
    const { stats, allPassengers: passengers, fines, incidents } = useSmartRail();
    const occPct = stats.totalSeats > 0 ? Math.round((stats.booked / stats.totalSeats) * 100) : 0;
    // WL conversion: confirmed out of (confirmed + original waitlist who were upgraded)
    const totalConfirmed = passengers.filter(p => p.status === 'Confirmed').length;
    const totalWL = passengers.filter(p => p.status === 'Waitlist').length;
    const wlConv = (totalConfirmed + totalWL) > 0 ? Math.round((totalConfirmed / (totalConfirmed + totalWL)) * 100) : 0;
    const revenue = fines.reduce((s, f) => s + f.amount, 0);

    const dailyStats = [
        { label: 'Occupancy %', value: `${occPct}%`, bar: occPct, color: 'bg-emerald-400' },
        { label: 'Revenue Collected', value: `₹${revenue}`, bar: Math.min((revenue / 2000) * 100, 100), color: 'bg-blue-400' },
        { label: 'WL Conversion', value: `${wlConv}%`, bar: wlConv, color: 'bg-amber-400' },
    ];

    const categories = [
        { label: 'Senior Citizens', count: passengers.filter(p => p.flags?.includes('senior')).length, color: 'text-blue-400' },
        { label: 'Women', count: passengers.filter(p => p.gender === 'Female' || p.gender === 'F').length, color: 'text-pink-400' },
        { label: 'Medical', count: passengers.filter(p => p.flags?.includes('medical')).length, color: 'text-red-400' },
        { label: 'Pregnant', count: passengers.filter(p => p.flags?.includes('pregnant')).length, color: 'text-amber-400' },
        { label: 'Regular', count: passengers.filter(p => (!p.flags || p.flags.length === 0) && p.gender !== 'Female' && p.gender !== 'F').length, color: 'text-[#B3B3B3]' },
    ];

    return (
        <div className="space-y-6">
            {/* Daily Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {dailyStats.map(s => (
                    <div key={s.label} className="bg-[#2B2B2B] rounded-2xl border border-[#D4D4D4]/10 p-5">
                        <p className="text-xs font-bold text-[#B3B3B3] uppercase tracking-wider">{s.label}</p>
                        <p className="text-3xl font-extrabold text-white mt-2 mb-3">{s.value}</p>
                        <div className="w-full h-2 rounded-full bg-black/40 border border-white/5">
                            <div className={`h-full rounded-full ${s.color} transition-all duration-700`} style={{ width: `${s.bar}%` }} />
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Boarding Breakdown */}
                <div className="bg-[#2B2B2B] rounded-2xl border border-[#D4D4D4]/10 p-6">
                    <h3 className="text-sm font-bold text-[#B3B3B3] uppercase tracking-wider mb-5 flex items-center gap-2"><TrendingUp size={16} /> Boarding Stations</h3>
                    {(() => {
                        const boardingMap = {};
                        passengers.forEach(p => {
                            if (p.boarding) boardingMap[p.boarding] = (boardingMap[p.boarding] || 0) + 1;
                        });
                        const entries = Object.entries(boardingMap).sort((a, b) => b[1] - a[1]).slice(0, 6);
                        const max = Math.max(...entries.map(([, v]) => v), 1);
                        return entries.length === 0 ? (
                            <p className="text-xs text-[#9CA3AF] text-center py-6">No boarding data available</p>
                        ) : (
                            <div className="space-y-3">
                                {entries.map(([station, count]) => (
                                    <div key={station} className="flex items-center gap-3">
                                        <span className="text-xs font-semibold text-[#B3B3B3] w-24 shrink-0 truncate">{station}</span>
                                        <div className="flex-1 h-5 bg-gray-800 rounded-full overflow-hidden">
                                            <div className="h-full bg-emerald-500 rounded-full flex items-center justify-center transition-all duration-500"
                                                style={{ width: `${(count / max) * 100}%` }}>
                                                <span className="text-[9px] font-bold text-white px-1">{count}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        );
                    })()}
                </div>

                {/* Passenger Categories */}
                <div className="bg-[#2B2B2B] rounded-2xl border border-[#D4D4D4]/10 p-6">
                    <h3 className="text-sm font-bold text-[#B3B3B3] uppercase tracking-wider mb-5 flex items-center gap-2"><Users size={16} /> Passenger Categories</h3>
                    <table className="w-full text-left">
                        <thead><tr className="text-[#B3B3B3] text-xs uppercase tracking-wider border-b border-[#D4D4D4]/10"><th className="pb-3 font-semibold">Category</th><th className="pb-3 font-semibold text-right">Count</th><th className="pb-3 font-semibold text-right">%</th></tr></thead>
                        <tbody className="divide-y divide-[#D4D4D4]/5">
                            {categories.map(c => (
                                <tr key={c.label} className="hover:bg-white/5">
                                    <td className={`py-3 text-sm font-semibold ${c.color}`}>{c.label}</td>
                                    <td className="py-3 text-sm text-white font-bold text-right">{c.count}</td>
                                    <td className="py-3 text-sm text-[#9CA3AF] text-right">{passengers.length > 0 ? Math.round((c.count / passengers.length) * 100) : 0}%</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Fraud Detection */}
            <div className="bg-[#2B2B2B] rounded-2xl border border-[#D4D4D4]/10 p-6">
                <h3 className="text-sm font-bold text-[#B3B3B3] uppercase tracking-wider mb-4 flex items-center gap-2"><BarChart3 size={16} /> Fraud Detection Summary</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-gray-900 rounded-xl p-4 border border-[#D4D4D4]/5">
                        <p className="text-[10px] font-bold text-[#9CA3AF] uppercase">Blacklisted Found</p>
                        <p className="text-2xl font-extrabold text-red-400 mt-1">{passengers.filter(p => p.flags?.includes('blacklisted')).length}</p>
                    </div>
                    <div className="bg-gray-900 rounded-xl p-4 border border-[#D4D4D4]/5">
                        <p className="text-[10px] font-bold text-[#9CA3AF] uppercase">Ticketless Caught</p>
                        <p className="text-2xl font-extrabold text-amber-400 mt-1">{fines.filter(f => f.reason === 'No ticket' || f.reason?.toLowerCase().includes('ticketless')).length}</p>
                    </div>
                    <div className="bg-gray-900 rounded-xl p-4 border border-[#D4D4D4]/5">
                        <p className="text-[10px] font-bold text-[#9CA3AF] uppercase">Total Incidents</p>
                        <p className="text-2xl font-extrabold text-blue-400 mt-1">{incidents.length}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
