import { useState, useEffect } from "react";
import { supabase } from "../../utils/supabaseClient";

export default function TteManagement() {
    const [ttes, setTtes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [msg, setMsg] = useState(null);
    const [confirmDelete, setConfirmDelete] = useState(null);

    const emptyForm = { name: "", email: "", phone: "", employee_id: "", base_station: "" };
    const [form, setForm] = useState(emptyForm);

    const fetchTtes = async () => {
        setLoading(true);
        const { data, error } = await supabase.from("tte_accounts").select("*").order("created_at", { ascending: false });
        if (data) setTtes(data);
        if (error) console.error(error);
        setLoading(false);
    };

    useEffect(() => { fetchTtes(); }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.name || !form.email) {
            setMsg({ type: "error", text: "Name and Email are required." });
            return;
        }
        setSubmitting(true);

        // 1. Insert into tte_accounts table
        const { error: dbErr } = await supabase.from("tte_accounts").insert([form]);
        if (dbErr) {
            setMsg({ type: "error", text: dbErr.message });
            setSubmitting(false);
            return;
        }

        setMsg({ type: "success", text: `TTE ${form.name} created! They can log in using OTP with email: ${form.email}` });
        setForm(emptyForm);
        setShowForm(false);
        fetchTtes();
        setSubmitting(false);
        setTimeout(() => setMsg(null), 5000);
    };

    const handleDelete = async (id, name) => {
        if (confirmDelete !== id) { setConfirmDelete(id); return; }
        await supabase.from("tte_accounts").delete().eq("id", id);
        setConfirmDelete(null);
        fetchTtes();
        setMsg({ type: "success", text: `${name} removed.` });
        setTimeout(() => setMsg(null), 3000);
    };

    return (
        <div className="p-4 md:p-6 lg:p-8 min-h-screen bg-[#0f172a]">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-white">TTE Management</h1>
                        <p className="text-gray-400 text-sm mt-1">Manage Travelling Ticket Examiners — they log in using OTP with their registered email</p>
                    </div>
                    <button onClick={() => { setShowForm(true); setForm(emptyForm); }}
                        className="flex items-center gap-2 px-5 py-2.5 bg-[#4ab86d] text-white font-bold rounded-xl hover:bg-green-600 transition text-sm shadow-lg">
                        + Add TTE
                    </button>
                </div>

                {msg && (
                    <div className={`mb-6 px-4 py-3 rounded-xl text-sm font-medium border ${msg.type === "success" ? "bg-green-500/10 text-green-300 border-green-500/20" : "bg-red-500/10 text-red-300 border-red-500/20"}`}>
                        {msg.text}
                    </div>
                )}

                {/* Add TTE Form */}
                {showForm && (
                    <div className="bg-[#1D2332] border border-white/10 rounded-2xl p-6 mb-8 shadow-2xl">
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-lg font-bold text-white">Add New TTE</h2>
                            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-white text-xl">✕</button>
                        </div>
                        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {[
                                { label: "Full Name *", key: "name", placeholder: "e.g. Rajesh Kumar" },
                                { label: "Email *", key: "email", placeholder: "e.g. tte.rajesh@gmail.com", type: "email" },
                                { label: "Phone", key: "phone", placeholder: "e.g. 9876543210" },
                                { label: "Employee ID", key: "employee_id", placeholder: "e.g. TTE-2024-001" },
                                { label: "Base Station", key: "base_station", placeholder: "e.g. Ernakulam" }
                            ].map(f => (
                                <div key={f.key}>
                                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{f.label}</label>
                                    <input type={f.type || "text"} value={form[f.key]} placeholder={f.placeholder}
                                        onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                                        className="w-full bg-[#0f172a] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-[#4ab86d]" />
                                </div>
                            ))}
                            <div className="sm:col-span-2 bg-blue-500/5 border border-blue-500/20 rounded-xl p-3 text-xs text-blue-300">
                                💡 The TTE will log in using <strong>OTP</strong> sent to their email. No separate password is required.
                            </div>
                            <div className="sm:col-span-2 flex justify-end gap-3 pt-1">
                                <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2.5 bg-gray-700 text-white rounded-xl hover:bg-gray-600 font-medium text-sm">Cancel</button>
                                <button type="submit" disabled={submitting}
                                    className="px-6 py-2.5 bg-[#4ab86d] text-white rounded-xl hover:bg-green-600 font-bold text-sm disabled:opacity-50">
                                    {submitting ? "Saving..." : "Add TTE"}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* TTE Cards */}
                {loading ? (
                    <div className="text-center text-gray-400 py-20">Loading TTEs...</div>
                ) : ttes.length === 0 ? (
                    <div className="bg-[#1D2332] border border-white/10 rounded-2xl p-12 text-center">
                        <div className="w-16 h-16 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-4 shadow-inner">
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                        </div>
                        <p className="text-gray-400">No TTEs added yet. Click "Add TTE" to get started.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {ttes.map(t => (
                            <div key={t.id} className="bg-[#1D2332] border border-white/10 rounded-2xl p-5 hover:border-white/20 transition">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="w-12 h-12 bg-gradient-to-br from-[#4ab86d]/30 to-blue-500/20 rounded-xl flex items-center justify-center text-xl font-bold text-white">
                                        {t.name.charAt(0).toUpperCase()}
                                    </div>
                                    <button onClick={() => handleDelete(t.id, t.name)}
                                        className={`text-xs px-3 py-1.5 rounded-lg font-medium transition border ${confirmDelete === t.id ? "bg-red-500 text-white border-red-500" : "border-red-500/20 text-red-400 hover:bg-red-500/10"}`}>
                                        {confirmDelete === t.id ? "Confirm Delete" : "Remove"}
                                    </button>
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-white font-bold text-lg">{t.name}</h3>
                                    <p className="text-gray-400 text-sm">{t.email}</p>
                                    {t.phone && <p className="text-gray-500 text-xs">{t.phone}</p>}
                                    <div className="flex flex-wrap gap-2 pt-2">
                                        {t.employee_id && (
                                            <span className="text-xs bg-blue-500/10 text-blue-300 border border-blue-500/20 px-2.5 py-1 rounded-lg font-mono">{t.employee_id}</span>
                                        )}
                                        {t.base_station && (
                                            <span className="text-xs bg-orange-500/10 text-orange-300 border border-orange-500/20 px-2.5 py-1 rounded-lg">📍 {t.base_station}</span>
                                        )}
                                    </div>
                                </div>
                                <div className="mt-3 pt-3 border-t border-white/5 text-[10px] text-gray-600">
                                    Added {new Date(t.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
