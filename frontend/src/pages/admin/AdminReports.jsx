import { useState, useEffect } from "react";
import { db } from "../../utils/firebaseClient";
import { collection, query, getDocs, where, orderBy } from "firebase/firestore";

export default function AdminReports() {
    const [loading, setLoading] = useState(true);
    const [passengerData, setPassengerData] = useState([]);
    const [dutyData, setDutyData] = useState([]);

    useEffect(() => {
        const fetchAnalytics = async () => {
            setLoading(true);
            try {
                const now = new Date();
                const sevenDaysAgo = new Date();
                sevenDaysAgo.setDate(now.getDate() - 7);

                // 1. Fetch Passenger Density (Bookings)
                const bookingSnap = await getDocs(query(
                    collection(db, "pnr_bookings"),
                    where("created_at", ">=", sevenDaysAgo.toISOString()),
                    orderBy("created_at", "asc")
                ));

                const dailyBookings = {};
                bookingSnap.docs.forEach(doc => {
                    const data = doc.data();
                    const date = data.created_at.split('T')[0];
                    const passengerCount = data.passengers?.length || 0;
                    dailyBookings[date] = (dailyBookings[date] || 0) + passengerCount;
                });

                // 2. Fetch TTE Duty Map
                const dutySnap = await getDocs(query(
                    collection(db, "tte_assignments"),
                    where("duty_date", ">=", sevenDaysAgo.toISOString().split('T')[0])
                ));

                const dailyDuties = {};
                dutySnap.docs.forEach(doc => {
                    const data = doc.data();
                    const date = data.duty_date;
                    // Simplified: Each assignment counts as 1 unit of activity
                    dailyDuties[date] = (dailyDuties[date] || 0) + 1;
                });

                // Generate last 7 days array
                const last7Days = [];
                for (let i = 6; i >= 0; i--) {
                    const d = new Date();
                    d.setDate(now.getDate() - i);
                    const ds = d.toISOString().split('T')[0];
                    const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' });
                    
                    last7Days.push({
                        date: ds,
                        label: dayLabel,
                        passengers: dailyBookings[ds] || 0,
                        duties: dailyDuties[ds] || 0,
                        isToday: i === 0
                    });
                }

                setPassengerData(last7Days);
                setDutyData(last7Days);

            } catch (error) {
                console.error("Analytics Error:", error);
            }
            setLoading(false);
        };

        fetchAnalytics();
    }, []);

    // Calculate dynamic bar height
    const maxPassengers = Math.max(...passengerData.map(d => d.passengers), 1);
    const maxDuties = Math.max(...dutyData.map(d => d.duties), 1);
    return (
        <div className="space-y-6 animate-fade-in text-gray-100 font-sans">
            <div className="flex justify-between items-center mb-6 pt-4 px-2">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#10b981] to-[#3b82f6] flex items-center justify-center text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" /></svg>
                    </div>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">Analytics & Reports</h1>
                        <p className="text-gray-400 text-sm mt-1 font-medium tracking-wide">System performance and metrics</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mx-2">
                <div className="bg-[#1D2332] rounded-2xl border border-white/5 shadow-2xl p-6 relative overflow-hidden">
                    {loading && <div className="absolute inset-0 bg-[#1D2332]/50 backdrop-blur-sm z-10 flex items-center justify-center"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>}
                    <h3 className="font-bold text-white mb-4">Passenger Density (7 Days)</h3>
                    <div className="h-48 w-full flex items-end gap-2 px-2 border-b border-l border-gray-700/50 pb-2">
                        {passengerData.map((d, i) => (
                            <div 
                                key={i}
                                title={`${d.label}: ${d.passengers} pax`}
                                style={{ height: `${(d.passengers / (maxPassengers * 1.2)) * 100}%`, minHeight: '4px' }}
                                className={`w-1/7 bg-blue-500/80 rounded-t flex-1 hover:bg-blue-400 transition-all duration-500 ${d.isToday ? 'shadow-[0_0_15px_rgba(59,130,246,0.3)] bg-blue-400' : ''}`}
                            ></div>
                        ))}
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-500 uppercase tracking-widest mt-2 px-2 font-bold">
                        {passengerData.map((d, i) => (
                            <span key={i} className={d.isToday ? 'text-white' : ''}>{d.label}</span>
                        ))}
                    </div>
                </div>

                <div className="bg-[#1D2332] rounded-2xl border border-white/5 shadow-2xl p-6 relative overflow-hidden">
                    {loading && <div className="absolute inset-0 bg-[#1D2332]/50 backdrop-blur-sm z-10 flex items-center justify-center"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>}
                    <h3 className="font-bold text-white mb-4">TTE Duty Load Map</h3>
                    <div className="h-48 w-full flex items-end gap-2 px-2 border-b border-l border-gray-700/50 pb-2">
                        {dutyData.map((d, i) => (
                            <div 
                                key={i}
                                title={`${d.label}: ${d.duties} assignments`}
                                style={{ height: `${(d.duties / (maxDuties * 1.2)) * 100}%`, minHeight: '4px' }}
                                className={`w-1/7 bg-emerald-500/80 rounded-t flex-1 hover:bg-emerald-400 transition-all duration-500 ${d.isToday ? 'shadow-[0_0_15px_rgba(16,185,129,0.3)] bg-emerald-400' : ''}`}
                            ></div>
                        ))}
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-500 uppercase tracking-widest mt-2 px-2 font-bold">
                        {dutyData.map((d, i) => (
                            <span key={i} className={d.isToday ? 'text-white' : ''}>{d.label}</span>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
