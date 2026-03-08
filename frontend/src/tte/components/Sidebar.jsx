import { NavLink, useLocation } from 'react-router-dom';
import { useSmartRail } from '../hooks/useSmartRail';
import {
    LayoutDashboard, Search, Armchair, ListOrdered,
    Banknote, UserX, AlertTriangle, RefreshCw, BarChart3,
    ChevronLeft, ChevronRight, Train, X, Star, MessageSquareWarning, Ticket
} from 'lucide-react';

const navItems = [
    { path: '/tte', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/tte/verify', label: 'Verify Passenger', icon: Search },
    { path: '/tte/seats', label: 'Seat Management', icon: Armchair },
    { path: '/tte/waitlist', label: 'WL & RAC', icon: ListOrdered },
    { path: '/tte/fines', label: 'Fines & Penalty', icon: Banknote },
    { path: '/tte/noshow', label: 'No-Show Mgmt', icon: UserX },
    { path: '/tte/incidents', label: 'Incidents', icon: AlertTriangle },
    { path: '/tte/handover', label: 'TT Handover', icon: RefreshCw },
    { path: '/tte/analytics', label: 'Analytics', icon: BarChart3 },
    { path: '/tte/reviews', label: 'Reviews', icon: Star },
    { path: '/tte/complaints', label: 'Complaints', icon: MessageSquareWarning },
    { path: '/tte/issue-ticket', label: 'Issue Ticket', icon: Ticket },
];

export default function Sidebar({ collapsed, setCollapsed, mobileOpen, setMobileOpen }) {
    const { tteInfo } = useSmartRail();
    const location = useLocation();

    const linkClasses = (isActive) =>
        `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group
     ${isActive
            ? 'bg-[#2B2B2B] text-white border border-[#D4D4D4]/20'
            : 'text-[#B3B3B3] hover:bg-[#2B2B2B]/60 hover:text-white'}`;

    const renderNav = () => (
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-hide">
            {navItems.map(({ path, label, icon: Icon }) => (
                <NavLink
                    key={path}
                    to={path}
                    end={path === '/'}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) => linkClasses(isActive)}
                    title={collapsed ? label : undefined}
                >
                    <Icon size={20} className="shrink-0" />
                    {!collapsed && <span className="truncate">{label}</span>}
                </NavLink>
            ))}
        </nav>
    );

    const desktopSidebar = (
        <aside
            className={`hidden lg:flex flex-col bg-[#1a1a1a] border-r border-[#D4D4D4]/10 h-screen sticky top-0 transition-sidebar
        ${collapsed ? 'w-[72px]' : 'w-[260px]'}`}
        >
            <div className={`flex items-center h-[70px] px-4 border-b border-[#D4D4D4]/10 shrink-0 ${collapsed ? 'justify-center' : 'gap-3'}`}>
                <div className="w-8 h-8 flex items-center justify-center shrink-0">
                    <img src="/trainwhite.png" alt="Logo" className="h-full w-full object-contain" />
                </div>
                {!collapsed && (
                    <div>
                        <h1 className="text-white font-bold text-base leading-tight">SmartRail</h1>
                        <p className="text-[#B3B3B3] text-[10px] font-semibold uppercase tracking-widest">TTE</p>
                    </div>
                )}
            </div>

            {renderNav()}

            {!collapsed && (
                <div className="px-3 pb-4 border-t border-[#D4D4D4]/10 pt-3 shrink-0">
                    <div className="px-3 py-2 rounded-xl bg-[#2B2B2B]/50">
                        <p className="text-white text-xs font-semibold truncate">{tteInfo.name}</p>
                        <p className="text-[#B3B3B3] text-[10px] uppercase tracking-wider font-bold mt-0.5">
                            {tteInfo.id}
                        </p>
                    </div>
                </div>
            )}

            <button
                onClick={() => setCollapsed(!collapsed)}
                className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-[#2B2B2B] border-2 border-[#1a1a1a] flex items-center justify-center text-[#B3B3B3] hover:text-white transition-colors z-50"
            >
                {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
            </button>
        </aside>
    );

    const mobileSidebar = mobileOpen && (
        <>
            <div className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={() => setMobileOpen(false)} />
            <aside className="lg:hidden fixed inset-y-0 left-0 w-[280px] bg-[#1a1a1a] z-50 flex flex-col shadow-2xl">
                <div className="flex items-center justify-between h-[70px] px-4 border-b border-[#D4D4D4]/10 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 flex items-center justify-center shrink-0">
                            <img src="/trainwhite.png" alt="Logo" className="h-full w-full object-contain" />
                        </div>
                        <div>
                            <h1 className="text-white font-bold text-base">SmartRail</h1>
                            <p className="text-[#B3B3B3] text-[10px] font-semibold uppercase tracking-widest">TTE</p>
                        </div>
                    </div>
                    <button onClick={() => setMobileOpen(false)} className="p-2 text-[#B3B3B3] hover:text-white">
                        <X size={20} />
                    </button>
                </div>
                {renderNav()}

            </aside>
        </>
    );

    return (
        <>
            {desktopSidebar}
            {mobileSidebar}
        </>
    );
}
