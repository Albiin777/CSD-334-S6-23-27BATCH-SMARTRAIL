import { useState, useRef, useEffect } from 'react';
import { useSmartRail } from '../hooks/useSmartRail';
import { Banknote, Receipt, Smartphone, Wallet, Search, User, Plus, Trash2 } from 'lucide-react';

const FINE_TYPES = [
    { reason: 'No ticket', amount: 500 },
    { reason: 'Wrong class', amount: 250 },
    { reason: 'Excess luggage', amount: 300 },
    { reason: 'Unauthorized travel', amount: 1000 },
];

const DEFAULT_FINE = { reason: FINE_TYPES[0].reason, amount: FINE_TYPES[0].amount };

export default function FinesPenalty() {
    const { fines, addFine, allPassengers } = useSmartRail();

    // Passenger selector
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedPassenger, setSelectedPassenger] = useState(null);
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef(null);

    // Single selection of multiple reasons
    const [selectedReasons, setSelectedReasons] = useState([]);
    const [amount, setAmount] = useState(0);
    const [method, setMethod] = useState('Cash');
    const [submitting, setSubmitting] = useState(false);

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowDropdown(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const filteredPassengers = allPassengers.filter(p => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return p.name.toLowerCase().includes(q) || p.pnr.includes(q) || `${p.coach}-${p.seatNo}`.toLowerCase().includes(q);
    });

    const selectPassenger = (p) => {
        setSelectedPassenger(p);
        setSearchQuery(p.name);
        setShowDropdown(false);
    };

    const toggleViolation = (ft) => {
        const isSelected = selectedReasons.includes(ft.reason);
        const newReasons = isSelected 
            ? selectedReasons.filter(r => r !== ft.reason) 
            : [...selectedReasons, ft.reason];
        
        setSelectedReasons(newReasons);
        
        // Update amount automatically based on new selection
        const newTotal = newReasons.reduce((sum, r) => {
            const type = FINE_TYPES.find(t => t.reason === r);
            return sum + (type ? type.amount : 0);
        }, 0);
        setAmount(newTotal);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedPassenger || selectedReasons.length === 0 || !amount) return;
        setSubmitting(true);

        await addFine({
            passenger: selectedPassenger.name,
            pnr: selectedPassenger.pnr,
            reason: selectedReasons.join(', '),
            amount: parseFloat(amount),
            method,
            time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        });

        setSelectedPassenger(null);
        setSearchQuery('');
        setSelectedReasons([]);
        setAmount(0);
        setMethod('Cash');
        setSubmitting(false);
    };

    const methods = [{ key: 'Cash', icon: Wallet }, { key: 'UPI', icon: Smartphone }];

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-[#2B2B2B] rounded-2xl border border-[#D4D4D4]/10 p-6">
                    <h3 className="text-sm font-bold text-[#B3B3B3] uppercase tracking-wider mb-5 flex items-center gap-2">
                        <Banknote size={16} /> Issue Fine
                    </h3>
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div ref={dropdownRef} className="relative">
                            <label className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider block mb-1">Select Passenger</label>
                            <div className="flex items-center bg-gray-900 border border-[#D4D4D4]/10 rounded-xl px-4 py-3 gap-2 focus-within:border-[#D4D4D4]/30 transition">
                                <Search size={16} className="text-[#6B7280] shrink-0" />
                                <input
                                    type="text" required value={searchQuery}
                                    onChange={e => { setSearchQuery(e.target.value); setSelectedPassenger(null); setShowDropdown(true); }}
                                    onFocus={() => setShowDropdown(true)}
                                    className="bg-transparent text-sm text-white placeholder:text-[#6B7280] outline-none w-full"
                                    placeholder="Search by name, PNR, or seat…"
                                />
                            </div>
                            {showDropdown && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a1a1a] border border-[#D4D4D4]/10 rounded-xl shadow-2xl z-50 max-h-52 overflow-y-auto">
                                    {filteredPassengers.map(p => (
                                        <button key={p.id} type="button" onClick={() => selectPassenger(p)}
                                            className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-white/5 transition">
                                            <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center shrink-0"><User size={12} className="text-[#B3B3B3]" /></div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-semibold text-white truncate">{p.name}</p>
                                                <p className="text-[10px] text-[#6B7280]">PNR: {p.pnr} • {p.coach}-{p.seatNo}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="space-y-4">
                            <label className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider block">Violations</label>
                            <div className="bg-gray-900 rounded-xl border border-[#D4D4D4]/10 p-5 space-y-4 overflow-hidden">
                                <div className="grid grid-cols-2 gap-2">
                                    {FINE_TYPES.map(ft => {
                                        const isSelected = selectedReasons.includes(ft.reason);
                                        return (
                                            <button key={ft.reason} type="button" onClick={() => toggleViolation(ft)}
                                                className={`p-3 rounded-xl text-left border text-sm transition-all duration-200 ${isSelected ? 'bg-white text-[#2B2B2B] border-white scale-[1.02]' : 'bg-[#1a1a1a] text-[#B3B3B3] border-[#D4D4D4]/10'}`}>
                                                <p className="font-bold text-xs">{ft.reason}</p>
                                                <p className={`text-[10px] mt-0.5 ${isSelected ? 'text-[#6B7280]' : 'text-[#9CA3AF]'}`}>₹{ft.amount}</p>
                                            </button>
                                        );
                                    })}
                                </div>

                                <div className="flex items-center justify-between bg-black/30 rounded-lg border border-[#D4D4D4]/10 px-4 py-3">
                                    <span className="text-xs text-[#9CA3AF] font-bold uppercase tracking-wider">Fine Amount</span>
                                    <div className="flex items-center gap-1">
                                        <span className="text-lg font-black text-amber-500">₹</span>
                                        <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
                                            className="bg-transparent text-lg font-black text-white outline-none text-right w-20 px-1" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider block mb-2">Payment Method</label>
                            <div className="flex gap-2">
                                {methods.map(m => (
                                    <button key={m.key} type="button" onClick={() => setMethod(m.key)}
                                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition border ${method === m.key ? 'bg-white text-[#2B2B2B] border-white' : 'bg-gray-900 text-[#B3B3B3] border-[#D4D4D4]/10'}`}>
                                        <m.icon size={16} />{m.key}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="bg-gray-900 rounded-xl p-4 border border-[#D4D4D4]/10 flex items-center justify-between">
                            <span className="text-xs text-[#9CA3AF] font-bold uppercase tracking-wider">Total Fine</span>
                            <span className="text-2xl font-black text-amber-500">₹{amount}</span>
                        </div>

                        <button type="submit" disabled={submitting || !selectedPassenger || !amount}
                            className="w-full flex items-center justify-center gap-3 px-5 py-4 bg-red-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-red-700 transition">
                            <Receipt size={18} /> {submitting ? 'Processing…' : 'Issue Fine & Receipt'}
                        </button>
                    </form>
                </div>

                <div className="bg-[#2B2B2B] rounded-2xl border border-[#D4D4D4]/10 overflow-hidden">
                    <div className="p-5 border-b border-[#D4D4D4]/10 flex items-center justify-between">
                        <h3 className="text-sm font-bold text-[#B3B3B3] uppercase tracking-wider">Fine History</h3>
                    </div>
                    {fines.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-[#B3B3B3]"><Banknote size={36} className="mb-3 opacity-20" /><p className="text-sm font-medium">No fines issued yet</p></div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead><tr className="bg-black/20 text-[#B3B3B3] text-xs uppercase tracking-wider"><th className="p-4 font-semibold">Receipt</th><th className="p-4 font-semibold">Passenger</th><th className="p-4 font-semibold">Reason</th><th className="p-4 font-semibold">Amount</th></tr></thead>
                                <tbody className="divide-y divide-[#D4D4D4]/5">
                                    {fines.map(f => (
                                        <tr key={f.id} className="hover:bg-white/5">
                                            <td className="p-4 text-xs font-mono text-[#9CA3AF]">{f.receipt}</td>
                                            <td className="p-4 text-sm text-white font-medium">{f.passenger}</td>
                                            <td className="p-4 text-sm text-[#B3B3B3]">{f.reason}</td>
                                            <td className="p-4 text-sm font-bold text-amber-400">₹{f.amount}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

