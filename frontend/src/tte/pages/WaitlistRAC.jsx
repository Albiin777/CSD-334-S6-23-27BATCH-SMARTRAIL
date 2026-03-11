import { useSmartRail } from '../hooks/useSmartRail';
import { ArrowRightLeft, User, AlertCircle } from 'lucide-react';

export default function WaitlistRAC() {
    const { allPassengers = [], upgradeRAC } = useSmartRail();
    // Status values from Firestore are 'WL' and 'RAC'
    const wl = allPassengers.filter(p => ['WL', 'Waitlist'].includes(p.status));
    const rac = allPassengers.filter(p => p.status === 'RAC');

    // Priority ordering: seniors (age > 60), females, then others
    const priorityOrder = (p) => {
        if (p.age && p.age >= 60) return 1; // Senior citizen
        if (p.gender === 'Female' || p.gender === 'F') return 2;
        return 3;
    };
    
    const getPriorityLabel = (p) => {
        if (p.age && p.age >= 60) return 'Senior';
        if (p.gender === 'Female' || p.gender === 'F') return 'Female';
        return 'Normal';
    };

    return (
        <div className="space-y-6">
            {/* Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-[#2B2B2B] rounded-2xl border border-[#D4D4D4]/10 p-5">
                    <p className="text-xs font-bold text-[#B3B3B3] uppercase tracking-wider">Waitlist Count</p>
                    <p className="text-3xl font-extrabold text-white mt-2">{wl.length}</p>
                </div>
                <div className="bg-[#2B2B2B] rounded-2xl border border-[#D4D4D4]/10 p-5">
                    <p className="text-xs font-bold text-[#B3B3B3] uppercase tracking-wider">RAC Count</p>
                    <p className="text-3xl font-extrabold text-white mt-2">{rac.length}</p>
                </div>
                <div className="bg-[#2B2B2B] rounded-2xl border border-[#D4D4D4]/10 p-5">
                    <p className="text-xs font-bold text-[#B3B3B3] uppercase tracking-wider">Confirmation Probability</p>
                    <p className="text-3xl font-extrabold text-emerald-400 mt-2">68%</p>
                </div>
            </div>

            {/* WL Queue */}
            <div className="bg-[#2B2B2B] rounded-2xl border border-[#D4D4D4]/10 overflow-hidden">
                <div className="p-5 border-b border-[#D4D4D4]/10 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-[#B3B3B3] uppercase tracking-wider">Waitlist Queue</h3>
                    <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">{wl.length} pending</span>
                </div>
                <table className="w-full text-left">
                    <thead><tr className="bg-black/20 text-[#B3B3B3] text-xs uppercase tracking-wider"><th className="p-4 font-semibold">Name</th><th className="p-4 font-semibold">PNR</th><th className="p-4 font-semibold">Priority</th><th className="p-4 font-semibold">WL No.</th></tr></thead>
                    <tbody className="divide-y divide-[#D4D4D4]/5">
                        {wl.length === 0 ? (
                            <tr><td colSpan={4} className="p-8 text-center text-[#6B7280] text-sm">No waitlisted passengers</td></tr>
                        ) : wl.sort((a, b) => priorityOrder(a) - priorityOrder(b)).map(p => (
                            <tr key={p.id} className="hover:bg-white/5">
                                <td className="p-4 text-sm text-white font-medium">{p.name}</td>
                                <td className="p-4 text-sm text-[#B3B3B3] font-mono">{p.pnr}</td>
                                <td className="p-4"><span className={`text-xs font-bold ${getPriorityLabel(p) === 'Senior' ? 'text-amber-400' : getPriorityLabel(p) === 'Female' ? 'text-pink-400' : 'text-[#9CA3AF]'}`}>{getPriorityLabel(p)}</span></td>
                                <td className="p-4 text-sm text-[#9CA3AF]">WL/{p.wlNumber || '—'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* RAC Queue */}
            <div className="bg-[#2B2B2B] rounded-2xl border border-[#D4D4D4]/10 overflow-hidden">
                <div className="p-5 border-b border-[#D4D4D4]/10"><h3 className="text-sm font-bold text-[#B3B3B3] uppercase tracking-wider">RAC — Convert to Full Berth</h3></div>
                <table className="w-full text-left">
                    <thead><tr className="bg-black/20 text-[#B3B3B3] text-xs uppercase tracking-wider"><th className="p-4 font-semibold">Name</th><th className="p-4 font-semibold">PNR</th><th className="p-4 font-semibold">Seat</th><th className="p-4 font-semibold text-right">Action</th></tr></thead>
                    <tbody className="divide-y divide-[#D4D4D4]/5">
                        {rac.length === 0 ? (
                            <tr><td colSpan={4} className="p-8 text-center text-[#6B7280] text-sm">No RAC passengers</td></tr>
                        ) : rac.map(p => (
                            <tr key={p.id} className="hover:bg-white/5">
                                <td className="p-4 text-sm text-white font-medium">{p.name}</td>
                                <td className="p-4 text-sm text-[#B3B3B3] font-mono">{p.pnr}</td>
                                <td className="p-4 text-sm text-[#B3B3B3]">{p.coach}-{p.seatNo || p.racNumber || '—'}</td>
                                <td className="p-4 text-right">
                                    <button onClick={() => upgradeRAC(p.id)} className="px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-xs font-bold hover:bg-emerald-600 transition flex items-center gap-1 ml-auto">
                                        <ArrowRightLeft size={12} /> Upgrade
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
