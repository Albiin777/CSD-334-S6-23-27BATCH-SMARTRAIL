import { useSmartRail } from '../hooks/useSmartRail';
import { BarChart3, TrendingUp, Users, DollarSign } from 'lucide-react';

export default function Analytics() {
    const { stats, allPassengers: passengers, fines, incidents } = useSmartRail();
    const occPct = stats.totalSeats > 0 ? Math.round((stats.booked / stats.totalSeats) * 100) : 0;
    const wlConv = 68;
    const noShowRate = stats.totalPassengers > 0 ? Math.round((stats.noShows / stats.totalPassengers) * 100) : 0;
    const revenue = fines.reduce((s, f) => s + f.amount, 0);

    const dailyStats = [
        { label: 'Occupancy %', value: `${occPct}%`, bar: occPct, color: 'bg-emerald-400' },
        { label: 'Revenue Collected', value: `₹${revenue}`, bar: Math.min((revenue / 2000) * 100, 100), color: 'bg-blue-400' },
        { label: 'WL Conversion', value: `${wlConv}%`, bar: wlConv, color: 'bg-amber-400' },
        { label: 'No-Show Rate', value: `${noShowRate}%`, bar: noShowRate, color: 'bg-red-400' },
    ];

    const stationData = [
        { station: 'Chennai', boarding: 5, alighting: 0 },
        { station: 'Vijayawada', boarding: 2, alighting: 1 },
        { station: 'Nagpur', boarding: 1, alighting: 0 },
        { station: 'Bhopal', boarding: 1, alighting: 2 },
        { station: 'Jaipur', boarding: 0, alighting: 3 },
        { station: 'Delhi', boarding: 0, alighting: 6 },
    ];

    const categories = [
        { label: 'Senior Citizens', count: passengers.filter(p => p.flags.includes('senior')).length, color: 'text-blue-400' },
        { label: 'Women', count: passengers.filter(p => p.gender === 'Female').length, color: 'text-pink-400' },
        { label: 'Medical', count: passengers.filter(p => p.flags.includes('medical')).length, color: 'text-red-400' },
        { label: 'Pregnant', count: passengers.filter(p => p.flags.includes('pregnant')).length, color: 'text-amber-400' },
        { label: 'Regular', count: passengers.filter(p => p.flags.length === 0 && p.gender === 'Male').length, color: 'text-[#B3B3B3]' },
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
                {/* Station Boarding Trends */}
                <div className="bg-[#2B2B2B] rounded-2xl border border-[#D4D4D4]/10 p-6">
                    <h3 className="text-sm font-bold text-[#B3B3B3] uppercase tracking-wider mb-5 flex items-center gap-2"><TrendingUp size={16} /> Station Boarding Trends</h3>
                    <div className="space-y-3">
                        {stationData.map(s => (
                            <div key={s.station} className="flex items-center gap-3">
                                <span className="text-xs font-semibold text-[#B3B3B3] w-20 shrink-0 truncate">{s.station}</span>
                                <div className="flex-1 flex gap-1 h-6">
                                    <div className="bg-emerald-500 rounded-l-lg transition-all duration-500 flex items-center justify-center" style={{ width: `${Math.max(s.boarding * 15, 5)}%` }}>
                                        {s.boarding > 0 && <span className="text-[9px] font-bold text-white">+{s.boarding}</span>}
                                    </div>
                                    <div className="bg-red-500 rounded-r-lg transition-all duration-500 flex items-center justify-center" style={{ width: `${Math.max(s.alighting * 15, 5)}%` }}>
                                        {s.alighting > 0 && <span className="text-[9px] font-bold text-white">-{s.alighting}</span>}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-4 mt-4 text-[10px] font-bold text-[#9CA3AF]">
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-500" /> Boarding</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-500" /> Alighting</span>
                    </div>
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
                        <p className="text-2xl font-extrabold text-red-400 mt-1">{passengers.filter(p => p.flags.includes('blacklisted')).length}</p>
                    </div>
                    <div className="bg-gray-900 rounded-xl p-4 border border-[#D4D4D4]/5">
                        <p className="text-[10px] font-bold text-[#9CA3AF] uppercase">Ticketless Caught</p>
                        <p className="text-2xl font-extrabold text-amber-400 mt-1">{fines.filter(f => f.reason === 'No ticket').length}</p>
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
