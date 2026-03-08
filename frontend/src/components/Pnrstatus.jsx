import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import LabelNavbar from "./LabelNavbar";
import PNRResult from "./Pnrresult";
import api from "../api/train.api";

export default function PNRStatus() {
  const location = useLocation();
  const [pnr, setPnr] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pnrData, setPnrData] = useState(null);
  const [error, setError] = useState(null);

  // Auto-fill PNR if navigated from payment success
  useEffect(() => {
    if (location.state?.pnr) {
      setPnr(location.state.pnr);
    }
  }, [location.state]);

  // 1. ADDED ACCESSIBILITY: Listen for "Enter" key globally
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Enter" && pnr.length === 10 && !loading && !showResult) {
        handleCheckStatus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pnr, loading, showResult]);

  const handleCheckStatus = async () => {
    if (pnr.length !== 10) return;

    setLoading(true);
    setError(null);
    setPnrData(null);

    try {
      const data = await api.getBookingStatus(pnr);

      // Transform API data to Component format
      const transformedData = {
        pnr: data.pnr,
        trainName: data.trainName || "Express Train",
        trainNumber: data.trainNumber,
        class: data.classCode,
        fromStation: data.source,
        fromCode: data.source, // Using code as name fallback
        toStation: data.destination,
        toCode: data.destination,
        departureDate: new Date(data.journeyDate).toLocaleDateString() + ", " + (data.departureTime || "00:00"),
        arrivalDate: new Date(data.journeyDate).toLocaleDateString() + ", " + (data.arrivalTime || "00:00"), // Fallback same day
        duration: data.duration || "N/A",
        distance: "N/A", // Calculated on backend ideally
        totalFare: "₹--", // Not in basic booking model yet
        chartStatus: "Prepared",
        passengers: data.passengers.map(p => ({
          name: p.name,
          booking: `${p.status}/${p.seatNumber || 'WL'}`,
          current: p.status,
          isConfirmed: p.status === 'CNF'
        }))
      };

      setPnrData(transformedData);
      setShowResult(true);
    } catch (err) {
      setError(err.message || "Failed to fetch PNR status");
      setShowResult(false);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const value = e.target.value.replace(/\D/g, "");
    if (value.length <= 10) setPnr(value);
  };

  const inputRef = useRef(null);

  const resetToForm = () => {
    setShowResult(false);
    setPnr("");
    setPnrData(null);
    setError(null);
    // scroll to the pnr section and focus input after render
    requestAnimationFrame(() => {
      const el = document.getElementById('pnr-section');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (inputRef.current) inputRef.current.focus();
    });
  };

  const isStandalonePage = location.pathname === '/pnr-status';

  return (
    <div className={`max-w-6xl mx-auto px-4 pb-14 flex justify-center flex-col text-white ${isStandalonePage ? 'mt-36' : 'mt-16'}`}>

        {!showResult ? (
          <>
            <div className="text-center lg:text-left">
              <h2 className="text-4xl sm:text-5xl font-black tracking-tight uppercase">
                {loading ? "Fetching Details..." : "Check PNR Status"}
              </h2>
              <p className="text-gray-400 mt-2 max-w-2xl mx-auto lg:mx-0 text-base leading-relaxed">
                Your Passenger Name Record (PNR) is a unique 10-digit digital certificate.
                Enter it below to unlock real-time journey updates and seat confirmation.
              </p>
            </div>

            <div className={`mt-6 flex flex-col items-center lg:flex-row lg:justify-between gap-10 transition-opacity ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
              <div className="relative w-full max-w-md lg:max-w-xl group">
                <input
                  ref={inputRef}
                  type="text"
                  value={pnr}
                  onChange={handleChange}
                  maxLength={10}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="flex justify-between gap-2 lg:gap-4">
                  {[...Array(10)].map((_, i) => (
                    <div key={i} className={`flex-1 h-16 lg:h-20 border-b-4 flex items-center justify-center text-3xl lg:text-5xl font-black transition-all duration-300 ${i < pnr.length ? "border-white text-white" : "border-white/10 text-white/5"} ${i === pnr.length ? "border-white/50 animate-pulse" : ""}`}>
                      {pnr[i] || "0"}
                    </div>
                  ))}
                </div>
                <span className="block mt-4 text-[10px] font-bold text-gray-500 uppercase tracking-[0.3em] text-center lg:text-left">
                  Press Enter to search
                </span>
              </div>

              <button
                onClick={handleCheckStatus}
                disabled={pnr.length !== 10 || loading}
                className={`w-full lg:w-auto px-16 py-6 rounded-full font-black text-lg transition-all ${pnr.length === 10 ? "bg-white text-black hover:scale-105 shadow-[0_0_30px_rgba(255,255,255,0.2)]" : "bg-white/5 text-white/20 cursor-not-allowed"}`}
              >
                {loading ? "PROCESSING..." : "CHECK STATUS"}
              </button>
            </div>
          </>
        ) : error ? (
          <div className="text-center py-20 animate-in fade-in zoom-in duration-500">
            <h2 className="text-3xl font-black text-red-500 mb-4">SEARCH FAILED</h2>
            <p className="text-gray-400 mb-8 max-w-md mx-auto">{error}</p>
            <button
              onClick={resetToForm}
              className="px-8 py-3 bg-white/10 hover:bg-white/20 text-white rounded-full font-bold transition"
            >
              TRY AGAIN
            </button>
          </div>
        ) : (
          <PNRResult
            pnrData={pnrData}
            onReset={resetToForm}
          />
        )}

        {!showResult && (
          <div className="mt-11 grid grid-cols-2 lg:grid-cols-4 gap-8 border-t border-white/10 pt-10">

          </div>
        )}
      </div>
  );
}