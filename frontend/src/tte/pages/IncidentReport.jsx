import { useState } from 'react';
import { useSmartRail } from '../hooks/useSmartRail';
import { AlertTriangle, Heart, Shield, Wrench, Users, Phone, Radio, Camera } from 'lucide-react';

const REPORT_TYPES = [
    { type: 'Medical', icon: Heart, color: 'red' },
    { type: 'Security', icon: Shield, color: 'blue' },
    { type: 'Complaint', icon: Users, color: 'amber' },
    { type: 'Technical', icon: Wrench, color: 'purple' },
    { type: 'Overcrowding', icon: Users, color: 'cyan' },
];

const colorMap = { red: 'bg-red-500/10 border-red-500/20 text-red-400', blue: 'bg-blue-500/10 border-blue-500/20 text-blue-400', amber: 'bg-amber-500/10 border-amber-500/20 text-amber-400', purple: 'bg-purple-500/10 border-purple-500/20 text-purple-400', cyan: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400' };

export default function IncidentReport() {
    const { incidents, addIncident, tteInfo } = useSmartRail();
    const [selected, setSelected] = useState(null);
    const [desc, setDesc] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!selected || !desc) return;
        addIncident({ type: selected, description: desc, coach: tteInfo.coach.split(',')[0].trim(), reporter: 'TTE' });
        setSelected(null);
        setDesc('');
    };

    return (
        <div className="space-y-6">
            {/* Report Type Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {REPORT_TYPES.map(rt => (
                    <button key={rt.type} onClick={() => setSelected(rt.type)}
                        className={`p-5 rounded-2xl border transition-all text-center ${selected === rt.type ? `${colorMap[rt.color]} border-2` : 'bg-[#2B2B2B] border-[#D4D4D4]/10 text-[#B3B3B3] hover:border-[#D4D4D4]/25'}`}>
                        <rt.icon size={28} className={`mx-auto mb-2 ${selected === rt.type ? '' : 'opacity-50'}`} />
                        <p className="text-sm font-bold">{rt.type}</p>
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Report Form */}
                <div className="bg-[#2B2B2B] rounded-2xl border border-[#D4D4D4]/10 p-6">
                    <h3 className="text-sm font-bold text-[#B3B3B3] uppercase tracking-wider mb-5 flex items-center gap-2"><AlertTriangle size={16} /> File Incident Report</h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="bg-gray-900 rounded-xl p-3 border border-[#D4D4D4]/5 flex items-center justify-between">
                            <span className="text-sm text-[#9CA3AF]">Type</span>
                            <span className="text-sm font-bold text-white">{selected || 'Select type above'}</span>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider block mb-1">Description</label>
                            <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={4} required className="w-full bg-gray-900 border border-[#D4D4D4]/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-[#6B7280] outline-none resize-none focus:border-[#D4D4D4]/30 transition" placeholder="Describe the incident…" />
                        </div>
                        <div className="flex gap-2">
                            <button type="button" className="flex-1 flex items-center justify-center gap-2 py-3 bg-white/10 text-[#B3B3B3] border border-[#D4D4D4]/10 rounded-xl text-sm font-semibold hover:bg-white/20 transition"><Camera size={16} /> Attach Photo</button>
                            <button type="button" className="flex-1 flex items-center justify-center gap-2 py-3 bg-white/10 text-[#B3B3B3] border border-[#D4D4D4]/10 rounded-xl text-sm font-semibold hover:bg-white/20 transition"><Phone size={16} /> Emergency Call</button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <button type="submit" className="flex items-center justify-center gap-2 py-3 bg-red-500 text-white rounded-xl font-bold text-sm hover:bg-red-600 transition"><Radio size={16} /> Notify Control</button>
                            <button type="button" className="flex items-center justify-center gap-2 py-3 bg-blue-500 text-white rounded-xl font-bold text-sm hover:bg-blue-600 transition"><Shield size={16} /> Notify RPF</button>
                        </div>
                    </form>
                </div>

                {/* Incident Log */}
                <div className="bg-[#2B2B2B] rounded-2xl border border-[#D4D4D4]/10 overflow-hidden">
                    <div className="p-5 border-b border-[#D4D4D4]/10"><h3 className="text-sm font-bold text-[#B3B3B3] uppercase tracking-wider">Incident Log</h3></div>
                    <table className="w-full text-left">
                        <thead><tr className="bg-black/20 text-[#B3B3B3] text-xs uppercase tracking-wider"><th className="p-4 font-semibold">Time</th><th className="p-4 font-semibold">Type</th><th className="p-4 font-semibold">Description</th><th className="p-4 font-semibold">Status</th></tr></thead>
                        <tbody className="divide-y divide-[#D4D4D4]/5">
                            {incidents.map(inc => (
                                <tr key={inc.id} className="hover:bg-white/5">
                                    <td className="p-4 text-sm font-mono text-[#9CA3AF]">{inc.time}</td>
                                    <td className="p-4"><span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${inc.type === 'Medical' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>{inc.type}</span></td>
                                    <td className="p-4 text-sm text-white font-medium">{inc.description}</td>
                                    <td className="p-4"><span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${inc.status === 'Active' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>{inc.status}</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
