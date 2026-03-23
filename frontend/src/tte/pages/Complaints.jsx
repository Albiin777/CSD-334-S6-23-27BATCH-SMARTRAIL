import { useState } from 'react';
import { useSmartRail } from '../hooks/useSmartRail';
import { db, auth } from '../../utils/firebaseClient';
import { doc, updateDoc, addDoc, collection } from 'firebase/firestore';
import { AlertCircle, CheckCircle, Clock, MessageSquare, Send, Search, X, Train, Image } from 'lucide-react';

const statusColor = {
    open: 'text-red-400 bg-red-500/10 border-red-500/20',
    in_progress: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    'in-progress': 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    resolved: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    closed: 'text-gray-400 bg-gray-500/10 border-gray-500/20',
};

const statusLabel = { open: 'Open', in_progress: 'In Progress', 'in-progress': 'In Progress', resolved: 'Resolved', closed: 'Closed' };

const StatusIcon = ({ status }) => {
    if (status === 'resolved' || status === 'closed') return <CheckCircle size={12} />;
    if (status === 'in_progress' || status === 'in-progress') return <Clock size={12} />;
    return <AlertCircle size={12} />;
};

export default function Complaints() {
    const { complaints, setComplaints, tteInfo, loading } = useSmartRail();
    const [selected, setSelected] = useState(null);
    const [filterStatus, setFilterStatus] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [newResponse, setNewResponse] = useState('');
    const [saving, setSaving] = useState(false);
    const [markResolved, setMarkResolved] = useState(false);

    // Filter
    let filtered = complaints;
    if (filterStatus !== 'All') {
        filtered = filtered.filter(c => {
            const s = (c.status || 'open').toLowerCase().replace(' ', '_');
            return s === filterStatus || c.status === filterStatus;
        });
    }
    if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter(c =>
            (c.subject || '').toLowerCase().includes(q) ||
            (c.description || '').toLowerCase().includes(q) ||
            (c.dbId || '').toLowerCase().includes(q)
        );
    }

    const counts = {
        total: complaints.length,
        open: complaints.filter(c => (c.status || 'open') === 'open').length,
        in_progress: complaints.filter(c => ['in_progress', 'in-progress'].includes(c.status)).length,
        resolved: complaints.filter(c => ['resolved', 'closed'].includes(c.status)).length,
    };

    const handleSendReply = async () => {
        if (!newResponse.trim() || !selected) return;
        setSaving(true);
        try {
            const token = await auth.currentUser?.getIdToken();
            if (!token) return;

            const newStatus = markResolved ? 'resolved' : 'in-progress';
            const now = new Date().toISOString();

            // Add reply to complaint_replies collection with is_admin_reply: true
            const replyData = {
                complaint_id: selected.dbId,
                message: newResponse.trim(),
                is_admin_reply: true,
                marks_resolved: markResolved,
                created_at: now
            };
            await addDoc(collection(db, 'complaint_replies'), replyData);

            // Update complaint status
            await updateDoc(doc(db, 'complaints', selected.dbId), {
                status: newStatus,
                updated_at: now
            });

            // Update local state optimistically
            setComplaints(prev => prev.map(c =>
                c.dbId === selected.dbId ? { ...c, status: newStatus } : c
            ));
            setSelected(prev => ({ ...prev, status: newStatus }));
            setNewResponse('');
            setMarkResolved(false);
        } catch (err) {
            console.error('Reply error:', err);
        }
        setSaving(false);
    };

    if (loading) return (
        <div className="flex items-center justify-center h-64 text-[#B3B3B3]">
            <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin mr-3" />
            <p className="text-sm">Loading complaints…</p>
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Summary stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                    { label: 'Total', value: counts.total, color: 'text-white' },
                    { label: 'Open', value: counts.open, color: 'text-red-400' },
                    { label: 'In Progress', value: counts.in_progress, color: 'text-amber-400' },
                    { label: 'Resolved', value: counts.resolved, color: 'text-emerald-400' },
                ].map(s => (
                    <div key={s.label} className="bg-[#2B2B2B] rounded-2xl border border-[#D4D4D4]/10 p-5 text-center">
                        <p className={`text-3xl font-extrabold ${s.color}`}>{s.value}</p>
                        <p className="text-[10px] font-bold text-[#9CA3AF] uppercase mt-1">{s.label}</p>
                    </div>
                ))}
            </div>

            {/* Train badge */}
            {tteInfo?.trainNo && (
                <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl w-fit">
                    <Train size={14} className="text-[#B3B3B3]" />
                    <span className="text-xs font-bold text-white">Train #{tteInfo.trainNo}</span>
                    <span className="text-[10px] text-[#B3B3B3]">— showing complaints for your assigned train only</span>
                </div>
            )}

            {/* Search + Filter */}
            <div className="bg-[#2B2B2B] rounded-2xl border border-[#D4D4D4]/10 p-4">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center bg-gray-900 rounded-xl px-3 py-2 gap-2 flex-1 min-w-[200px] border border-[#D4D4D4]/10">
                        <Search size={14} className="text-[#B3B3B3] flex-shrink-0" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Search by subject or ID…"
                            className="bg-transparent text-sm text-white placeholder:text-[#9CA3AF] outline-none w-full"
                        />
                    </div>
                    <select
                        value={filterStatus}
                        onChange={e => setFilterStatus(e.target.value)}
                        className="bg-gray-900 text-white text-xs font-semibold px-3 py-2 rounded-lg border border-[#D4D4D4]/10 outline-none"
                    >
                        <option value="All">All Status</option>
                        <option value="open">Open</option>
                        <option value="in-progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                    </select>
                </div>
            </div>

            {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-[#B3B3B3] bg-[#2B2B2B] rounded-2xl border border-[#D4D4D4]/10">
                    <AlertCircle size={36} className="mb-3 opacity-20" />
                    <p className="text-sm font-medium">No complaints found</p>
                    <p className="text-xs text-[#6B7280] mt-1">Passenger complaints for this train will appear here</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {/* Complaints List */}
                    <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                        {filtered.map(c => {
                            const status = (c.status || 'open').toLowerCase();
                            return (
                                <div
                                    key={c.dbId}
                                    onClick={() => { setSelected(c); setNewResponse(''); setMarkResolved(false); }}
                                    className={`bg-[#2B2B2B] rounded-2xl border p-5 cursor-pointer transition hover:border-[#D4D4D4]/30 ${selected?.dbId === c.dbId ? 'border-white/20 bg-[#333]' : 'border-[#D4D4D4]/10'}`}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                                <p className="text-white font-bold text-sm truncate">{c.subject || 'Complaint'}</p>
                                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border flex items-center gap-1 ${statusColor[status] || statusColor.open}`}>
                                                    <StatusIcon status={status} /> {statusLabel[status] || status}
                                                </span>
                                            </div>
                                            <p className="text-xs text-[#9CA3AF] line-clamp-2">{c.description}</p>
                                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                                                {c.train_name && (
                                                    <span className="text-[10px] font-bold text-[#9CA3AF] bg-gray-900 px-2 py-0.5 rounded-full flex items-center gap-1">
                                                        <Train size={9} /> {c.train_name}
                                                    </span>
                                                )}
                                                {c.images?.length > 0 && (
                                                    <span className="text-[10px] text-[#6B7280] flex items-center gap-1">
                                                        <Image size={10} /> {c.images.length} file{c.images.length > 1 ? 's' : ''}
                                                    </span>
                                                )}
                                                <span className="text-[10px] text-[#6B7280] ml-auto">
                                                    {c.created_at ? new Date(c.created_at).toLocaleDateString('en-IN') : ''}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Detail Panel */}
                    <div className="bg-[#2B2B2B] rounded-2xl border border-[#D4D4D4]/10 flex flex-col h-[60vh]">
                        {!selected ? (
                            <div className="flex flex-col items-center justify-center flex-1 text-[#B3B3B3]">
                                <AlertCircle size={40} className="mb-3 opacity-30" />
                                <p className="text-sm font-medium">Select a complaint</p>
                                <p className="text-xs text-[#6B7280] mt-1">Click to view details and respond</p>
                            </div>
                        ) : (
                            <>
                                {/* Header */}
                                <div className="p-5 border-b border-[#D4D4D4]/10 flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <h3 className="font-black text-white text-base leading-tight mb-1 truncate">{selected.subject}</h3>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold uppercase flex items-center gap-1 ${statusColor[(selected.status || 'open').toLowerCase()] || statusColor.open}`}>
                                                <StatusIcon status={(selected.status || 'open').toLowerCase()} />
                                                {statusLabel[(selected.status || 'open').toLowerCase()] || selected.status}
                                            </span>
                                            {selected.train_name && (
                                                <span className="text-[10px] text-[#9CA3AF] bg-gray-900 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                                                    <Train size={9} /> {selected.train_name}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <button onClick={() => setSelected(null)} className="p-1.5 text-[#B3B3B3] hover:text-white rounded-lg hover:bg-white/10 flex-shrink-0">
                                        <X size={16} />
                                    </button>
                                </div>

                                {/* Body */}
                                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                                    {/* Description */}
                                    <div>
                                        <p className="text-[10px] font-bold text-[#9CA3AF] uppercase mb-2">Description</p>
                                        <p className="text-xs text-[#B3B3B3] leading-relaxed bg-gray-900 rounded-xl p-3 border border-[#D4D4D4]/5">
                                            {selected.description || 'No description provided.'}
                                        </p>
                                    </div>

                                    {/* Attached Images */}
                                    {selected.images?.length > 0 && (
                                        <div>
                                            <p className="text-[10px] font-bold text-[#9CA3AF] uppercase mb-2">Evidence</p>
                                            <div className="grid grid-cols-3 gap-2">
                                                {selected.images.map((url, i) => (
                                                    <a key={i} href={url} target="_blank" rel="noreferrer"
                                                        className="aspect-square rounded-lg overflow-hidden border border-[#D4D4D4]/10 hover:border-white/30 transition">
                                                        <img src={url} className="w-full h-full object-cover" alt="evidence" />
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Submitted info */}
                                    <div className="text-[10px] text-[#6B7280] font-mono">
                                        Submitted: {selected.created_at ? new Date(selected.created_at).toLocaleString('en-IN') : 'N/A'}
                                    </div>
                                </div>

                                {/* Reply Input */}
                                <div className="p-5 border-t border-[#D4D4D4]/10 bg-white/[0.01]">
                                    {['resolved', 'closed'].includes((selected.status || '').toLowerCase()) ? (
                                        <div className="text-center py-2 text-[10px] font-black uppercase tracking-widest text-[#9CA3AF] opacity-60 italic">
                                            Case resolved. Replies disabled.
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            <textarea
                                                value={newResponse}
                                                onChange={e => setNewResponse(e.target.value)}
                                                placeholder="Write your response to the passenger…"
                                                rows={3}
                                                className="w-full bg-[#080f1e] text-white border border-gray-700 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition resize-none placeholder:text-gray-600"
                                            />
                                            <div className="flex items-center justify-between gap-3">
                                                <label className="flex items-center gap-2 text-xs text-[#9CA3AF] cursor-pointer hover:text-white transition">
                                                    <input
                                                        type="checkbox"
                                                        checked={markResolved}
                                                        onChange={e => setMarkResolved(e.target.checked)}
                                                        className="w-3.5 h-3.5 rounded border-gray-600"
                                                    />
                                                    Mark as resolved
                                                </label>
                                                <button
                                                    onClick={handleSendReply}
                                                    disabled={saving || !newResponse.trim()}
                                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold uppercase transition disabled:opacity-40 disabled:cursor-not-allowed"
                                                >
                                                    {saving ? (
                                                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                    ) : (
                                                        <Send size={12} />
                                                    )}
                                                    {markResolved ? 'Send & Resolve' : 'Send Reply'}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
