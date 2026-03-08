import React, { useState, useRef, useEffect } from "react";
import { Search, Calendar, MapPin, Clock } from "lucide-react";
import api from "../api/train.api";

export default function TrainSchedule() {
    const [trainQuery, setTrainQuery] = useState("");
    const [trainSuggestions, setTrainSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);

    const [selectedDate, setSelectedDate] = useState(new Date());
    const [scheduleData, setScheduleData] = useState(null);
    const [trainRunsOnDate, setTrainRunsOnDate] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const formatDate = (date) => date.toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short" });

    const debounceRef = useRef(null);
    const containerRef = useRef(null);

    // Click outside to close dropdown
    useEffect(() => {
        const handler = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const fetchSuggestions = (query) => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (!query || query.length < 2) {
            setTrainSuggestions([]);
            return;
        }

        debounceRef.current = setTimeout(async () => {
            try {
                const results = await api.searchTrains(query);
                setTrainSuggestions(results);
                setShowSuggestions(results.length > 0);
            } catch (err) {
                console.error("Train search error", err);
                setTrainSuggestions([]);
            }
        }, 300);
    };

    const handleSearch = async () => {
        const match = trainQuery.match(/\((\d+)\)$/);
        const extractedNumber = match ? match[1] : trainQuery.replace(/\D/g, '');

        if (!extractedNumber || extractedNumber.length !== 5) {
            setError("Please select a specific train from the dropdown.");
            return;
        }

        setError("");
        setLoading(true);
        setScheduleData(null);
        setTrainRunsOnDate(true);

        try {
            // Get the schedule array
            const scheduleResponse = await api.getTrainSchedule(extractedNumber);
            const scheduleArray = scheduleResponse.data || [];

            // Get the parent train details to show the name / header
            let trainDetails = { trainName: trainQuery.split(' (')[0], trainNumber: extractedNumber, source: "Source", destination: "Destination", runningDays: [] };
            try {
                const detailsResponse = await api.getTrainDetails(extractedNumber);
                if (detailsResponse.data) {
                    trainDetails = detailsResponse.data;
                }
            } catch (e) { } // fine, we'll use fallback info

            // Check if train runs on selected date
            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const dayOfWeek = days[selectedDate.getDay()];
            const runsOnDate = !trainDetails.runningDays || 
                             trainDetails.runningDays.length === 0 || 
                             trainDetails.runningDays.includes(dayOfWeek);
            
            setTrainRunsOnDate(runsOnDate);
            setScheduleData({ ...trainDetails, schedule: scheduleArray });
        } catch (err) {
            setError("Failed to load train schedule. Please try again.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Build timeline data grouping intermediate non-halts AFTER the main stop
    const timelineDataByDay = {};

    if (scheduleData && scheduleData.schedule) {
        let currentGroup = null;

        scheduleData.schedule.forEach((stop, index) => {
            const isFirst = index === 0;
            const isLast = index === scheduleData.schedule.length - 1;
            const day = stop.journeyDay || 1;

            if (!timelineDataByDay[day]) {
                timelineDataByDay[day] = [];
            }

            if (stop.isHalt || isFirst || isLast) {
                if (currentGroup) {
                    const groupDay = currentGroup.mainStop.journeyDay || 1;
                    if (!timelineDataByDay[groupDay]) timelineDataByDay[groupDay] = [];
                    timelineDataByDay[groupDay].push(currentGroup);
                }
                currentGroup = {
                    mainStop: stop,
                    intermediates: []
                };
            } else {
                if (currentGroup) {
                    currentGroup.intermediates.push(stop);
                }
            }
        });
        if (currentGroup) {
            const groupDay = currentGroup.mainStop.journeyDay || 1;
            if (!timelineDataByDay[groupDay]) timelineDataByDay[groupDay] = [];
            timelineDataByDay[groupDay].push(currentGroup);
        }
    }

    const [expandedSegments, setExpandedSegments] = useState({});

    // We change the expandedSegments key slightly since we're now grouping by Day
    // But we can just use a global index for simplicity.
    let globalSegmentIdx = 0;

    const toggleSegment = (idx) => {
        setExpandedSegments(prev => ({ ...prev, [idx]: !prev[idx] }));
    };

    return (
        <div id="schedule-section" className="relative max-w-6xl mx-auto mt-32 mb-28 px-4 scroll-mt-32">
            <div className="text-left mb-2">
                <h2 className="text-4xl sm:text-5xl font-black text-white uppercase tracking-tight">
                    Search Train Schedules
                </h2>
                <p className="text-base text-gray-400 mt-2 max-w-2xl leading-relaxed">
                    View the scheduled arrival and departure times.
                </p>
            </div>


            {/* SEARCH BOX */}
            <div className="bg-[#1D2332] rounded-2xl md:rounded-[28px] border border-white/5 px-4 py-5 md:px-6 md:py-7 mb-8">
                <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-4 items-end relative" ref={containerRef}>
                    <div className="relative bg-[#0f172a] rounded-xl px-4 py-3 border border-white/10 flex-1">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Train Name / Number</label>
                        <div className="flex items-center gap-2">
                            <Search className="w-4 h-4 text-slate-400" />
                            <input
                                value={trainQuery}
                                onChange={(e) => {
                                    const v = e.target.value;
                                    setTrainQuery(v);
                                    fetchSuggestions(v);
                                }}
                                onFocus={() => { if (trainSuggestions.length > 0) setShowSuggestions(true); }}
                                className="w-full bg-transparent outline-none text-sm font-bold text-white placeholder-slate-600"
                                placeholder="e.g. 12301 or Rajdhani"
                            />
                        </div>

                        {showSuggestions && trainSuggestions.length > 0 && (
                            <div className="absolute left-0 right-0 top-full mt-2 bg-[#1D2332] rounded-xl shadow-2xl z-50 border border-white/10 max-h-60 overflow-y-auto custom-scrollbar">
                                {trainSuggestions.map((train, idx) => (
                                    <div
                                        key={idx}
                                        onClick={() => {
                                            setTrainQuery(`${train.trainName} (${train.trainNumber})`);
                                            setShowSuggestions(false);
                                        }}
                                        className="px-4 py-3 hover:bg-white/5 cursor-pointer border-b border-white/5 last:border-b-0"
                                    >
                                        <div className="text-sm font-bold text-white">{train.trainName}</div>
                                        <div className="text-xs text-slate-400 font-medium tracking-wide">#{train.trainNumber} • {train.source} → {train.destination}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="relative bg-[#0f172a] rounded-xl px-4 py-3 border border-white/10 w-full md:w-48">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Starting Date</label>
                        <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            <span className="text-sm font-bold text-white">{formatDate(selectedDate)}</span>
                        </div>
                        <input
                            type="date"
                            min={new Date().toISOString().split("T")[0]}
                            max={new Date(new Date().setDate(new Date().getDate() + 60)).toISOString().split("T")[0]}
                            value={selectedDate.toISOString().split("T")[0]}
                            onChange={(e) => {
                                const newDate = new Date(e.target.value);
                                if (!isNaN(newDate.getTime())) setSelectedDate(newDate);
                            }}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                        />
                    </div>

                    <button
                        onClick={handleSearch}
                        disabled={loading}
                        className="h-full bg-white text-black hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed px-8 py-4 rounded-xl font-black text-sm uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                        {loading ? <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" /> : "Check Schedule"}
                    </button>
                </div>
                {error && <p className="text-rose-500 text-xs font-bold uppercase tracking-wide mt-4 text-center">{error}</p>}
            </div>

            {/* TIMELINE UI */}
            {scheduleData && !loading && (
                <div className="bg-[#1D2332] rounded-2xl md:rounded-[28px] border border-white/5 overflow-hidden flex flex-col max-h-[700px] relative">

                    {/* Header Banner */}
                    <div className="bg-[#1D2332] p-6 border-b border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 shadow-lg z-40 sticky top-0">
                        <div>
                            <h3 className="text-xl font-black text-white">{scheduleData.trainName} <span className="text-slate-400 font-medium tracking-wide">({scheduleData.trainNumber})</span></h3>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">
                                {scheduleData.source} → {scheduleData.destination}
                            </p>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="text-[11px] font-black text-emerald-400 uppercase tracking-widest bg-emerald-400/10 px-3 py-1.5 rounded-md inline-block border border-emerald-400/20 whitespace-nowrap">
                                Runs: {scheduleData.runningDays?.join(", ") || "Daily"}
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col flex-1 overflow-hidden relative bg-[#0f172a]/30">
                        {/* Table Header Row (Hidden on Mobile) */}
                        <div className="bg-[#2a3142] py-2 px-4 shadow-sm z-30 border-b border-white/5 shrink-0 sticky top-[-1px] hidden sm:flex items-center">
                            <div className="w-24 text-center text-[10px] font-black tracking-widest text-slate-500 uppercase">Arrival</div>
                            <div className="w-8 shrink-0"></div>
                            <div className="flex-1 pl-4 text-[10px] font-black tracking-widest text-slate-500 uppercase text-left">Station</div>
                            <div className="pr-6 text-[10px] font-black tracking-widest text-slate-500 uppercase text-right shrink-0">Departure</div>
                        </div>

                        {/* Timeline Scrollable Container */}
                        <div className="overflow-y-auto custom-scrollbar flex-1 relative px-0 pb-12">
                            {!trainRunsOnDate ? (
                                <div className="flex flex-col items-center justify-center py-10 px-8 text-center gap-4">
                                    <div>
                                        <h3 className="text-2xl font-black text-white uppercase tracking-tight">Train does not run on this day</h3>
                                        <p className="text-slate-400 mt-2 max-w-sm mx-auto leading-relaxed">
                                            The <span className="text-white font-bold">{scheduleData.trainName}</span> is not scheduled to operate on <span className="text-rose-400 font-bold">{formatDate(selectedDate)}</span>. Please select another date or check the "Runs" info above.
                                        </p>
                                    </div>
                                    <button 
                                        onClick={() => {
                                            const nextRun = new Date(selectedDate);
                                            nextRun.setDate(nextRun.getDate() + 1);
                                            setSelectedDate(nextRun);
                                        }}
                                        className="mt-4 px-6 py-2 bg-white/5 hover:bg-white/10 text-white text-xs font-black uppercase tracking-widest rounded-lg border border-white/10 transition-all"
                                    >
                                        Try Next Day
                                    </button>
                                </div>
                            ) : Object.keys(timelineDataByDay).length > 0 ? (
                                <div className="flex flex-col">
                                    {Object.entries(timelineDataByDay).map(([day, segments], dayIndex) => {

                                        return (
                                            <div key={`day-${day}`} className="mb-0">
                                                {/* DAY HEADER */}
                                                <div className="sticky top-0 z-20 py-1.5 px-4 sm:px-8 bg-[#0f172a] border-b border-white/5 flex items-center gap-3">
                                                    <div className="w-5 h-5 rounded-full bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                                                        <Clock className="w-2.5 h-2.5 text-indigo-400" />
                                                    </div>
                                                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Day {day}</span>
                                                </div>

                                                {segments.map((segment, segmentIndexInDay) => {
                                                    const { mainStop, intermediates } = segment;
                                                    const hasIntermediates = intermediates.length > 0;

                                                    // These are rough definitions for the timeline line UI
                                                    const isFirst = globalSegmentIdx === 0;
                                                    const isLastDay = dayIndex === Object.keys(timelineDataByDay).length - 1;
                                                    const isLast = isLastDay && segmentIndexInDay === segments.length - 1;

                                                    const currentIdx = globalSegmentIdx++;
                                                    const isExpanded = !!expandedSegments[currentIdx];

                                                    return (
                                                        <React.Fragment key={`segment-${currentIdx}`}>
                                                            {/* MAIN STOP ROW */}
                                                            <div
                                                                onClick={() => {
                                                                    if (hasIntermediates) toggleSegment(currentIdx);
                                                                }}
                                                                className={`flex items-stretch w-full transition-colors relative group ${hasIntermediates ? 'cursor-pointer hover:bg-white/[0.04]' : 'hover:bg-white/[0.02]'}`}
                                                            >

                                                                {/* LEFT COLUMN: Arrival Time / Station Code */}
                                                                <div className="w-16 sm:w-24 shrink-0 flex flex-col items-center justify-center py-4 text-center">
                                                                    <span className="text-sm font-black text-white">{mainStop.stationCode}</span>
                                                                    {isFirst ? (
                                                                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">STARTS</span>
                                                                    ) : (
                                                                        <span className="text-sm font-bold text-slate-300 mt-1 font-mono tracking-wider">{mainStop.arrivalTime || '--:--'}</span>
                                                                    )}
                                                                </div>

                                                                {/* CENTER TIMELINE DOT & LINE */}
                                                                <div className="w-8 shrink-0 flex flex-col items-center justify-center relative hidden sm:flex">
                                                                    {!isFirst && <div className="absolute top-0 h-1/2 w-[2px] bg-[#60A5FA]/80"></div>}
                                                                    {(!isLast || hasIntermediates) && <div className="absolute bottom-0 h-[100%] w-[2px] bg-[#60A5FA]/80"></div>}

                                                                    {/* Central Dot */}
                                                                    <div className={`w-3.5 h-3.5 rounded-full z-10 transition-colors
                                                                        ${isFirst ? 'bg-[#60A5FA] ring-[4px] ring-[#1D2332]/80 group-hover:bg-blue-300'
                                                                            : isLast ? 'bg-[#60A5FA] ring-[4px] ring-[#1D2332]/80 group-hover:bg-blue-300'
                                                                                : 'bg-[#60A5FA] border-[2px] border-[#1D2332] group-hover:bg-blue-300'}`}
                                                                    ></div>
                                                                </div>

                                                                {/* RIGHT COLUMN: Station Name, Distance, Platform, Departure Time */}
                                                                <div className="flex-1 min-w-0 flex items-center justify-between sm:pl-4 pl-3 py-4 ml-2 sm:ml-0 border-l-[2px] border-[#60A5FA]/30 sm:border-0 mr-4 sm:mr-0">
                                                                    <div className="flex flex-col justify-center">
                                                                        <span className="text-[15px] font-bold text-white leading-tight flex items-center flex-wrap gap-2">
                                                                            {mainStop.stationName}
                                                                            {hasIntermediates && (
                                                                                <span className="text-[9px] text-slate-400 bg-white/5 border border-white/10 px-1.5 py-0.5 rounded ml-1 opacity-70 group-hover:opacity-100 transition-opacity uppercase tracking-widest flex items-center gap-1">
                                                                                    {intermediates.length} Passes {isExpanded ? '▴' : '▾'}
                                                                                </span>
                                                                            )}
                                                                        </span>
                                                                        <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500 mt-1 uppercase tracking-wider">
                                                                            <span>{mainStop.distanceFromSourceKm} km</span>
                                                                            {(mainStop.platform || mainStop.haltTimeMinutes > 0) && (
                                                                                <span className="text-slate-700">|</span>
                                                                            )}
                                                                            {mainStop.platform && (
                                                                                <span className="text-[#60A5FA]">PF #{mainStop.platform}</span>
                                                                            )}
                                                                            {mainStop.haltTimeMinutes > 0 && (
                                                                                <>
                                                                                    {mainStop.platform && <span className="text-slate-700">|</span>}
                                                                                    <span>{mainStop.haltTimeMinutes}m Halt</span>
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    <div className="text-right flex flex-col items-end justify-center sm:pr-6 shrink-0 ml-2">
                                                                        {isLast ? (
                                                                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">ENDS</span>
                                                                        ) : (
                                                                            <span className="text-sm font-bold text-slate-300 font-mono tracking-wider">{mainStop.departureTime || '--:--'}</span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* INTERMEDIATE STATIONS (Expanded list) */}
                                                            {isExpanded && hasIntermediates && (
                                                                <div className="flex w-full relative">
                                                                    <div className="w-16 sm:w-24 shrink-0"></div>

                                                                    {/* Continuing blue line through intermediates */}
                                                                    <div className="w-8 shrink-0 flex items-center justify-center relative hidden sm:flex">
                                                                        <div className="absolute top-0 bottom-0 w-[2px] bg-[#60A5FA]/30"></div>
                                                                    </div>

                                                                    <div className="flex-1 min-w-0 sm:pl-4 pl-3 py-2 pr-4 sm:pr-6 border-l-[2px] border-[#60A5FA]/30 sm:border-0 ml-2 sm:ml-0">
                                                                        <div className="flex flex-col gap-1 py-1">
                                                                            {intermediates.map((intStop, intIdx) => (
                                                                                <div key={`int-${currentIdx}-${intIdx}`} className="flex justify-between items-center text-slate-500 py-1.5 pl-3 border-l-2 border-white/10 ml-2 hover:border-[#60A5FA]/40 hover:bg-white/[0.04] rounded-r-md transition-colors cursor-default">
                                                                                    <div className="flex flex-col">
                                                                                        <span className="text-xs font-semibold text-slate-400 flex items-center gap-2">
                                                                                            {intStop.stationName}
                                                                                            <span className="text-[9px] text-slate-600 font-mono">{intStop.stationCode}</span>
                                                                                        </span>
                                                                                        <div className="flex gap-2 items-center mt-0.5">
                                                                                            <span className="text-[10px] font-medium tracking-wide">{intStop.distanceFromSourceKm} km</span>
                                                                                        </div>
                                                                                    </div>
                                                                                    <div className="text-[11px] font-medium font-mono text-slate-500 bg-white/5 px-2 py-0.5 rounded">
                                                                                        {intStop.arrivalTime || '--:--'}
                                                                                    </div>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </React.Fragment>
                                                    );
                                                })}
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="py-20 text-center text-slate-500 font-bold uppercase tracking-widest text-xs">No schedule details found for this train.</div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
