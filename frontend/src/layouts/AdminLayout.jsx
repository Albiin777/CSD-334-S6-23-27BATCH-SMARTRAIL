import { useState, useEffect } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { auth, db } from "../utils/firebaseClient";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

import { LayoutDashboard, Train, Armchair, Users, ClipboardList, Banknote, MessageSquare, Bell, LineChart, ShieldCheck, LogOut, Menu, X } from "lucide-react";
import MiniFooter from "../components/common/MiniFooter";

const ICONS = {
    Dashboard: ({ className }) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>,
    Trains: ({ className }) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h14M5 8a2 2 0 00-2 2v8a2 2 0 002 2h14a2 2 0 002-2v-8a2 2 0 00-2-2H5z" /></svg>,
    Seats: ({ className }) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>,
    Users: ({ className }) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
    Assign: ({ className }) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
    Fares: ({ className }) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    Complaints: ({ className }) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>,
    Notifications: ({ className }) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>,
    Reports: ({ className }) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" /></svg>,
};

const NAV = [
    { path: "/admin", label: "Dashboard", icon: ICONS.Dashboard, exact: true },
    { path: "/admin/trains", label: "Trains", icon: ICONS.Trains },
    { path: "/admin/seats", label: "Seat Management", icon: ICONS.Seats },
    { path: "/admin/ttes", label: "TTE Staff", icon: ICONS.Users },
    { path: "/admin/assignments", label: "TTE Assign", icon: ICONS.Assign },
    { path: "/admin/fares", label: "Fare Editor", icon: ICONS.Fares },
    { path: "/admin/complaints", label: "Complaints", icon: ICONS.Complaints },
    { path: "/admin/notifications", label: "Notifications", icon: ICONS.Notifications },
    { path: "/admin/reports", label: "Reports", icon: ICONS.Reports },
];

// Internal small arrow component 
function ArrowRight({ className }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
    );
}

export default function AdminLayout() {
    const navigate = useNavigate();
    const [sideOpen, setSideOpen] = useState(false);
    const [adminIdentifier, setAdminIdentifier] = useState("Loading...");
    const [adminName, setAdminName] = useState("");

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setAdminIdentifier(user.email);
                // Fetch name from profile
                try {
                    const pDoc = await getDoc(doc(db, 'profiles', user.uid));
                    if (pDoc.exists() && (pDoc.data().full_name || pDoc.data().name)) {
                        setAdminName(pDoc.data().full_name || pDoc.data().name);
                    }
                } catch (e) {
                    console.error("Layout name fetch error:", e);
                }
            } else {
                setAdminIdentifier("Unknown User");
                setAdminName("");
            }
        });
        return () => unsubscribe();
    }, []);

    const handleLogout = async () => {
        await signOut(auth);
        localStorage.removeItem("isAdmin");
        navigate("/");
    };

    return (
        <div className="h-screen flex overflow-hidden bg-[#080f1e] text-gray-100 font-sans">
            {/* Overlay for mobile */}
            {sideOpen && (
                <div
                    className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm md:hidden"
                    onClick={() => setSideOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed inset-y-0 left-0 z-40 flex flex-col w-64 h-full bg-[#0d1526] border-r border-white/5
                transform transition-transform duration-300 ease-in-out
                ${sideOpen ? "translate-x-0" : "-translate-x-full"}
                md:translate-x-0 md:static md:inset-auto
            `}>
                <div className="flex items-center gap-3 px-6 py-5 border-b border-white/5 bg-[#0a1120] min-h-[81px]">
                    <div className="w-10 h-10 flex items-center justify-center">
                        <img src="/trainwhite.png" alt="Logo" className="w-full h-full object-contain" />
                    </div>
                    <div>
                        <div className="text-white font-extrabold text-base tracking-wide">SmartRail</div>
                        <div className="text-[#10b981] text-[10px] font-bold uppercase tracking-[0.2em]">Admin</div>
                    </div>
                    <button className="ml-auto md:hidden text-gray-400 hover:text-white" onClick={() => setSideOpen(false)}>
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto scrollbar-hide">
                    <div className="min-h-full flex flex-col">
                        <div className="px-6 py-4 border-b border-white/5 bg-[#0d1526]/50">
                            <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1">Session</div>
                            <div className="text-gray-200 text-sm font-medium truncate">{adminName || adminIdentifier}</div>
                            {adminName && <div className="text-gray-500 text-[10px] truncate mt-0.5">{adminIdentifier}</div>}
                        </div>

                        <nav className="flex-1 px-4 py-6 space-y-1.5">
                            {NAV.map(item => (
                                <NavLink
                                    key={item.path}
                                    to={item.path}
                                    end={item.exact}
                                    onClick={() => setSideOpen(false)}
                                    className={({ isActive }) =>
                                        `group flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all
                                        ${isActive ? "bg-[#10b981]/10 text-[#10b981] border-l-2 border-[#10b981]" : "text-gray-400 hover:text-gray-100 hover:bg-white/5"}`
                                    }
                                >
                                    <item.icon className="w-5 h-5" />
                                    <span>{item.label}</span>
                                </NavLink>
                            ))}
                        </nav>

                        <div className="px-6 border-t border-white/5 bg-[#0a1120] min-h-[77px] flex items-center mt-auto">
                            <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold text-sm transition-all whitespace-nowrap">
                                <LogOut className="w-4 h-4" />
                                Sign Out Session
                            </button>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Area */}
            <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
                <header className="flex items-center justify-between px-8 py-5 bg-[#080f1e]/80 backdrop-blur-lg border-b border-white/5 sticky top-0 z-20 min-h-[81px]">
                    <div className="flex items-center gap-3 text-sm font-medium">
                        <span className="text-gray-400">Workspace</span>
                        <ArrowRight className="w-4 h-4 text-gray-600" />
                        <span className="text-gray-200">System Dashboard</span>
                    </div>
                    <button onClick={() => setSideOpen(true)} className="md:hidden p-2 text-gray-400"><Menu className="w-6 h-6" /></button>
                    <div className="hidden md:flex items-center gap-5">
                        <div className="flex items-center gap-3 px-4 py-1.5 rounded-full bg-white/5 border border-white/5">
                            <div className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse"></div>
                            <span className="text-xs text-gray-300">System Online</span>
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto w-full flex flex-col">
                    <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-[1400px] mx-auto w-full">
                        <Outlet />
                    </main>
                    <MiniFooter />
                </div>
            </div>
        </div>
    );
}

