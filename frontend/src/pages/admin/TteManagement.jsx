import { useState, useEffect } from "react";
import { db } from "../../utils/firebaseClient";
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, updateDoc, limit, setDoc } from "firebase/firestore";
import { AUTHORIZED_TTES } from "../../utils/roles.config";

export default function TteManagement() {
    const [ttes, setTtes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [msg, setMsg] = useState(null);
    const [confirmDelete, setConfirmDelete] = useState(null);

    const emptyForm = { name: "", email: "", phone: "+91", employee_id: "" };
    const [form, setForm] = useState(emptyForm);
    const [editingId, setEditingId] = useState(null); // Added for edit mode
    const [searchTerm, setSearchTerm] = useState(""); // Added search state

    const generateNextTteId = (existingTtes) => {
        const year = new Date().getFullYear();
        const prefix = `TTE${year}`;
        
        // Find existing IDs for the current year
        const ids = existingTtes
            .map(t => t.employee_id || "")
            .filter(id => id.startsWith(prefix))
            .map(id => parseInt(id.replace(prefix, "")) || 0);
            
        const nextNum = ids.length > 0 ? Math.max(...ids) + 1 : 1;
        return `${prefix}${nextNum.toString().padStart(3, '0')}`;
    };

    const fetchTtes = async () => {
        setLoading(true);
        try {
            // 1. Get from dedicated 'ttes' collection
            const ttesSnap = await getDocs(collection(db, "ttes"));
            const ttesData = ttesSnap.docs.map(d => ({ id: d.id, ...d.data(), source: 'collection' }));

            // 2. Get from 'profiles' where role is 'tte'
            const profilesSnap = await getDocs(query(collection(db, "profiles"), where("role", "==", "tte")));
            const profilesData = profilesSnap.docs.map(d => ({ id: d.id, ...d.data(), source: 'profile' }));

            // 3. Prepare Merge Map
            const merged = new Map();
            const missingInCollection = [];

            // Pass 1: Static Config (Support both string and object formats)
            AUTHORIZED_TTES.forEach(t => {
                const email = typeof t === 'string' ? t : t.email;
                const phone = typeof t === 'object' ? t.phone : '+91';
                const lower = email.toLowerCase();
                merged.set(lower, { 
                    name: lower.split('@')[0], 
                    email: lower, 
                    phone: phone || "+91",
                    source: 'config',
                    isConfig: true 
                });
            });

            // Pass 2: Profiles
            profilesData.forEach(p => {
                const lower = p.email.toLowerCase();
                const existing = merged.get(lower) || {};
                merged.set(lower, {
                    ...existing,
                    ...p,
                    name: p.full_name || p.name || existing.name,
                    source: 'profile'
                });
            });

            // Pass 3: Check against dedicated collection & identify missing/malformed IDs
            const collectionEmails = new Set(ttesData.map(t => t.email.toLowerCase()));
            const toRepair = []; // List of existing records with bad IDs
            const validIdPattern = /^TTE\d+$/; // Standard: TTE followed by only digits
            
            // Collect metadata from collection
            ttesData.forEach(t => {
                const lower = t.email.toLowerCase();
                const id = t.employee_id || "";

                // Check if ID needs repair: 
                // 1. Doesn't follow TTE + Digits pattern
                // 2. Or is a known placeholder string
                if (!validIdPattern.test(id) || id.includes("AUTO") || id.includes("PROMOTED") || id.includes("GEN")) {
                    toRepair.push(t);
                }

                const existing = merged.get(lower) || {};
                merged.set(lower, {
                    ...existing,
                    ...t,
                    name: t.name || t.full_name || existing.name,
                    source: 'collection'
                });
            });

            // Auto-Sync Phase: Find what's in merged but NOT in collection
            for (const [email, data] of merged.entries()) {
                if (!collectionEmails.has(email)) {
                    missingInCollection.push(data);
                }
            }

            // Perform Auto-Sync or Repair if found
            if (missingInCollection.length > 0 || toRepair.length > 0) {
                console.log(`Auto-repairing/syncing ${missingInCollection.length + toRepair.length} TTE records...`);
                
                // Track IDs locally to avoid duplicates during this batch
                const validIdPattern = /^TTE\d+$/; 
                let currentTtes = ttesData.filter(t => 
                    validIdPattern.test(t.employee_id || "") && 
                    !t.employee_id.includes("AUTO") && 
                    !t.employee_id.includes("PROMOTED") &&
                    !t.employee_id.includes("GEN")
                );
                
                const updates = [];

                // 1. Create Missing Records
                missingInCollection.forEach(m => {
                    const nextId = generateNextTteId(currentTtes);
                    const newRecord = {
                        name: m.name,
                        full_name: m.name,
                        email: m.email,
                        phone: m.phone || "+91",
                        employee_id: nextId,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    };
                    currentTtes.push(newRecord);
                    updates.push(addDoc(collection(db, "ttes"), newRecord));
                });

                // 2. Repair Existing Malformed Records
                toRepair.forEach(t => {
                    const nextId = generateNextTteId(currentTtes);
                    const repairData = { employee_id: nextId, updated_at: new Date().toISOString() };
                    // Add temporary ID to local tracker so next loop gets a unique number
                    currentTtes.push({ ...t, ...repairData });
                    updates.push(updateDoc(doc(db, "ttes", t.id), repairData));
                });

                await Promise.all(updates);
                // Recursive call to reflect the fresh collection data
                return fetchTtes();
            }

            const finalData = Array.from(merged.values());
            finalData.sort((a, b) => (b.created_at || 0).toString().localeCompare((a.created_at || 0).toString()));
            setTtes(finalData);
        } catch (error) {
            console.error("Fetch/Sync TTEs Error:", error);
        }
        setLoading(false);
    };

    useEffect(() => { fetchTtes(); }, []);

    const filteredTtes = ttes.filter(t => {
        const search = searchTerm.toLowerCase();
        return (
            (t.name || "").toLowerCase().includes(search) ||
            (t.email || "").toLowerCase().includes(search) ||
            (t.employee_id || "").toLowerCase().includes(search)
        );
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.name || !form.email) {
            setMsg({ type: "error", text: "Name and Email are required." });
            return;
        }
        
        // 10-digit Phone Validation (supporting +91 prefix)
        if (form.phone && !/^\+91\d{10}$/.test(form.phone)) {
            setMsg({ type: "error", text: "Phone number must be +91 followed by 10 digits." });
            return;
        }

        setSubmitting(true);

        try {
            const emailLower = form.email.toLowerCase();
            const tteData = {
                name: form.name,
                full_name: form.name,
                email: emailLower,
                phone: form.phone || "+91",
                employee_id: form.employee_id || generateNextTteId(ttes),
                updated_at: new Date().toISOString()
            };

            if (editingId) {
                // UPDATE EXISTING
                await updateDoc(doc(db, "ttes", editingId), tteData);
                setMsg({ type: "success", text: `TTE ${form.name} updated successfully.` });
            } else {
                // ADD NEW
                tteData.created_at = new Date().toISOString();
                await addDoc(collection(db, "ttes"), tteData);
                
                // Sync role in profile
                try {
                    const profileQ = query(collection(db, 'profiles'), where('email', '==', emailLower), limit(1));
                    const profileSnap = await getDocs(profileQ);
                    if (!profileSnap.empty) {
                        await updateDoc(doc(db, 'profiles', profileSnap.docs[0].id), { role: 'tte' });
                    }
                } catch (pErr) {
                    console.warn("Could not sync profile role:", pErr);
                }
                setMsg({ type: "success", text: `TTE ${form.name} created!` });
            }

            setForm(emptyForm);
            setShowForm(false);
            setEditingId(null);
            fetchTtes();
        } catch (err) {
            setMsg({ type: "error", text: err.message });
        }
        setSubmitting(false);
        setTimeout(() => setMsg(null), 5000);
    };

    const startEdit = (tte) => {
        setForm({
            name: tte.name || tte.full_name || "",
            email: tte.email || "",
            phone: tte.phone || "",
            employee_id: tte.employee_id || ""
        });
        setEditingId(tte.id);
        setShowForm("add");
    };

    const handleDelete = async (id, email, name) => {
        if (confirmDelete !== id) { setConfirmDelete(id); return; }
        
        try {
            // 1. Remove from 'ttes' collection
            await deleteDoc(doc(db, "ttes", id));

            // 2. Revoke role in profile
            try {
                const profileQ = query(collection(db, 'profiles'), where('email', '==', email.toLowerCase()), limit(1));
                const profileSnap = await getDocs(profileQ);
                if (!profileSnap.empty) {
                    await updateDoc(doc(db, 'profiles', profileSnap.docs[0].id), { role: 'user' });
                }
            } catch (e) {
                console.warn("Profile role sync failed on delete:", e);
            }

            setConfirmDelete(null);
            fetchTtes();
            setMsg({ type: "success", text: `${name} removed from TTE workforce.` });
        } catch (err) {
            console.error(err);
        }
        setTimeout(() => setMsg(null), 3000);
    };

    return (
        <div className="p-4 md:p-6 lg:p-8 min-h-screen bg-[#0f172a]">
            <div className="max-w-6xl mx-auto">
                {/* Header & Search */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10">
                    <div className="flex-1">
                        <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">TTE Management</h1>
                        <p className="text-gray-400 text-sm mt-1 max-w-lg">Manage or Add Travelling Ticket Examiners</p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                        <div className="relative group flex-1 sm:min-w-[320px]">
                            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-[#4ab86d] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input 
                                type="text"
                                placeholder="Search by name, email or ID..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-[#1D2332] border border-white/10 rounded-xl pl-11 pr-4 py-2.5 text-white text-sm outline-none focus:border-[#4ab86d]/50 focus:ring-4 focus:ring-[#4ab86d]/10 transition-all"
                            />
                            {searchTerm && (
                                <button 
                                    onClick={() => setSearchTerm("")}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                                >
                                    ✕
                                </button>
                            )}
                        </div>

                        <button onClick={() => { setShowForm("add"); setForm(emptyForm); setEditingId(null); }}
                            className="flex items-center justify-center gap-2 px-6 py-2.5 bg-[#4ab86d] text-white font-bold rounded-xl hover:bg-green-600 transition text-sm shadow-lg transform active:scale-95">
                            <span className="text-lg">+</span> Add TTE
                        </button>
                    </div>
                </div>

                {msg && (
                    <div className={`mb-6 px-4 py-3 rounded-xl text-sm font-medium border ${msg.type === "success" ? "bg-green-500/10 text-green-300 border-green-500/20" : "bg-red-500/10 text-red-300 border-red-500/20"}`}>
                        {msg.text}
                    </div>
                )}

                {/* Forms */}
                {showForm === "add" && (
                    <div className="bg-[#1D2332] border border-white/10 rounded-2xl p-6 mb-8 shadow-2xl">
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-lg font-bold text-white">{editingId ? "Edit TTE Profile" : "Add New TTE"}</h2>
                            <button onClick={() => { setShowForm(false); setEditingId(null); }} className="text-gray-400 hover:text-white text-xl">✕</button>
                        </div>
                        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {[
                                { label: "Full Name *", key: "name", placeholder: "e.g. Rajesh Kumar" },
                                { label: "Email *", key: "email", placeholder: "e.g. tte.rajesh@gmail.com", type: "email", disabled: !!editingId },
                                { label: "Phone", key: "phone", placeholder: "e.g. 9876543210", maxLength: 13 },
                                { label: "Employee ID", key: "employee_id", placeholder: "e.g. TTE2024001" },
                            ].map(f => (
                                <div key={f.key}>
                                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{f.label}</label>
                                    <input type={f.type || "text"} value={form[f.key]} placeholder={f.placeholder} disabled={f.disabled}
                                        maxLength={f.maxLength}
                                        onChange={e => {
                                            let val = e.target.value;
                                            if (f.key === 'phone') {
                                                // Prevent deleting the prefix or mangling it
                                                if (!val.startsWith('+91')) {
                                                    // If user tried to delete 1 from +91, val will be '+9'
                                                    // We should just reset to +91 or handle it gracefully
                                                    val = '+91';
                                                } else {
                                                    // Get only digits after +91
                                                    const suffix = val.slice(3).replace(/\D/g, '').slice(0, 10);
                                                    val = '+91' + suffix;
                                                }
                                            }
                                            setForm(prev => ({ ...prev, [f.key]: val }));
                                        }}
                                        className={`w-full bg-[#0f172a] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-[#4ab86d] ${f.disabled ? 'opacity-50 cursor-not-allowed' : ''}`} />
                                </div>
                            ))}
                            <div className="sm:col-span-2 flex justify-end gap-3 pt-1">
                                <button type="button" onClick={() => { setShowForm(false); setEditingId(null); }} className="px-6 py-2.5 bg-gray-700 text-white rounded-xl hover:bg-gray-600 font-medium text-sm">Cancel</button>
                                <button type="submit" disabled={submitting}
                                    className="px-6 py-2.5 bg-[#4ab86d] text-white rounded-xl hover:bg-green-600 font-bold text-sm disabled:opacity-50">
                                    {submitting ? "Saving..." : (editingId ? "Update Profile" : "Add TTE")}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* TTE Cards */}
                {loading ? (
                    <div className="text-center text-gray-400 py-20">Loading TTEs...</div>
                ) : filteredTtes.length === 0 ? (
                    <div className="bg-[#1D2332] border border-white/10 rounded-2xl p-12 text-center">
                        <div className="w-16 h-16 rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 mx-auto mb-4">
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <h3 className="text-white font-bold text-lg mb-1">No TTEs found</h3>
                        <p className="text-gray-400 text-sm">No results match "{searchTerm}". Try another search or clear the filter.</p>
                        <button onClick={() => setSearchTerm("")} className="mt-4 text-[#4ab86d] font-bold text-sm hover:underline">Clear Search</button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {filteredTtes.map(t => (
                            <div key={t.id} className="bg-[#1D2332] border border-white/10 rounded-2xl p-5 hover:border-white/20 transition">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="w-12 h-12 bg-gradient-to-br from-[#4ab86d]/30 to-blue-500/20 rounded-xl flex items-center justify-center text-xl font-bold text-white">
                                        {(t.name || t.email).charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => startEdit(t)} className="text-xs px-3 py-1.5 rounded-lg font-medium border border-blue-500/20 text-blue-400 hover:bg-blue-500/10 transition">
                                            Edit
                                        </button>
                                        <button onClick={() => handleDelete(t.id, t.email, t.name)}
                                            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition border ${confirmDelete === t.id ? "bg-red-500 text-white border-red-500" : "border-red-500/20 text-red-400 hover:bg-red-500/10"}`}>
                                            {confirmDelete === t.id ? "Confirm" : "Remove"}
                                        </button>
                                    </div>
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
