import { useSmartRail } from '../hooks/useSmartRail';
import { UserX, ArrowRightLeft, CheckCircle, MapPin } from 'lucide-react';

export default function NoShowManager() {
    const { passengers, markNoShow } = useSmartRail();
    const confirmed = passengers.filter(p => p.status === 'Confirmed' && !p.verified);
    const noShows = passengers.filter(p => p.status === 'No-Show');

    return (
        <div className="space-y-6">
            {/* Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-[#2B2B2B] rounded-2xl border border-[#D4D4D4]/10 p-5">
                    <p className="text-xs font-bold text-[#B3B3B3] uppercase tracking-wider">Unverified Passengers</p>
                    <p className="text-3xl font-extrabold text-amber-400 mt-2">{confirmed.length}</p>
                </div>
                <div className="bg-[#2B2B2B] rounded-2xl border border-[#D4D4D4]/10 p-5">
                    <p className="text-xs font-bold text-[#B3B3B3] uppercase tracking-wider">Marked No-Show</p>
                    <p className="text-3xl font-extrabold text-red-400 mt-2">{noShows.length}</p>
                </div>
                <div className="bg-[#2B2B2B] rounded-2xl border border-[#D4D4D4]/10 p-5">
                    <p className="text-xs font-bold text-[#B3B3B3] uppercase tracking-wider">Seats Released</p>
                    <p className="text-3xl font-extrabold text-emerald-400 mt-2">{noShows.length}</p>
                </div>
            </div>

            {/* Unverified Passengers */}
            <div className="bg-[#2B2B2B] rounded-2xl border border-[#D4D4D4]/10 overflow-hidden">
                <div className="p-5 border-b border-[#D4D4D4]/10"><h3 className="text-sm font-bold text-[#B3B3B3] uppercase tracking-wider">Unverified Passengers — Mark as No-Show</h3></div>
                <table className="w-full text-left">
                    <thead><tr className="bg-black/20 text-[#B3B3B3] text-xs uppercase tracking-wider"><th className="p-4 font-semibold">Name</th><th className="p-4 font-semibold">Seat</th><th className="p-4 font-semibold">Boarding</th><th className="p-4 font-semibold text-right">Action</th></tr></thead>
                    <tbody className="divide-y divide-[#D4D4D4]/5">
                        {confirmed.map(p => (
                            <tr key={p.id} className="hover:bg-white/5">
                                <td className="p-4 text-sm text-white font-medium">{p.name}</td>
                                <td className="p-4 text-sm text-[#B3B3B3]">{p.coach}-{p.seatNo}</td>
                                <td className="p-4 text-sm text-[#9CA3AF] flex items-center gap-1"><MapPin size={12} />{p.boarding}</td>
                                <td className="p-4 text-right">
                                    <button onClick={() => markNoShow(p.id)} className="px-3 py-1.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg text-xs font-bold hover:bg-red-500 hover:text-white transition flex items-center gap-1 ml-auto">
                                        <UserX size={12} /> No-Show
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* No-Show Log */}
            {noShows.length > 0 && (
                <div className="bg-[#2B2B2B] rounded-2xl border border-[#D4D4D4]/10 overflow-hidden">
                    <div className="p-5 border-b border-[#D4D4D4]/10"><h3 className="text-sm font-bold text-[#B3B3B3] uppercase tracking-wider">No-Show Log — Seats Released</h3></div>
                    <table className="w-full text-left">
                        <thead><tr className="bg-black/20 text-[#B3B3B3] text-xs uppercase tracking-wider"><th className="p-4 font-semibold">Name</th><th className="p-4 font-semibold">Seat</th><th className="p-4 font-semibold">Status</th></tr></thead>
                        <tbody className="divide-y divide-[#D4D4D4]/5">
                            {noShows.map(p => (
                                <tr key={p.id} className="hover:bg-white/5"><td className="p-4 text-sm text-white/60">{p.name}</td><td className="p-4 text-sm text-[#B3B3B3]">{p.coach}-{p.seatNo}</td><td className="p-4"><span className="text-[10px] font-bold uppercase text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">Released</span></td></tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
