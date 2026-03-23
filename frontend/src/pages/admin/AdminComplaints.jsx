import { useState, useEffect } from "react";
import { auth } from "../../utils/firebaseClient";
import { API_BASE_URL } from "../../api/config";
import { Train, MessageSquare, Search, X, CheckCircle2, Clock, AlertCircle, Send, Loader2, Filter } from "lucide-react";

const STATUS_COLORS = {
    open: "text-orange-400 bg-orange-500/10 border-orange-500/20",
    "in-progress": "text-blue-400 bg-blue-500/10 border-blue-500/20",
    in_progress: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    resolved: "text-green-400 bg-green-500/10 border-green-500/20",
    closed: "text-gray-400 bg-gray-500/10 border-gray-500/20",
};

const statusLabel = { open: "Open", "in-progress": "In Progress", in_progress: "In Progress", resolved: "Resolved", closed: "Closed" };

const StatusIcon = ({ s }) => {
    if (s === "resolved" || s === "closed") return <CheckCircle2 size={11} />;
    if (s === "in-progress" || s === "in_progress") return <Clock size={11} />;
    return <AlertCircle size={11} />;
};

export default function AdminComplaints() {
    const [complaints, setComplaints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("all");
    const [trainFilter, setTrainFilter] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [selected, setSelected] = useState(null);
    const [replies, setReplies] = useState([]);
    const [reply, setReply] = useState("");
    const [saving, setSaving] = useState(false);
    const [loadingReplies, setLoadingReplies] = useState(false);
    const [markResolved, setMarkResolved] = useState(false);

    useEffect(() => { fetchComplaints(); }, []);

    const getToken = async () => {
        const token = await auth.currentUser?.getIdToken();
        if (!token) throw new Error("Not authenticated");
        return token;
    };

    const fetchComplaints = async () => {
        setLoading(true);
        try {
            const token = await getToken();
            const res = await fetch(`${API_BASE_URL}/complaints/admin/all`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setComplaints(data);
            } else {
                console.error("Failed to fetch complaints:", await res.text());
            }
        } catch (err) {
            console.error("Failed to fetch complaints:", err);
        }
        setLoading(false);
    };

    const fetchReplies = async (complaintId) => {
        setLoadingReplies(true);
        try {
            const token = await getToken();
            const res = await fetch(`${API_BASE_URL}/complaints/${complaintId}/replies/admin`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setReplies(data.replies || []);
            } else {
                setReplies([]);
            }
        } catch (err) {
            setReplies([]);
        }
        setLoadingReplies(false);
    };

    useEffect(() => {
        if (selected?.id) {
            fetchReplies(selected.id);
        } else {
            setReplies([]);
        }
    }, [selected]);

    const sendReply = async () => {
        if (!reply.trim() || !selected) return;
        setSaving(true);
        try {
            const token = await getToken();
            const newStatus = markResolved ? "resolved" : "in-progress";
            const res = await fetch(`${API_BASE_URL}/complaints/${selected.id}/replies/admin`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ message: reply.trim(), marks_resolved: markResolved, new_status: newStatus }),
            });
            if (res.ok) {
                const data = await res.json();
                const newReply = data.reply;
                setReplies(prev => [...prev, newReply]);
                setComplaints(prev => prev.map(c => c.id === selected.id ? { ...c, status: newStatus } : c));
                setSelected(prev => ({ ...prev, status: newStatus }));
                setReply("");
                setMarkResolved(false);
            }
        } catch (err) {
            console.error("Failed to send reply:", err);
        }
        setSaving(false);
    };

    // Unique train numbers for the filter dropdown
    const trainNumbers = [...new Set(complaints.map(c => c.train_number).filter(Boolean))];

    // Apply all filters
    const filtered = complaints.filter(c => {
        const statusMatch = filter === "all" || c.status === filter;
        const trainMatch = !trainFilter || c.train_number === trainFilter;
        const searchMatch = !searchQuery.trim() ||
            (c.subject || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
            (c.description || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
            (c.id || "").toLowerCase().includes(searchQuery.toLowerCase());
        return statusMatch && trainMatch && searchMatch;
    });

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#10b981] to-[#3b82f6] flex items-center justify-center text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                    <MessageSquare className="w-6 h-6" />
                </div>
                <div>
                    <h1 className="text-2xl md:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">Complaints</h1>
                    <p className="text-gray-400 text-sm mt-1 font-medium tracking-wide">Manage all passenger complaints</p>
                </div>
                <button onClick={fetchComplaints} className="ml-auto px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold rounded-xl transition flex items-center gap-2">
                    <Loader2 className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    { label: "Total", val: complaints.length, color: "text-white" },
                    { label: "Open", val: complaints.filter(c => c.status === "open").length, color: "text-orange-400" },
                    { label: "In Progress", val: complaints.filter(c => ["in-progress", "in_progress"].includes(c.status)).length, color: "text-blue-400" },
                    { label: "Resolved", val: complaints.filter(c => ["resolved", "closed"].includes(c.status)).length, color: "text-green-400" },
                ].map(s => (
                    <div key={s.label} className="bg-[#111827] border border-white/5 rounded-xl p-4 text-center">
                        <p className={`text-2xl font-extrabold ${s.color}`}>{s.val}</p>
                        <p className="text-[10px] text-gray-500 uppercase font-bold mt-1">{s.label}</p>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="bg-[#111827] border border-white/5 rounded-xl p-4 flex flex-wrap items-center gap-3">
                {/* Search */}
                <div className="flex items-center bg-[#080f1e] rounded-lg px-3 py-2 gap-2 flex-1 min-w-[200px] border border-white/5">
                    <Search size={14} className="text-gray-500 flex-shrink-0" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search subject, description…"
                        className="bg-transparent text-sm text-white placeholder:text-gray-600 outline-none w-full"
                    />
                </div>

                {/* Status filter */}
                <select
                    value={filter}
                    onChange={e => setFilter(e.target.value)}
                    className="bg-[#080f1e] text-white text-xs font-semibold px-3 py-2 rounded-lg border border-white/5 outline-none"
                >
                    {["all", "open", "in-progress", "resolved", "closed"].map(f => (
                        <option key={f} value={f}>{f === "all" ? "All Status" : statusLabel[f] || f}</option>
                    ))}
                </select>

                {/* Train filter */}
                {trainNumbers.length > 0 && (
                    <select
                        value={trainFilter}
                        onChange={e => setTrainFilter(e.target.value)}
                        className="bg-[#080f1e] text-white text-xs font-semibold px-3 py-2 rounded-lg border border-white/5 outline-none flex items-center gap-2"
                    >
                        <option value="">All Trains</option>
                        {trainNumbers.map(tn => (
                            <option key={tn} value={tn}>Train #{tn}</option>
                        ))}
                    </select>
                )}

                {(trainFilter || filter !== "all" || searchQuery) && (
                    <button
                        onClick={() => { setTrainFilter(""); setFilter("all"); setSearchQuery(""); }}
                        className="flex items-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/5 text-gray-300 text-xs font-bold rounded-lg transition"
                    >
                        <X size={12} /> Clear
                    </button>
                )}

                <span className="text-xs text-gray-500 ml-auto font-mono">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Complaints List */}
                <div className="bg-[#111827] border border-white/5 rounded-2xl overflow-hidden">
                    {loading ? (
                        <div className="p-10 text-center text-gray-500 flex items-center justify-center gap-3">
                            <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                            Loading complaints…
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="p-10 text-center text-gray-500 text-sm">No complaints found.</div>
                    ) : (
                        <div className="divide-y divide-white/5 max-h-[70vh] overflow-y-auto">
                            {filtered.map(c => {
                                const s = (c.status || "open").toLowerCase();
                                return (
                                    <button
                                        key={c.id}
                                        onClick={() => { setSelected(c); setReply(""); setMarkResolved(false); }}
                                        className={`w-full text-left px-5 py-4 hover:bg-white/3 transition ${selected?.id === c.id ? "bg-[#4ab86d]/5 border-l-2 border-[#4ab86d]" : ""}`}
                                    >
                                        <div className="flex items-start justify-between gap-2 mb-1">
                                            <div className="font-bold text-white text-sm truncate">{c.subject || "Complaint"}</div>
                                            <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full border font-bold flex items-center gap-1 ${STATUS_COLORS[s] || STATUS_COLORS.open}`}>
                                                <StatusIcon s={s} /> {statusLabel[s] || s}
                                            </span>
                                        </div>
                                        <div className="text-xs text-gray-400 line-clamp-2 mb-2">{c.description || "No description"}</div>
                                        <div className="flex items-center gap-2 text-[10px] text-gray-600 flex-wrap">
                                            {c.train_number && (
                                                <span className="flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded font-bold text-gray-400">
                                                    <Train size={9} /> #{c.train_number}
                                                </span>
                                            )}
                                            <span>{c.created_at ? new Date(c.created_at).toLocaleDateString("en-IN") : ""}</span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Detail / Reply Panel */}
                <div className="bg-[#111827] border border-white/5 rounded-2xl flex flex-col h-[75vh]">
                    {!selected ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-500 text-sm gap-4">
                            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center opacity-20">
                                <MessageSquare className="w-8 h-8" />
                            </div>
                            Select a complaint to start conversation
                        </div>
                    ) : (
                        <>
                            {/* Header */}
                            <div className="p-5 border-b border-white/5">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <h3 className="font-black text-white text-base leading-tight mb-1 truncate">{selected.subject || "Complaint"}</h3>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold flex items-center gap-1 ${STATUS_COLORS[(selected.status || "open").toLowerCase()] || STATUS_COLORS.open}`}>
                                                <StatusIcon s={(selected.status || "open").toLowerCase()} />
                                                {statusLabel[(selected.status || "open").toLowerCase()] || selected.status}
                                            </span>
                                            {selected.train_number && (
                                                <span className="text-[10px] font-mono bg-white/5 px-2 py-0.5 rounded border border-white/5 text-gray-400 flex items-center gap-1">
                                                    <Train size={9} /> Train #{selected.train_number}
                                                    {selected.train_name && ` – ${selected.train_name}`}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <button onClick={() => setSelected(null)} className="p-2 hover:bg-white/10 rounded-full transition">
                                        <X className="w-4 h-4 text-gray-400" />
                                    </button>
                                </div>
                            </div>

                            {/* Chat Thread */}
                            <div className="flex-1 overflow-y-auto p-5 space-y-5 scrollbar-hide">
                                {/* Original complaint */}
                                <div className="flex gap-4">
                                    <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-xs text-gray-500 shrink-0">👤</div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Passenger</span>
                                            <span className="text-[9px] text-gray-600 font-mono">{new Date(selected.created_at).toLocaleString("en-IN")}</span>
                                        </div>
                                        <div className="bg-white/5 border border-white/10 rounded-2xl rounded-tl-sm p-4 text-sm text-gray-300 leading-relaxed max-w-[90%]">
                                            {selected.description}
                                            {selected.images?.length > 0 && (
                                                <div className="grid grid-cols-2 gap-2 mt-3">
                                                    {selected.images.map((url, i) => (
                                                        <a key={i} href={url} target="_blank" rel="noreferrer" className="aspect-square rounded-lg overflow-hidden border border-white/10 hover:border-white/30 transition">
                                                            <img src={url} className="w-full h-full object-cover" alt="evidence" />
                                                        </a>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Replies */}
                                {loadingReplies ? (
                                    <div className="flex items-center justify-center py-6 opacity-40">
                                        <div className="w-4 h-4 border-2 border-[#4ab86d] border-t-transparent rounded-full animate-spin" />
                                    </div>
                                ) : replies.map((r, i) => (
                                    <div key={r.id || i} className={`flex gap-4 ${r.is_admin_reply ? "flex-row-reverse" : ""}`}>
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs shrink-0 font-bold ${r.is_admin_reply ? "bg-[#4ab86d]/20 text-[#4ab86d] border border-[#4ab86d]/20" : "bg-white/5 text-gray-500 border border-white/10"}`}>
                                            {r.is_admin_reply ? "🛡️" : "👤"}
                                        </div>
                                        <div className={`flex-1 flex flex-col ${r.is_admin_reply ? "items-end" : "items-start"}`}>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                                    {r.is_admin_reply ? "Support Team" : "Passenger"}
                                                </span>
                                                <span className="text-[9px] text-gray-600 font-mono italic">
                                                    {new Date(r.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                                </span>
                                            </div>
                                            <div className={`p-4 text-sm leading-relaxed max-w-[85%] rounded-2xl ${r.is_admin_reply ? "bg-[#4ab86d]/10 border border-[#4ab86d]/20 text-gray-200 rounded-tr-sm" : "bg-white/5 border border-white/10 text-gray-300 rounded-tl-sm"}`}>
                                                {r.message}
                                            </div>
                                            {r.marks_resolved && (
                                                <div className="mt-1.5 text-[9px] font-black uppercase text-[#4ab86d] bg-[#4ab86d]/5 px-2 py-0.5 rounded border border-[#4ab86d]/10">
                                                    ✓ Marked Resolved
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Input */}
                            <div className="p-5 border-t border-white/5 bg-white/[0.01]">
                                {["resolved", "closed"].includes((selected.status || "").toLowerCase()) ? (
                                    <div className="text-center py-2 text-[10px] font-black uppercase tracking-widest text-gray-500 italic">
                                        Case resolved. Replies disabled.
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <textarea
                                            value={reply}
                                            onChange={e => setReply(e.target.value)}
                                            placeholder="Write your message to the passenger…"
                                            rows={3}
                                            className="w-full bg-[#080f1e] text-white border border-gray-700 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-[#4ab86d] transition resize-none placeholder:text-gray-600"
                                        />
                                        <div className="flex items-center justify-between gap-3">
                                            <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer hover:text-gray-300 transition">
                                                <input
                                                    type="checkbox"
                                                    checked={markResolved}
                                                    onChange={e => setMarkResolved(e.target.checked)}
                                                    className="w-3.5 h-3.5 rounded border-gray-600 bg-[#080f1e] text-green-500"
                                                />
                                                Mark as resolved
                                            </label>
                                            <button
                                                onClick={sendReply}
                                                disabled={saving || !reply.trim()}
                                                className="flex items-center gap-2 px-5 py-2.5 bg-[#4ab86d] hover:bg-[#3da861] text-black rounded-xl text-xs font-black uppercase transition disabled:opacity-40 disabled:cursor-not-allowed"
                                            >
                                                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send size={12} />}
                                                {markResolved ? "Send & Resolve" : "Send Reply"}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
