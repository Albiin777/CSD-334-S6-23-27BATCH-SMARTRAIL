import { useState, useEffect } from "react";
import { supabase } from "../../utils/supabaseClient";

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
    const [reply, setReply] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => { fetchComplaints(); }, []);

    const fetchComplaints = async () => {
        setLoading(true);
        const { data } = await supabase
            .from("complaints")
            .select("*")
            .order("created_at", { ascending: false });
        if (data) setComplaints(data);
        setLoading(false);
    };

    const updateStatus = async (id, status) => {
        await supabase.from("complaints").update({ status }).eq("id", id);
        setComplaints(prev => prev.map(c => c.id === id ? { ...c, status } : c));
        if (selected?.id === id) setSelected(prev => ({ ...prev, status }));
    };

    const sendReply = async () => {
        if (!reply.trim() || !selected) return;
        setSaving(true);
        await supabase.from("complaints").update({ admin_reply: reply, status: "in-progress" }).eq("id", selected.id);
        setComplaints(prev => prev.map(c => c.id === selected.id ? { ...c, admin_reply: reply, status: "in-progress" } : c));
        setSelected(prev => ({ ...prev, admin_reply: reply, status: "in-progress" }));
        setReply("");
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

                {/* Detail Panel */}
                <div className="bg-[#111827] border border-white/5 rounded-2xl p-5">
                    {!selected ? (
                        <div className="h-full flex items-center justify-center text-gray-500 text-sm py-20">
                            Select a complaint to view details
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-start justify-between gap-3">
                                <h3 className="font-black text-white text-base">{selected.subject || selected.category || "Complaint"}</h3>
                                <div className="flex gap-2 flex-wrap">
                                    {["open", "in-progress", "resolved"].map(s => (
                                        <button
                                            key={s}
                                            onClick={() => updateStatus(selected.id, s)}
                                            className={`text-[10px] px-2.5 py-1 rounded-full font-bold border transition ${selected.status === s ? STATUS_COLORS[s] : "text-gray-500 border-gray-700 hover:border-gray-500"
                                                }`}
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="text-xs text-gray-500">
                                From: <span className="text-gray-300 font-bold">{selected.user_email || selected.email || "Anonymous"}</span>
                                {selected.train_no && <> · Train {selected.train_no}</>}
                            </div>

                            <div className="bg-[#080f1e] rounded-xl p-4 border border-white/5 text-sm text-gray-300">
                                {selected.message || selected.description || "No message provided."}
                            </div>

                            {selected.admin_reply && (
                                <div className="bg-[#4ab86d]/5 border border-[#4ab86d]/15 rounded-xl p-4">
                                    <div className="text-xs text-[#4ab86d] font-bold mb-1">Admin Reply</div>
                                    <div className="text-sm text-gray-200">{selected.admin_reply}</div>
                                </div>
                            )}

                            <div>
                                <textarea
                                    value={reply}
                                    onChange={e => setReply(e.target.value)}
                                    placeholder="Type a reply to the user..."
                                    rows={3}
                                    className="w-full bg-[#080f1e] text-white border border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#4ab86d] transition resize-none"
                                />
                                <div className="flex gap-2 mt-2">
                                    <button
                                        onClick={sendReply}
                                        disabled={saving || !reply.trim()}
                                        className="flex-1 bg-[#4ab86d] hover:bg-[#3da85c] disabled:opacity-40 text-black font-black py-2.5 rounded-xl transition text-sm"
                                    >
                                        {saving ? "Saving..." : "Send Reply & Mark In-Progress"}
                                    </button>
                                    <button
                                        onClick={() => updateStatus(selected.id, "resolved")}
                                        className="px-4 py-2.5 rounded-xl bg-green-500/10 text-green-400 border border-green-500/20 font-bold text-sm hover:bg-green-500/15 transition"
                                    >
                                        ✓ Resolve
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
