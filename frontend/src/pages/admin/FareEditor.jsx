import { useState, useEffect } from "react";
import api from "../../api/train.api";
import { db } from "../../utils/firebaseClient";
import { doc, getDoc, setDoc } from "firebase/firestore";

export default function FareEditor() {
    const [searchQ, setSearchQ] = useState("");
    const [trains, setTrains] = useState([]);
    const [selectedTrain, setSelectedTrain] = useState(null);
    const [trainDistance, setTrainDistance] = useState(0);
    const [fares, setFares] = useState(null); // Base/Official fares from API
    const [editedFares, setEditedFares] = useState({}); // { cls: { ratePerKm, serviceCharge, total } }
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (searchQ.length < 1) { setTrains([]); return; }
        const t = setTimeout(async () => {
            const res = await api.searchTrains(searchQ);
            setTrains(res.slice(0, 12));
        }, 300);
        return () => clearTimeout(t);
    }, [searchQ]);

    const selectTrain = async (train) => {
        setSelectedTrain(train);
        setSearchQ(train.trainName);
        setTrains([]);
        setLoading(true);
        setSuccess(false);
        try {
            // Get official fares + distance from API
            const apiRes = await api.getFare(train.trainNumber);
            const dist = apiRes.distanceKm || 800;
            setTrainDistance(dist);
            
            const baseDetails = apiRes.fareDetails || {};
            
            // Check for Firestore overrides
            const overrideDoc = await getDoc(doc(db, "fare_overrides", String(train.trainNumber)));
            const overrideData = overrideDoc.exists() ? overrideDoc.data().fares : null;

            const finalFares = {};
            Object.keys(baseDetails).forEach(cls => {
                const base = baseDetails[cls];
                const ovr = overrideData?.[cls];
                
                if (ovr) {
                    if (typeof ovr === 'object') {
                        finalFares[cls] = {
                            ratePerKm: ovr.ratePerKm || base.ratePerKm,
                            serviceCharge: ovr.serviceCharge || 0,
                            total: Math.ceil(((dist * (ovr.ratePerKm || base.ratePerKm)) + (ovr.serviceCharge || 0)) / 5) * 5
                        };
                    } else {
                        // Legacy number override
                        finalFares[cls] = {
                            ratePerKm: Number(ovr) / dist,
                            serviceCharge: 0,
                            total: Number(ovr)
                        };
                    }
                } else {
                    finalFares[cls] = {
                        ratePerKm: base.ratePerKm,
                        serviceCharge: base.reservationCharge + base.superfastCharge + base.gst,
                        total: base.totalFare
                    };
                }
            });

            setFares(finalFares);
            setEditedFares(JSON.parse(JSON.stringify(finalFares)));
        } catch (err) {
            console.error(err);
            setFares({});
            setEditedFares({});
        }
        setLoading(false);
    };

    const saveFares = async () => {
        if (!selectedTrain) return;
        setSaving(true);
        try {
            await setDoc(doc(db, "fare_overrides", String(selectedTrain.trainNumber)), {
                train_no: selectedTrain.trainNumber,
                train_name: selectedTrain.trainName,
                fares: editedFares,
                updated_at: new Date().toISOString(),
                updated_by: "admin",
            }, { merge: true });
            
            setFares({ ...editedFares });
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (error) {
            console.error(error);
        }
        setSaving(false);
    };

    const CLASS_LABELS = {
        "1A": "AC First Class (1A)",
        "2A": "AC 2-Tier (2A)",
        "3A": "AC 3-Tier (3A)",
        "CC": "AC Chair Car (CC)",
        "SL": "Sleeper (SL)",
        "2S": "2nd Seating (2S)",
        "FC": "First Class (FC)",
        "EC": "Executive Chair (EC)",
        "GS": "General / Unreserved",
    };

    const hasChanges = JSON.stringify(fares) !== JSON.stringify(editedFares);

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#10b981] to-[#3b82f6] flex items-center justify-center text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <div>
                    <h1 className="text-2xl md:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">Fare Editor</h1>
                    <p className="text-gray-400 text-sm mt-1 font-medium tracking-wide">Manage dynamic pricing overrides</p>
                </div>
            </div>
            <p className="text-sm text-gray-400">Set per-train fare overrides. These prices apply to all new bookings for the selected train.</p>

            {/* Train Search */}
            <div className="bg-[#111827] border border-white/5 rounded-2xl p-5">
                <label className="text-xs text-gray-500 font-bold uppercase tracking-wide block mb-2">Select Train</label>
                <div className="relative">
                    <input
                        type="text"
                        value={searchQ}
                        onChange={e => setSearchQ(e.target.value)}
                        placeholder="Search train name or number..."
                        className="w-full bg-[#080f1e] text-white border border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#4ab86d] transition"
                    />
                    {trains.length > 0 && (
                        <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-[#1D2332] border border-gray-700 rounded-xl shadow-2xl max-h-56 overflow-y-auto">
                            {trains.map(t => (
                                <button
                                    key={t.trainNumber}
                                    onClick={() => selectTrain(t)}
                                    className="w-full text-left px-4 py-3 hover:bg-white/5 text-sm border-b border-white/5 flex items-center gap-3"
                                >
                                    <span className="text-gray-400 hover:text-white transition-colors">
                                        <svg className="w-5 h-5 inline-block mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    </span>
                                    <div>
                                        <div className="font-bold text-white">{t.trainName}</div>
                                        <div className="text-xs text-gray-500">{t.trainNumber} · {t.source} → {t.destination}</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Fare Table */}
            {
                selectedTrain && (
                    <div className="bg-[#111827] border border-white/5 rounded-2xl overflow-hidden">
                        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between flex-wrap gap-3">
                            <div>
                                <h2 className="font-bold text-white">{selectedTrain.trainName}</h2>
                                <div className="text-xs text-gray-500 font-mono">{selectedTrain.trainNumber} · {selectedTrain.source} → {selectedTrain.destination}</div>
                            </div>
                            {success && <span className="text-green-400 text-sm font-bold">✓ Fares saved!</span>}
                            {hasChanges && !success && (
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-orange-400 font-bold">Unsaved changes</span>
                                    <button onClick={() => setEditedFares({ ...fares })} className="text-xs text-gray-500 hover:text-white border border-gray-700 px-3 py-1.5 rounded-lg transition">Reset</button>
                                    <button
                                        onClick={saveFares}
                                        disabled={saving}
                                        className="bg-[#4ab86d] hover:bg-[#3da85c] disabled:opacity-50 text-black font-black px-4 py-1.5 rounded-lg text-sm transition"
                                    >
                                        {saving ? "Saving..." : "Save Fares"}
                                    </button>
                                </div>
                            )}
                        </div>

                        {loading ? (
                            <div className="p-10 text-center text-gray-500">Loading fares...</div>
                        ) : (
                            <div className="p-5">
                                <div className="bg-[#080f1e] border border-white/5 rounded-xl p-4 mb-4 text-xs text-blue-400 flex items-start gap-3">
                                    <span className="shrink-0 text-blue-500">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    </span>
                                    <span>These are base fares for the full route. Passengers pay proportional amounts based on their boarding and deboarding stations.</span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                    {Object.keys(editedFares).map(classCode => {
                                        const fare = editedFares[classCode];
                                        const updateField = (field, val) => {
                                            setEditedFares(prev => {
                                                const next = { ...prev, [classCode]: { ...prev[classCode], [field]: val } };
                                                // If we update rate/svc, auto-calc total
                                                if (field === 'ratePerKm' || field === 'serviceCharge') {
                                                    next[classCode].total = Math.ceil(((trainDistance * next[classCode].ratePerKm) + next[classCode].serviceCharge) / 5) * 5;
                                                }
                                                // If we update total manually, back-calc rate (assuming svc is fixed)
                                                if (field === 'total') {
                                                    next[classCode].ratePerKm = Number(((val - next[classCode].serviceCharge) / trainDistance).toFixed(4));
                                                }
                                                return next;
                                            });
                                        };

                                        return (
                                            <div key={classCode} className="bg-[#080f1e] border border-white/5 rounded-xl p-4">
                                                <div className="flex justify-between items-start mb-3">
                                                    <div>
                                                        <div className="text-xs text-gray-500 font-bold uppercase tracking-wide mb-0.5">{classCode}</div>
                                                        <div className="text-[10px] text-gray-600 truncate max-w-[120px]">{CLASS_LABELS[classCode] || classCode}</div>
                                                    </div>
                                                </div>
                                                
                                                <div className="space-y-3">
                                                    <div>
                                                        <label className="text-[9px] text-gray-500 uppercase font-black block mb-1">Rate per KM</label>
                                                        <div className="relative">
                                                            <span className="absolute left-3 top-1.5 text-xs text-green-500/50">₹</span>
                                                            <input
                                                                type="number"
                                                                step="0.01"
                                                                value={fare.ratePerKm}
                                                                onChange={e => updateField('ratePerKm', Number(e.target.value))}
                                                                className="w-full bg-[#111827] text-white border border-gray-700 focus:border-[#4ab86d] rounded-lg pl-6 pr-3 py-1.5 text-xs font-bold focus:outline-none transition"
                                                                placeholder="0.00"
                                                            />
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <label className="text-[9px] text-gray-500 uppercase font-black block mb-1">Service Charge</label>
                                                        <div className="relative">
                                                            <span className="absolute left-3 top-1.5 text-xs text-green-500/50">₹</span>
                                                            <input
                                                                type="number"
                                                                value={fare.serviceCharge}
                                                                onChange={e => updateField('serviceCharge', Number(e.target.value))}
                                                                className="w-full bg-[#111827] text-white border border-gray-700 focus:border-[#4ab86d] rounded-lg pl-6 pr-3 py-1.5 text-xs font-bold focus:outline-none transition"
                                                                placeholder="0"
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="pt-2 border-t border-white/5">
                                                        <label className="text-[9px] text-gray-400 uppercase font-black block mb-1">Total Trip Cost ({trainDistance}km)</label>
                                                        <div className="relative">
                                                            <span className="absolute left-3 top-1.5 text-sm text-green-400 font-black">₹</span>
                                                            <input
                                                                type="number"
                                                                value={fare.total}
                                                                onChange={e => updateField('total', Number(e.target.value))}
                                                                className="w-full bg-[#0d1321] text-white border border-gray-600 focus:border-[#4ab86d] rounded-lg pl-7 pr-3 py-2 text-sm font-black focus:outline-none transition"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                {fares?.[classCode]?.total !== fare.total && (
                                                    <div className="text-[9px] mt-2 flex justify-between items-center opacity-60">
                                                        <span className="text-gray-500">Official: ₹{fares?.[classCode]?.total || '?'}</span>
                                                        <span className={`font-bold ${fare.total > fares?.[classCode]?.total ? "text-red-400" : "text-green-400"}`}>
                                                            {fare.total > fares?.[classCode]?.total ? "↑" : "↓"} {Math.abs(((fare.total - (fares?.[classCode]?.total || fare.total)) / (fares?.[classCode]?.total || 1)) * 100).toFixed(0)}%
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                {hasChanges && (
                                    <div className="mt-5 flex gap-3 justify-end">
                                        <button onClick={() => setEditedFares({ ...fares })} className="px-5 py-2.5 rounded-xl border border-gray-700 text-gray-400 hover:text-white font-bold transition text-sm">Reset Changes</button>
                                        <button onClick={saveFares} disabled={saving}
                                            className="px-6 py-2.5 rounded-xl bg-[#4ab86d] hover:bg-[#3da85c] disabled:opacity-50 text-black font-black transition text-sm flex items-center gap-2">
                                            {saving ? "Saving..." : (
                                                <>
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                                                    Save Fare Overrides
                                                </>
                                            )}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )
            }

            {
                !selectedTrain && !loading && (
                    <div className="text-center py-16 text-gray-600 text-sm">Search and select a train above to edit its fares.</div>
                )
            }
        </div>
    );
}
