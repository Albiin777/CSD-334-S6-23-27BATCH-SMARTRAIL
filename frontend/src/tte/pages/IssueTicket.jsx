import { useState, useRef } from 'react';
import { useSmartRail } from '../hooks/useSmartRail';
import { Ticket, Printer, CheckCircle, ChevronDown, User, Hash, MapPin, Train, CreditCard } from 'lucide-react';

const CLASS_FARES = {
    '1A': { label: 'First AC (1A)', color: '#a855f7', basePerKm: 4.5, min: 1500, icon: '🟣' },
    '2A': { label: 'AC 2-Tier (2A)', color: '#3b82f6', basePerKm: 2.8, min: 900, icon: '🔵' },
    '3A': { label: 'AC 3-Tier (3A)', color: '#22c55e', basePerKm: 1.95, min: 600, icon: '🟢' },
    'SL': { label: 'Sleeper (SL)', color: '#eab308', basePerKm: 0.60, min: 200, icon: '🟡' },
    'CC': { label: 'Chair Car (CC)', color: '#06b6d4', basePerKm: 1.20, min: 350, icon: '🔵' },
    '2S': { label: '2nd Sitting (2S)', color: '#f97316', basePerKm: 0.30, min: 80, icon: '🟠' },
};

const STATION_DISTANCES = {
    'Chennai Central': 0,
    'Perambur': 6,
    'Arakkonam Jn': 69,
    'Renigunta Jn': 170,
    'Vijayawada Jn': 432,
    'Warangal': 575,
    'Nagpur Jn': 904,
    'Bhopal Jn': 1161,
    'Jhansi Jn': 1301,
    'Gwalior Jn': 1372,
    'Agra Cantt': 1441,
    'New Delhi': 2191,
};

const ID_TYPES = ['Aadhaar', 'PAN Card', 'Passport', 'Voter ID', 'Driving License', 'Student ID'];

function generatePNR() {
    return String(Math.floor(1000000000 + Math.random() * 9000000000));
}

function calcFare(classKey, from, to) {
    const d1 = STATION_DISTANCES[from] ?? 0;
    const d2 = STATION_DISTANCES[to] ?? 0;
    const dist = Math.abs(d2 - d1);
    const cfg = CLASS_FARES[classKey];
    if (!cfg || dist === 0) return 0;
    const base = Math.round(dist * cfg.basePerKm);
    const fare = Math.max(base, cfg.min);
    // Catering + reservation surcharge
    const surcharge = ['1A', '2A', '3A', 'CC'].includes(classKey) ? 50 : 20;
    return fare + surcharge;
}

export default function IssueTicket() {
    const { coaches, currentStation, tteInfo, issueTicket, stations } = useSmartRail();

    const [step, setStep] = useState(1); // 1=details, 2=preview, 3=issued
    const [form, setForm] = useState({
        name: '', age: '', gender: 'Male', mobile: '',
        idType: 'Aadhaar', idNumber: '',
        classKey: '3A', coachId: '',
        from: currentStation, to: 'New Delhi',
        paymentMethod: 'Cash',
    });
    const [issuedTicket, setIssuedTicket] = useState(null);
    const printRef = useRef(null);

    const selectedClass = CLASS_FARES[form.classKey];
    const fare = calcFare(form.classKey, form.from, form.to);
    const distance = Math.abs((STATION_DISTANCES[form.to] ?? 0) - (STATION_DISTANCES[form.from] ?? 0));

    // Coaches matching selected class
    const matchingCoaches = coaches.filter(c => c.type === form.classKey);

    const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

    const handleIssue = () => {
        const pnr = generatePNR();
        const ticket = {
            pnr,
            name: form.name,
            age: form.age,
            gender: form.gender,
            mobile: form.mobile,
            idType: form.idType,
            idNumber: form.idNumber,
            classKey: form.classKey,
            classLabel: selectedClass.label,
            coach: form.coachId || matchingCoaches[0]?.id || 'GS',
            from: form.from,
            to: form.to,
            distance,
            fare,
            paymentMethod: form.paymentMethod,
            issuedBy: tteInfo.name,
            issuedAt: new Date().toLocaleString('en-IN'),
            trainNo: tteInfo.trainNo,
            trainName: tteInfo.trainName,
        };

        setIssuedTicket(ticket);

        // Save to Supabase (this also handles the addLog internally)
        issueTicket(ticket);

        setStep(3);
    };

    const handlePrint = () => {
        window.print();
    };

    const isStep1Valid = form.name && form.age && form.mobile && form.idNumber && form.from && form.to && form.from !== form.to;

    return (
        <div className="p-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(168,85,247,0.15)' }}>
                    <Ticket size={24} className="text-purple-400" />
                </div>
                <div>
                    <h1 className="text-white text-2xl font-bold">Issue Ticket</h1>
                    <p className="text-[#B3B3B3] text-sm">Issue onboard ticket for any class</p>
                </div>
            </div>

            {/* Progress */}
            {step < 3 && (
                <div className="flex items-center gap-2 mb-8">
                    {['Passenger Details', 'Review & Pay', 'Ticket Issued'].map((s, i) => (
                        <div key={i} className="flex items-center gap-2 flex-1">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-all
                                ${step > i + 1 ? 'bg-green-500 text-white' : step === i + 1 ? 'bg-purple-500 text-white' : 'bg-[#2B2B2B] text-[#B3B3B3]'}`}>
                                {step > i + 1 ? '✓' : i + 1}
                            </div>
                            <span className={`text-sm font-medium hidden sm:block ${step === i + 1 ? 'text-white' : 'text-[#B3B3B3]'}`}>{s}</span>
                            {i < 2 && <div className={`flex-1 h-px ${step > i + 1 ? 'bg-green-500' : 'bg-[#2B2B2B]'}`} />}
                        </div>
                    ))}
                </div>
            )}

            {/* ── STEP 1: Passenger Details ── */}
            {step === 1 && (
                <div className="space-y-6">
                    {/* Class Selection */}
                    <div className="bg-[#1a1a1a] border border-[#D4D4D4]/10 rounded-2xl p-5">
                        <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
                            <Train size={16} className="text-purple-400" /> Select Class
                        </h2>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {Object.entries(CLASS_FARES).map(([key, cls]) => (
                                <button
                                    key={key}
                                    onClick={() => { set('classKey', key); set('coachId', ''); }}
                                    className={`p-3 rounded-xl border-2 text-left transition-all ${form.classKey === key
                                        ? 'border-opacity-100 bg-opacity-10'
                                        : 'border-[#2B2B2B] hover:border-[#444]'
                                        }`}
                                    style={form.classKey === key ? { borderColor: cls.color, backgroundColor: cls.color + '15' } : {}}
                                >
                                    <div className="text-lg mb-1">{cls.icon}</div>
                                    <div className="text-white text-xs font-semibold leading-tight">{cls.label}</div>
                                    <div className="text-[#B3B3B3] text-[10px] mt-0.5">Min ₹{cls.min}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Journey */}
                    <div className="bg-[#1a1a1a] border border-[#D4D4D4]/10 rounded-2xl p-5">
                        <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
                            <MapPin size={16} className="text-blue-400" /> Journey Details
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <label className="text-[#B3B3B3] text-xs font-semibold uppercase tracking-wider mb-1.5 block">From Station</label>
                                <div className="relative">
                                    <select value={form.from} onChange={e => set('from', e.target.value)}
                                        className="w-full bg-[#2B2B2B] border border-[#444] text-white rounded-xl px-3 py-2.5 text-sm appearance-none pr-8">
                                        {stations.map(s => <option key={s}>{s}</option>)}
                                    </select>
                                    <ChevronDown size={14} className="absolute right-3 top-3.5 text-[#B3B3B3] pointer-events-none" />
                                </div>
                            </div>
                            <div>
                                <label className="text-[#B3B3B3] text-xs font-semibold uppercase tracking-wider mb-1.5 block">To Station</label>
                                <div className="relative">
                                    <select value={form.to} onChange={e => set('to', e.target.value)}
                                        className="w-full bg-[#2B2B2B] border border-[#444] text-white rounded-xl px-3 py-2.5 text-sm appearance-none pr-8">
                                        {stations.map(s => <option key={s}>{s}</option>)}
                                    </select>
                                    <ChevronDown size={14} className="absolute right-3 top-3.5 text-[#B3B3B3] pointer-events-none" />
                                </div>
                            </div>
                            <div>
                                <label className="text-[#B3B3B3] text-xs font-semibold uppercase tracking-wider mb-1.5 block">Coach (Optional)</label>
                                <div className="relative">
                                    <select value={form.coachId} onChange={e => set('coachId', e.target.value)}
                                        className="w-full bg-[#2B2B2B] border border-[#444] text-white rounded-xl px-3 py-2.5 text-sm appearance-none pr-8">
                                        <option value="">Auto-assign</option>
                                        {matchingCoaches.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                                    </select>
                                    <ChevronDown size={14} className="absolute right-3 top-3.5 text-[#B3B3B3] pointer-events-none" />
                                </div>
                            </div>
                        </div>
                        {fare > 0 && (
                            <div className="mt-4 p-3 rounded-xl flex items-center justify-between" style={{ background: selectedClass.color + '15', border: `1px solid ${selectedClass.color}40` }}>
                                <span className="text-[#B3B3B3] text-sm">{distance} km · {selectedClass.label}</span>
                                <span className="text-white text-xl font-bold">₹{fare.toLocaleString()}</span>
                            </div>
                        )}
                    </div>

                    {/* Passenger Info */}
                    <div className="bg-[#1a1a1a] border border-[#D4D4D4]/10 rounded-2xl p-5">
                        <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
                            <User size={16} className="text-green-400" /> Passenger Details
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="sm:col-span-2">
                                <label className="text-[#B3B3B3] text-xs font-semibold uppercase tracking-wider mb-1.5 block">Full Name *</label>
                                <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Enter passenger name"
                                    className="w-full bg-[#2B2B2B] border border-[#444] text-white rounded-xl px-3 py-2.5 text-sm placeholder-[#666] focus:outline-none focus:border-purple-500" />
                            </div>
                            <div>
                                <label className="text-[#B3B3B3] text-xs font-semibold uppercase tracking-wider mb-1.5 block">Age *</label>
                                <input type="number" value={form.age} onChange={e => set('age', e.target.value)} placeholder="Age" min="1" max="120"
                                    className="w-full bg-[#2B2B2B] border border-[#444] text-white rounded-xl px-3 py-2.5 text-sm placeholder-[#666] focus:outline-none focus:border-purple-500" />
                            </div>
                            <div>
                                <label className="text-[#B3B3B3] text-xs font-semibold uppercase tracking-wider mb-1.5 block">Gender *</label>
                                <div className="relative">
                                    <select value={form.gender} onChange={e => set('gender', e.target.value)}
                                        className="w-full bg-[#2B2B2B] border border-[#444] text-white rounded-xl px-3 py-2.5 text-sm appearance-none pr-8">
                                        <option>Male</option>
                                        <option>Female</option>
                                        <option>Other</option>
                                    </select>
                                    <ChevronDown size={14} className="absolute right-3 top-3.5 text-[#B3B3B3] pointer-events-none" />
                                </div>
                            </div>
                            <div>
                                <label className="text-[#B3B3B3] text-xs font-semibold uppercase tracking-wider mb-1.5 block">Mobile *</label>
                                <input value={form.mobile} onChange={e => set('mobile', e.target.value)} placeholder="10-digit mobile" maxLength={10}
                                    className="w-full bg-[#2B2B2B] border border-[#444] text-white rounded-xl px-3 py-2.5 text-sm placeholder-[#666] focus:outline-none focus:border-purple-500" />
                            </div>
                        </div>


                    </div>

                    <button
                        onClick={() => setStep(2)}
                        disabled={!isStep1Valid}
                        className="w-full py-3 rounded-xl font-bold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{ background: isStep1Valid ? selectedClass.color : '#2B2B2B' }}
                    >
                        Review Ticket →
                    </button>
                </div>
            )}

            {/* ── STEP 2: Review ── */}
            {step === 2 && (
                <div className="space-y-5">
                    <div className="bg-[#1a1a1a] border border-[#D4D4D4]/10 rounded-2xl overflow-hidden">
                        {/* Ticket preview header */}
                        <div className="p-5 border-b border-[#D4D4D4]/10" style={{ background: selectedClass.color + '20' }}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-white font-bold text-lg">{tteInfo.trainName}</div>
                                    <div className="text-[#B3B3B3] text-sm">#{tteInfo.trainNo} · {selectedClass.label}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-white text-2xl font-bold">₹{fare.toLocaleString()}</div>
                                    <div className="text-[#B3B3B3] text-xs">{distance} km</div>
                                </div>
                            </div>
                        </div>

                        {/* Journey */}
                        <div className="p-5 border-b border-[#D4D4D4]/10">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-[#B3B3B3] text-xs uppercase tracking-wider mb-1">From</div>
                                    <div className="text-white font-semibold">{form.from}</div>
                                </div>
                                <div className="text-[#B3B3B3] text-xl">→</div>
                                <div className="text-right">
                                    <div className="text-[#B3B3B3] text-xs uppercase tracking-wider mb-1">To</div>
                                    <div className="text-white font-semibold">{form.to}</div>
                                </div>
                            </div>
                        </div>

                        {/* Passenger details */}
                        <div className="p-5 grid grid-cols-2 gap-4 border-b border-[#D4D4D4]/10">
                            {[
                                ['Name', form.name],
                                ['Age / Gender', `${form.age} / ${form.gender}`],
                                ['Mobile', form.mobile],
                                ['ID Proof', `${form.idType}: ${form.idNumber}`],
                                ['Coach', form.coachId || matchingCoaches[0]?.id || 'Auto'],
                                ['Class', selectedClass.label],
                            ].map(([label, val]) => (
                                <div key={label}>
                                    <div className="text-[#B3B3B3] text-xs uppercase tracking-wider">{label}</div>
                                    <div className="text-white text-sm font-medium mt-0.5">{val}</div>
                                </div>
                            ))}
                        </div>

                        {/* Payment method */}
                        <div className="p-5">
                            <div className="text-[#B3B3B3] text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2">
                                <CreditCard size={13} /> Payment Method
                            </div>
                            <div className="flex gap-3 flex-wrap">
                                {['Cash', 'UPI', 'Card', 'NEFT'].map(m => (
                                    <button key={m} onClick={() => set('paymentMethod', m)}
                                        className={`px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${form.paymentMethod === m
                                            ? 'bg-white text-black border-white'
                                            : 'bg-transparent text-[#B3B3B3] border-[#2B2B2B] hover:border-[#555]'
                                            }`}>
                                        {m}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button onClick={() => setStep(1)} className="flex-1 py-3 rounded-xl bg-[#2B2B2B] text-white font-bold hover:bg-[#333] transition-all">
                            ← Back
                        </button>
                        <button onClick={handleIssue}
                            className="flex-2 px-8 py-3 rounded-xl text-white font-bold transition-all"
                            style={{ background: selectedClass.color, flex: 2 }}>
                            Issue Ticket ✓
                        </button>
                    </div>
                </div>
            )}

            {/* ── STEP 3: Issued ── */}
            {step === 3 && issuedTicket && (
                <div className="space-y-5">
                    {/* Success banner */}
                    <div className="flex items-center gap-3 bg-green-500/10 border border-green-500/30 rounded-2xl p-4">
                        <CheckCircle size={28} className="text-green-400 shrink-0" />
                        <div>
                            <div className="text-white font-bold">Ticket Issued Successfully!</div>
                            <div className="text-green-400 font-mono text-sm">PNR: {issuedTicket.pnr}</div>
                        </div>
                    </div>

                    {/* Printable ticket */}
                    <div ref={printRef} className="bg-white text-black rounded-2xl overflow-hidden shadow-2xl print:shadow-none">
                        {/* Train header */}
                        <div className="p-5 text-white" style={{ background: CLASS_FARES[issuedTicket.classKey].color }}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="font-bold text-xl">SmartRail</div>
                                    <div className="text-white/80 text-sm">{issuedTicket.trainName} · #{issuedTicket.trainNo}</div>
                                </div>
                                <div className="text-right">
                                    <div className="font-mono font-bold text-lg tracking-widest">{issuedTicket.pnr}</div>
                                    <div className="text-white/80 text-xs">PNR Number</div>
                                </div>
                            </div>
                        </div>

                        {/* Journey bar */}
                        <div className="bg-gray-50 px-5 py-4 flex items-center justify-between border-b">
                            <div>
                                <div className="text-gray-500 text-xs uppercase tracking-wider">From</div>
                                <div className="font-bold text-gray-800 text-lg">{issuedTicket.from}</div>
                            </div>
                            <div className="text-3xl text-gray-400">→</div>
                            <div className="text-right">
                                <div className="text-gray-500 text-xs uppercase tracking-wider">To</div>
                                <div className="font-bold text-gray-800 text-lg">{issuedTicket.to}</div>
                            </div>
                        </div>

                        {/* Details grid */}
                        <div className="p-5 grid grid-cols-2 sm:grid-cols-3 gap-5 border-b">
                            {[
                                ['Passenger', issuedTicket.name],
                                ['Age / Gender', `${issuedTicket.age} / ${issuedTicket.gender}`],
                                ['Class', issuedTicket.classLabel],
                                ['Coach', issuedTicket.coach],
                                ['Distance', `${issuedTicket.distance} km`],
                                ['ID Proof', `${issuedTicket.idType}: ${issuedTicket.idNumber}`],
                                ['Mobile', issuedTicket.mobile],
                                ['Payment', issuedTicket.paymentMethod],
                                ['Fare Paid', `₹${issuedTicket.fare.toLocaleString()}`],
                            ].map(([label, val]) => (
                                <div key={label}>
                                    <div className="text-gray-400 text-xs uppercase tracking-wider">{label}</div>
                                    <div className="text-gray-800 font-semibold text-sm mt-0.5">{val}</div>
                                </div>
                            ))}
                        </div>

                        {/* Footer */}
                        <div className="px-5 py-3 bg-gray-50 flex items-center justify-between">
                            <div className="text-gray-400 text-xs">
                                Issued by: <span className="text-gray-600 font-medium">{issuedTicket.issuedBy}</span> · {issuedTicket.issuedAt}
                            </div>
                            <div className="text-xs text-gray-400 italic">This is a valid railway ticket</div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                        <button onClick={handlePrint}
                            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-[#2B2B2B] text-white font-bold hover:bg-[#333] transition-all">
                            <Printer size={18} /> Print Ticket
                        </button>
                        <button onClick={() => { setStep(1); setForm(f => ({ ...f, name: '', age: '', mobile: '', idNumber: '' })); setIssuedTicket(null); }}
                            className="flex-1 py-3 rounded-xl font-bold text-white transition-all"
                            style={{ background: '#a855f7' }}>
                            Issue Another
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
