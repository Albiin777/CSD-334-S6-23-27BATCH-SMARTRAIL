import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Menu, Bell, AlertTriangle, UserX, ShieldAlert, X, LogOut, ChevronDown, User, Train, Clock, MapPin, Database } from 'lucide-react';
import { useSmartRail } from '../hooks/useSmartRail';

const pageTitles = {
    '/': 'Dashboard',
    '/verify': 'Passenger Verification',
    '/seats': 'Seat Management',
    '/waitlist': 'WL & RAC Management',

    '/fines': 'Fines & Penalty',
    '/noshow': 'No-Show Management',
    '/incidents': 'Incident Reporting',
    '/handover': 'TT Handover',
    '/analytics': 'Analytics & Reports',
    '/reviews': 'Passenger Reviews',
    '/complaints': 'Complaints Management',
};

export default function Header({ onMenuClick }) {
    const { pathname } = useLocation();
    const { tteInfo, incidents, allPassengers, stats } = useSmartRail();
    const [showNotifs, setShowNotifs] = useState(false);
    const [showProfile, setShowProfile] = useState(false);
    const profileRef = useRef(null);
    const notifRef = useRef(null);
    const title = pageTitles[pathname] || 'TTE Command Center';

    // Close dropdowns on outside click
    useEffect(() => {
        function handleClickOutside(e) {
            if (profileRef.current && !profileRef.current.contains(e.target)) setShowProfile(false);
            if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifs(false);
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const activeIncidents = incidents.filter(i => i.status === 'Active');
    const unverified = allPassengers.filter(p => !p.verified && p.status !== 'No-Show').length;
    const waitlist = allPassengers.filter(p => p.status === 'Waitlist').length;

    const notifications = [
        ...activeIncidents.map(i => ({ icon: ShieldAlert, color: 'text-red-500 bg-red-50', text: `${i.type}: ${i.description}`, time: i.time })),
        ...(unverified > 0 ? [{ icon: UserX, color: 'text-amber-500 bg-amber-50', text: `${unverified} passengers not yet verified`, time: 'Now' }] : []),
        ...(waitlist > 0 ? [{ icon: AlertTriangle, color: 'text-orange-500 bg-orange-50', text: `${waitlist} passengers on waitlist`, time: 'Now' }] : []),
    ];

    const count = notifications.length;

    return (
        <header className="sticky top-0 z-30 h-[70px] bg-[#FFFFFF] border-b border-[#D4D4D4] flex items-center justify-between px-4 lg:px-6">
            <div className="flex items-center gap-3 min-w-0">
                <button onClick={onMenuClick} className="lg:hidden p-2 -ml-2 rounded-xl text-[#2B2B2B] hover:bg-gray-100 transition shrink-0">
                    <Menu size={22} />
                </button>
                <div className="flex items-center gap-2 shrink-0">
                    <img src="/trainnew.png" alt="Logo" className="h-[22px] sm:h-[26px]" />
                    <span className="text-[18px] sm:text-[22px] font-bold text-[#2B2B2B] tracking-tight hidden sm:block">SmartRail</span>
                </div>
                <div className="hidden sm:block h-5 w-px bg-[#D4D4D4] mx-1 shrink-0"></div>
                <h2 className="text-base sm:text-lg font-bold text-[#2B2B2B] truncate">{title}</h2>
            </div>

            <div className="flex items-center gap-2">

                {/* Notification Bell */}
                <div className="relative" ref={notifRef}>
                    <button onClick={() => { setShowNotifs(!showNotifs); setShowProfile(false); }} className="relative p-2 rounded-xl text-[#2B2B2B] hover:bg-gray-100 transition">
                        <Bell size={20} />
                        {count > 0 && (
                            <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 bg-red-500 rounded-full flex items-center justify-center text-[9px] font-bold text-white">
                                {count}
                            </span>
                        )}
                    </button>
                    {showNotifs && (
                        <div className="absolute top-full right-0 mt-2 w-80 bg-white border border-[#D4D4D4] rounded-2xl shadow-2xl z-50 overflow-hidden">
                            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                                <p className="text-sm font-bold text-[#2B2B2B]">Notifications ({count})</p>
                                <button onClick={() => setShowNotifs(false)} className="p-1 rounded-lg hover:bg-gray-100 text-[#B3B3B3]"><X size={14} /></button>
                            </div>
                            {notifications.length === 0 ? (
                                <p className="text-sm text-[#B3B3B3] text-center py-6">No new notifications</p>
                            ) : (
                                <div className="max-h-64 overflow-y-auto divide-y divide-gray-50">
                                    {notifications.map((n, i) => (
                                        <div key={i} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${n.color}`}>
                                                <n.icon size={16} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-semibold text-[#2B2B2B] leading-snug">{n.text}</p>
                                                <p className="text-[10px] text-[#B3B3B3] mt-0.5">{n.time}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Profile Dropdown */}
                <div className="relative ml-1 pl-3 border-l border-[#D4D4D4]" ref={profileRef}>
                    <button onClick={() => { setShowProfile(!showProfile); setShowNotifs(false); }}
                        className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-gray-100 transition cursor-pointer">
                        <div className="w-8 h-8 rounded-full bg-[#2B2B2B] flex items-center justify-center text-white text-xs font-bold">
                            {(tteInfo.name || 'T').charAt(0)}
                        </div>
                        <div className="hidden md:block text-left">
                            <p className="text-xs font-semibold text-[#2B2B2B] leading-tight truncate max-w-[120px]">{tteInfo.name}</p>
                            <p className="text-[10px] text-[#B3B3B3] font-bold uppercase tracking-wider">TTE</p>
                        </div>
                        <ChevronDown size={14} className={`text-[#B3B3B3] transition-transform ${showProfile ? 'rotate-180' : ''}`} />
                    </button>

                    {showProfile && (
                        <div className="absolute top-full right-0 mt-2 w-72 bg-white border border-[#D4D4D4] rounded-2xl shadow-2xl z-50 overflow-hidden">
                            {/* Profile Header */}
                            <div className="px-5 py-4 bg-gradient-to-br from-[#2B2B2B] to-[#3d3d3d] text-white">
                                <div className="flex items-center gap-3">
                                    <div className="w-11 h-11 rounded-full bg-white/20 flex items-center justify-center text-white text-lg font-bold">
                                        {(tteInfo.name || 'T').charAt(0)}
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm">{tteInfo.name}</p>
                                        <p className="text-[10px] text-white/60 font-semibold uppercase tracking-wider">{tteInfo.id}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Details */}
                            <div className="px-4 py-3 space-y-2.5">
                                {[
                                    { icon: Train, label: 'Train', value: `${tteInfo.trainNo} — ${tteInfo.trainName}` },
                                    { icon: MapPin, label: 'Route', value: tteInfo.route },
                                    { icon: Clock, label: 'Shift', value: tteInfo.shift },
                                    { icon: User, label: 'Coach', value: tteInfo.coachLabel },
                                    { icon: Database, label: 'Data', value: tteInfo.dataSource === 'supabase' ? '✅ Supabase Live' : tteInfo.dataSource === 'error' ? '❌ DB Error' : '⏳ Loading…' },
                                ].map(item => (
                                    <div key={item.label} className="flex items-center gap-3">
                                        <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                                            <item.icon size={14} className="text-[#6B7280]" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[9px] font-bold text-[#9CA3AF] uppercase tracking-wider">{item.label}</p>
                                            <p className="text-xs font-semibold text-[#2B2B2B] truncate">{item.value}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Logout */}
                            <div className="border-t border-gray-100 px-4 py-3">
                                <button onClick={() => { setShowProfile(false); window.location.href = '/?logout=true'; }}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 rounded-xl text-xs font-bold hover:bg-red-100 transition">
                                    <LogOut size={14} /> Logout
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
