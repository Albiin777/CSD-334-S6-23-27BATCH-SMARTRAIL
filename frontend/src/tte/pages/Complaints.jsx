import { useState } from 'react';
import { useSmartRail } from '../hooks/useSmartRail';
import { supabase } from '../lib/supabaseClient';
import { AlertCircle, CheckCircle, Clock, User, MessageSquare, Send, Search, X, FileText } from 'lucide-react';

const priorityColor = { High: 'text-red-400 bg-red-500/10 border-red-500/20', Medium: 'text-amber-400 bg-amber-500/10 border-amber-500/20', Low: 'text-blue-400 bg-blue-500/10 border-blue-500/20' };
const statusColor = { Open: 'text-red-400 bg-red-500/10', 'In Progress': 'text-amber-400 bg-amber-500/10', Resolved: 'text-emerald-400 bg-emerald-500/10' };
const statusIcon = { Open: AlertCircle, 'In Progress': Clock, Resolved: CheckCircle };

export default function Complaints() {
    const { complaints, setComplaints, tteInfo, loading } = useSmartRail();
    const [selected, setSelected] = useState(null);
    const [filterCat, setFilterCat] = useState('All');
    const [filterStatus, setFilterStatus] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [newResponse, setNewResponse] = useState('');
    const [saving, setSaving] = useState(false);

    const allCategories = ['All', ...new Set(complaints.map(c => c.category).filter(Boolean))];
    const allStatuses = ['All', 'Open', 'In Progress', 'Resolved'];

    let filtered = complaints;
    if (filterCat !== 'All') filtered = filtered.filter(c => c.category === filterCat);
    if (filterStatus !== 'All') filtered = filtered.filter(c => c.status === filterStatus);
    if (searchQuery) filtered = filtered.filter(c =>
        c.passenger.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.pnr.includes(searchQuery)
    );

    const openCount = complaints.filter(c => c.status === 'Open').length;
    const inProgressCount = complaints.filter(c => c.status === 'In Progress').length;
    const resolvedCount = complaints.filter(c => c.status === 'Resolved').length;

    const handleStatusChange = async (id, newStatus) => {
        // Optimistic update
        setComplaints(prev => prev.map(c => c.id === id ? { ...c, status: newStatus } : c));
        if (selected?.id === id) setSelected(prev => ({ ...prev, status: newStatus }));

        // Sync to Supabase
        const complaint = complaints.find(c => c.id === id);
        if (supabase && complaint?.dbId) {
            await supabase.from('complaints').update({ status: newStatus }).eq('id', complaint.dbId);
        }
    };

    const handleAddResponse = async (id) => {
        if (!newResponse.trim()) return;
        setSaving(true);
        const responseObj = {
            by: tteInfo.name || 'TTE',
            text: newResponse,
            time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        };

        // Optimistic update
        setComplaints(prev => prev.map(c => c.id === id ? { ...c, responses: [...c.responses, responseObj] } : c));
        if (selected?.id === id) setSelected(prev => ({ ...prev, responses: [...prev.responses, responseObj] }));
        setNewResponse('');

        // Sync to Supabase
        const complaint = complaints.find(c => c.id === id);
        if (supabase && complaint?.dbId) {
            await supabase.from('complaint_replies').insert({
                complaint_id: complaint.dbId,
                reply_text: newResponse,
                replied_by: tteInfo.name || 'TTE',
            });
        }
        setSaving(false);
    };

    if (loading) return (
        <div className="flex items-center justify-center h-64 text-[#B3B3B3]">
            <p className="text-sm">Loading complaints…</p>
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                {[
                    { label: 'Total Complaints', value: complaints.length, color: 'text-white' },
                    { label: 'Open', value: openCount, color: 'text-red-400' },
                    { label: 'In Progress', value: inProgressCount, color: 'text-amber-400' },
                    { label: 'Resolved', value: resolvedCount, color: 'text-emerald-400' },
                ].map(s => (
                    <div key={s.label} className="bg-[#2B2B2B] rounded-2xl border border-[#D4D4D4]/10 p-5 text-center">
                        <p className={`text-3xl font-extrabold ${s.color}`}>{s.value}</p>
                        <p className="text-[10px] font-bold text-[#9CA3AF] uppercase mt-1">{s.label}</p>
                    </div>
                ))}
            </div>

            {/* Search + Filters */}
            <div className="bg-[#2B2B2B] rounded-2xl border border-[#D4D4D4]/10 p-5">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center bg-gray-900 rounded-xl px-3 py-2 gap-2 flex-1 min-w-[200px] border border-[#D4D4D4]/10">
                        <Search size={16} className="text-[#B3B3B3]" />
                        <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search by name, ID, PNR…"
                            className="bg-transparent text-sm text-white placeholder:text-[#9CA3AF] outline-none w-full" />
                    </div>
                    <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
                        className="bg-gray-900 text-white text-xs font-semibold px-3 py-2 rounded-lg border border-[#D4D4D4]/10 outline-none">
                        {allCategories.map(c => <option key={c} value={c}>{c === 'All' ? 'All Categories' : c}</option>)}
                    </select>
                    <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                        className="bg-gray-900 text-white text-xs font-semibold px-3 py-2 rounded-lg border border-[#D4D4D4]/10 outline-none">
                        {allStatuses.map(s => <option key={s} value={s}>{s === 'All' ? 'All Status' : s}</option>)}
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
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Complaints List */}
                    <div className="lg:col-span-2 space-y-3">
                        {filtered.map(c => {
                            const StatusIcon = statusIcon[c.status] || AlertCircle;
                            return (
                                <div key={c.id} onClick={() => setSelected(c)}
                                    className={`bg-[#2B2B2B] rounded-2xl border p-5 cursor-pointer transition hover:border-[#D4D4D4]/30 ${selected?.id === c.id ? 'border-white/20 bg-[#333]' : 'border-[#D4D4D4]/10'}`}>
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-start gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-gray-700 flex items-center justify-center shrink-0 mt-0.5">
                                                <FileText size={16} className="text-[#B3B3B3]" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <p className="text-white font-bold text-sm">{c.id}</p>
                                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border ${priorityColor[c.priority] || 'text-gray-400 bg-gray-500/10 border-gray-500/20'}`}>{c.priority}</span>
                                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase flex items-center gap-1 ${statusColor[c.status] || 'text-gray-400 bg-gray-500/10'}`}>
                                                        <StatusIcon size={10} /> {c.status}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-[#9CA3AF] mt-0.5">{c.passenger}{c.pnr && ` • PNR: ${c.pnr}`}{c.coach && ` • Coach ${c.coach}`}</p>
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="text-[10px] text-[#9CA3AF] font-semibold">{c.date}</p>
                                            <p className="text-[10px] text-[#6B7280]">{c.time}</p>
                                        </div>
                                    </div>
                                    <p className="text-xs text-[#B3B3B3] mt-2.5 line-clamp-2 leading-relaxed">{c.description}</p>
                                    <div className="flex items-center gap-3 mt-3 pt-2.5 border-t border-[#D4D4D4]/5">
                                        <span className="text-[10px] font-bold text-[#9CA3AF] bg-gray-900 px-2 py-0.5 rounded-full">{c.category}</span>
                                        <span className="text-[10px] text-[#6B7280] flex items-center gap-1"><MessageSquare size={10} /> {c.responses.length} responses</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Detail Panel */}
                    <div className="bg-[#2B2B2B] rounded-2xl border border-[#D4D4D4]/10 p-6 h-fit sticky top-[86px]">
                        {selected ? (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between pb-3 border-b border-[#D4D4D4]/10">
                                    <h3 className="text-white font-bold">{selected.id}</h3>
                                    <button onClick={() => setSelected(null)} className="p-1 text-[#B3B3B3] hover:text-white rounded-lg hover:bg-white/10"><X size={16} /></button>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center"><User size={18} className="text-[#B3B3B3]" /></div>
                                    <div>
                                        <p className="text-white font-semibold text-sm">{selected.passenger}</p>
                                        <p className="text-[10px] text-[#9CA3AF]">{selected.pnr && `PNR: ${selected.pnr}`}{selected.coach && ` • Coach ${selected.coach}`}{selected.seat && ` / Berth ${selected.seat}`}</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    {[['Category', selected.category], ['Priority', selected.priority], ['Status', selected.status], ['Assigned', selected.assignedTo]].map(([l, v]) => (
                                        <div key={l} className="bg-gray-900 rounded-lg p-2.5 border border-[#D4D4D4]/5">
                                            <p className="text-[9px] font-bold text-[#9CA3AF] uppercase">{l}</p>
                                            <p className="text-xs font-semibold text-white">{v}</p>
                                        </div>
                                    ))}
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-[#9CA3AF] uppercase mb-1.5">Description</p>
                                    <p className="text-xs text-[#B3B3B3] leading-relaxed bg-gray-900 rounded-xl p-3 border border-[#D4D4D4]/5">{selected.description}</p>
                                </div>
                                {/* Status Change */}
                                <div className="flex gap-2">
                                    {['Open', 'In Progress', 'Resolved'].map(s => (
                                        <button key={s} onClick={() => handleStatusChange(selected.id, s)}
                                            className={`flex-1 px-2 py-2 rounded-lg text-[10px] font-bold uppercase transition border ${selected.status === s ? `${statusColor[s]} border-transparent` : 'bg-gray-900 text-[#9CA3AF] border-[#D4D4D4]/5 hover:border-[#D4D4D4]/20'}`}>
                                            {s}
                                        </button>
                                    ))}
                                </div>
                                {/* Response Thread */}
                                <div>
                                    <p className="text-[10px] font-bold text-[#9CA3AF] uppercase mb-2">Activity ({selected.responses.length})</p>
                                    <div className="space-y-2 max-h-52 overflow-y-auto">
                                        {selected.responses.map((r, i) => (
                                            <div key={i} className="bg-gray-900 rounded-lg p-2.5 border border-[#D4D4D4]/5">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-[10px] font-bold text-white">{r.by}</p>
                                                    <p className="text-[9px] text-[#6B7280]">{r.time}</p>
                                                </div>
                                                <p className="text-[11px] text-[#B3B3B3] mt-0.5">{r.text}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                {/* Add Response */}
                                <div className="flex gap-2">
                                    <input type="text" value={newResponse} onChange={e => setNewResponse(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleAddResponse(selected.id)}
                                        placeholder="Add a response…"
                                        className="flex-1 bg-gray-900 rounded-lg px-3 py-2 text-xs text-white placeholder:text-[#9CA3AF] outline-none border border-[#D4D4D4]/10" />
                                    <button onClick={() => handleAddResponse(selected.id)} disabled={saving}
                                        className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition disabled:opacity-50">
                                        <Send size={14} />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-64 text-[#B3B3B3]">
                                <AlertCircle size={40} className="mb-3 opacity-30" />
                                <p className="text-sm font-medium">Select a complaint</p>
                                <p className="text-xs text-[#6B7280] mt-1">Click to view details and respond</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
