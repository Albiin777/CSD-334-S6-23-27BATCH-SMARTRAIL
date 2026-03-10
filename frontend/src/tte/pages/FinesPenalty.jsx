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

    // Multiple fines list — each entry has reason + editable amount
    const [fineItems, setFineItems] = useState([{ ...DEFAULT_FINE }]);

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

    // Add another fine row
    const addFineItem = () => setFineItems(prev => [...prev, { ...DEFAULT_FINE }]);

    // Update a specific fine row
    const updateFineItem = (index, field, value) => {
        setFineItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
    };

    // Set violation type for a row (also resets amount to default)
    const setViolationType = (index, ft) => {
        setFineItems(prev => prev.map((item, i) => i === index ? { reason: ft.reason, amount: ft.amount } : item));
    };

    // Remove a fine row (keep at least one)
    const removeFineItem = (index) => {
        if (fineItems.length === 1) return;
        setFineItems(prev => prev.filter((_, i) => i !== index));
    };

    const totalAmount = fineItems.reduce((s, f) => s + (parseFloat(f.amount) || 0), 0);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedPassenger) return;
        setSubmitting(true);

        // Issue each fine entry separately
        for (const item of fineItems) {
            if (!item.reason || !item.amount) continue;
            await addFine({
                passenger: selectedPassenger.name,
                pnr: selectedPassenger.pnr,
                reason: item.reason,
                amount: parseFloat(item.amount),
                method,
                time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
            });
        }

        // Reset
        setSelectedPassenger(null);
        setSearchQuery('');
        setFineItems([{ ...DEFAULT_FINE }]);
        setMethod('Cash');
        setSubmitting(false);
    };

    const methods = [{ key: 'Cash', icon: Wallet }, { key: 'UPI', icon: Smartphone }];

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Fine Form */}
                <div className="bg-[#2B2B2B] rounded-2xl border border-[#D4D4D4]/10 p-6">
                    <h3 className="text-sm font-bold text-[#B3B3B3] uppercase tracking-wider mb-5 flex items-center gap-2">
                        <Banknote size={16} /> Issue Fine
                    </h3>
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Passenger Selector */}
                        <div ref={dropdownRef} className="relative">
                            <label className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider block mb-1">Select Passenger</label>
                            <div className="flex items-center bg-gray-900 border border-[#D4D4D4]/10 rounded-xl px-4 py-3 gap-2 focus-within:border-[#D4D4D4]/30 transition">
                                <Search size={16} className="text-[#6B7280] shrink-0" />
                                <input
                                    type="text"
                                    required
                                    value={searchQuery}
                                    onChange={e => { setSearchQuery(e.target.value); setSelectedPassenger(null); setShowDropdown(true); }}
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

                        {/* Fine Items */}
                        <div className="space-y-4">
                            <label className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider block">
                                Violations {fineItems.length > 1 && <span className="text-blue-400">({fineItems.length} items)</span>}
                            </label>
                            {fineItems.map((item, idx) => (
                                <div key={idx} className="bg-gray-900 rounded-xl border border-[#D4D4D4]/10 p-4 space-y-3">
                                    {fineItems.length > 1 && (
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-[10px] font-bold text-[#6B7280] uppercase">Violation {idx + 1}</span>
                                            <button type="button" onClick={() => removeFineItem(idx)}
                                                className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition">
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    )}

                                    {/* Violation Type */}
                                    <div className="grid grid-cols-2 gap-2">
                                        {FINE_TYPES.map(ft => (
                                            <button key={ft.reason} type="button" onClick={() => setViolationType(idx, ft)}
                                                className={`p-3 rounded-xl text-left border text-sm font-medium transition ${item.reason === ft.reason ? 'bg-white text-[#2B2B2B] border-white' : 'bg-[#1a1a1a] text-[#B3B3B3] border-[#D4D4D4]/10 hover:border-[#D4D4D4]/30'}`}>
                                                <p className="font-bold text-xs">{ft.reason}</p>
                                                <p className={`text-[10px] mt-0.5 ${item.reason === ft.reason ? 'text-[#6B7280]' : 'text-[#9CA3AF]'}`}>₹{ft.amount}</p>
                                            </button>
                                        ))}
                                    </div>

                                    {/* Editable Amount */}
                                    <div className="flex items-center justify-between bg-[#111] rounded-lg border border-[#D4D4D4]/10 px-4 py-2.5">
                                        <span className="text-xs text-[#9CA3AF] font-medium">Fine Amount</span>
                                        <div className="flex items-center gap-1">
                                            <span className="text-lg font-extrabold text-amber-400">₹</span>
                                            <input
                                                type="number"
                                                min="1"
                                                required
                                                value={item.amount}
                                                onChange={e => updateFineItem(idx, 'amount', e.target.value)}
                                                className="bg-transparent text-lg font-extrabold text-white outline-none text-right w-24"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {/* Add another fine */}
                            <button type="button" onClick={addFineItem}
                                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-[#D4D4D4]/20 text-xs font-semibold text-[#9CA3AF] hover:text-white hover:border-[#D4D4D4]/40 transition">
                                <Plus size={14} /> Add Another Violation
                            </button>
                        </div>

                        {/* Payment Method */}
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

                        {/* Total */}
                        <div className="bg-gray-900 rounded-xl p-4 border border-[#D4D4D4]/10 flex items-center justify-between">
                            <span className="text-sm text-[#9CA3AF] font-medium">
                                Total {fineItems.length > 1 && <span className="text-[10px]">({fineItems.length} fines)</span>}
                            </span>
                            <span className="text-2xl font-extrabold text-amber-400">₹{totalAmount}</span>
                        </div>

                        <button type="submit" disabled={submitting || !selectedPassenger}
                            className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-red-500 text-white rounded-xl font-bold text-sm hover:bg-red-600 transition disabled:opacity-50 disabled:cursor-not-allowed">
                            <Receipt size={18} />
                            {submitting ? 'Processing…' : `Collect Fine${fineItems.length > 1 ? 's' : ''} & Generate Receipt`}
                        </button>
                    </form>
                </div>

                {/* Fine History */}
                <div className="bg-[#2B2B2B] rounded-2xl border border-[#D4D4D4]/10 overflow-hidden">
                    <div className="p-5 border-b border-[#D4D4D4]/10 flex items-center justify-between">
                        <h3 className="text-sm font-bold text-[#B3B3B3] uppercase tracking-wider">Fine History</h3>
                        <span className="text-xs font-bold text-white bg-white/10 px-2.5 py-1 rounded-full">₹{fines.reduce((s, f) => s + f.amount, 0)} total</span>
                    </div>
                    {fines.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-[#B3B3B3]">
                            <Banknote size={36} className="mb-3 opacity-20" />
                            <p className="text-sm font-medium">No fines issued yet</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-black/20 text-[#B3B3B3] text-xs uppercase tracking-wider">
                                        <th className="p-4 font-semibold">Receipt</th>
                                        <th className="p-4 font-semibold">Passenger</th>
                                        <th className="p-4 font-semibold">Reason</th>
                                        <th className="p-4 font-semibold">Amount</th>
                                        <th className="p-4 font-semibold">Method</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#D4D4D4]/5">
                                    {fines.map(f => (
                                        <tr key={f.id} className="hover:bg-white/5">
                                            <td className="p-4 text-sm font-mono text-[#9CA3AF]">{f.receipt}</td>
                                            <td className="p-4 text-sm text-white font-medium">{f.passenger}</td>
                                            <td className="p-4 text-sm text-[#B3B3B3]">{f.reason}</td>
                                            <td className="p-4 text-sm font-bold text-amber-400">₹{f.amount}</td>
                                            <td className="p-4 text-sm text-[#B3B3B3]">{f.method}</td>
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
