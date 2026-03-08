import { useState, useRef, useEffect } from 'react';
import { useSmartRail } from '../hooks/useSmartRail';
import { Banknote, Receipt, Smartphone, Wallet, Search, User } from 'lucide-react';

const FINE_TYPES = [
    { reason: 'No ticket', amount: 500 },
    { reason: 'Wrong class', amount: 250 },
    { reason: 'Excess luggage', amount: 300 },
    { reason: 'Unauthorized travel', amount: 1000 },
];

export default function FinesPenalty() {
    const { fines, addFine, allPassengers } = useSmartRail();
    const [form, setForm] = useState({ passenger: '', reason: FINE_TYPES[0].reason, amount: FINE_TYPES[0].amount, method: 'Cash' });
    const [searchQuery, setSearchQuery] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef(null);

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowDropdown(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const filteredPassengers = allPassengers.filter(p => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return p.name.toLowerCase().includes(q) || p.pnr.includes(q) || `${p.coach}-${p.seatNo}`.toLowerCase().includes(q);
    });

    const selectPassenger = (p) => {
        setForm({ ...form, passenger: p.name });
        setSearchQuery(p.name);
        setShowDropdown(false);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        addFine({ ...form, time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) });
        setForm({ passenger: '', reason: FINE_TYPES[0].reason, amount: FINE_TYPES[0].amount, method: 'Cash' });
        setSearchQuery('');
    };

    const methods = [{ key: 'Cash', icon: Wallet }, { key: 'UPI', icon: Smartphone }];

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Fine Form */}
                <div className="bg-[#2B2B2B] rounded-2xl border border-[#D4D4D4]/10 p-6">
                    <h3 className="text-sm font-bold text-[#B3B3B3] uppercase tracking-wider mb-5 flex items-center gap-2"><Banknote size={16} /> Issue Fine</h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Passenger Selector */}
                        <div ref={dropdownRef} className="relative">
                            <label className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider block mb-1">Select Passenger</label>
                            <div className="flex items-center bg-gray-900 border border-[#D4D4D4]/10 rounded-xl px-4 py-3 gap-2 focus-within:border-[#D4D4D4]/30 transition">
                                <Search size={16} className="text-[#6B7280] shrink-0" />
                                <input
                                    type="text"
                                    required
                                    value={searchQuery}
                                    onChange={e => { setSearchQuery(e.target.value); setForm({ ...form, passenger: e.target.value }); setShowDropdown(true); }}
                                    onFocus={() => setShowDropdown(true)}
                                    className="bg-transparent text-sm text-white placeholder:text-[#6B7280] outline-none w-full"
                                    placeholder="Search by name, PNR, or seat…"
                                />
                            </div>
                            {showDropdown && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a1a1a] border border-[#D4D4D4]/10 rounded-xl shadow-2xl z-50 max-h-52 overflow-y-auto">
                                    {filteredPassengers.length === 0 ? (
                                        <p className="text-xs text-[#6B7280] text-center py-4">No passengers found</p>
                                    ) : (
                                        filteredPassengers.slice(0, 15).map(p => (
                                            <button key={p.id} type="button" onClick={() => selectPassenger(p)}
                                                className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-white/5 transition">
                                                <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center shrink-0">
                                                    <User size={12} className="text-[#B3B3B3]" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-semibold text-white truncate">{p.name}</p>
                                                    <p className="text-[10px] text-[#6B7280]">PNR: {p.pnr} • {p.coach}-{p.seatNo}</p>
                                                </div>
                                                <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full ${p.status === 'Confirmed' ? 'bg-emerald-500/10 text-emerald-400' : p.status === 'RAC' ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400'}`}>
                                                    {p.status}
                                                </span>
                                            </button>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider block mb-2">Violation Type</label>
                            <div className="grid grid-cols-2 gap-2">
                                {FINE_TYPES.map(ft => (
                                    <button key={ft.reason} type="button" onClick={() => setForm({ ...form, reason: ft.reason, amount: ft.amount })}
                                        className={`p-3 rounded-xl text-left border text-sm font-medium transition ${form.reason === ft.reason ? 'bg-white text-[#2B2B2B] border-white' : 'bg-gray-900 text-[#B3B3B3] border-[#D4D4D4]/10 hover:border-[#D4D4D4]/30'}`}>
                                        <p className="font-bold">{ft.reason}</p>
                                        <p className={`text-xs mt-0.5 ${form.reason === ft.reason ? 'text-[#6B7280]' : 'text-[#9CA3AF]'}`}>₹{ft.amount}</p>
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider block mb-2">Payment Method</label>
                            <div className="flex gap-2">
                                {methods.map(m => (
                                    <button key={m.key} type="button" onClick={() => setForm({ ...form, method: m.key })}
                                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition border ${form.method === m.key ? 'bg-white text-[#2B2B2B] border-white' : 'bg-gray-900 text-[#B3B3B3] border-[#D4D4D4]/10'}`}>
                                        <m.icon size={16} />{m.key}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="bg-gray-900 rounded-xl p-4 border border-[#D4D4D4]/10 flex items-center justify-between">
                            <span className="text-sm text-[#9CA3AF] font-medium">Fine Amount</span>
                            <span className="text-2xl font-extrabold text-white">₹{form.amount}</span>
                        </div>
                        <button type="submit" className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-red-500 text-white rounded-xl font-bold text-sm hover:bg-red-600 transition">
                            <Receipt size={18} /> Collect Fine & Generate Receipt
                        </button>
                    </form>
                </div>

                {/* Fine History */}
                <div className="bg-[#2B2B2B] rounded-2xl border border-[#D4D4D4]/10 overflow-hidden">
                    <div className="p-5 border-b border-[#D4D4D4]/10 flex items-center justify-between">
                        <h3 className="text-sm font-bold text-[#B3B3B3] uppercase tracking-wider">Fine History</h3>
                        <span className="text-xs font-bold text-white bg-white/10 px-2.5 py-1 rounded-full">₹{fines.reduce((s, f) => s + f.amount, 0)} total</span>
                    </div>
                    <table className="w-full text-left">
                        <thead><tr className="bg-black/20 text-[#B3B3B3] text-xs uppercase tracking-wider"><th className="p-4 font-semibold">Receipt</th><th className="p-4 font-semibold">Passenger</th><th className="p-4 font-semibold">Reason</th><th className="p-4 font-semibold">Amount</th><th className="p-4 font-semibold">Method</th></tr></thead>
                        <tbody className="divide-y divide-[#D4D4D4]/5">
                            {fines.map(f => (
                                <tr key={f.id} className="hover:bg-white/5"><td className="p-4 text-sm font-mono text-[#9CA3AF]">{f.receipt}</td><td className="p-4 text-sm text-white font-medium">{f.passenger}</td><td className="p-4 text-sm text-[#B3B3B3]">{f.reason}</td><td className="p-4 text-sm font-bold text-amber-400">₹{f.amount}</td><td className="p-4 text-sm text-[#B3B3B3]">{f.method}</td></tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
