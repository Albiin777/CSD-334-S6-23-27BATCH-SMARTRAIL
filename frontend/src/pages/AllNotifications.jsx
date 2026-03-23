import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Ticket, Info, Newspaper, Inbox, Bell, CheckCircle2, X, Clock, ExternalLink } from 'lucide-react';
import { notificationApi } from '../api/notification.api';
import { auth } from '../utils/firebaseClient';
import { onAuthStateChanged } from 'firebase/auth';

export default function AllNotifications() {
    const [notifications, setNotifications] = useState([]);
    const [activeTab, setActiveTab] = useState('all'); // 'all' | 'foryou'
    const [isLoading, setIsLoading] = useState(true);
    const [authLoading, setAuthLoading] = useState(true); // Track auth state loading
    const [selectedNotif, setSelectedNotif] = useState(null); // Selected notification for detail view
    const navigate = useNavigate();
    const [user, setUser] = useState(null);

    const isLoggedIn = !!user;

    // Scroll to top on mount
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'instant' });
    }, []);

    // Firebase auth state listener
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setAuthLoading(false);
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        // Don't fetch until auth state is determined
        if (authLoading) return;
        
        const fetchNotifications = async () => {
            try {
                setIsLoading(true);
                const data = await notificationApi.getNotifications();
                setNotifications(data);
            } catch (error) {
                console.error("Error fetching notifications:", error);
            } finally {
                setIsLoading(false);
            }
        };

        // Only fetch if logged in
        if (isLoggedIn) {
            fetchNotifications();
        } else {
            setIsLoading(false);
            setNotifications([]);
        }
    }, [isLoggedIn, authLoading]);

    const filteredNotifications = notifications.filter(n => {
        if (activeTab === 'foryou') return n.for_you;
        return true; // 'all'
    });

    const unreadCount = filteredNotifications.filter(n => !n.is_read).length;

    const markAllAsRead = async () => {
        try {
            await notificationApi.markAllAsRead();
            setNotifications(notifications.map(n => ({ ...n, is_read: true })));
        } catch (error) {
            console.error(error);
        }
    };

    const markAsRead = async (id) => {
        try {
            await notificationApi.markAsRead(id);
            setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: true } : n));
        } catch (error) {
            console.error(error);
        }
    };

    const handleNotificationClick = (notif) => {
        if (!notif.is_read) {
            markAsRead(notif.id);
        }
        // Show the notification detail modal
        setSelectedNotif(notif);
    };

    const getIcon = (type, isRead, size = 22) => {
        const iconClass = isRead ? "text-slate-500" : "text-white";

        switch (type) {
            case 'alert': return <AlertTriangle size={size} className={iconClass} />;
            case 'reminder': return <Ticket size={size} className={iconClass} />;
            case 'info': return <Info size={size} className={iconClass} />;
            case 'news': return <Newspaper size={size} className={iconClass} />;
            default: return <Bell size={size} className={iconClass} />;
        }
    };

    const getTypeLabel = (type) => {
        switch (type) {
            case 'alert': return 'Alert';
            case 'reminder': return 'Reminder';
            case 'info': return 'Information';
            case 'news': return 'News';
            default: return 'Notification';
        }
    };

    const getTypeColor = (type) => {
        switch (type) {
            case 'alert': return 'bg-red-500/20 text-red-400 border-red-500/30';
            case 'reminder': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
            case 'info': return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
            case 'news': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
            default: return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
        }
    };

    return (
        <div className="min-h-screen pt-40 pb-20 px-4 bg-[#0f172a] text-gray-100 font-sans">
            <div className="max-w-4xl mx-auto">

                {/* Header Section */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2 flex items-center gap-3">
                            Notifications
                            {unreadCount > 0 && (
                                <span className="bg-orange-500/20 text-orange-400 text-sm px-3 py-1 rounded-full border border-orange-500/30 font-medium">
                                    {unreadCount} New
                                </span>
                            )}
                        </h1>
                        <p className="text-gray-400 text-sm">Stay updated with the latest alerts, waitlist statuses, and railway news.</p>
                    </div>
                    {unreadCount > 0 && (
                        <button
                            onClick={markAllAsRead}
                            className="flex items-center gap-2 self-start sm:self-auto px-4 py-2 bg-[#1D2332] hover:bg-[#212838] border border-gray-700 text-gray-300 hover:text-white rounded-lg text-sm font-semibold transition"
                        >
                            <CheckCircle2 size={16} className="text-orange-500" />
                            Mark all as read
                        </button>
                    )}
                </div>

                {/* Filters */}
                <div className="flex gap-2 mb-6 border-b border-gray-700pb-1">
                    <button
                        onClick={() => setActiveTab('all')}
                        className={`px-5 py-2.5 rounded-t-lg font-medium text-sm transition-colors border-b-2 ${activeTab === 'all'
                            ? 'text-orange-500 border-orange-500 bg-[#1D2332]/50 '
                            : 'text-gray-400 border-transparent hover:text-gray-200 hover:bg-white/5 '
                            }`}
                    >
                        All Notifications
                    </button>
                    <button
                        onClick={() => setActiveTab('foryou')}
                        className={`px-5 py-2.5 rounded-t-lg font-medium text-sm transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'foryou'
                            ? 'text-orange-500 border-orange-500 bg-[#1D2332]/50'
                            : 'text-gray-400 border-transparent hover:text-gray-200 hover:bg-white/5'
                            }`}
                    >
                        <Bell size={14} className={activeTab === 'foryou' ? 'text-orange-500' : 'text-gray-500'} />
                        For You
                    </button>
                </div>

                {/* Notifications List */}
                <div className="bg-[#1D2332] rounded-xl border border-gray-700 shadow-lg overflow-hidden">
                    {(isLoading || authLoading) ? (
                        <div className="px-6 py-16 text-center text-gray-500 flex flex-col items-center">
                            <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                            <p className="text-sm font-medium">Loading notifications...</p>
                        </div>
                    ) : filteredNotifications.length === 0 ? (
                        <div className="px-6 py-16 text-center text-gray-500 flex flex-col items-center">
                            <Inbox size={48} className="mb-4 text-gray-600 opacity-50" />
                            {activeTab === 'foryou' && !isLoggedIn ? (
                                <>
                                    <p className="text-lg font-medium text-gray-400">Log in to see your notifications</p>
                                    <p className="text-sm mt-1">Updates about your tickets will appear here.</p>
                                </>
                            ) : (
                                <>
                                    <p className="text-lg font-medium text-gray-400">You are all caught up!</p>
                                    <p className="text-sm mt-1">No pending notifications in this view.</p>
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col divide-y divide-gray-700/50">
                            {filteredNotifications.map((notif) => (
                                <div
                                    key={notif.id}
                                    onClick={() => handleNotificationClick(notif)}
                                    className={`
                                        px-6 py-5 cursor-pointer transition-all duration-300
                                        ${notif.is_read ? 'bg-transparent opacity-70 hover:bg-white/5' : 'bg-[#1D2332] hover:bg-white/5 border-l-[3px] border-l-orange-500/50'}
                                    `}
                                >
                                    <div className={`flex gap-4 sm:gap-6 ${notif.is_read ? 'ml-1' : '-ml-[3px]'}`}>
                                        {/* Icon */}
                                        <div className="shrink-0 mt-1.5 flex items-center justify-center w-10">
                                            {getIcon(notif.type, notif.is_read)}
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1">
                                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-1.5 gap-1 sm:gap-4">
                                                <h4 className={`text-base font-bold tracking-wide ${notif.is_read ? 'text-gray-400' : 'text-gray-200'}`}>
                                                    {notif.title}
                                                </h4>
                                                <span className="text-[11px] font-medium text-gray-400 whitespace-nowrap bg-gray-900/40 px-2 py-1 rounded">
                                                    {new Date(notif.created_at).toLocaleDateString()}
                                                </span>
                                            </div>

                                            <p className={`text-sm leading-relaxed mb-3 line-clamp-2 ${notif.is_read ? 'text-gray-500' : 'text-gray-400'}`}>
                                                {notif.message}
                                            </p>

                                            {/* Action Links */}
                                            <div className="flex items-center gap-1.5 text-xs font-semibold text-orange-500 hover:text-orange-400 transition">
                                                <span>View Details</span>
                                                <span className="group-hover:translate-x-1 transition-transform">→</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>

            {/* Notification Detail Modal */}
            {selectedNotif && (
                <div 
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
                    onClick={() => setSelectedNotif(null)}
                >
                    <div 
                        className="bg-[#1D2332] rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-hidden border border-gray-700"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="flex items-start justify-between p-5 border-b border-gray-700 bg-[#212838]">
                            <div className="flex items-center gap-3">
                                <div className={`p-2.5 rounded-xl ${getTypeColor(selectedNotif.type).replace('text-', 'bg-').split(' ')[0]}`}>
                                    {getIcon(selectedNotif.type, false, 24)}
                                </div>
                                <div>
                                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${getTypeColor(selectedNotif.type)}`}>
                                        {getTypeLabel(selectedNotif.type)}
                                    </span>
                                </div>
                            </div>
                            <button 
                                onClick={() => setSelectedNotif(null)}
                                className="p-2 hover:bg-white/10 rounded-lg transition text-gray-400 hover:text-white"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 overflow-y-auto max-h-[60vh]">
                            {/* Title */}
                            <h2 className="text-xl font-bold text-white mb-3">
                                {selectedNotif.title}
                            </h2>

                            {/* Date & Time */}
                            <div className="flex items-center gap-2 text-gray-400 text-sm mb-5">
                                <Clock size={14} />
                                <span>
                                    {new Date(selectedNotif.created_at).toLocaleDateString('en-IN', {
                                        weekday: 'long',
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    })}
                                    {' at '}
                                    {new Date(selectedNotif.created_at).toLocaleTimeString('en-IN', {
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </span>
                            </div>

                            {/* Full Message */}
                            <div className="bg-[#0f172a] rounded-xl p-5 border border-gray-700/50">
                                <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                                    {selectedNotif.message}
                                </p>
                            </div>

                            {/* Additional Info if available */}
                            {selectedNotif.for_you && (
                                <div className="mt-4 flex items-center gap-2 text-emerald-400 text-xs font-semibold bg-emerald-500/10 px-3 py-2 rounded-lg border border-emerald-500/20">
                                    <Bell size={14} />
                                    <span>This notification is personalized for you</span>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="flex items-center justify-between gap-3 p-5 border-t border-gray-700 bg-[#212838]">
                            <button
                                onClick={() => setSelectedNotif(null)}
                                className="px-4 py-2.5 text-sm font-semibold text-gray-400 hover:text-white transition"
                            >
                                Close
                            </button>
                            
                            {selectedNotif.link && selectedNotif.link !== '#' && selectedNotif.link.startsWith('/') && (
                                <button
                                    onClick={() => {
                                        setSelectedNotif(null);
                                        navigate(selectedNotif.link);
                                    }}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold rounded-lg transition"
                                >
                                    <ExternalLink size={16} />
                                    Go to Link
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
