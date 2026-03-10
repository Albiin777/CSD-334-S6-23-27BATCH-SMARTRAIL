import { useState, useEffect, useRef } from "react";
import api from "../../api/train.api";
import { db } from "../../utils/firebaseClient";
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, orderBy } from "firebase/firestore";

const today = new Date().toISOString().split("T")[0];
const maxDate = new Date(new Date().getTime() + 60 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]; // 2 months from now

const formatTime = (timeStr) => {
    if (!timeStr) return "";
    try {
        const [hours, minutes] = timeStr.split(':');
        let h = parseInt(hours);
        const ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12 || 12;
        return `${h}:${minutes} ${ampm}`;
    } catch { return timeStr; }
};

export default function DutyAssignments() {
    const [assignments, setAssignments] = useState([]);
    const [ttes, setTtes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState("");
    const [searchQ, setSearchQ] = useState("");
    const [trainResults, setTrainResults] = useState([]);
    const [coachList, setCoachList] = useState([]);
    const [selectedCoaches, setSelectedCoaches] = useState([]);

    const [form, setForm] = useState({
        tte_name: "", tte_id: "", tte_email: "",
        train_no: "", train_name: "", source_station: "", dest_station: "",
        duty_date: today, shift_start: "14:00", shift_end: "23:00",
        notes: ""
    });
    const [tteSearch, setTteSearch] = useState("");
    const [showTteResults, setShowTteResults] = useState(false);
    const [minStartTime, setMinStartTime] = useState(""); // Departure from source
    const [limitEndTime, setLimitEndTime] = useState(""); // Arrival at destination
    const [runningDays, setRunningDays] = useState([]);   // Days the train operates [Monday, ...]

    const [sourceResults, setSourceResults] = useState([]);
    const [destResults, setDestResults] = useState([]);
    const [showSourceResults, setShowSourceResults] = useState(false);
    const [showDestResults, setShowDestResults] = useState(false);

    const tteRef = useRef(null);
    const trainRef = useRef(null);
    const sourceRef = useRef(null);
    const destRef = useRef(null);

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (tteRef.current && !tteRef.current.contains(event.target)) setShowTteResults(false);
            if (trainRef.current && !trainRef.current.contains(event.target)) setTrainResults([]);
            if (sourceRef.current && !sourceRef.current.contains(event.target)) setShowSourceResults(false);
            if (destRef.current && !destRef.current.contains(event.target)) setShowDestResults(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        (async () => {
            try {
                const [aSnap, tSnap, pSnap] = await Promise.all([
                    getDocs(query(collection(db, "tte_assignments"), orderBy("created_at", "desc"))),
                    getDocs(collection(db, "ttes")), // TTEs from dedicated collection
                    getDocs(query(collection(db, "profiles"), where("role", "==", "tte"))) // TTEs from profiles
                ]);
                setAssignments(aSnap.docs.map(d => ({ id: d.id, ...d.data() })));
                
                // Merge TTEs from both sources, deduplicating by email
                const mergedTtes = new Map();
                
                // 1. Process Profile TTEs first (basic data)
                pSnap.docs.forEach(d => {
                    const data = d.data();
                    const email = data.email?.toLowerCase();
                    if (email) {
                        mergedTtes.set(email, { 
                            id: d.id, 
                            ...data, 
                            name: data.full_name || data.name || email.split('@')[0] 
                        });
                    }
                });
                
                // 2. Process Dedicated TTEs (overwrites profile data with more specific TTE info)
                tSnap.docs.forEach(d => {
                    const data = d.data();
                    const email = data.email?.toLowerCase();
                    if (email) {
                        const existing = mergedTtes.get(email) || {};
                        mergedTtes.set(email, { 
                            ...existing, 
                            id: d.id, 
                            ...data, 
                            name: data.name || data.full_name || existing.name || email.split('@')[0] 
                        });
                    }
                });

                const ttesList = Array.from(mergedTtes.values());
                ttesList.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
                setTtes(ttesList);
            } catch (err) {
                console.error("Error fetching data:", err);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    // Train search
    useEffect(() => {
        if (searchQ.length < 1) { setTrainResults([]); return; }
        const t = setTimeout(async () => {
            const res = await api.searchTrains(searchQ);
            setTrainResults(res.slice(0, 10));
        }, 300);
        return () => clearTimeout(t);
    }, [searchQ]);

    const selectTrain = async (train) => {
        setForm(f => ({
            ...f,
            train_no: train.trainNumber,
            train_name: train.trainName,
            source_station: `${train.source || ""} (${train.sourceCode || train.source || ""})`,
            dest_station: `${train.destination || train.dest || ""} (${train.destCode || train.dest || ""})`,
        }));
        setRunningDays(train.runningDays || []);
        setSearchQ(`${train.trainName} (${train.trainNumber})`);
        setTrainResults([]);
        setSelectedCoaches([]);
        // Fetch metadata
        try {
            const [layout, schedule] = await Promise.all([
                api.getSeatLayout(train.trainNumber),
                api.getTrainSchedule(train.trainNumber)
            ]);
            
            if (layout?.coaches) setCoachList(layout.coaches.map(c => ({ id: c.coachId, class: c.classCode })));
            
            if (schedule && schedule.length > 0) {
                const departure = schedule[0].departureTime; // First station dep
                const arrival = schedule[schedule.length - 1].arrivalTime; // Last station arr
                
                setMinStartTime(departure);
                setLimitEndTime(arrival);

                // Auto-adjust if current selection is outside the train's running window
                if (form.shift_start < departure) setForm(f => ({ ...f, shift_start: departure }));
                if (form.shift_end > arrival) setForm(f => ({ ...f, shift_end: arrival }));
                // Ensure end is not before start
                if (departure > arrival) { /* Handle overnight separately if needed, but for now stay simple */ }
            }
        } catch (e) { 
            console.error("Fetch metadata error:", e);
            setCoachList([]); 
            setMinStartTime("");
        }
    };

    const selectTTE = (tte) => {
        const finalName = tte.name || tte.full_name || tte.email?.split('@')[0] || "Unknown TTE";
        setForm(f => ({ ...f, tte_name: finalName, tte_id: tte.employee_id || tte.id, tte_email: tte.email }));
        setTteSearch(finalName);
        setShowTteResults(false);
    };

    const filteredTtes = !tteSearch ? ttes : ttes.filter(t => 
        (t.name || "").toLowerCase().includes(tteSearch.toLowerCase()) ||
        (t.email || "").toLowerCase().includes(tteSearch.toLowerCase()) ||
        (t.employee_id || "").toLowerCase().includes(tteSearch.toLowerCase())
    );

    const toggleCoach = (id) => {
        setSelectedCoaches(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
    };

    const selectRange = (from, to) => {
        const fromIdx = coachList.findIndex(c => c.id === from);
        const toIdx = coachList.findIndex(c => c.id === to);
        if (fromIdx < 0 || toIdx < 0) return;
        
        // Get physical order from train map
        const range = coachList.slice(Math.min(fromIdx, toIdx), Math.max(fromIdx, toIdx) + 1).map(c => c.id);
        
        setSelectedCoaches(prev => {
            const merged = new Set([...prev, ...range]);
            return Array.from(merged);
        });
        
        // Reset selectors for next action
        setRangeFrom("");
        setRangeTo("");
    };

    const selectAllOfClass = (coachesInClass) => {
        const allAlreadySelected = coachesInClass.every(id => selectedCoaches.includes(id));
        
        setSelectedCoaches(prev => {
            if (allAlreadySelected) {
                // Unselect all in this class
                return prev.filter(id => !coachesInClass.includes(id));
            } else {
                // Select all in this class
                const merged = new Set([...prev, ...coachesInClass]);
                return Array.from(merged);
            }
        });
    };

    const [rangeFrom, setRangeFrom] = useState("");
    const [rangeTo, setRangeTo] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        if (!form.train_no) { setError("Please select a train"); return; }
        if (!form.tte_name) { setError("Please select a TTE"); return; }
        if (selectedCoaches.length === 0) { setError("Please select at least one coach"); return; }
        
        // Date Validation
        if (form.duty_date < today) {
            setError("Duty date cannot be in the past");
            return;
        }
        if (form.duty_date > maxDate) {
            setError("Duty date cannot be more than 2 months in advance");
            return;
        }

        // Running Day Validation
        if (form.train_no && runningDays.length > 0) {
            const dateObj = new Date(form.duty_date);
            const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
            if (!runningDays.includes(dayName)) {
                setError(`Train ${form.train_no} does not run on ${dayName}`);
                setSaving(false);
                return;
            }
        }

        // Time Validation (Must be within train running window)
        if (minStartTime && form.shift_start < minStartTime) {
            setError(`Shift cannot start before train departure (${minStartTime})`);
            return;
        }
        if (limitEndTime && form.shift_end > limitEndTime) {
            setError(`Shift cannot end after train arrival (${limitEndTime})`);
            return;
        }
        if (form.shift_start >= form.shift_end) {
            setError("Shift end time must be after start time");
            return;
        }

        setSaving(true);
        try {
            await addDoc(collection(db, "tte_assignments"), {
                ...form,
                coach_ids: selectedCoaches,
                status: "active",
                created_at: new Date().toISOString()
            });
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
            
            const aSnap = await getDocs(query(collection(db, "tte_assignments"), orderBy("created_at", "desc")));
            setAssignments(aSnap.docs.map(d => ({ id: d.id, ...d.data() })));
            
            setForm({ tte_name: "", tte_id: "", tte_email: "", train_no: "", train_name: "", source_station: "", dest_station: "", duty_date: today, shift_start: "14:00", shift_end: "23:00", notes: "" });
            setTteSearch("");
            setSelectedCoaches([]); setCoachList([]); setSearchQ("");
        } catch (dbErr) {
            setError(dbErr.message); 
        }
        setSaving(false);
    };

    const deleteAssignment = async (id) => {
        try {
            await deleteDoc(doc(db, "tte_assignments", id));
            setAssignments(prev => prev.filter(a => a.id !== id));
        } catch (err) {
            console.error(err);
        }
    };

    // Group coaches by class
    const coachGroups = coachList.reduce((acc, c) => {
        if (!acc[c.class]) acc[c.class] = [];
        acc[c.class].push(c.id);
        return acc;
    }, {});

    return (
        <div className="space-y-5">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#10b981] to-[#3b82f6] flex items-center justify-center text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                </div>
                <div>
                    <h1 className="text-2xl md:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">TTE Duty Assignments</h1>
                    <p className="text-gray-400 text-sm mt-1 font-medium tracking-wide">Assign personnel to trains</p>
                </div>
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">

                {/* Assignment Form */}
                <form onSubmit={handleSubmit} className="xl:col-span-2 bg-[#111827] border border-white/5 rounded-2xl p-5 space-y-4 self-start sticky top-4">
                    <h2 className="font-bold text-white">New Assignment</h2>
                    {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl px-4 py-2.5 font-bold">{error}</div>}
                    {success && <div className="bg-green-500/10 border border-green-500/20 text-green-400 text-xs rounded-xl px-4 py-2.5 font-bold">✓ Assignment created!</div>}

                    {/* Select TTE Search */}
                    <div className="relative" ref={tteRef}>
                        <label className="text-xs text-gray-500 font-bold uppercase tracking-wide block mb-1.5">Select TTE</label>
                        <div className="relative group">
                            <input
                                type="text"
                                value={tteSearch}
                                onChange={e => { setTteSearch(e.target.value); setShowTteResults(true); }}
                                onFocus={() => setShowTteResults(true)}
                                placeholder="Search TTE by name or ID..."
                                className="w-full bg-[#080f1e] text-white border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#4ab86d] transition"
                            />
                            {tteSearch && (
                                <button type="button" onClick={() => { setTteSearch(""); setForm(f => ({ ...f, tte_name: "", tte_id: "", tte_email: "" })); }}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">✕</button>
                            )}
                        </div>
                        
                        {showTteResults && filteredTtes.length > 0 && (
                            <div className="absolute z-[60] top-full mt-1 left-0 right-0 bg-[#1D2332] border border-gray-700 rounded-xl shadow-2xl overflow-hidden max-h-48 overflow-y-auto">
                                {filteredTtes.map(t => (
                                    <button
                                        key={t.id}
                                        type="button"
                                        onClick={() => selectTTE(t)}
                                        className="w-full text-left px-4 py-3 hover:bg-[#4ab86d]/10 text-sm border-b border-white/5 group transition"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center font-black text-[10px] group-hover:bg-[#4ab86d]/20 transition">{t.name?.[0] || t.email?.[0]}</span>
                                            <div className="min-w-0">
                                                <div className="font-bold text-white truncate">{t.name || t.full_name}</div>
                                                <div className="text-[10px] text-gray-400 truncate">{t.employee_id} · {t.email}</div>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                        {showTteResults && tteSearch && filteredTtes.length === 0 && (
                            <div className="absolute z-[60] top-full mt-1 left-0 right-0 bg-[#1D2332] border border-gray-700 rounded-xl p-4 text-center text-xs text-gray-500 italic">
                                No TTE found with that name or ID
                            </div>
                        )}
                    </div>

                    {/* Train Search */}
                    <div className="relative" ref={trainRef}>
                        <label className="text-xs text-gray-500 font-bold uppercase tracking-wide block mb-1.5">Select Train</label>
                        <input
                            type="text"
                            value={searchQ}
                            onChange={e => setSearchQ(e.target.value)}
                            placeholder="Search train name or number..."
                            className="w-full bg-[#080f1e] text-white border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#4ab86d] transition"
                        />
                        {trainResults.length > 0 && (
                            <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-[#1D2332] border border-gray-700 rounded-xl shadow-2xl overflow-hidden max-h-48 overflow-y-auto">
                                {trainResults.map(t => (
                                    <button
                                        key={t.trainNumber}
                                        type="button"
                                        onClick={() => selectTrain(t)}
                                        className="w-full text-left px-4 py-3 hover:bg-white/5 text-sm border-b border-white/5"
                                    >
                                        <span className="font-bold text-white">{t.trainName}</span>
                                        <span className="text-xs text-gray-500 ml-2">{t.trainNumber}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Station Search */}
                    {form.train_no && (
                        <div className="grid grid-cols-2 gap-2">
                            <div className="relative" ref={sourceRef}>
                                <label className="text-xs text-gray-500 font-bold block mb-1">From Station</label>
                                <input type="text" 
                                    value={form.source_station} 
                                    onFocus={() => setShowSourceResults(true)}
                                    onChange={async (e) => {
                                        const val = e.target.value;
                                        setForm(f => ({ ...f, source_station: val }));
                                        if (val.length > 1) {
                                            const res = await api.searchStations(val);
                                            setSourceResults(res.slice(0, 5));
                                            setShowSourceResults(true);
                                        }
                                    }}
                                    placeholder="Search source..."
                                    className="w-full bg-[#080f1e] text-white border border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#4ab86d]" />
                                
                                {showSourceResults && sourceResults.length > 0 && (
                                    <div className="absolute z-[60] top-full mt-1 left-0 right-0 bg-[#1D2332] border border-gray-700 rounded-xl shadow-2xl overflow-hidden max-h-48 overflow-y-auto">
                                        {sourceResults.map(s => (
                                            <button key={s.code} type="button" 
                                                onClick={() => {
                                                    setForm(f => ({ ...f, source_station: `${s.name} (${s.code})` }));
                                                    setShowSourceResults(false);
                                                }}
                                                className="w-full text-left px-4 py-2.5 hover:bg-white/5 text-xs text-gray-300 border-b border-white/5"
                                            >
                                                <span className="font-bold text-white">{s.name}</span> <span className="text-[#4ab86d] ml-1">[{s.code}]</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="relative" ref={destRef}>
                                <label className="text-xs text-gray-500 font-bold block mb-1">To Station</label>
                                <input type="text" 
                                    value={form.dest_station} 
                                    onFocus={() => setShowDestResults(true)}
                                    onChange={async (e) => {
                                        const val = e.target.value;
                                        setForm(f => ({ ...f, dest_station: val }));
                                        if (val.length > 1) {
                                            const res = await api.searchStations(val);
                                            setDestResults(res.slice(0, 5));
                                            setShowDestResults(true);
                                        }
                                    }}
                                    placeholder="Search destination..."
                                    className="w-full bg-[#080f1e] text-white border border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#4ab86d]" />

                                {showDestResults && destResults.length > 0 && (
                                    <div className="absolute z-[60] top-full mt-1 left-0 right-0 bg-[#1D2332] border border-gray-700 rounded-xl shadow-2xl overflow-hidden max-h-48 overflow-y-auto">
                                        {destResults.map(s => (
                                            <button key={s.code} type="button" 
                                                onClick={() => {
                                                    setForm(f => ({ ...f, dest_station: `${s.name} (${s.code})` }));
                                                    setShowDestResults(false);
                                                }}
                                                className="w-full text-left px-4 py-2.5 hover:bg-white/5 text-xs text-gray-300 border-b border-white/5"
                                            >
                                                <span className="font-bold text-white">{s.name}</span> <span className="text-[#4ab86d] ml-1">[{s.code}]</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Coach Selection */}
                    {coachList.length > 0 && (
                        <div>
                            <label className="text-xs text-gray-500 font-bold uppercase tracking-wide block mb-2">
                                Select Coaches <span className="text-[#4ab86d] ml-1">{selectedCoaches.length} selected</span>
                            </label>

                            {/* Range selector */}
                            <div className="flex gap-2 mb-3">
                                <select value={rangeFrom} 
                                    onChange={e => {
                                        const val = e.target.value;
                                        setRangeFrom(val);
                                        if (val && rangeTo) selectRange(val, rangeTo);
                                    }}
                                    className="flex-1 bg-[#080f1e] text-white border border-gray-700 rounded-lg px-2 py-1.5 text-xs focus:outline-none">
                                    <option value="">Start Coach...</option>
                                    {coachList.map(c => <option key={c.id} value={c.id}>{c.id}</option>)}
                                </select>
                                <select value={rangeTo} 
                                    onChange={e => {
                                        const val = e.target.value;
                                        setRangeTo(val);
                                        if (rangeFrom && val) selectRange(rangeFrom, val);
                                    }}
                                    className="flex-1 bg-[#080f1e] text-white border border-gray-700 rounded-lg px-2 py-1.5 text-xs focus:outline-none">
                                    <option value="">End Coach...</option>
                                    {coachList.map(c => <option key={c.id} value={c.id}>{c.id}</option>)}
                                </select>
                                <button type="button" onClick={() => rangeFrom && rangeTo && selectRange(rangeFrom, rangeTo)}
                                    className="px-3 py-1.5 bg-[#4ab86d]/20 text-[#4ab86d] border border-[#4ab86d]/20 rounded-lg text-xs font-bold hover:bg-[#4ab86d]/30 transition">
                                    Add
                                </button>
                            </div>

                            {/* By class group */}
                            {Object.entries(coachGroups).map(([cls, ids]) => {
                                const isAllClassSelected = ids.every(id => selectedCoaches.includes(id));
                                return (
                                    <div key={cls} className="mb-2">
                                        <div className="flex items-center justify-between mb-1.5">
                                            <div className="text-[10px] text-gray-500 font-bold uppercase">{cls} coaches</div>
                                            <button type="button" onClick={() => selectAllOfClass(ids)}
                                                className={`text-[9px] font-bold px-2 py-0.5 rounded transition ${isAllClassSelected ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-[#4ab86d]/10 text-[#4ab86d] hover:bg-[#4ab86d]/20'}`}>
                                                {isAllClassSelected ? `Unselect All ${cls}` : `Select All ${cls}`}
                                            </button>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5">
                                            {ids.map(id => (
                                                <button
                                                    key={id}
                                                    type="button"
                                                    onClick={() => toggleCoach(id)}
                                                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition ${selectedCoaches.includes(id)
                                                        ? "bg-[#4ab86d]/20 text-[#4ab86d] border-[#4ab86d]/30"
                                                        : "bg-white/3 text-gray-400 border-white/10 hover:bg-white/8"
                                                        }`}
                                                >
                                                    {id}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                            <button type="button" onClick={() => setSelectedCoaches([])}
                                className="text-xs text-gray-500 hover:text-red-400 transition mt-1">clear all</button>
                        </div>
                    )}

                    {/* Date & Shift */}
                    <div className="grid grid-cols-3 gap-2">
                        <div>
                            <label className="text-xs text-gray-500 font-bold block mb-1">Date</label>
                            <input type="date" value={form.duty_date} 
                                min={today}
                                max={maxDate}
                                onChange={e => setForm(f => ({ ...f, duty_date: e.target.value }))}
                                className={`w-full bg-[#080f1e] text-white border border-gray-700 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#4ab86d] ${form.duty_date < today ? 'border-red-500' : ''}`} />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 font-bold block mb-1">Start {minStartTime && <span className="text-orange-400 font-normal">(Min: {formatTime(minStartTime)})</span>}</label>
                            <input type="time" value={form.shift_start} onChange={e => setForm(f => ({ ...f, shift_start: e.target.value }))}
                                min={minStartTime}
                                className={`w-full bg-[#080f1e] text-white border border-gray-700 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#4ab86d] ${minStartTime && form.shift_start < minStartTime ? 'border-red-500' : ''}`} />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 font-bold block mb-1">End {limitEndTime && <span className="text-orange-400 font-normal">(Max: {formatTime(limitEndTime)})</span>}</label>
                            <input type="time" value={form.shift_end} onChange={e => setForm(f => ({ ...f, shift_end: e.target.value }))}
                                max={limitEndTime}
                                className={`w-full bg-[#080f1e] text-white border border-gray-700 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#4ab86d] ${limitEndTime && form.shift_end > limitEndTime ? 'border-red-500' : ''}`} />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs text-gray-500 font-bold block mb-1">Notes (optional)</label>
                        <input type="text" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                            placeholder="Any special instructions..."
                            className="w-full bg-[#080f1e] text-white border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#4ab86d]" />
                    </div>

                    <button type="submit" disabled={saving}
                        className="w-full bg-[#4ab86d] hover:bg-[#3da85c] disabled:opacity-50 text-black font-black py-3 rounded-xl transition">
                        {saving ? "Saving..." : (
                            <span className="flex items-center gap-2 justify-center">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                Create Assignment
                            </span>
                        )}
                    </button>
                </form>

                {/* Assignments List */}
                <div className="xl:col-span-3 bg-[#111827] border border-white/5 rounded-2xl overflow-hidden">
                    <div className="px-5 py-4 border-b border-white/5">
                        <h2 className="font-bold text-white">All Assignments <span className="text-xs text-gray-500 font-normal ml-2">({assignments.length})</span></h2>
                    </div>
                    {loading ? (
                        <div className="p-10 text-center text-gray-500">Loading...</div>
                    ) : assignments.length === 0 ? (
                        <div className="p-10 text-center text-gray-500 text-sm">No assignments yet.</div>
                    ) : (
                        <div className="divide-y divide-white/5 max-h-[80vh] overflow-y-auto">
                            {assignments.map(a => (
                                <div key={a.id} className="px-5 py-4">
                                    <div className="flex items-start gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-[#4ab86d]/10 border border-[#4ab86d]/20 flex items-center justify-center text-[#4ab86d] font-black text-sm shrink-0">
                                            {a.tte_name?.[0] || "T"}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-black text-white">{a.tte_name}</span>
                                                {a.tte_id && <span className="text-[10px] font-mono text-gray-500">ID: {a.tte_id}</span>}
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${a.status === "active" ? "text-green-400 bg-green-500/10 border-green-500/20" : "text-gray-400 bg-gray-500/10 border-gray-500/20"
                                                    }`}>{a.status}</span>
                                            </div>
                                            <div className="text-sm text-gray-300 mt-0.5">
                                                Train <span className="font-bold text-blue-400">{a.train_no}</span> · {a.train_name}
                                            </div>
                                            <div className="text-xs text-gray-500 mt-0.5">
                                                {a.source_station} → {a.dest_station} · {a.duty_date} · {formatTime(a.shift_start)} – {formatTime(a.shift_end)}
                                            </div>
                                            {a.coach_ids?.length > 0 && (
                                                <div className="flex flex-wrap gap-1 mt-2">
                                                    {a.coach_ids.map(c => (
                                                        <span key={c} className="text-[9px] bg-blue-500/10 text-blue-300 border border-blue-500/15 px-1.5 py-0.5 rounded font-mono">{c}</span>
                                                    ))}
                                                </div>
                                            )}
                                            {a.notes && <div className="text-xs text-gray-500 mt-1 italic">{a.notes}</div>}
                                        </div>
                                        <button onClick={() => deleteAssignment(a.id)}
                                            className="text-gray-600 hover:text-red-400 transition text-sm shrink-0">🗑</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
