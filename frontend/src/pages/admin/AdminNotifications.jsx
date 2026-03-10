import { useState, useEffect } from "react";
import { db } from "../../utils/firebaseClient";
import { collection, query, getDocs, addDoc, deleteDoc, doc, orderBy, limit } from "firebase/firestore";

export default function AdminNotifications() {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState({ title: "", message: "", type: "info", target: "all", link: "" });
    const [sending, setSending] = useState(false);
    const [success, setSuccess] = useState(false);
    const [editingId, setEditingId] = useState(null);

    useEffect(() => { fetchNotifications(); }, []);

    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, "notifications"), orderBy("created_at", "desc"), limit(50));
            const snap = await getDocs(q);
            setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (err) {
            console.error("Fetch notifications error:", err);
        }
        setLoading(false);
    };

    const sendNotification = async (e) => {
        e.preventDefault();
        if (!form.title.trim() || !form.message.trim()) return;
        setSending(true);

        try {
            const notifData = {
                title: form.title,
                message: form.message,
                type: form.type,
                target: form.target,
                link: form.link || null,
                userId: null, 
                is_read: false,
                for_you: false,
                updated_at: new Date().toISOString()
            };

            if (editingId) {
                await updateDoc(doc(db, "notifications", editingId), notifData);
                setSuccess(true);
            } else {
                notifData.created_at = new Date().toISOString();
                await addDoc(collection(db, "notifications"), notifData);
                setSuccess(true);
            }

            setForm({ title: "", message: "", type: "info", target: "all", link: "" });
            setEditingId(null);
            fetchNotifications();
            setTimeout(() => setSuccess(false), 3000);
        } catch (error) {
            console.error("Failed to save notification:", error);
        }
        setSending(false);
    };

    const editNotification = (n) => {
        setForm({
            title: n.title || "",
            message: n.message || "",
            type: n.type || "info",
            target: n.target || "all",
            link: n.link || ""
        });
        setEditingId(n.id);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const cancelEdit = () => {
        setForm({ title: "", message: "", type: "info", target: "all", link: "" });
        setEditingId(null);
    };

    const deleteNotification = async (id) => {
        try {
            await deleteDoc(doc(db, "notifications", id));
            setNotifications(prev => prev.filter(n => n.id !== id));
        } catch (err) {
            console.error("Delete notification error:", err);
        }
    };

    const TYPE_STYLES = {
        info: "border-blue-500/20 text-blue-400 bg-blue-500/8",
        warning: "border-orange-500/20 text-orange-400 bg-orange-500/8",
        alert: "border-red-500/20 text-red-400 bg-red-500/8",
        success: "border-green-500/20 text-green-400 bg-green-500/8",
    };
    const TYPE_ICONS = { info: "ℹ️", warning: "⚠️", alert: "🚨", success: "✅" };

    return (
        <div className="space-y-5">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#10b981] to-[#3b82f6] flex items-center justify-center text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                </div>
                <div>
                    <h1 className="text-2xl md:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">Notifications</h1>
                    <p className="text-gray-400 text-sm mt-1 font-medium tracking-wide">Broadcast alerts across the network</p>
                </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
                {/* Compose Form */}
                <div className="lg:col-span-2">
                    <form onSubmit={sendNotification} className="bg-[#111827] border border-white/5 rounded-2xl p-5 space-y-4 sticky top-4">
                        <div className="flex items-center justify-between">
                            <h2 className="font-bold text-white">{editingId ? "Edit Notification" : "Send Notification"}</h2>
                            {editingId && (
                                <button 
                                    type="button" 
                                    onClick={cancelEdit}
                                    className="text-[10px] font-black uppercase text-red-400 hover:text-red-300 transition"
                                >
                                    Cancel Edit
                                </button>
                            )}
                        </div>

                        {/* Custom Success Toast Popup to avoid browser alerts */}
                        {success && (
                            <div className="fixed bottom-6 right-6 bg-[#111827] border-l-4 border-green-500 shadow-2xl rounded-lg p-4 z-50 animate-bounce flex items-center gap-3 w-80">
                                <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center text-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)]">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                </div>
                                <div>
                                    <div className="text-white font-bold text-sm">Success</div>
                                    <div className="text-gray-400 text-xs">Notification published successfully!</div>
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="text-xs text-gray-500 font-bold uppercase tracking-wide block mb-1.5">Type</label>
                            <div className="grid grid-cols-2 gap-2">
                                {["info", "warning", "alert", "success"].map(t => (
                                    <button
                                        key={t}
                                        type="button"
                                        onClick={() => setForm(f => ({ ...f, type: t }))}
                                        className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-bold transition ${form.type === t ? TYPE_STYLES[t] : "bg-white/3 border-white/5 text-gray-400 hover:bg-white/8"
                                            }`}
                                    >
                                        <span>{TYPE_ICONS[t]}</span>
                                        <span className="capitalize">{t}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="text-xs text-gray-500 font-bold uppercase tracking-wide block mb-1.5">Target Audience</label>
                            <select
                                value={form.target}
                                onChange={e => setForm(f => ({ ...f, target: e.target.value }))}
                                className="w-full bg-[#080f1e] text-white border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#4ab86d] transition"
                            >
                                <option value="all">All Users</option>
                                <option value="passengers">Passengers</option>
                                <option value="ttes">TTEs only</option>
                            </select>
                        </div>

                        <div>
                            <label className="text-xs text-gray-500 font-bold uppercase tracking-wide block mb-1.5">Title</label>
                            <input
                                type="text"
                                value={form.title}
                                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                                placeholder="e.g. Service Disruption on Route CLT-SRR"
                                className="w-full bg-[#080f1e] text-white border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#4ab86d] transition"
                                required
                            />
                        </div>

                        <div>
                            <label className="text-xs text-gray-500 font-bold uppercase tracking-wide block mb-1.5">Action Link (Optional)</label>
                            <input
                                type="text"
                                value={form.link}
                                onChange={e => setForm(f => ({ ...f, link: e.target.value }))}
                                placeholder="e.g. /results or https://external-link.com"
                                className="w-full bg-[#080f1e] text-white border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#4ab86d] transition"
                            />
                        </div>

                        <div>
                            <label className="text-xs text-gray-500 font-bold uppercase tracking-wide block mb-1.5">Message</label>
                            <textarea
                                value={form.message}
                                onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                                placeholder="Write the notification message..."
                                rows={4}
                                className="w-full bg-[#080f1e] text-white border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#4ab86d] transition resize-none"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={sending}
                            className={`w-full ${editingId ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-[#4ab86d] hover:bg-[#3da85c] text-black'} disabled:opacity-50 font-black py-3 rounded-xl transition flex items-center justify-center gap-2`}
                        >
                            {sending ? "Saving..." : (
                                <span className="flex items-center gap-2 justify-center">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                                    {editingId ? "Update Changes" : "Send Notification"}
                                </span>
                            )}
                        </button>
                    </form>
                </div>

                <div className="lg:col-span-3 bg-[#111827] border border-white/5 rounded-2xl overflow-hidden flex flex-col">
                    <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
                        <h2 className="font-bold text-white uppercase text-xs tracking-widest opacity-70">
                            Sent History <span className="text-[#10b981] ml-2">({notifications.length})</span>
                        </h2>
                        <button onClick={fetchNotifications} className="text-[10px] font-bold text-gray-400 hover:text-white transition uppercase">Refresh</button>
                    </div>

                    <div className="flex-1 overflow-x-auto overflow-y-auto max-h-[75vh] scrollbar-hide">
                        {loading ? (
                            <div className="p-12 text-center text-gray-500 flex flex-col items-center gap-3">
                                <div className="w-5 h-5 border-2 border-[#10b981] border-t-transparent rounded-full animate-spin"></div>
                                <span className="text-xs font-bold uppercase tracking-wider">Syncing with Cloud...</span>
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="p-12 text-center text-gray-500 text-sm italic font-medium">
                                No broadcast records found in this sequence.
                            </div>
                        ) : (
                            <table className="w-full text-left border-collapse min-w-[700px]">
                                <thead className="bg-white/[0.02] border-b border-white/5 sticky top-0 z-10 backdrop-blur-md">
                                    <tr className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                                        <th className="px-5 py-4">ID</th>
                                        <th className="px-3 py-4 text-center">Type</th>
                                        <th className="px-3 py-4 text-center">Target</th>
                                        <th className="px-3 py-4">Title & Message</th>
                                        <th className="px-4 py-4">Created At</th>
                                        <th className="px-5 py-4 text-right"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {notifications.map((n) => (
                                        <tr key={n.id} className="group hover:bg-white/[0.03] transition-colors border-l-2 border-l-transparent hover:border-l-[#10b981]">
                                            <td className="px-5 py-4">
                                                <div className="font-mono text-[9px] text-gray-600 bg-white/3 px-1.5 py-0.5 rounded w-fit">
                                                    {n.id.slice(0, 8)}...
                                                </div>
                                            </td>
                                            <td className="px-3 py-4 text-center">
                                                <span className={`text-base shadow-sm`} title={n.type}>
                                                    {TYPE_ICONS[n.type] || "ℹ️"}
                                                </span>
                                            </td>
                                            <td className="px-3 py-4 text-center">
                                                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                                                    n.target === 'all' ? 'text-blue-400 border-blue-500/20 bg-blue-500/5' :
                                                    n.target === 'ttes' ? 'text-purple-400 border-purple-500/20 bg-purple-500/5' :
                                                    'text-orange-400 border-orange-500/20 bg-orange-500/5'
                                                }`}>
                                                    {n.target || "all"}
                                                </span>
                                            </td>
                                            <td className="px-3 py-4 max-w-xs">
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <div className="font-bold text-white text-xs truncate" title={n.title}>{n.title}</div>
                                                    {n.link && (
                                                        <span className="text-blue-400 text-[10px]" title={n.link}>🔗</span>
                                                    )}
                                                </div>
                                                <div className="text-[10px] text-gray-400 truncate opacity-60" title={n.message}>{n.message}</div>
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap">
                                                <div className="text-[10px] text-gray-300 font-medium">
                                                    {n.created_at ? new Date(n.created_at).toLocaleDateString("en-IN", { day: '2-digit', month: 'short' }) : "—"}
                                                </div>
                                                <div className="text-[9px] text-gray-600 font-bold uppercase mt-0.5">
                                                    {n.created_at ? new Date(n.created_at).toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit' }) : ""}
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                                    <button
                                                        onClick={() => editNotification(n)}
                                                        className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-600 hover:text-blue-400 hover:bg-blue-500/10 transition-all"
                                                        title="Edit notification"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                    </button>
                                                    <button
                                                        onClick={() => deleteNotification(n.id)}
                                                        className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
                                                        title="Permanently remove from collection"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
