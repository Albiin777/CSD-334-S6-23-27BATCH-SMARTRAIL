import { useState } from 'react';
import { useSmartRail } from '../hooks/useSmartRail';
import { Ticket, QrCode, CreditCard, CheckCircle } from 'lucide-react';

export default function OnboardBooking() {
    const { addLog } = useSmartRail();
    const [form, setForm] = useState({ name: '', age: '', gender: 'Male', mobile: '', from: '', to: '', class: 'Sleeper' });
    const [booked, setBooked] = useState(null);

    const handleBook = (e) => {
        e.preventDefault();
        const ticket = { ...form, pnr: `OB-${Date.now().toString(36).toUpperCase()}`, seat: `B2-${Math.floor(Math.random() * 30) + 40}`, time: new Date().toLocaleTimeString() };
        setBooked(ticket);
        addLog(`Onboard ticket: ${form.name} → ${form.to}`, 'booking');
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Booking Form */}
                <div className="bg-[#2B2B2B] rounded-2xl border border-[#D4D4D4]/10 p-6">
                    <h3 className="text-sm font-bold text-[#B3B3B3] uppercase tracking-wider mb-5 flex items-center gap-2"><Ticket size={16} /> New Onboard Ticket</h3>
                    <form onSubmit={handleBook} className="space-y-4">
                        {[['name', 'Passenger Name', 'text'], ['age', 'Age', 'number'], ['mobile', 'Mobile Number', 'tel'], ['from', 'Boarding Station', 'text'], ['to', 'Destination', 'text']].map(([key, label, type]) => (
                            <div key={key}>
                                <label className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider block mb-1">{label}</label>
                                <input type={type} required value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })}
                                    className="w-full bg-gray-900 border border-[#D4D4D4]/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-[#6B7280] outline-none focus:border-[#D4D4D4]/30 transition" />
                            </div>
                        ))}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider block mb-1">Gender</label>
                                <select value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })} className="w-full bg-gray-900 border border-[#D4D4D4]/10 rounded-xl px-4 py-3 text-sm text-white outline-none">
                                    <option>Male</option><option>Female</option><option>Other</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider block mb-1">Class</label>
                                <select value={form.class} onChange={e => setForm({ ...form, class: e.target.value })} className="w-full bg-gray-900 border border-[#D4D4D4]/10 rounded-xl px-4 py-3 text-sm text-white outline-none">
                                    <option>Sleeper</option><option>AC 3-Tier</option><option>AC 2-Tier</option>
                                </select>
                            </div>
                        </div>
                        <button type="submit" className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-white text-[#2B2B2B] rounded-xl font-bold text-sm hover:bg-[#D4D4D4] transition mt-2">
                            <Ticket size={18} /> Book & Assign Seat
                        </button>
                    </form>
                </div>

                {/* Receipt Preview */}
                <div className="bg-[#2B2B2B] rounded-2xl border border-[#D4D4D4]/10 p-6">
                    <h3 className="text-sm font-bold text-[#B3B3B3] uppercase tracking-wider mb-5 flex items-center gap-2"><QrCode size={16} /> Digital Receipt</h3>
                    {booked ? (
                        <div className="space-y-4">
                            <div className="bg-gray-900 rounded-2xl p-6 border border-[#D4D4D4]/10 space-y-3">
                                <div className="flex items-center justify-between pb-3 border-b border-[#D4D4D4]/10">
                                    <p className="text-white font-bold">SmartRail Ticket</p>
                                    <CheckCircle size={20} className="text-emerald-400" />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    {[['PNR', booked.pnr], ['Passenger', booked.name], ['Seat', booked.seat], ['Class', booked.class], ['From', booked.from], ['To', booked.to]].map(([l, v]) => (
                                        <div key={l}>
                                            <p className="text-[10px] font-bold text-[#9CA3AF] uppercase">{l}</p>
                                            <p className="text-sm font-semibold text-white">{v}</p>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex items-center justify-center py-4 border-t border-[#D4D4D4]/10 mt-3">
                                    <div className="w-24 h-24 bg-white rounded-xl flex items-center justify-center"><QrCode size={60} className="text-[#2B2B2B]" /></div>
                                </div>
                                <p className="text-center text-[10px] text-[#9CA3AF]">Scan QR for verification</p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-64 text-[#B3B3B3]">
                            <CreditCard size={40} className="mb-3 opacity-30" />
                            <p className="text-sm">Book a ticket to generate receipt</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
