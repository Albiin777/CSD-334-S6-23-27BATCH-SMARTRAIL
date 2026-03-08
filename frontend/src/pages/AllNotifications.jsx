import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Ticket, Info, Newspaper, Inbox, Bell, CheckCircle2 } from 'lucide-react';
import { notificationApi } from '../api/notification.api';
import { supabase } from '../utils/supabaseClient';

export default function AllNotifications() {
    const [notifications, setNotifications] = useState([]);
    const [activeTab, setActiveTab] = useState('all'); // 'all' | 'foryou'
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();
    const [user, setUser] = useState(null);

    const isLoggedIn = !!user;

    // Supabase auth state listener
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });

        return () => subscription.unsubscribe();
    }, []);

    useEffect(() => {
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
    }, [isLoggedIn]);

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
        if (notif.link && notif.link !== '#') {
            navigate(notif.link);
        }
    };

    const getIcon = (type, isRead) => {
        const iconClass = isRead ? "text-slate-500" : "text-white";
        const iconSize = 22;

        switch (type) {
            case 'alert': return <AlertTriangle size={iconSize} className={iconClass} />;
            case 'reminder': return <Ticket size={iconSize} className={iconClass} />;
            case 'info': return <Info size={iconSize} className={iconClass} />;
            case 'news': return <Newspaper size={iconSize} className={iconClass} />;
            default: return <Bell size={iconSize} className={iconClass} />;
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
                            ? 'text-orange-500 border-orange-500 bg-[#1D2332]/50'
                            : 'text-gray-400 border-transparent hover:text-gray-200 hover:bg-white/5'
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
                    {isLoading ? (
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

                                            <p className={`text-sm leading-relaxed mb-3 ${notif.is_read ? 'text-gray-500' : 'text-gray-400'}`}>
                                                {notif.message}
                                            </p>

                                            {/* Action Links */}
                                            {notif.link && (
                                                <div className="flex items-center gap-1.5 text-xs font-semibold text-orange-500 group-hover:text-orange-400 transition">
                                                    <span>{notif.type === 'news' ? 'Read Article' : 'View Details'}</span>
                                                    <span className="group-hover:translate-x-1 transition-transform">→</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
