import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/train.api";

const STATUS_CFG = {
    Running: { color: "text-green-400 bg-green-500/10 border-green-500/20", dot: "bg-green-400" },
    Delayed: { color: "text-orange-400 bg-orange-500/10 border-orange-500/20", dot: "bg-orange-400" },
    Departed: { color: "text-blue-400 bg-blue-500/10 border-blue-500/20", dot: "bg-blue-400" },
};

export default function TrainManagement() {
    const [trains, setTrains] = useState([]);
    const [filtered, setFiltered] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQ, setSearchQ] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const navigate = useNavigate();

    useEffect(() => {
        (async () => {
            try {
                // Fetch all trains via our new query parameter support
                const data = await api.searchTrains("all");

                const enriched = data.map(t => {
                    const seed = t.trainNumber.split("").reduce((a, b) => a + b.charCodeAt(0), 0);
                    const status = seed % 5 === 0 ? "Delayed" : seed % 7 === 0 ? "Departed" : "Running";
                    return { ...t, status, totalCoaches: t.classes ? Object.keys(t.classes).length * 4 : 14 + (seed % 8) };
                });
                setTrains(enriched);
                setFiltered(enriched);
            } catch (err) {
                console.error("Failed to load trains", err);
            }
            setLoading(false);
        })();
    }, []);

    useEffect(() => {
        let res = trains;
        if (searchQ) res = res.filter(t =>
            t.trainName.toLowerCase().includes(searchQ.toLowerCase()) ||
            t.trainNumber.includes(searchQ)
        );
        if (statusFilter !== "all") res = res.filter(t => t.status === statusFilter);
        setFiltered(res);
    }, [searchQ, statusFilter, trains]);

    const counts = {
        Running: trains.filter(t => t.status === "Running").length,
        Delayed: trains.filter(t => t.status === "Delayed").length,
        Departed: trains.filter(t => t.status === "Departed").length,
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#10b981] to-[#3b82f6] flex items-center justify-center text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h14M5 8a2 2 0 00-2 2v8a2 2 0 002 2h14a2 2 0 002-2v-8a2 2 0 00-2-2H5z" /></svg>
                </div>
                <div>
                    <h1 className="text-2xl md:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">Train Management</h1>
                    <p className="text-gray-400 text-sm mt-1 font-medium tracking-wide">Monitor and manage the active fleet</p>
                </div>
            </div>

            {/* Status filter pills */}
            <div className="flex flex-wrap gap-2">
                {[["all", "All Trains", trains.length, "text-gray-400 bg-white/5 border-white/10"],
                ["Running", "Running", counts.Running, "text-green-400 bg-green-500/8 border-green-500/20"],
                ["Delayed", "Delayed", counts.Delayed, "text-orange-400 bg-orange-500/8 border-orange-500/20"],
                ["Departed", "Departed", counts.Departed, "text-blue-400 bg-blue-500/8 border-blue-500/20"],
                ].map(([val, label, cnt, inactiveCls]) => (
                    <button
                        key={val}
                        onClick={() => setStatusFilter(val)}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold border transition ${statusFilter === val
                            ? val === "all" ? "bg-white/15 text-white border-white/20" : inactiveCls.replace("/8", "/20")
                            : `${inactiveCls} opacity-60 hover:opacity-100`
                            }`}
                    >
                        {label} <span className="ml-1 opacity-70">{cnt}</span>
                    </button>
                ))}
            </div>

            {/* Search */}
            <div className="relative group">
                <input
                    type="text"
                    value={searchQ}
                    onChange={e => setSearchQ(e.target.value)}
                    placeholder="Search train name or number..."
                    className="w-full bg-[#0a1120] text-gray-200 border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-sm font-medium focus:outline-none focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981] transition-all duration-300 shadow-sm group-hover:border-white/20"
                />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 transition-colors group-hover:text-gray-300">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </span>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="bg-[#111827] rounded-2xl h-36 animate-pulse border border-white/5" />
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filtered.map((t, i) => {
                        const cfg = STATUS_CFG[t.status] || STATUS_CFG.Running;
                        return (
                            <div
                                key={i}
                                onClick={() => navigate(`/admin/seats?train=${t.trainNumber}`)}
                                className="bg-[#0a1120] border border-white/5 rounded-2xl p-5 cursor-pointer hover:bg-white/[0.03] hover:border-white/20 hover:-translate-y-1 hover:shadow-xl transition-all duration-300 group relative overflow-hidden"
                            >
                                <div className="absolute -right-4 -top-4 opacity-0 blur-xl w-24 h-24 rounded-full bg-blue-500 transition-all duration-500 group-hover:scale-150 group-hover:opacity-10" />
                                <div className="flex items-start justify-between mb-4">
                                    <div className="w-10 h-10 rounded-xl bg-[#3b82f6]/10 border border-[#3b82f6]/20 flex items-center justify-center text-[#3b82f6] shadow-inner group-hover:bg-[#3b82f6]/20 transition-colors">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h14M5 8a2 2 0 00-2 2v8a2 2 0 002 2h14a2 2 0 002-2v-8a2 2 0 00-2-2H5z" /></svg>
                                    </div>
                                    <span className={`flex items-center gap-1.5 text-[10px] uppercase tracking-wider px-3 py-1 rounded-full border font-bold ${cfg.color}`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} animate-pulse shadow-[0_0_8px_currentColor]`} />
                                        {t.status}
                                    </span>
                                </div>
                                <div className="font-extrabold text-white text-base leading-tight mb-1 group-hover:text-[#10b981] transition-colors">{t.trainName}</div>
                                <div className="text-[11px] font-mono font-semibold text-gray-500 mb-3 bg-white/5 inline-block px-2 py-0.5 rounded border border-white/5">#{t.trainNumber}</div>
                                <div className="text-xs text-gray-300 font-medium truncate flex items-center gap-2">
                                    <span className="truncate">{t.source}</span>
                                    <svg className="w-3 h-3 text-gray-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                    <span className="truncate">{t.destination}</span>
                                </div>
                                <div className="mt-5 pt-4 border-t border-white/5 flex items-center justify-between text-[11px] font-bold text-gray-500">
                                    <span className="flex items-center gap-1.5"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg> {t.totalCoaches} coaches</span>
                                    <span className="text-[#10b981] opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0 flex items-center gap-1">View Seats <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg></span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )
            }

            {
                !loading && filtered.length === 0 && (
                    <div className="text-center py-16 text-gray-500 text-sm">No trains match your filter.</div>
                )
            }
        </div >
    );
}
