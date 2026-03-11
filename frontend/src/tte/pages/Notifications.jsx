import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../utils/firebaseClient';
import { collection, query, getDocs, orderBy, limit } from 'firebase/firestore';
import { Bell, Info, AlertTriangle, CheckCircle, Trash2, Calendar, Filter } from 'lucide-react';

const TYPE_CONFIG = {
    info: { icon: Info, color: 'text-blue-400 bg-blue-500/10 border-blue-500/20', label: 'Information' },
    warning: { icon: AlertTriangle, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20', label: 'Warning' },
    alert: { icon: AlertTriangle, color: 'text-red-400 bg-red-500/10 border-red-500/20', label: 'Urgent Alert' },
    success: { icon: CheckCircle, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', label: 'Success' },
};

export default function Notifications() {
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterType, setFilterType] = useState('all');

    useEffect(() => {
        fetchNotifications();
    }, []);

    const fetchNotifications = async () => {
        setLoading(true);
        try {
            // Fetch all notifications and filter client-side to avoid composite index requirement
            const q = query(
                collection(db, "notifications"),
                orderBy("created_at", "desc"),
                limit(50)
            );
            
            const snap = await getDocs(q);
            const allNotifs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            // Filter for broadcast notifications (userId is null) targeting TTEs or all
            const tteNotifs = allNotifs.filter(n => 
                (n.userId === null || n.userId === undefined) && 
                (n.target === 'all' || n.target === 'ttes')
            );
            
            setNotifications(tteNotifs);
        } catch (err) {
            console.error("Failed to fetch notifications:", err);
        }
        setLoading(false);
    };

    const handleNotificationClick = (notif) => {
        if (!notif.link) return;
        
        if (notif.link.startsWith('http')) {
            window.open(notif.link, '_blank');
        } else {
            navigate(notif.link);
        }
    };

    const filtered = filterType === 'all' 
        ? notifications 
        : notifications.filter(n => n.type === filterType);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center text-white shadow-xl shadow-black/20">
                        <Bell size={24} className="text-blue-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-white tracking-tight">System Notifications</h1>
                        <p className="text-xs text-[#B3B3B3] font-medium tracking-wide flex items-center gap-1.5 uppercase mt-0.5 opacity-70">
                            Broadcasts & Network Alerts
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 bg-[#1a1a1a] rounded-xl p-1 border border-white/5">
                    {['all', 'info', 'warning', 'alert'].map(type => (
                        <button
                            key={type}
                            onClick={() => setFilterType(type)}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all duration-200 ${
                                filterType === type 
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                                : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                            }`}
                        >
                            {type}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center h-64 text-[#B3B3B3] bg-[#1a1a1a] rounded-3xl border border-white/5">
                    <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-sm font-medium tracking-wide">Syncing with Central Server...</p>
                </div>
            ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-[#B3B3B3] bg-[#1a1a1a] rounded-3xl border border-white/5">
                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                        <Bell size={32} className="opacity-20" />
                    </div>
                    <p className="text-sm font-bold text-gray-400">No notifications found</p>
                    <p className="text-xs text-gray-500 mt-1">You are all caught up with network updates</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {filtered.map(notif => {
                        const config = TYPE_CONFIG[notif.type] || TYPE_CONFIG.info;
                        const Icon = config.icon;
                        const date = notif.created_at ? new Date(notif.created_at) : new Date();

                        return (
                            <div 
                                key={notif.id} 
                                onClick={() => handleNotificationClick(notif)}
                                className={`group relative bg-[#1a1a1a] border border-white/5 rounded-2xl p-5 transition-all duration-300 hover:shadow-2xl hover:shadow-black/40 ${notif.link ? 'cursor-pointer hover:bg-[#222]' : ''}`}
                            >
                                <div className="flex gap-4">
                                    <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center border ${config.color}`}>
                                        <Icon size={20} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1.5">
                                            <h3 className="text-white font-bold text-base line-clamp-1">{notif.title || "Notification"}</h3>
                                            <div className="flex items-center gap-2 text-[10px] text-gray-500 font-bold uppercase shrink-0">
                                                <Calendar size={12} />
                                                {date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                <span className="opacity-30">|</span>
                                                {date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </div>
                                        <p className="text-sm text-[#B3B3B3] leading-relaxed mb-3">
                                            {notif.message}
                                        </p>
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-3">
                                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${config.color}`}>
                                                    {config.label}
                                                </span>
                                                {notif.target && (
                                                    <span className="text-[9px] font-bold text-gray-500 flex items-center gap-1 uppercase bg-white/5 px-2 py-0.5 rounded-full">
                                                        Target: {notif.target}
                                                    </span>
                                                )}
                                            </div>

                                            {notif.link && (
                                                <div className="flex items-center gap-1 text-[10px] font-black uppercase text-blue-400 group-hover:underline">
                                                    View Details <span>→</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
