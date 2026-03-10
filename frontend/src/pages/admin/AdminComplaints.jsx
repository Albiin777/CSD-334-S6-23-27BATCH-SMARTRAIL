import { useState, useEffect } from "react";
import { db } from "../../utils/firebaseClient";
import { collection, query, getDocs, doc, updateDoc, orderBy, where, addDoc } from "firebase/firestore";

const STATUS_COLORS = {
    open: "text-orange-400 bg-orange-500/10 border-orange-500/20",
    "in-progress": "text-blue-400 bg-blue-500/10 border-blue-500/20",
    resolved: "text-green-400 bg-green-500/10 border-green-500/20",
};

export default function AdminComplaints() {
    const [complaints, setComplaints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("all");
    const [selected, setSelected] = useState(null);
    const [replies, setReplies] = useState([]);
    const [reply, setReply] = useState("");
    const [saving, setSaving] = useState(false);
    const [loadingReplies, setLoadingReplies] = useState(false);

    useEffect(() => { fetchComplaints(); }, []);

    const fetchComplaints = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, "complaints"), orderBy("created_at", "desc"));
            const snap = await getDocs(q);
            setComplaints(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (err) { 
            console.error("Failed to fetch complaints:", err); 
        }
        setLoading(false);
    };

    const fetchReplies = async (complaintId) => {
        setLoadingReplies(true);
        try {
            const q = query(
                collection(db, "complaint_replies"), 
                where("complaint_id", "==", complaintId),
                orderBy("created_at", "asc")
            );
            const snap = await getDocs(q);
            setReplies(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (err) {
            console.error("Failed to fetch replies:", err);
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

    const updateStatus = async (id, status) => {
        try {
            await updateDoc(doc(db, "complaints", id), { status });
            setComplaints(prev => prev.map(c => c.id === id ? { ...c, status } : c));
            if (selected?.id === id) setSelected(prev => ({ ...prev, status }));
        } catch (err) { 
            console.error("Failed to update status:", err); 
        }
    };

    const sendReply = async (newStatus = "in-progress") => {
        if (!reply.trim() || !selected) return;
        setSaving(true);
        try {
            const now = new Date().toISOString();
            
            // 1. Add to chat history (complaint_replies)
            const replyData = {
                complaint_id: selected.id,
                message: reply.trim(),
                is_admin_reply: true,
                marks_resolved: newStatus === "resolved",
                created_at: now
            };
            await addDoc(collection(db, "complaint_replies"), replyData);

            // 2. Update complaint status
            const updates = { 
                status: newStatus,
                updated_at: now
            };
            await updateDoc(doc(db, "complaints", selected.id), updates);
            
            // 3. Refresh UI
            setComplaints(prev => prev.map(c => c.id === selected.id ? { ...c, ...updates } : c));
            setSelected(prev => ({ ...prev, ...updates }));
            setReplies(prev => [...prev, { id: "temp-" + Date.now(), ...replyData }]);
            setReply("");
        } catch (err) { 
            console.error("Failed to send reply:", err); 
        }
        setSaving(false);
    };

    const filtered = filter === "all" ? complaints : complaints.filter(c => c.status === filter);

    return (
        <div className="space-y-5">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#10b981] to-[#3b82f6] flex items-center justify-center text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                </div>
                <div>
                    <h1 className="text-2xl md:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">Complaints</h1>
                    <p className="text-gray-400 text-sm mt-1 font-medium tracking-wide">Manage user feedback</p>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 flex-wrap">
                {["all", "open", "in-progress", "resolved"].map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold border transition ${filter === f ? "bg-[#4ab86d] text-black border-[#4ab86d]" : "bg-white/5 text-gray-400 border-white/10 hover:bg-white/10"
                            }`}
                    >
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                        <span className="ml-1.5 opacity-60">
                            {f === "all" ? complaints.length : complaints.filter(c => c.status === f).length}
                        </span>
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* List */}
                <div className="bg-[#111827] border border-white/5 rounded-2xl overflow-hidden">
                    {loading ? (
                        <div className="p-10 text-center text-gray-500">Loading complaints...</div>
                    ) : filtered.length === 0 ? (
                        <div className="p-10 text-center text-gray-500 text-sm">No complaints found.</div>
                    ) : (
                        <div className="divide-y divide-white/5 max-h-[70vh] overflow-y-auto">
                            {filtered.map(c => (
                                <button
                                    key={c.id}
                                    onClick={() => { setSelected(c); setReply(""); }}
                                    className={`w-full text-left px-5 py-4 hover:bg-white/3 transition ${selected?.id === c.id ? "bg-[#4ab86d]/5 border-l-2 border-[#4ab86d]" : ""}`}
                                >
                                    <div className="flex items-start justify-between gap-2 mb-1">
                                        <div className="font-bold text-white text-sm truncate">{c.subject || c.category || "Complaint"}</div>
                                        <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full border font-bold ${STATUS_COLORS[c.status] || STATUS_COLORS.open}`}>
                                            {c.status || "open"}
                                        </span>
                                    </div>
                                    <div className="text-xs text-gray-400 line-clamp-2">{c.message || c.description || "No message"}</div>
                                    <div className="text-[10px] text-gray-600 mt-2 flex gap-2">
                                        <span>{c.user_email || c.email || "Anonymous"}</span>
                                        <span>·</span>
                                        <span>{c.created_at ? new Date(c.created_at).toLocaleDateString("en-IN") : ""}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="bg-[#111827] border border-white/5 rounded-2xl flex flex-col h-[75vh]">
                    {!selected ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-500 text-sm gap-4">
                            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center opacity-20">
                                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                            </div>
                            Select a complaint to start conversation
                        </div>
                    ) : (
                        <>
                            {/* Header */}
                            <div className="p-5 border-b border-white/5">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <h3 className="font-black text-white text-base leading-tight mb-1">{selected.subject || selected.category || "Complaint"}</h3>
                                        <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                                            From: <span className="text-gray-300">{selected.user_email || selected.email || "Anonymous"}</span>
                                            {selected.train_no && <span className="ml-2 font-mono bg-white/5 px-1.5 py-0.5 rounded border border-white/5">Train {selected.train_no}</span>}
                                        </div>
                                    </div>
                                    <span className={`shrink-0 text-[10px] px-3 py-1 rounded-full border font-black uppercase tracking-widest ${STATUS_COLORS[selected.status] || STATUS_COLORS.open}`}>
                                        {selected.status || "open"}
                                    </span>
                                </div>
                            </div>

                            {/* Chat History */}
                            <div className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-hide">
                                {/* Initial Complaint Message */}
                                <div className="flex gap-4">
                                    <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-xs text-gray-500 shrink-0 font-bold">👤</div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">User Request</span>
                                            <span className="text-[9px] text-gray-600 font-mono italic">{new Date(selected.created_at).toLocaleString()}</span>
                                        </div>
                                        <div className="bg-white/5 border border-white/10 rounded-2xl rounded-tl-sm p-4 text-sm text-gray-300 leading-relaxed max-w-[85%]">
                                            {selected.message || selected.description || "No description provided."}
                                            {selected.images?.length > 0 && (
                                                <div className="grid grid-cols-2 gap-2 mt-4">
                                                    {selected.images.map((url, i) => (
                                                        <a key={i} href={url} target="_blank" rel="noreferrer" className="aspect-square rounded-lg overflow-hidden border border-white/5 hover:border-[#4ab86d]/30 transition">
                                                            <img src={url} className="w-full h-full object-cover" alt="attachment" />
                                                        </a>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Replies */}
                                {loadingReplies ? (
                                    <div className="flex items-center justify-center py-10 opacity-40">
                                        <div className="w-4 h-4 border-2 border-[#4ab86d] border-t-transparent rounded-full animate-spin"></div>
                                    </div>
                                ) : replies.length === 0 ? (
                                    <div className="text-center py-10">
                                        <div className="text-[10px] font-black text-gray-600 uppercase tracking-[0.3em]">Waiting for Response</div>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        {replies.map((r, i) => (
                                            <div key={r.id || i} className={`flex gap-4 ${r.is_admin_reply ? "flex-row-reverse" : ""}`}>
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs shrink-0 font-bold ${
                                                    r.is_admin_reply ? "bg-[#4ab86d]/20 text-[#4ab86d] border border-[#4ab86d]/20" : "bg-white/5 text-gray-500 border border-white/10"
                                                }`}>
                                                    {r.is_admin_reply ? "🛡️" : "👤"}
                                                </div>
                                                <div className={`flex-1 flex flex-col ${r.is_admin_reply ? "items-end" : "items-start"}`}>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                                            {r.is_admin_reply ? "Support Representative" : "User Follow-up"}
                                                        </span>
                                                        <span className="text-[9px] text-gray-600 font-mono italic">
                                                            {new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                    <div className={`p-4 text-sm leading-relaxed max-w-[85%] rounded-2xl ${
                                                        r.is_admin_reply 
                                                        ? "bg-[#4ab86d]/10 border border-[#4ab86d]/20 text-gray-200 rounded-tr-sm" 
                                                        : "bg-white/5 border border-white/10 text-gray-300 rounded-tl-sm"
                                                    }`}>
                                                        {r.message}
                                                    </div>
                                                    {r.marks_resolved && (
                                                        <div className="mt-2 text-[9px] font-black uppercase text-[#4ab86d] bg-[#4ab86d]/5 px-2 py-0.5 rounded border border-[#4ab86d]/10">
                                                            Resolution Applied
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Input Area */}
                            <div className="p-5 border-t border-white/5 bg-white/[0.01]">
                                {selected.status === 'resolved' ? (
                                    <div className="text-center py-2 text-[10px] font-black uppercase tracking-widest text-gray-500 opacity-60 italic">
                                        Case resolved. Replies disabled.
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <textarea
                                            value={reply}
                                            onChange={e => setReply(e.target.value)}
                                            placeholder="Write your message to the user..."
                                            rows={3}
                                            className="w-full bg-[#080f1e] text-white border border-gray-700 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-[#4ab86d] transition resize-none placeholder:text-gray-600"
                                        />
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                onClick={() => sendReply("in-progress")}
                                                disabled={saving || !reply.trim()}
                                                className="flex flex-col items-center justify-center bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-600/20 disabled:opacity-30 p-2.5 rounded-xl transition"
                                            >
                                                <span className="text-[11px] font-black uppercase">Send Message</span>
                                                <span className="text-[8px] opacity-60 font-medium mt-0.5 tracking-tighter">Stay In-Progress</span>
                                            </button>
                                            <button
                                                onClick={() => sendReply("resolved")}
                                                disabled={saving || !reply.trim()}
                                                className="flex flex-col items-center justify-center bg-[#4ab86d]/10 hover:bg-[#4ab86d]/20 text-[#4ab86d] border border-[#4ab86d]/20 disabled:opacity-30 p-2.5 rounded-xl transition"
                                            >
                                                <span className="text-[11px] font-black uppercase">Resolve Issue</span>
                                                <span className="text-[8px] opacity-60 font-medium mt-0.5 tracking-tighter">Close Conversation</span>
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
