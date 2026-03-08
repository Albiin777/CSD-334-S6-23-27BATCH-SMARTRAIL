import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';
import { Train, Calendar, MapPin, Search, ArrowRight, Loader2, Ticket, ShieldCheck, Home } from 'lucide-react';
import QRCode from "react-qr-code";

export default function MyBookings() {
    const [bookings, setBookings] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                
                if (!session) {
                    setUser(null);
                    setIsLoading(false);
                    return;
                }

                setUser(session.user);
                const token = session.access_token;

                const res = await fetch('http://localhost:5001/api/bookings/history', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (!res.ok) {
                    const errorData = await res.json();
                    throw new Error(errorData.error || 'Failed to fetch booking history');
                }
                
                const data = await res.json();
                setBookings(data);
            } catch (err) {
                console.error(err);
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchHistory();
    }, []);

    if (isLoading) {
        return (
            <div className="min-h-screen pt-32 pb-20 px-4 bg-gray-900 text-white font-sans flex flex-col items-center justify-center">
                <Loader2 className="w-10 h-10 text-gray-600 animate-spin mb-4" />
                <p className="text-gray-500 font-medium">Fetching your journeys...</p>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="min-h-screen pt-32 pb-20 px-4 bg-gray-900 text-white font-sans flex items-center justify-center">
                <div className="p-8 rounded-2xl border border-slate-800 text-center max-w-sm">
                    <ShieldCheck className="w-10 h-10 text-gray-700 mx-auto mb-4" />
                    <h2 className="text-xl font-bold mb-2">My Bookings</h2>
                    <p className="text-gray-400 mb-6">Please log in to view your travel history and upcoming tickets.</p>
                    <button 
                        onClick={() => window.location.href = '/'}
                        className="w-full py-3 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition shadow-lg shadow-black/20"
                    >
                        Go to Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen pt-36 pb-20 px-4 sm:px-8 bg-gray-900 text-white font-sans">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="mb-12 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight mb-2">Booking History</h1>
                        <p className="text-gray-500 font-medium">Track your past travels and upcoming adventures.</p>
                    </div>
                </div>

                {error && (
                    <div className="mb-8 p-4 bg-red-500/5 border border-red-500/20 text-red-100 rounded-xl flex items-center gap-3">
                        <Search className="w-5 h-5 flex-shrink-0" />
                        <span className="text-sm font-medium">{error}</span>
                    </div>
                )}

                {bookings.length === 0 ? (
                    <div className="bg-transparent border border-slate-800 rounded-2xl p-20 text-center">
                        <div className="bg-slate-800/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Train className="w-8 h-8 text-gray-600" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">No journeys yet</h3>
                        <p className="text-gray-500 mb-8 max-w-xs mx-auto text-sm">Your booking history is currently empty. Ready to start your next trip?</p>
                        <button 
                            onClick={() => navigate('/')}
                            className="inline-flex items-center gap-2 px-8 py-3 bg-white text-black text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-gray-200 transition"
                        >
                            <Home className="w-3.5 h-3.5" /> Return to Home
                        </button>
                    </div>
                ) : (
                    <div className="grid gap-6">
                        {bookings.map((booking) => (
                            <div key={booking.id} className="group bg-transparent border border-slate-800 rounded-xl overflow-hidden transition-all duration-300 flex flex-col md:flex-row">
                                
                                {/* Status/Date Block */}
                                <div className="bg-slate-900/40 p-6 md:p-8 flex flex-col justify-center md:w-56 border-b md:border-b-0 md:border-r border-slate-800">
                                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-600 mb-2">
                                        <Calendar className="w-3 h-3 text-gray-700" /> Journey Date
                                    </div>
                                    <div className="text-2xl font-black text-white mb-6">
                                        {new Date(booking.journeyDate).toLocaleDateString('en-IN', {
                                            day: '2-digit',
                                            month: 'short',
                                            year: 'numeric'
                                        })}
                                    </div>
                                    
                                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-600 mb-2">
                                        Status
                                    </div>
                                    <div className={`text-sm font-bold uppercase tracking-wider ${
                                        (booking.passengers && booking.passengers[0]?.status === 'CNF') 
                                            ? 'text-green-500' 
                                            : 'text-orange-400'
                                    }`}>
                                        {booking.passengers && booking.passengers[0] ? booking.passengers[0].status : 'PENDING'}
                                    </div>
                                </div>

                                {/* Details Block */}
                                <div className="p-6 md:p-8 flex-1 flex flex-col">
                                    <div className="flex justify-between items-start mb-8 gap-4">
                                        <div className="flex items-center gap-4">
                                            <Train className="w-6 h-6 text-gray-500" />
                                            <div>
                                                <div className="text-[10px] font-bold uppercase tracking-widest text-gray-700 mb-0.5">Train Number</div>
                                                <h3 className="text-xl font-bold text-white leading-tight">#{booking.trainNumber}</h3>
                                            </div>
                                        </div>
                                          <div className="text-right flex flex-col items-end gap-2">
                                              <div>
                                                  <div className="text-[10px] font-bold uppercase tracking-widest text-gray-700 mb-0.5">PNR Reference</div>
                                                  <div className="text-lg font-mono font-bold text-white leading-tight">{booking.pnr}</div>
                                              </div>
                                              <div className="bg-white p-2 rounded-lg">
                                                  <QRCode value={booking.pnr} size={64} level="M" />
                                              </div>
                                          </div>
                                      </div>

                                    <div className="flex items-center justify-between gap-6 mb-8 px-2">
                                        <div className="flex-1">
                                            <div className="text-xl font-bold text-white mb-1 leading-tight">{booking.source.split('(')[0]}</div>
                                            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-700">
                                                <MapPin className="w-3 h-3" /> Boarding
                                            </div>
                                        </div>
                                        
                                        <div className="flex flex-col items-center">
                                            <div className="w-12 h-[1px] bg-slate-800 relative">
                                                <ArrowRight className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 text-gray-600" />
                                            </div>
                                        </div>

                                        <div className="flex-1 text-right">
                                            <div className="text-xl font-bold text-white mb-1 leading-tight">{booking.destination.split('(')[0]}</div>
                                            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-700 justify-end">
                                                <MapPin className="w-3 h-3 text-gray-800" /> Arrival
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="mt-auto pt-6 border-t border-slate-800/50 flex flex-col sm:flex-row justify-between items-center gap-4">
                                        <div className="flex items-center gap-3">
                                            <div className="px-3 py-1 bg-slate-900/30 border border-slate-800 rounded-full text-[10px] font-bold uppercase tracking-widest text-gray-600">
                                                {booking.classCode} Class
                                            </div>
                                            <div className="px-3 py-1 bg-slate-900/30 border border-slate-800 rounded-full text-[10px] font-bold uppercase tracking-widest text-gray-600">
                                                {booking.passengers?.length || 0} Pax
                                            </div>
                                        </div>
                                        
                                        <button 
                                            onClick={() => navigate(`/?pnr=${booking.pnr}#pnr-section`)}
                                            className="w-full sm:w-auto px-6 py-2.5 bg-white text-black hover:bg-gray-200 text-xs font-bold uppercase rounded-lg transition active:scale-95 flex items-center justify-center gap-2"
                                        >
                                            Track PNR
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            
            {/* Minimal decorative element */}
            <div className="fixed bottom-0 right-0 w-64 h-64 bg-slate-800/5 blur-[120px] -z-10 pointer-events-none"></div>
        </div>
    );
}
