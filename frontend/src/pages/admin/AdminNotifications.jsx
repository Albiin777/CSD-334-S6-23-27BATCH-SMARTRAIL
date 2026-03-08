import { useState, useEffect } from "react";
import { supabase } from "../../utils/supabaseClient";

export default function AdminNotifications() {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState({ title: "", message: "", type: "info", target: "all" });
    const [sending, setSending] = useState(false);
    const [success, setSuccess] = useState(false);

    useEffect(() => { fetchNotifications(); }, []);

    const fetchNotifications = async () => {
        setLoading(true);
        const { data } = await supabase
            .from("notifications")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(50);
        if (data) setNotifications(data);
        setLoading(false);
    };

    const sendNotification = async (e) => {
        e.preventDefault();
        if (!form.title.trim() || !form.message.trim()) return;
        setSending(true);

        // Supabase `notifications` table only expects `message` and `type`
        // We will combine Title and Message to preserve context cleanly.
        const fullMessage = `${form.title}: ${form.message}`;

        const { error } = await supabase.from("notifications").insert({
            message: fullMessage,
            type: form.type,
            // target_audience and sent_by don't exist in the current DB schema.
        });

        if (!error) {
            setSuccess(true);
            setForm({ title: "", message: "", type: "info", target: "all" });
            fetchNotifications();
            setTimeout(() => setSuccess(false), 3000);
        } else {
            console.error("Failed to send notification:", error);
            // Optionally set an error state here
        }
        setSending(false);
    };

    const deleteNotification = async (id) => {
        await supabase.from("notifications").delete().eq("id", id);
        setNotifications(prev => prev.filter(n => n.id !== id));
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
                        <h2 className="font-bold text-white">Send Notification</h2>

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
                            className="w-full bg-[#4ab86d] hover:bg-[#3da85c] disabled:opacity-50 text-black font-black py-3 rounded-xl transition flex items-center justify-center gap-2"
                        >
                            {sending ? "Sending..." : (
                                <span className="flex items-center gap-2 justify-center">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                                    Send Notification
                                </span>
                            )}
                        </button>
                    </form>
                </div>

                {/* Sent History */}
                <div className="lg:col-span-3 bg-[#111827] border border-white/5 rounded-2xl overflow-hidden">
                    <div className="px-5 py-4 border-b border-white/5">
                        <h2 className="font-bold text-white">Sent Notifications <span className="text-xs text-gray-500 font-normal ml-2">({notifications.length})</span></h2>
                    </div>
                    {loading ? (
                        <div className="p-10 text-center text-gray-500 text-sm">Loading...</div>
                    ) : notifications.length === 0 ? (
                        <div className="p-10 text-center text-gray-500 text-sm">No notifications sent yet.</div>
                    ) : (
                        <div className="divide-y divide-white/5 max-h-[75vh] overflow-y-auto">
                            {notifications.map(n => {
                                // Extract pseudo-title since DB only stores message
                                const splitIdx = n.message?.indexOf(': ') ?? -1;
                                const title = splitIdx !== -1 ? n.message.substring(0, splitIdx) : "Notification";
                                const actualMsg = splitIdx !== -1 ? n.message.substring(splitIdx + 2) : n.message;

                                return (
                                    <div key={n.id} className={`flex gap-4 px-5 py-4 border-l-2 ${n.type === "alert" ? "border-red-500" :
                                        n.type === "warning" ? "border-orange-500" :
                                            n.type === "success" ? "border-green-500" : "border-blue-500"
                                        }`}>
                                        <span className="text-xl shrink-0">{TYPE_ICONS[n.type] || "ℹ️"}</span>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-bold text-white text-sm">{title}</div>
                                            <div className="text-xs text-gray-400 mt-0.5 line-clamp-2">{actualMsg}</div>
                                            <div className="flex gap-3 text-[10px] text-gray-600 mt-1.5">
                                                <span>{n.created_at ? new Date(n.created_at).toLocaleDateString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : ""}</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => deleteNotification(n.id)}
                                            className="text-gray-600 hover:text-red-400 transition text-sm shrink-0 self-start mt-1"
                                            title="Delete"
                                        >
                                            🗑
                                        </button>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
