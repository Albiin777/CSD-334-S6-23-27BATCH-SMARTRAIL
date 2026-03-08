import { useState, useEffect } from "react";
import api from "../../api/train.api";
import { supabase } from "../../utils/supabaseClient";

const today = new Date().toISOString().split("T")[0];

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

    useEffect(() => {
        (async () => {
            const [aRes, tRes] = await Promise.all([
                supabase.from("tte_assignments").select("*").order("created_at", { ascending: false }),
                supabase.from("tte_accounts").select("*").order("name")
            ]);
            if (aRes.data) setAssignments(aRes.data);
            if (tRes.data) setTtes(tRes.data);
            setLoading(false);
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
            source_station: train.source,
            dest_station: train.destination,
        }));
        setSearchQ(train.trainName);
        setTrainResults([]);
        setSelectedCoaches([]);
        // Fetch coaches
        try {
            const layout = await api.getSeatLayout(train.trainNumber);
            if (layout?.coaches) setCoachList(layout.coaches.map(c => ({ id: c.coachId, class: c.classCode })));
        } catch { setCoachList([]); }
    };

    const selectTTE = (tte) => {
        setForm(f => ({ ...f, tte_name: tte.name, tte_id: tte.employee_id || tte.id, tte_email: tte.email }));
    };

    const toggleCoach = (id) => {
        setSelectedCoaches(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
    };

    const selectRange = (from, to) => {
        const fromIdx = coachList.findIndex(c => c.id === from);
        const toIdx = coachList.findIndex(c => c.id === to);
        if (fromIdx < 0 || toIdx < 0) return;
        const range = coachList.slice(Math.min(fromIdx, toIdx), Math.max(fromIdx, toIdx) + 1).map(c => c.id);
        setSelectedCoaches(prev => {
            const merged = new Set([...prev, ...range]);
            return Array.from(merged);
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
        setSaving(true);
        const { error: dbErr } = await supabase.from("tte_assignments").insert({
            ...form,
            coach_ids: selectedCoaches,
            status: "active",
        });
        if (dbErr) { setError(dbErr.message); setSaving(false); return; }
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
        const { data } = await supabase.from("tte_assignments").select("*").order("created_at", { ascending: false });
        if (data) setAssignments(data);
        setForm({ tte_name: "", tte_id: "", tte_email: "", train_no: "", train_name: "", source_station: "", dest_station: "", duty_date: today, shift_start: "14:00", shift_end: "23:00", notes: "" });
        setSelectedCoaches([]); setCoachList([]); setSearchQ("");
        setSaving(false);
    };

    const deleteAssignment = async (id) => {
        await supabase.from("tte_assignments").delete().eq("id", id);
        setAssignments(prev => prev.filter(a => a.id !== id));
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

                    {/* Select TTE */}
                    <div>
                        <label className="text-xs text-gray-500 font-bold uppercase tracking-wide block mb-2">Select TTE</label>
                        {ttes.length === 0 ? (
                            <p className="text-xs text-gray-500">No TTEs found. Add TTEs in TTE Staff section first.</p>
                        ) : (
                            <div className="grid grid-cols-1 gap-1.5 max-h-40 overflow-y-auto pr-1">
                                {ttes.map(t => (
                                    <button
                                        key={t.id}
                                        type="button"
                                        onClick={() => selectTTE(t)}
                                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border text-sm text-left transition ${form.tte_name === t.name ? "bg-[#4ab86d]/15 border-[#4ab86d]/30 text-[#4ab86d]" : "bg-white/3 border-white/5 text-gray-300 hover:bg-white/6"
                                            }`}
                                    >
                                        <span className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center font-black shrink-0 text-xs">{t.name?.[0]}</span>
                                        <div className="min-w-0">
                                            <div className="font-bold truncate">{t.name}</div>
                                            <div className="text-[10px] opacity-60 truncate">{t.employee_id} · {t.email}</div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Train Search */}
                    <div className="relative">
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

                    {/* Station Range */}
                    {form.train_no && (
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="text-xs text-gray-500 font-bold block mb-1">From Station</label>
                                <input type="text" value={form.source_station} onChange={e => setForm(f => ({ ...f, source_station: e.target.value }))}
                                    className="w-full bg-[#080f1e] text-white border border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#4ab86d]" />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 font-bold block mb-1">To Station</label>
                                <input type="text" value={form.dest_station} onChange={e => setForm(f => ({ ...f, dest_station: e.target.value }))}
                                    className="w-full bg-[#080f1e] text-white border border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#4ab86d]" />
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
                                <select value={rangeFrom} onChange={e => setRangeFrom(e.target.value)}
                                    className="flex-1 bg-[#080f1e] text-white border border-gray-700 rounded-lg px-2 py-1.5 text-xs focus:outline-none">
                                    <option value="">From coach...</option>
                                    {coachList.map(c => <option key={c.id} value={c.id}>{c.id}</option>)}
                                </select>
                                <select value={rangeTo} onChange={e => setRangeTo(e.target.value)}
                                    className="flex-1 bg-[#080f1e] text-white border border-gray-700 rounded-lg px-2 py-1.5 text-xs focus:outline-none">
                                    <option value="">To coach...</option>
                                    {coachList.map(c => <option key={c.id} value={c.id}>{c.id}</option>)}
                                </select>
                                <button type="button" onClick={() => rangeFrom && rangeTo && selectRange(rangeFrom, rangeTo)}
                                    className="px-3 py-1.5 bg-blue-500/20 text-blue-400 border border-blue-500/20 rounded-lg text-xs font-bold hover:bg-blue-500/30 transition">
                                    Add
                                </button>
                            </div>

                            {/* By class group */}
                            {Object.entries(coachGroups).map(([cls, ids]) => (
                                <div key={cls} className="mb-2">
                                    <div className="text-[10px] text-gray-500 font-bold uppercase mb-1.5">{cls} coaches</div>
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
                            ))}
                            <button type="button" onClick={() => setSelectedCoaches([])}
                                className="text-xs text-gray-500 hover:text-red-400 transition mt-1">clear all</button>
                        </div>
                    )}

                    {/* Date & Shift */}
                    <div className="grid grid-cols-3 gap-2">
                        <div>
                            <label className="text-xs text-gray-500 font-bold block mb-1">Date</label>
                            <input type="date" value={form.duty_date} onChange={e => setForm(f => ({ ...f, duty_date: e.target.value }))}
                                className="w-full bg-[#080f1e] text-white border border-gray-700 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#4ab86d]" />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 font-bold block mb-1">Start</label>
                            <input type="time" value={form.shift_start} onChange={e => setForm(f => ({ ...f, shift_start: e.target.value }))}
                                className="w-full bg-[#080f1e] text-white border border-gray-700 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#4ab86d]" />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 font-bold block mb-1">End</label>
                            <input type="time" value={form.shift_end} onChange={e => setForm(f => ({ ...f, shift_end: e.target.value }))}
                                className="w-full bg-[#080f1e] text-white border border-gray-700 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#4ab86d]" />
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
                                                {a.source_station} → {a.dest_station} · {a.duty_date} · {a.shift_start}–{a.shift_end}
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
