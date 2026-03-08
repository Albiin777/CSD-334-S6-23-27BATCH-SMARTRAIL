import { useState } from 'react';
import { useSmartRail } from '../hooks/useSmartRail';
import { Star, ThumbsUp, ThumbsDown, Filter, MessageSquare, User, Clock, Train } from 'lucide-react';

const REVIEWS = [
    { id: 1, passenger: 'Priya Sharma', pnr: '2541876231', coach: 'B1', seat: 2, rating: 5, category: 'Cleanliness', comment: 'Coach was very clean and well maintained. Bedsheets were fresh.', date: '21 Feb 2026', helpful: 12 },
    { id: 2, passenger: 'Rohit Gupta', pnr: '4832971047', coach: 'B1', seat: 19, rating: 4, category: 'TTE Service', comment: 'TTE was very polite and helped with berth exchange for my elderly mother.', date: '21 Feb 2026', helpful: 8 },
    { id: 3, passenger: 'Deepa Nair', pnr: '6729384503', coach: 'B1', seat: 25, rating: 3, category: 'Pantry', comment: 'Food quality was average. Tea was cold. Could be improved.', date: '21 Feb 2026', helpful: 3 },
    { id: 4, passenger: 'Nandini Rao', pnr: '8123456796', coach: 'B1', seat: 65, rating: 5, category: 'Punctuality', comment: 'Train was on time at every station. Very impressed with Indian Railways.', date: '21 Feb 2026', helpful: 15 },
    { id: 5, passenger: 'Col. Ranjit Deshmukh', pnr: '2541810001', coach: 'A1', seat: 1, rating: 2, category: 'AC/Ventilation', comment: 'AC was not working properly in Bay 1. Temperature was too high. Complained to TTE.', date: '21 Feb 2026', helpful: 6 },
    { id: 6, passenger: 'Ananya Krishnan', pnr: '2541810002', coach: 'A1', seat: 5, rating: 4, category: 'Cleanliness', comment: 'Washrooms were clean. Housekeeping staff visited regularly.', date: '21 Feb 2026', helpful: 10 },
    { id: 7, passenger: 'Ramesh Yadav', pnr: '2541820001', coach: 'S1', seat: 3, rating: 1, category: 'Safety', comment: 'Door latch in the coach was broken. Felt unsafe at night.', date: '21 Feb 2026', helpful: 20 },
    { id: 8, passenger: 'Dr. Arvind Mehta', pnr: '2541800001', coach: 'H1', seat: 1, rating: 5, category: 'Overall', comment: 'First class was excellent. Attendant service was top-notch. Will travel again.', date: '21 Feb 2026', helpful: 7 },
    { id: 9, passenger: 'Shankar Pillai', pnr: '2541820003', coach: 'S1', seat: 17, rating: 3, category: 'Pantry', comment: 'Pantry car food was overpriced for the quality. Outside vendors were better.', date: '21 Feb 2026', helpful: 4 },
    { id: 10, passenger: 'Sunita Devi', pnr: '2541876233', coach: 'B1', seat: 9, rating: 4, category: 'TTE Service', comment: 'TTE helped me with medical assistance. Very responsive and caring.', date: '21 Feb 2026', helpful: 11 },
];

const categories = ['All', 'Cleanliness', 'TTE Service', 'Pantry', 'Punctuality', 'AC/Ventilation', 'Safety', 'Overall'];

function Stars({ count, size = 14 }) {
    return (
        <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map(i => (
                <Star key={i} size={size} className={i <= count ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'} />
            ))}
        </div>
    );
}

export default function Reviews() {
    const { tteInfo } = useSmartRail();
    const [filter, setFilter] = useState('All');
    const [sortBy, setSortBy] = useState('latest');

    let filtered = filter === 'All' ? REVIEWS : REVIEWS.filter(r => r.category === filter);
    if (sortBy === 'highest') filtered = [...filtered].sort((a, b) => b.rating - a.rating);
    if (sortBy === 'lowest') filtered = [...filtered].sort((a, b) => a.rating - b.rating);
    if (sortBy === 'helpful') filtered = [...filtered].sort((a, b) => b.helpful - a.helpful);

    const avgRating = (REVIEWS.reduce((s, r) => s + r.rating, 0) / REVIEWS.length).toFixed(1);
    const dist = [5, 4, 3, 2, 1].map(r => ({ rating: r, count: REVIEWS.filter(rv => rv.rating === r).length }));

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-[#2B2B2B] rounded-2xl border border-[#D4D4D4]/10 p-6 flex flex-col items-center justify-center">
                    <p className="text-5xl font-extrabold text-yellow-400">{avgRating}</p>
                    <Stars count={Math.round(avgRating)} size={18} />
                    <p className="text-xs text-[#9CA3AF] mt-2 font-semibold">{REVIEWS.length} reviews</p>
                </div>
                <div className="bg-[#2B2B2B] rounded-2xl border border-[#D4D4D4]/10 p-6 col-span-2">
                    <h3 className="text-sm font-bold text-[#B3B3B3] uppercase tracking-wider mb-3">Rating Distribution</h3>
                    <div className="space-y-2">
                        {dist.map(d => (
                            <div key={d.rating} className="flex items-center gap-3">
                                <span className="text-xs font-bold text-[#9CA3AF] w-4">{d.rating}★</span>
                                <div className="flex-1 h-3 bg-gray-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-yellow-400 rounded-full transition-all" style={{ width: `${(d.count / REVIEWS.length) * 100}%` }} />
                                </div>
                                <span className="text-xs font-bold text-white w-6 text-right">{d.count}</span>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="bg-[#2B2B2B] rounded-2xl border border-[#D4D4D4]/10 p-6">
                    <h3 className="text-sm font-bold text-[#B3B3B3] uppercase tracking-wider mb-3">Train Info</h3>
                    <div className="space-y-3">
                        <div><p className="text-[9px] font-bold text-[#9CA3AF] uppercase">Train</p><p className="text-sm font-semibold text-white">{tteInfo.trainNo} — {tteInfo.trainName}</p></div>
                        <div><p className="text-[9px] font-bold text-[#9CA3AF] uppercase">Route</p><p className="text-sm font-semibold text-white">{tteInfo.route}</p></div>
                        <div><p className="text-[9px] font-bold text-[#9CA3AF] uppercase">Date</p><p className="text-sm font-semibold text-white">{tteInfo.date}</p></div>
                    </div>
                </div>
            </div>

            {/* Filters + Sort */}
            <div className="bg-[#2B2B2B] rounded-2xl border border-[#D4D4D4]/10 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap gap-2">
                        {categories.map(c => (
                            <button key={c} onClick={() => setFilter(c)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${filter === c ? 'bg-white text-[#2B2B2B]' : 'bg-white/10 text-[#B3B3B3] hover:text-white border border-[#D4D4D4]/10'}`}>
                                {c}
                            </button>
                        ))}
                    </div>
                    <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                        className="bg-gray-900 text-white text-xs font-semibold px-3 py-2 rounded-lg border border-[#D4D4D4]/10 outline-none">
                        <option value="latest">Latest First</option>
                        <option value="highest">Highest Rated</option>
                        <option value="lowest">Lowest Rated</option>
                        <option value="helpful">Most Helpful</option>
                    </select>
                </div>
            </div>

            {/* Review Cards */}
            <div className="space-y-4">
                {filtered.map(r => (
                    <div key={r.id} className="bg-[#2B2B2B] rounded-2xl border border-[#D4D4D4]/10 p-6 hover:border-[#D4D4D4]/20 transition">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center shrink-0">
                                    <User size={18} className="text-[#B3B3B3]" />
                                </div>
                                <div>
                                    <p className="text-white font-semibold text-sm">{r.passenger}</p>
                                    <p className="text-[10px] text-[#9CA3AF]">PNR: {r.pnr} • Coach {r.coach} / Berth {r.seat}</p>
                                </div>
                            </div>
                            <div className="text-right shrink-0">
                                <Stars count={r.rating} />
                                <p className="text-[10px] text-[#9CA3AF] mt-1">{r.date}</p>
                            </div>
                        </div>
                        <div className="mt-3">
                            <span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full uppercase">{r.category}</span>
                        </div>
                        <p className="text-sm text-[#B3B3B3] mt-3 leading-relaxed">{r.comment}</p>
                        <div className="flex items-center gap-4 mt-4 pt-3 border-t border-[#D4D4D4]/5">
                            <button className="flex items-center gap-1.5 text-xs font-semibold text-[#9CA3AF] hover:text-emerald-400 transition">
                                <ThumbsUp size={14} /> Helpful ({r.helpful})
                            </button>
                            <button className="flex items-center gap-1.5 text-xs font-semibold text-[#9CA3AF] hover:text-red-400 transition">
                                <ThumbsDown size={14} /> Not Helpful
                            </button>
                            <button className="flex items-center gap-1.5 text-xs font-semibold text-[#9CA3AF] hover:text-blue-400 transition ml-auto">
                                <MessageSquare size={14} /> Reply
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
