import { useState, useEffect, useRef } from "react";
import { Star, Search, ThumbsUp, CheckCircle2, Plus, X, ThumbsDown, Pencil, Image as ImageIcon, ChevronLeft, ChevronRight, Inbox } from "lucide-react";
import { auth } from "../utils/firebaseClient";
import { onAuthStateChanged } from "firebase/auth";
import api from "../api/train.api";

export default function Reviews() {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [trainName, setTrainName] = useState("");
    const [hasSearched, setHasSearched] = useState(false);
    const [startAnimation, setStartAnimation] = useState(false);
    const [user, setUser] = useState(null);
    const [expandedCards, setExpandedCards] = useState({});
    const [animStep, setAnimStep] = useState(0); // 0=hidden, 1=header in, 2=content in
    const [isLoading, setIsLoading] = useState(false);
    const [trainSuggestions, setTrainSuggestions] = useState([]);
    const [showTrainSuggestions, setShowTrainSuggestions] = useState(false);

    const searchRef = useRef(null);
    const trainDebounceRef = useRef(null);

    const toggleCard = (id) => setExpandedCards(prev => ({ ...prev, [id]: !prev[id] }));

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (searchRef.current && !searchRef.current.contains(e.target)) {
                setShowTrainSuggestions(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const [reviews, setReviews] = useState([]);
    const [averageRating, setAverageRating] = useState(0);
    const [isNotFound, setIsNotFound] = useState(false);
    const [isLightboxOpen, setIsLightboxOpen] = useState(false);

    const galleryItems = reviews.flatMap(r => {
        if (!r.reviewImage && (!r.reviewImages || r.reviewImages.length === 0)) return [];
        if (r.reviewImages && r.reviewImages.length > 0) {
            return r.reviewImages.map((img, idx) => ({ ...r, reviewImage: img, id: `${r.id}-${idx}`, originalId: r.id }));
        }
        return [r];
    });

    const [newReview, setNewReview] = useState({
        name: "",
        rating: 5,
        text: "",
        reviewImages: [],
        ratings: { cleanliness: 5, safety: 5, comfort: 5, schedule: 5, staff: 5 }
    });

    const fetchTrainSuggestions = (query) => {
        if (trainDebounceRef.current) clearTimeout(trainDebounceRef.current);
        if (!query || query.length < 2) { setTrainSuggestions([]); setShowTrainSuggestions(false); return; }

        trainDebounceRef.current = setTimeout(async () => {
            try {
                const results = await api.searchTrains(query);
                setTrainSuggestions(results);
                setShowTrainSuggestions(results.length > 0);
            } catch (err) {
                console.error("Train search error", err);
                setTrainSuggestions([]);
            }
        }, 300);
    };

    const handleSearch = async (forcedQuery = null) => {
        const query = forcedQuery !== null ? forcedQuery : searchQuery;
        if (!query.trim()) return;
        setIsLoading(true);
        setIsNotFound(false);
        setHasSearched(true);
        setAnimStep(0);
        setShowTrainSuggestions(false);
        
        try {
            // 1. Resolve train name/number first
            const searchResults = await api.searchTrains(query);
            if (!searchResults || searchResults.length === 0) {
                setIsNotFound(true);
                setTrainName(query);
                setReviews([]);
                setAverageRating(0);
                setTimeout(() => setAnimStep(1), 60);
                setTimeout(() => setAnimStep(2), 240);
                setIsLoading(false);
                return;
            }

            // Pick the first match
            const bestMatch = searchResults[0];
            const fullDisplayName = `${bestMatch.trainName} (${bestMatch.trainNumber})`;
            setTrainName(fullDisplayName);

            // 2. Fetch reviews for this specific train number
            const data = await api.getReviews(bestMatch.trainNumber);
            
            setTimeout(() => setAnimStep(1), 60);   // header slides in
            setTimeout(() => setAnimStep(2), 240);  // content rises up

            if (data && data.reviews) {
                const mappedReviews = data.reviews.map((r, i) => ({
                    id: r.id,
                    name: "Passenger",
                    date: new Date(r.created_at).toLocaleDateString(),
                    rating: r.rating,
                    text: r.comment,
                    reviewImages: [],
                    image: "https://randomuser.me/api/portraits/lego/" + ((i % 9) + 1) + ".jpg",
                    verified: true,
                    likes: 0,
                    dislikes: 0,
                    userAction: null,
                    categoryRatings: { cleanliness: r.rating, safety: r.rating, comfort: r.rating, schedule: r.rating, staff: r.rating }
                }));
                setReviews(mappedReviews);
                setAverageRating(data.averageRating || 0);
            } else {
                setReviews([]);
                setAverageRating(0);
            }
        } catch (err) {
            console.error("Failed to load reviews:", err);
            setReviews([]);
            setAverageRating(0);
        } finally {
            setIsLoading(false);
        }
    };

    const openLightbox = (index) => { setSelectedImageIndex(index); setIsLightboxOpen(true); };
    const nextImage = (e) => { e.stopPropagation(); setSelectedImageIndex((prev) => (prev + 1) % galleryItems.length); };
    const prevImage = (e) => { e.stopPropagation(); setSelectedImageIndex((prev) => (prev - 1 + galleryItems.length) % galleryItems.length); };

    useEffect(() => {
        if (!isLightboxOpen) return;
        const handleKeyDown = (e) => {
            if (e.key === 'ArrowRight') setSelectedImageIndex((prev) => (prev + 1) % galleryItems.length);
            else if (e.key === 'ArrowLeft') setSelectedImageIndex((prev) => (prev - 1 + galleryItems.length) % galleryItems.length);
            else if (e.key === 'Escape') setIsLightboxOpen(false);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isLightboxOpen, galleryItems.length]);

    useEffect(() => {
        if (isModalOpen || isLightboxOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isModalOpen, isLightboxOpen]);

    const ratingsList = [
        { label: "Cleanliness", score: averageRating || 0, color: "bg-emerald-500" },
        { label: "Safety", score: averageRating || 0, color: "bg-blue-500" },
        { label: "Comfort", score: averageRating || 0, color: "bg-amber-500" },
        { label: "Schedule", score: averageRating || 0, color: "bg-violet-500" },
        { label: "Staff", score: averageRating || 0, color: "bg-rose-500" },
    ];

    const getRatingColor = (score) => {
        if (score >= 4.0) return "text-green-500";
        if (score >= 2.5) return "text-orange-500";
        return "text-red-500";
    };

    const handleLike = (id, isLike) => {
        setReviews(reviews.map(review => {
            if (review.id !== id) return review;
            let newLikes = review.likes, newDislikes = review.dislikes, newAction = review.userAction;
            if (isLike) {
                if (review.userAction === 'like') { newLikes--; newAction = null; }
                else { newLikes++; newAction = 'like'; if (review.userAction === 'dislike') newDislikes--; }
            } else {
                if (review.userAction === 'dislike') { newDislikes--; newAction = null; }
                else { newDislikes++; newAction = 'dislike'; if (review.userAction === 'like') newLikes--; }
            }
            return { ...review, likes: newLikes, dislikes: newDislikes, userAction: newAction };
        }));
    };

    const handleSubmitReview = async (e) => {
        e.preventDefault();
        if (!user || !user.id) { alert("Please login to submit a review."); return; }
        if (!newReview.name.trim() || !newReview.text.trim()) return;

        const avgRating = Math.round((Object.values(newReview.ratings).reduce((a, b) => a + b, 0) / 5) * 10) / 10;

        try {
            await api.submitReview(trainName, Math.round(avgRating), newReview.text, user.id);
            const data = await api.getReviews(trainName);
            if (data && data.reviews) {
                setReviews(data.reviews.map((r, i) => ({
                    id: r.id, name: "Passenger", date: new Date(r.created_at).toLocaleDateString(),
                    rating: r.rating, text: r.comment, reviewImages: [],
                    image: "https://randomuser.me/api/portraits/lego/" + ((i % 9) + 1) + ".jpg",
                    verified: true, likes: 0, dislikes: 0, userAction: null,
                    categoryRatings: { cleanliness: r.rating, safety: r.rating, comfort: r.rating, schedule: r.rating, staff: r.rating }
                })));
            }
            setNewReview({ name: "", rating: 5, text: "", reviewImages: [], ratings: { cleanliness: 5, safety: 5, comfort: 5, schedule: 5, staff: 5 } });
            setIsModalOpen(false);
        } catch (err) {
            console.error("Failed to submit review", err);
            alert(err.message || "Failed to submit review");
        }
    };

    if (!hasSearched) {
        return (
            <div className="relative w-full max-w-6xl mx-auto mt-[74px] pb-[76px] px-4 animate-in fade-in duration-700">
                <div className="mb-8 pl-2">
                    <div className="mb-6">
                        <h2 className="text-4xl sm:text-5xl font-black uppercase tracking-tight text-white drop-shadow-sm mb-2">SmartRail Reviews Hub</h2>
                        <p className="text-[#D4D4D4] opacity-60 text-sm md:text-base font-medium leading-relaxed max-w-2xl ml-1">
                            Search for a train name or number to see reviews, ratings, and traveler photos.
                        </p>
                    </div>
                    <div className="relative max-w-lg" ref={searchRef}>
                        <input 
                            type="text" 
                            value={searchQuery} 
                            onChange={(e) => {
                                const v = e.target.value;
                                setSearchQuery(v);
                                fetchTrainSuggestions(v);
                            }} 
                            onFocus={() => { if (trainSuggestions.length > 0) setShowTrainSuggestions(true); }}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()} 
                            placeholder="Enter train name or number..."
                            className="w-full pl-6 pr-14 py-4 bg-[#1D2332] border border-white/20 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:border-white focus:ring-2 focus:ring-white/20 transition-all text-base" 
                        />
                        <button onClick={() => handleSearch()} className="absolute right-2 top-2 bottom-2 aspect-square bg-white hover:bg-slate-200 text-black rounded-xl flex items-center justify-center transition-colors">
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin"></div>
                            ) : (
                                <Search className="w-5 h-5" />
                            )}
                        </button>

                        {/* TRAIN SUGGESTIONS DROPDOWN */}
                        {showTrainSuggestions && trainSuggestions.length > 0 && (
                            <div className="absolute left-0 right-0 top-full mt-2 bg-[#1D2332]/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 max-h-64 overflow-y-auto z-[100] custom-scrollbar">
                                {trainSuggestions.map((train, idx) => (
                                    <div
                                        key={idx}
                                        onClick={() => {
                                            const fullStr = `${train.trainName} (${train.trainNumber})`;
                                            setSearchQuery(fullStr);
                                            setShowTrainSuggestions(false);
                                            handleSearch(fullStr);
                                        }}
                                        className="px-5 py-4 hover:bg-white/5 cursor-pointer border-b border-white/5 last:border-b-0 transition-all group"
                                    >
                                        <div className="flex justify-between items-center mb-1">
                                            <div className="text-sm font-bold text-white transition-colors">{train.trainName}</div>
                                            <div className="text-[10px] font-black text-slate-500 bg-white/5 px-2 py-0.5 rounded-md uppercase tracking-widest">#{train.trainNumber}</div>
                                        </div>
                                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2">
                                            <span>{train.source}</span>
                                            <span className="text-slate-700">→</span>
                                            <span>{train.destination}</span>
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


    return (
        <div className="relative w-full max-w-6xl mx-auto mt-[26px] pb-[76px] px-4">

            {/* BACK BUTTON */}
            <button 
                onClick={() => { setHasSearched(false); setSearchQuery(""); }}
                className="mb-6 flex items-center gap-2 text-slate-400 hover:text-white transition-all group bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl border border-white/5 hover:border-white/10"
            >
                <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                <span className="text-[10px] font-black uppercase tracking-widest">Back to Search</span>
            </button>

            {/* HEADER — slides in first */}
            <div className={`mb-8 pl-2 transition-all duration-500 ease-out ${animStep >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
                <div className="mb-6">
                    <h2 className="text-4xl sm:text-5xl font-black uppercase tracking-tight text-white drop-shadow-sm mb-2">Trains &amp; Reviews</h2>
                    <p className="text-[#D4D4D4] opacity-60 text-sm md:text-base font-medium leading-relaxed max-w-2xl ml-1">Your journey matters. Share your experience and help shape better travels.</p>
                </div>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest block">Viewing Reviews For</span>
                            {reviews.length > 0 && (
                                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 text-[9px] font-black uppercase tracking-tighter rounded-md border border-emerald-500/20">
                                    {reviews.length} Verified Review{reviews.length !== 1 ? 's' : ''}
                                </span>
                            )}
                            {isNotFound && (
                                <span className="px-2 py-0.5 bg-rose-500/10 text-rose-500 text-[9px] font-black uppercase tracking-tighter rounded-md border border-rose-500/20">
                                    Not Found
                                </span>
                            )}
                        </div>
                        <h3 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight">{trainName}</h3>
                    </div>
                    {/* BACK TO MAIN SEARCH BUTTON */}
                    <div className="flex items-center">
                        <button 
                            onClick={() => { setHasSearched(false); setSearchQuery(""); }}
                            className="flex items-center gap-3 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl transition-all group"
                        >
                            <span className="text-slate-400 group-hover:text-white text-[10px] font-bold uppercase tracking-widest transition-colors mb-0.5">Search Another Train</span>
                            <div className="p-1.5 bg-white text-black rounded-lg group-active:scale-95 transition-transform">
                                <Search className="w-3.5 h-3.5" />
                            </div>
                        </button>
                    </div>
                </div>
            </div>

            {/* MAIN CONTENT — rises up after header */}
            <div className={`bg-[#1D2332] rounded-[28px] flex flex-col lg:flex-row overflow-hidden transition-all duration-600 ease-out ${animStep >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>

                {/* LEFT: VISUALS */}
                <div className="flex-1 p-6 md:p-8 border-b lg:border-b-0 lg:border-r border-white/10 bg-[#1D2332] flex flex-col gap-4">
                    <div className="aspect-video w-full rounded-2xl overflow-hidden relative group cursor-pointer bg-black/40">
                        {galleryItems.length > 0 ? (
                            <img src={galleryItems[0].reviewImage} alt="Main Interior" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" onClick={() => openLightbox(0)} />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-600"><ImageIcon className="w-12 h-12" /></div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4 pointer-events-none">
                            <p className="text-white text-xs font-medium line-clamp-1 italic">"{galleryItems[0]?.text}"</p>
                        </div>
                    </div>

                    {galleryItems.length > 1 && (
                        <div className="grid grid-cols-3 gap-2 h-24">
                            {galleryItems.slice(1, 4).map((item, idx) => {
                                const realIndex = idx + 1;
                                const isLastItem = idx === 2;
                                const remainingCount = galleryItems.length - 4;
                                return (
                                    <div key={item.id} className="relative rounded-lg overflow-hidden cursor-pointer h-full group bg-black/40" onClick={() => openLightbox(realIndex)}>
                                        <img src={item.reviewImage} alt={`View ${realIndex}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                        {isLastItem && remainingCount > 0 && (
                                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-[2px]">
                                                <span className="text-white font-bold text-sm tracking-widest">+{remainingCount} MORE</span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    <button 
                        onClick={() => galleryItems.length > 0 ? openLightbox(0) : null} 
                        className={`w-full py-3 mt-auto rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 group ${galleryItems.length > 0 ? 'bg-white text-black hover:bg-slate-200 cursor-pointer' : 'bg-white/10 text-slate-500 cursor-not-allowed'}`}
                        disabled={galleryItems.length === 0}
                    >
                        <ImageIcon className="w-4 h-4 group-hover:scale-110 transition-transform" /> View Gallery
                    </button>
                </div>

                {/* RIGHT: RATINGS & REVIEWS */}
                <div className="flex-1 flex flex-col bg-[#1D2332] h-full">

                    {/* RATINGS */}
                    <div className="px-6 py-4 md:px-8 md:py-6 border-b border-white/10">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xs font-black uppercase tracking-widest text-white flex items-center gap-2">
                                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" /> Overall Ratings
                                {reviews.length === 0 && !isNotFound && hasSearched && (
                                    <span className="text-slate-500 italic ml-2 text-[10px]">(Be the first to rate!)</span>
                                )}
                            </h3>
                            {user && !isNotFound && (
                                <button onClick={() => { setNewReview(prev => ({ ...prev, name: user.user_metadata?.full_name || user.email?.split('@')[0] || "" })); setIsModalOpen(true); }}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-white hover:bg-slate-200 text-black rounded-lg font-bold text-[10px] uppercase transition-all shadow-lg active:scale-95">
                                    <Plus className="w-3 h-3" /> Add Review
                                </button>
                            )}
                        </div>
                        {isNotFound ? (
                            <div className="py-10 text-center bg-white/5 rounded-2xl border border-white/5 mx-2">
                                <Search className="w-10 h-10 text-rose-500 mx-auto mb-4 opacity-40 animate-pulse" />
                                <h4 className="text-lg font-black text-white uppercase tracking-widest mb-1">Train Not Found</h4>
                                <p className="text-[11px] text-slate-500 uppercase font-bold tracking-tight px-10">We couldn't find any results for "{trainName}". <br/> Please check the train number or name.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                                {ratingsList.map((stat, idx) => {
                                    const score = Number(stat.score);
                                    const barColor = score > 0 ? (score >= 4.0 ? "bg-green-500" : score >= 2.5 ? "bg-orange-500" : "bg-red-500") : "bg-white/10";
                                    return (
                                        <div key={idx} className="space-y-2">
                                            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
                                                <span className="text-white/60">{stat.label}</span>
                                                <span className={score > 0 ? getRatingColor(score) : "text-slate-600 italic"}>
                                                    {score > 0 ? score.toFixed(1) : "-"}
                                                </span>
                                            </div>
                                            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                                                <div className={`h-full ${barColor} rounded-full transition-all duration-1000`} style={{ width: `${(score / 5) * 100}%` }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* REVIEW CARDS */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3 bg-[#1D2332] max-h-[320px] md:max-h-[460px]">
                        {reviews.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8 text-center px-10">
                                <h4 className="text-xl font-black text-white uppercase tracking-widest mb-3">No Journey Stories Yet</h4>
                                <p className="text-[11px] text-slate-500 leading-relaxed uppercase font-bold tracking-tight mb-6">This train is waiting for its first review. <br/> Be the pioneer and share your travel experience.</p>
                                
                                {user && !isNotFound && (
                                    <button onClick={() => setIsModalOpen(true)} className="px-8 py-3.5 bg-white text-black rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95 shadow-2xl flex items-center gap-2">
                                        <Pencil className="w-3.5 h-3.5" /> Post First Review
                                    </button>
                                )}
                            </div>
                        ) : (
                            reviews.map((review) => {
                                const isExp = !!expandedCards[review.id];
                                return (
                                    <div key={review.id} style={{ borderRadius: 16, border: `1px solid ${isExp ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.05)"}`, background: isExp ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.02)", overflow: "hidden", boxShadow: isExp ? "0 6px 24px rgba(0,0,0,0.35)" : "none", transition: "all 300ms ease" }}>
                                        {/* Header */}
                                        <button onClick={() => toggleCard(review.id)} style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px 10px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}>
                                            <div style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
                                                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                                                    <span style={{ color: "#fff", fontWeight: 800, fontSize: 13 }}>{review.name}</span>
                                                    {review.verified && <CheckCircle2 size={11} color="#22d3ee" />}
                                                    <span style={{ color: "#334155", fontSize: 10 }}>• {review.date}</span>
                                                </div>
                                                <div style={{ maxHeight: isExp ? 0 : 18, opacity: isExp ? 0 : 1, overflow: "hidden", transition: "max-height 300ms ease, opacity 200ms ease" }}>
                                                    <p style={{ color: "#475569", fontSize: 10, margin: 0, fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>"{review.text}"</p>
                                                </div>
                                            </div>
                                            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                                                <div style={{ display: "flex", alignItems: "center", gap: 4, background: "rgba(0,0,0,0.4)", padding: "4px 8px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)" }}>
                                                    <span className={`text-xs font-black ${getRatingColor(review.rating)}`}>{review.rating}</span>
                                                    <Star className={`w-3 h-3 fill-current ${getRatingColor(review.rating)}`} />
                                                </div>
                                                {/* Springy chevron */}
                                                <div style={{ width: 20, height: 20, borderRadius: "50%", background: isExp ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "center", transform: isExp ? "rotate(180deg)" : "rotate(0deg)", transition: "all 500ms cubic-bezier(0.34,1.56,0.64,1)" }}>
                                                    <span style={{ color: "#475569", fontSize: 9, lineHeight: 1 }}>▾</span>
                                                </div>
                                            </div>
                                        </button>

                                        {/* Spring expand body — max-height + keyframe spring */}
                                        <div style={{ maxHeight: isExp ? 400 : 0, overflow: "hidden", transition: "max-height 500ms cubic-bezier(0.34,1.3,0.64,1)" }}>
                                            <div style={{ animation: isExp ? "springReveal 500ms cubic-bezier(0.34,1.4,0.64,1) both" : "none" }}>
                                                <div style={{ padding: "0 14px 14px" }}>
                                                    <p style={{ color: "#94a3b8", fontSize: 11, lineHeight: 1.6, fontStyle: "italic", borderLeft: "2px solid rgba(255,255,255,0.1)", paddingLeft: 10, margin: "0 0 12px" }}>"{review.text}"</p>

                                                    <div style={{ display: "flex", gap: 8, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                                                        <button onClick={() => handleLike(review.id, true)} className={`flex items-center gap-1.5 text-[10px] font-bold py-1 px-2 rounded-lg transition-all ${review.userAction === 'like' ? 'bg-white/20 text-white border border-white/20' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`}>
                                                            <ThumbsUp className={`w-3 h-3 ${review.userAction === 'like' ? 'fill-current' : ''}`} /><span>{review.likes}</span>
                                                        </button>
                                                        <button onClick={() => handleLike(review.id, false)} className={`flex items-center gap-1.5 text-[10px] font-bold py-1 px-2 rounded-lg transition-all ${review.userAction === 'dislike' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`}>
                                                            <ThumbsDown className={`w-3 h-3 ${review.userAction === 'dislike' ? 'fill-current' : ''}`} /><span>{review.dislikes}</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>

            {/* ADD REVIEW MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[9999] overflow-y-auto bg-black/60 backdrop-blur-sm">
                    <div className="min-h-full flex items-center justify-center p-4">
                        <div className="relative w-full max-w-lg bg-[#1D2332] rounded-2xl border border-white/10 shadow-2xl my-8">
                            <div className="flex items-center justify-between p-6 border-b border-white/10 rounded-t-2xl">
                                <h3 className="text-xl font-bold text-white flex items-center gap-2"><Plus className="w-6 h-6" /> Write a Review</h3>
                                <button onClick={() => setIsModalOpen(false)} className="bg-transparent border border-white/20 text-slate-200 hover:bg-red-500 hover:text-white hover:border-red-500 p-2 rounded-full transition-all">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="p-6">
                                <form onSubmit={handleSubmitReview} className="space-y-6">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Your Name</label>
                                        <input type="text" value={newReview.name} readOnly={!!user} onChange={(e) => !user && setNewReview({ ...newReview, name: e.target.value })}
                                            className={`w-full bg-transparent border border-white/20 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-white transition-colors ${user ? 'opacity-60 cursor-not-allowed' : ''}`} placeholder="Enter your name" />
                                    </div>
                                    <div className="space-y-4 bg-white/5 p-4 rounded-xl border border-white/5">
                                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-white/10 pb-2">Rate Categories</label>
                                        {Object.keys(newReview.ratings).map((cat) => (
                                            <div key={cat} className="flex items-center justify-between">
                                                <span className="text-sm font-bold text-white capitalize w-24">{cat}</span>
                                                <div className="flex gap-1">
                                                    {[1, 2, 3, 4, 5].map((s) => (
                                                        <button key={s} type="button" onClick={() => setNewReview({ ...newReview, ratings: { ...newReview.ratings, [cat]: s } })}
                                                            className={`transition-transform hover:scale-110 p-1 ${s <= newReview.ratings[cat] ? 'text-yellow-400' : 'text-slate-600'}`}>
                                                            <Star className="w-5 h-5 fill-current" />
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Review</label>
                                        <textarea value={newReview.text} onChange={(e) => setNewReview({ ...newReview, text: e.target.value })}
                                            className="w-full bg-transparent border border-white/20 rounded-lg px-4 py-3 text-white placeholder-slate-500 h-24 resize-none focus:outline-none focus:border-white transition-colors" placeholder="Share your experience..." />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Add Photos (Max 5)</label>
                                        <div className="flex flex-wrap gap-2">
                                            {newReview.reviewImages.map((img, idx) => (
                                                <div key={idx} className="relative w-20 h-20 rounded-xl overflow-hidden group border border-white/10">
                                                    <img src={img} alt={`Preview ${idx}`} className="w-full h-full object-cover" />
                                                    <button type="button" onClick={() => setNewReview({ ...newReview, reviewImages: newReview.reviewImages.filter((_, i) => i !== idx) })}
                                                        className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white">
                                                        <X className="w-6 h-6" />
                                                    </button>
                                                </div>
                                            ))}
                                            {newReview.reviewImages.length < 5 && (
                                                <label className="w-20 h-20 rounded-xl border border-dashed border-slate-600 hover:border-white/50 bg-white/5 hover:bg-white/10 flex items-center justify-center cursor-pointer transition-all group">
                                                    <ImageIcon className="w-8 h-8 text-slate-500 group-hover:text-white transition-colors" />
                                                    <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => {
                                                        const files = Array.from(e.target.files);
                                                        if (!files.length) return;
                                                        const slots = 5 - newReview.reviewImages.length;
                                                        Promise.all(files.slice(0, slots).map(f => new Promise(res => { const r = new FileReader(); r.onloadend = () => res(r.result); r.readAsDataURL(f); }))).then(imgs => { setNewReview(p => ({ ...p, reviewImages: [...p.reviewImages, ...imgs] })); });
                                                    }} />
                                                </label>
                                            )}
                                        </div>
                                    </div>
                                    {newReview.text.trim().length > 0 && (
                                        <button type="submit" className="w-full bg-white hover:bg-slate-200 text-black font-bold py-4 rounded-xl transition-all active:scale-95 shadow-lg">Submit Review</button>
                                    )}
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* LIGHTBOX */}
            {isLightboxOpen && galleryItems.length > 0 && (
                <div className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-xl overflow-y-auto">
                    <button onClick={() => setIsLightboxOpen(false)} className="fixed top-6 right-6 text-white/50 hover:text-white transition-colors z-50"><X className="w-8 h-8" /></button>
                    <button onClick={prevImage} className="fixed left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all z-50 hidden md:block"><ChevronLeft className="w-8 h-8" /></button>
                    <button onClick={nextImage} className="fixed right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all z-50 hidden md:block"><ChevronRight className="w-8 h-8" /></button>
                    <div className="min-h-full w-full flex flex-col items-center justify-center p-4 md:p-10">
                        <div className="relative max-w-5xl w-full flex items-center justify-center mb-6">
                            <img src={galleryItems[selectedImageIndex].reviewImage} className="max-w-full max-h-[70vh] object-contain rounded-md shadow-2xl" alt="Gallery View" />
                        </div>
                        <div className="max-w-2xl text-center pb-10">
                            <div className="flex items-center justify-center gap-3 mb-2">
                                <span className="text-white font-bold text-lg">{galleryItems[selectedImageIndex].name}</span>
                                <div className="flex items-center gap-1 bg-black/40 px-2 py-0.5 rounded border border-white/20">
                                    <span className="text-sm font-bold text-green-400">{galleryItems[selectedImageIndex].rating}</span>
                                    <Star className="w-3 h-3 fill-green-400 text-green-400" />
                                </div>
                            </div>
                            <p className="text-slate-300 font-medium italic text-lg leading-relaxed">"{galleryItems[selectedImageIndex].text}"</p>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #475569; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                @keyframes springReveal {
                    0%   { opacity: 0; transform: translateY(22px) scale(0.95); }
                    55%  { opacity: 1; transform: translateY(-6px) scale(1.01); }
                    75%  { transform: translateY(3px) scale(0.995); }
                    100% { opacity: 1; transform: translateY(0) scale(1); }
                }
            `}</style>
        </div>
    );
}
