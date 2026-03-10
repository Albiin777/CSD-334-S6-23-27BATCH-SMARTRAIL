import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/train.api";
import { db } from "../utils/firebaseClient";
import { collection, query, getDocs, limit, orderBy, where } from "firebase/firestore";

function StatCard({ label, value, sub, color = "blue", icon }) {
    const colors = {
        blue: "from-[#3b82f6]/20 to-[#3b82f6]/5 border-[#3b82f6]/30 text-[#3b82f6] shadow-[0_4px_20px_rgba(59,130,246,0.1)]",
        green: "from-[#10b981]/20 to-[#10b981]/5 border-[#10b981]/30 text-[#10b981] shadow-[0_4px_20px_rgba(16,185,129,0.1)]",
        red: "from-[#ef4444]/20 to-[#ef4444]/5 border-[#ef4444]/30 text-[#ef4444] shadow-[0_4px_20px_rgba(239,68,68,0.1)]",
        orange: "from-[#f59e0b]/20 to-[#f59e0b]/5 border-[#f59e0b]/30 text-[#f59e0b] shadow-[0_4px_20px_rgba(245,158,11,0.1)]",
        purple: "from-[#8b5cf6]/20 to-[#8b5cf6]/5 border-[#8b5cf6]/30 text-[#8b5cf6] shadow-[0_4px_20px_rgba(139,92,246,0.1)]",
    };
    return (
        <div className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${colors[color]} group`}>
            <div className="absolute -right-4 -top-4 opacity-10 blur-xl w-32 h-32 rounded-full bg-current transition-all duration-500 group-hover:scale-150 group-hover:opacity-20" />
            <div className="text-3xl mb-4 w-10 h-10 p-2 rounded-xl bg-current/10 flex items-center justify-center">{icon}</div>
            <div className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">{value}</div>
            <div className="text-sm font-semibold mt-1 tracking-wide text-gray-300">{label}</div>
            {sub && <div className="text-xs font-medium opacity-60 mt-1.5">{sub}</div>}
        </div>
    );
}

// Reusable SVG icons
const ICONS = {
    Running: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
    Delayed: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    Departed: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>,
    Complaints: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    Trains: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" /></svg>,
    Users: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
    Lightning: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
    Seats: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>,
    Assign: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
    Fares: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    Bell: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>,
};

export default function AdminDashboard() {
    const navigate = useNavigate();
    const [trains, setTrains] = useState([]);
    const [allTrains, setAllTrains] = useState([]);
    const [complaints, setComplaints] = useState([]);
    const [ttes, setTtes] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [page, setPage] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                // 1. Trains (API remains same)
                const raw = await api.searchTrains("all");
                const now = new Date();
                const currentHour = now.getHours();

                const enriched = raw.map(t => {
                    const seed = t.trainNumber.split("").reduce((a, b) => a + b.charCodeAt(0), 0);
                    const isRunning = (seed + currentHour) % 2 === 0;
                    const status = isRunning ? "Running" : (seed % 3 === 0 ? "Delayed" : "Departed");
                    return { ...t, status };
                });
                
                setAllTrains(enriched);
                // Show ONLY running trains in the list
                setTrains(enriched.filter(t => t.status === "Running"));
 
                // 2. Complaints (Firestore)
                const complaintsSnap = await getDocs(query(collection(db, "complaints"), orderBy("created_at", "desc"), limit(8)));
                setComplaints(complaintsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
 
                // 3. TTEs (Firestore)
                const ttesSnap = await getDocs(query(collection(db, "profiles"), where("role", "==", "tte"), limit(5)));
                setTtes(ttesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
 
                // 4. Active assignments (Firestore)
                const assignmentsSnap = await getDocs(query(collection(db, "tte_assignments"), where("status", "==", "active"), limit(5)));
                setAssignments(assignmentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
 
            } catch (e) {
                console.error("Dashboard Load Error:", e);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const runningCount = allTrains.filter(t => t.status === "Running").length;
    const delayedCount = allTrains.filter(t => t.status === "Delayed").length;
    const departedCount = allTrains.filter(t => t.status === "Departed").length;

    const itemsPerPage = 4;
    const paginatedTrains = trains.slice(page * itemsPerPage, (page + 1) * itemsPerPage);
    const totalPages = Math.ceil(trains.length / itemsPerPage);

    if (loading) return (
        <div className="flex items-center justify-center h-64 text-gray-400">
            <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-[#4ab86d] border-t-transparent rounded-full animate-spin" />
                Loading dashboard...
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl md:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">System Dashboard</h1>
                <p className="text-gray-400 text-sm mt-1.5 font-medium tracking-wide">Live overview · SmartRail Network Operations</p>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                <StatCard label="Running" value={runningCount} icon={ICONS.Running} color="green" sub="Active trains on route" />
                <StatCard label="Delayed" value={delayedCount} icon={ICONS.Delayed} color="orange" sub="Behind schedule" />
                <StatCard label="Departed" value={departedCount} icon={ICONS.Departed} color="blue" sub="Successfully completed" />
                <StatCard label="Complaints" value={complaints.length} icon={ICONS.Complaints} color="red" sub="Require attention" />
            </div>

            {/* Main 2-col layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                {/* Live Train Status */}
                <div className="bg-[#0a1120] border border-white/5 rounded-2xl shadow-xl overflow-hidden backdrop-blur-md">
                    <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 bg-white/[0.02]">
                        <h2 className="font-bold text-white flex items-center gap-3 text-lg">
                            <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">{ICONS.Trains}</span>
                            Live Train Status
                        </h2>
                        <button onClick={() => navigate("/admin/trains")} className="text-xs text-[#10b981] hover:text-[#059669] font-bold tracking-wide uppercase transition-colors">View all →</button>
                    </div>
                    <div className="divide-y divide-white/5">
                        {paginatedTrains.length > 0 ? (
                            paginatedTrains.map((t, i) => (
                                <div key={i} className="flex items-center justify-between px-5 py-3.5 hover:bg-white/[0.03] transition group">
                                    <div className="flex items-center gap-4">
                                        <div className="w-8 h-8 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-400 group-hover:scale-110 transition-transform font-bold text-[10px]">
                                            {t.trainNumber.slice(-2)}
                                        </div>
                                        <div>
                                            <div className="font-bold text-white text-sm group-hover:text-[#10b981] transition-colors">{t.trainName}</div>
                                            <div className="text-[10px] text-gray-500 font-mono font-medium tracking-tight">#{t.trainNumber} · {t.source} → {t.destination}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-[10px] px-2.5 py-1 rounded-full font-bold border text-green-400 bg-green-500/10 border-green-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]">Running</span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-8 text-center text-gray-500 text-sm">No trains are currently running.</div>
                        )}
                    </div>
                    {totalPages > 1 && (
                        <div className="px-6 py-4 border-t border-white/5 bg-white/[0.01] flex items-center justify-between">
                            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Page {page + 1} of {totalPages}</div>
                            <div className="flex gap-2">
                                <button 
                                    disabled={page === 0}
                                    onClick={() => setPage(p => Math.max(0, p - 1))}
                                    className="p-1.5 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 disabled:opacity-20 transition"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                                </button>
                                <button 
                                    disabled={page >= totalPages - 1}
                                    onClick={() => setPage(p => p + 1)}
                                    className="p-1.5 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 disabled:opacity-20 transition"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Complaints Panel */}
                <div className="bg-[#0a1120] border border-white/5 rounded-2xl shadow-xl overflow-hidden backdrop-blur-md">
                    <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 bg-white/[0.02]">
                        <h2 className="font-bold text-white flex items-center gap-3 text-lg">
                            <span className="p-1.5 rounded-lg bg-red-500/10 text-red-400">{ICONS.Complaints}</span>
                            Recent Complaints
                        </h2>
                        <button onClick={() => navigate("/admin/complaints")} className="text-xs text-[#10b981] hover:text-[#059669] font-bold tracking-wide uppercase transition-colors">View all →</button>
                    </div>
                    {complaints.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 text-sm">No complaints yet. 🎉</div>
                    ) : (
                        <div className="divide-y divide-white/5">
                            {complaints.map((c, i) => (
                                <div key={i} className="px-5 py-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-bold text-white truncate">{c.subject || c.category || "Complaint"}</div>
                                            <div className="text-xs text-gray-400 truncate mt-0.5">{c.message || c.description || "—"}</div>
                                        </div>
                                        <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full border font-bold ${c.status === "resolved" ? "text-green-400 bg-green-500/10 border-green-500/20" :
                                            "text-orange-400 bg-orange-500/10 border-orange-500/20"
                                            }`}>{c.status || "open"}</span>
                                    </div>
                                    <div className="text-[10px] text-gray-600 mt-1">{c.user_email || c.email || "Anonymous"} · {c.created_at ? new Date(c.created_at).toLocaleDateString("en-IN") : ""}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Active TTE Assignments */}
                <div className="bg-[#0a1120] border border-white/5 rounded-2xl shadow-xl overflow-hidden backdrop-blur-md lg:col-span-2 xl:col-span-1">
                    <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 bg-white/[0.02]">
                        <h2 className="font-bold text-white flex items-center gap-3 text-lg">
                            <span className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400">{ICONS.Users}</span>
                            Active Duty Personnel
                        </h2>
                        <button onClick={() => navigate("/admin/assignments")} className="text-xs text-[#10b981] hover:text-[#059669] font-bold tracking-wide uppercase transition-colors">Manage →</button>
                    </div>
                    {assignments.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 text-sm">No active assignments.</div>
                    ) : (
                        <div className="divide-y divide-white/5">
                            {assignments.map((a, i) => (
                                <div key={i} className="px-5 py-3 flex items-center gap-4">
                                    <div className="w-9 h-9 rounded-xl bg-[#4ab86d]/15 border border-[#4ab86d]/20 flex items-center justify-center text-[#4ab86d] font-black text-sm shrink-0">
                                        {a.tte_name?.[0] || "T"}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-bold text-white text-sm">{a.tte_name}</div>
                                        <div className="text-xs text-gray-400">Train {a.train_no} · {a.duty_date}</div>
                                        {a.coach_ids?.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {a.coach_ids.slice(0, 4).map(c => (
                                                    <span key={c} className="text-[9px] bg-blue-500/10 text-blue-300 border border-blue-500/15 px-1.5 rounded font-mono">{c}</span>
                                                ))}
                                                {a.coach_ids.length > 4 && <span className="text-[9px] text-gray-500">+{a.coach_ids.length - 4} more</span>}
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-xs text-gray-500">{a.shift_start}–{a.shift_end}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Quick Actions */}
                <div className="bg-[#0a1120] border border-white/5 rounded-2xl shadow-xl p-6 backdrop-blur-md lg:col-span-2 xl:col-span-1 border-t-4 border-t-[#10b981]">
                    <h2 className="font-bold text-white mb-5 flex items-center gap-3 text-lg">
                        <span className="p-1.5 rounded-lg bg-orange-500/10 text-orange-400">{ICONS.Lightning}</span>
                        Quick Actions
                    </h2>
                    <div className="grid grid-cols-2 gap-4">
                        {[
                            { label: "Seat Map", icon: ICONS.Seats, path: "/admin/seats", color: "from-[#10b981]/10 to-transparent", text: "text-[#10b981]", border: "border-[#10b981]/30 hover:border-[#10b981]" },
                            { label: "Assign TTE", icon: ICONS.Assign, path: "/admin/assignments", color: "from-[#3b82f6]/10 to-transparent", text: "text-[#3b82f6]", border: "border-[#3b82f6]/30 hover:border-[#3b82f6]" },
                            { label: "Edit Fares", icon: ICONS.Fares, path: "/admin/fares", color: "from-[#f59e0b]/10 to-transparent", text: "text-[#f59e0b]", border: "border-[#f59e0b]/30 hover:border-[#f59e0b]" },
                            { label: "Send Alert", icon: ICONS.Bell, path: "/admin/notifications", color: "from-[#8b5cf6]/10 to-transparent", text: "text-[#8b5cf6]", border: "border-[#8b5cf6]/30 hover:border-[#8b5cf6]" },
                        ].map(a => (
                            <button
                                key={a.path}
                                onClick={() => navigate(a.path)}
                                className={`flex flex-col items-center gap-3 p-5 rounded-xl bg-gradient-to-b ${a.color} border transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${a.border} group`}
                            >
                                <span className={`${a.text} p-2 bg-white/5 rounded-lg group-hover:bg-white/10 transition-colors`}>{a.icon}</span>
                                <span className="text-sm font-bold text-gray-200 group-hover:text-white">{a.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
