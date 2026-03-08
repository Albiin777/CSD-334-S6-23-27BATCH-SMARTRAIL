import { useState } from 'react';
import { useSmartRail } from '../hooks/useSmartRail';
import { AlertCircle, CheckCircle, Clock, User, ChevronDown, MessageSquare, Send, Filter, Search, X, FileText } from 'lucide-react';

const COMPLAINTS = [
    { id: 'CMP-001', passenger: 'Rajesh Kumar', pnr: '2541876230', coach: 'B1', seat: 1, category: 'AC Not Working', priority: 'High', status: 'Open', description: 'AC is blowing hot air since Vijayawada. Temperature is unbearable in Bay 1. Multiple passengers have complained.', date: '21 Feb 2026', time: '14:20', assignedTo: 'TTE Arun Prasad', responses: [{ by: 'System', text: 'Complaint registered. Assigned to TTE Arun Prasad.', time: '14:20' }] },
    { id: 'CMP-002', passenger: 'Fatima Begum', pnr: '6729384501', coach: 'B1', seat: 20, category: 'Cleanliness', priority: 'Medium', status: 'In Progress', description: 'Washroom near berth 17-24 is very dirty. No water in flush. Housekeeping has not visited since Chennai.', date: '21 Feb 2026', time: '13:45', assignedTo: 'Housekeeping Supervisor', responses: [{ by: 'System', text: 'Complaint registered.', time: '13:45' }, { by: 'TTE Arun Prasad', text: 'Informed housekeeping. They will attend before Nagpur.', time: '14:00' }] },
    { id: 'CMP-003', passenger: 'Ramesh Yadav', pnr: '2541820001', coach: 'S1', seat: 3, category: 'Safety', priority: 'High', status: 'Open', description: 'Door latch of Coach S1 entrance is broken. Door keeps swinging open when train moves. Very dangerous for passengers near the door.', date: '21 Feb 2026', time: '11:30', assignedTo: 'TTE Arun Prasad', responses: [{ by: 'System', text: 'Complaint registered. Marked as High Priority.', time: '11:30' }] },
    { id: 'CMP-004', passenger: 'Deepa Nair', pnr: '6729384503', coach: 'B1', seat: 25, category: 'Food Quality', priority: 'Low', status: 'Resolved', description: 'Ordered veg biryani from pantry but received plain rice with dal. Tea was also cold.', date: '21 Feb 2026', time: '12:15', assignedTo: 'Pantry Manager', responses: [{ by: 'System', text: 'Complaint registered.', time: '12:15' }, { by: 'Pantry Manager', text: 'Apologies for the mix-up. Replacement meal sent. Tea refund initiated.', time: '12:30' }, { by: 'TTE Arun Prasad', text: 'Confirmed with passenger. Issue resolved.', time: '12:45' }] },
    { id: 'CMP-005', passenger: 'Vikram Singh', pnr: '4832971045', coach: 'B1', seat: 15, category: 'Berth Allocation', priority: 'Medium', status: 'Open', description: 'I have a confirmed ticket but my berth has been given to someone else. Waitlist passenger is occupying my side lower berth.', date: '21 Feb 2026', time: '15:00', assignedTo: 'TTE Arun Prasad', responses: [{ by: 'System', text: 'Complaint registered. TTE will investigate.', time: '15:00' }] },
    { id: 'CMP-006', passenger: 'Col. Ranjit Deshmukh', pnr: '2541810001', coach: 'A1', seat: 1, category: 'AC Not Working', priority: 'High', status: 'In Progress', description: 'AC temperature set to 18°C but compartment feels like 28°C. Multiple passengers in AC 2-Tier have the same issue. Seems like a compressor failure.', date: '21 Feb 2026', time: '10:00', assignedTo: 'Electric Loco Pilot', responses: [{ by: 'System', text: 'Complaint registered.', time: '10:00' }, { by: 'TTE Arun Prasad', text: 'Escalated to electrical department. Will be checked at Nagpur halt.', time: '10:30' }] },
    { id: 'CMP-007', passenger: 'Pooja Bhatt', pnr: '2541820002', coach: 'S1', seat: 8, category: 'Noise', priority: 'Low', status: 'Open', description: 'Group of passengers in Bay 1 playing loud music at 1 AM. Cannot sleep. Requested them politely but they refused.', date: '21 Feb 2026', time: '01:15', assignedTo: 'TTE Arun Prasad', responses: [{ by: 'System', text: 'Complaint registered.', time: '01:15' }] },
    { id: 'CMP-008', passenger: 'Lakshmi Iyer', pnr: '8123456790', coach: 'B1', seat: 33, category: 'Staff Behaviour', priority: 'Medium', status: 'Resolved', description: 'Pantry attendant was rude when I asked for vegetarian food. He threw the plate on the berth.', date: '21 Feb 2026', time: '13:00', assignedTo: 'Catering Manager', responses: [{ by: 'System', text: 'Complaint registered.', time: '13:00' }, { by: 'Catering Manager', text: 'Attendant has been warned. Apology served. Complimentary meal provided.', time: '13:30' }, { by: 'TTE Arun Prasad', text: 'Passenger satisfied. Marked resolved.', time: '14:00' }] },
];

const priorityColor = { High: 'text-red-400 bg-red-500/10 border-red-500/20', Medium: 'text-amber-400 bg-amber-500/10 border-amber-500/20', Low: 'text-blue-400 bg-blue-500/10 border-blue-500/20' };
const statusColor = { Open: 'text-red-400 bg-red-500/10', 'In Progress': 'text-amber-400 bg-amber-500/10', Resolved: 'text-emerald-400 bg-emerald-500/10' };
const statusIcon = { Open: AlertCircle, 'In Progress': Clock, Resolved: CheckCircle };

const allCategories = ['All', ...new Set(COMPLAINTS.map(c => c.category))];
const allStatuses = ['All', 'Open', 'In Progress', 'Resolved'];

export default function Complaints() {
    const { tteInfo } = useSmartRail();
    const [complaints, setComplaints] = useState(COMPLAINTS);
    const [selected, setSelected] = useState(null);
    const [filterCat, setFilterCat] = useState('All');
    const [filterStatus, setFilterStatus] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [newResponse, setNewResponse] = useState('');

    let filtered = complaints;
    if (filterCat !== 'All') filtered = filtered.filter(c => c.category === filterCat);
    if (filterStatus !== 'All') filtered = filtered.filter(c => c.status === filterStatus);
    if (searchQuery) filtered = filtered.filter(c => c.passenger.toLowerCase().includes(searchQuery.toLowerCase()) || c.id.toLowerCase().includes(searchQuery.toLowerCase()) || c.pnr.includes(searchQuery));

    const openCount = complaints.filter(c => c.status === 'Open').length;
    const inProgressCount = complaints.filter(c => c.status === 'In Progress').length;
    const resolvedCount = complaints.filter(c => c.status === 'Resolved').length;

    const handleStatusChange = (id, newStatus) => {
        setComplaints(prev => prev.map(c => c.id === id ? { ...c, status: newStatus } : c));
        if (selected?.id === id) setSelected(prev => ({ ...prev, status: newStatus }));
    };

    const handleAddResponse = (id) => {
        if (!newResponse.trim()) return;
        const response = { by: `TTE ${tteInfo.name}`, text: newResponse, time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) };
        setComplaints(prev => prev.map(c => c.id === id ? { ...c, responses: [...c.responses, response] } : c));
        if (selected?.id === id) setSelected(prev => ({ ...prev, responses: [...prev.responses, response] }));
        setNewResponse('');
    };

    return (
        <div className="space-y-6">
            {/* Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="bg-[#2B2B2B] rounded-2xl border border-[#D4D4D4]/10 p-5 text-center">
                    <p className="text-3xl font-extrabold text-white">{complaints.length}</p>
                    <p className="text-[10px] font-bold text-[#9CA3AF] uppercase mt-1">Total Complaints</p>
                </div>
                <div className="bg-[#2B2B2B] rounded-2xl border border-[#D4D4D4]/10 p-5 text-center">
                    <p className="text-3xl font-extrabold text-red-400">{openCount}</p>
                    <p className="text-[10px] font-bold text-[#9CA3AF] uppercase mt-1">Open</p>
                </div>
                <div className="bg-[#2B2B2B] rounded-2xl border border-[#D4D4D4]/10 p-5 text-center">
                    <p className="text-3xl font-extrabold text-amber-400">{inProgressCount}</p>
                    <p className="text-[10px] font-bold text-[#9CA3AF] uppercase mt-1">In Progress</p>
                </div>
                <div className="bg-[#2B2B2B] rounded-2xl border border-[#D4D4D4]/10 p-5 text-center">
                    <p className="text-3xl font-extrabold text-emerald-400">{resolvedCount}</p>
                    <p className="text-[10px] font-bold text-[#9CA3AF] uppercase mt-1">Resolved</p>
                </div>
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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Complaints List */}
                <div className="lg:col-span-2 space-y-3">
                    {filtered.map(c => {
                        const StatusIcon = statusIcon[c.status];
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
                                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border ${priorityColor[c.priority]}`}>{c.priority}</span>
                                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase flex items-center gap-1 ${statusColor[c.status]}`}>
                                                    <StatusIcon size={10} /> {c.status}
                                                </span>
                                            </div>
                                            <p className="text-xs text-[#9CA3AF] mt-0.5">{c.passenger} • PNR: {c.pnr} • Coach {c.coach}</p>
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
                                    <p className="text-[10px] text-[#9CA3AF]">PNR: {selected.pnr} • Coach {selected.coach} / Berth {selected.seat}</p>
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
                                <button onClick={() => handleAddResponse(selected.id)}
                                    className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition">
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
        </div>
    );
}
