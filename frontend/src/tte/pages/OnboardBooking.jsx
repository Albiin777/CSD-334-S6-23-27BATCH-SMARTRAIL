import { useState, useMemo, useCallback } from 'react';
import { useSmartRail } from '../hooks/useSmartRail';
import { Ticket, QrCode, CreditCard, CheckCircle, Train, MapPin } from 'lucide-react';

const CLASS_FARES = {
    '1A': { label: 'First AC (1A)', color: '#a855f7', basePerKm: 4.5, min: 1500, icon: '🟣' },
    '2A': { label: 'AC 2-Tier (2A)', color: '#3b82f6', basePerKm: 2.8, min: 900, icon: '🔵' },
    '3A': { label: 'AC 3-Tier (3A)', color: '#22c55e', basePerKm: 1.95, min: 600, icon: '🟢' },
    'SL': { label: 'Sleeper (SL)', color: '#eab308', basePerKm: 0.60, min: 200, icon: '🟡' },
    'CC': { label: 'Chair Car (CC)', color: '#06b6d4', basePerKm: 1.20, min: 350, icon: '🔵' },
    '2S': { label: '2nd Sitting (2S)', color: '#f97316', basePerKm: 0.30, min: 80, icon: '🟠' },
};

export default function OnboardBooking() {
    const { addLog, stations, stationSchedule, currentStation } = useSmartRail();
    const [form, setForm] = useState({ name: '', age: '', gender: 'Male', mobile: '', from: currentStation || stations[0] || '', to: stations[stations.length - 1] || '', classKey: '3A' });
    const [booked, setBooked] = useState(null);

    // Calculate fare using station schedule distances from API
    const calcFare = useCallback((classKey, from, to) => {
        const fromStation = stationSchedule.find(s => s.stationName === from || s.stationCode === from);
        const toStation = stationSchedule.find(s => s.stationName === to || s.stationCode === to);
        const d1 = fromStation?.distanceFromSourceKm ?? 0;
        const d2 = toStation?.distanceFromSourceKm ?? 0;
        const dist = Math.abs(d2 - d1);
        const cfg = CLASS_FARES[classKey];
        if (!cfg || dist === 0) return { fare: 0, distance: 0 };
        const base = Math.round(dist * cfg.basePerKm);
        const fare = Math.max(base, cfg.min);
        const surcharge = ['1A', '2A', '3A', 'CC'].includes(classKey) ? 50 : 20;
        return { fare: fare + surcharge, distance: Math.round(dist) };
    }, [stationSchedule]);

    const { fare, distance } = useMemo(() => calcFare(form.classKey, form.from, form.to), [calcFare, form.classKey, form.from, form.to]);
    const selectedClass = CLASS_FARES[form.classKey] || CLASS_FARES['3A'];

    const handleBook = (e) => {
        e.preventDefault();
        if (fare === 0) return alert('Invalid stations selected or distance is 0');
        const ticket = { 
            ...form, 
            pnr: `OB-${Date.now().toString(36).toUpperCase()}`, 
            seat: `B2-${Math.floor(Math.random() * 30) + 40}`, 
            time: new Date().toLocaleTimeString(),
            fare,
            distance,
            classLabel: selectedClass.label
        };
        setBooked(ticket);
        addLog(`Onboard ticket: ${form.name} → ${form.to} (₹${fare})`, 'booking');
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Booking Form */}
                <div className="bg-[#2B2B2B] rounded-2xl border border-[#D4D4D4]/10 p-6">
                    <h3 className="text-sm font-bold text-[#B3B3B3] uppercase tracking-wider mb-5 flex items-center gap-2"><Ticket size={16} /> New Onboard Ticket</h3>
                    <form onSubmit={handleBook} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {[['name', 'Passenger Name', 'text'], ['age', 'Age', 'number'], ['mobile', 'Mobile Number', 'tel']].map(([key, label, type]) => (
                                <div key={key} className={key === 'name' ? 'sm:col-span-2' : ''}>
                                    <label className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider block mb-1">{label}</label>
                                    <input type={type} required value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })}
                                        className="w-full bg-gray-900 border border-[#D4D4D4]/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-[#6B7280] outline-none focus:border-[#D4D4D4]/30 transition" />
                                </div>
                            ))}
                            <div>
                                <label className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider block mb-1">Gender</label>
                                <select value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })} className="w-full bg-gray-900 border border-[#D4D4D4]/10 rounded-xl px-4 py-3 text-sm text-white outline-none">
                                    <option>Male</option><option>Female</option><option>Other</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#D4D4D4]/10">
                            <div>
                                <label className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider block mb-1">From Station</label>
                                <select required value={form.from} onChange={e => setForm({ ...form, from: e.target.value })} className="w-full bg-gray-900 border border-[#D4D4D4]/10 rounded-xl px-4 py-3 text-sm text-white outline-none">
                                    {stations.map(s => <option key={s}>{s}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider block mb-1">To Station</label>
                                <select required value={form.to} onChange={e => setForm({ ...form, to: e.target.value })} className="w-full bg-gray-900 border border-[#D4D4D4]/10 rounded-xl px-4 py-3 text-sm text-white outline-none">
                                    {stations.map(s => <option key={s}>{s}</option>)}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider block mb-2">Select Class</label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {Object.entries(CLASS_FARES).map(([key, cls]) => (
                                    <button
                                        key={key} type="button"
                                        onClick={() => setForm(f => ({ ...f, classKey: key }))}
                                        className={`p-2 rounded-xl border text-left transition ${form.classKey === key ? 'bg-[#4ab86d]/10 border-[#4ab86d] text-[#4ab86d]' : 'bg-gray-900 border-[#D4D4D4]/10 text-[#B3B3B3] hover:border-[#D4D4D4]/30'}`}
                                    >
                                        <div className="text-xs font-bold">{cls.label.split(' ')[0]}</div>
                                        <div className="text-[9px] opacity-70">{key}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {fare > 0 && (
                            <div className="bg-gradient-to-r from-[#4ab86d]/20 to-transparent border border-[#4ab86d]/30 rounded-xl p-4 flex items-center justify-between mt-2">
                                <div>
                                    <p className="text-[#B3B3B3] text-xs font-semibold">{distance} km • {selectedClass.label}</p>
                                    <p className="text-[10px] text-[#9CA3AF]">Includes base fare & surcharges</p>
                                </div>
                                <div className="text-2xl font-black text-white">₹{fare.toLocaleString()}</div>
                            </div>
                        )}

                        <button type="submit" disabled={fare === 0} className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-[#4ab86d] text-black disabled:opacity-50 disabled:bg-gray-600 rounded-xl font-bold text-sm hover:bg-[#3da85c] transition mt-2">
                            <Ticket size={18} /> Book & Generate Receipt
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
                                    {[['PNR', booked.pnr], ['Passenger', booked.name], ['Class', booked.classLabel], ['Fare', `₹${booked.fare}`], ['From', booked.from], ['To', booked.to]].map(([l, v]) => (
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
