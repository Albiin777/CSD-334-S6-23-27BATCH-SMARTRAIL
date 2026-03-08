import { Train, Clock, MapPin, IndianRupee, ChevronRight, Share2, Download, Ticket } from "lucide-react";
import QRCode from "react-qr-code";

export default function PNRResult({ pnrData, onReset }) {
  const handlePassengerClick = (passenger) => {
    window.location.href = `/passenger-details/${passenger.name.toLowerCase().replace(/ /g, "-")}`;
  };

  return (
    <div className="mt-6 md:mt-10 w-full max-w-6xl mx-auto animate-in fade-in duration-700 font-sans">

      <h2 className="text-3xl md:text-4xl font-black text-white mb-6 uppercase tracking-tight">
        PNR Status
      </h2>

      {/* TICKET CONTAINER - Dark Solid */}
      <div className="bg-[#2B2B2B] border border-[#B3B3B3]/20 rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row min-h-[400px]">

        {/* === LEFT DIVISION (MAIN JOURNEY) === */}
        <div className="flex-1 p-6 md:p-8 relative text-white">

          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/10 rounded-xl text-white">
                <Train className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white leading-tight">
                  {pnrData.trainName}
                </h3>
                <p className="text-sm font-medium text-gray-400">
                  #{pnrData.trainNumber} • {pnrData.class}
                </p>
              </div>
            </div>
          </div>

          {/* Journey Path */}
          <div className="bg-black/20 rounded-2xl p-5 mb-6 border border-white/5">
            <div className="flex items-center justify-between text-white">
              <div className="text-left">
                <p className="text-2xl md:text-3xl font-black">{pnrData.fromCode}</p>
                <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-wide">{pnrData.fromStation}</p>
                <p className="text-sm font-medium mt-1 text-gray-300">{pnrData.departureDate.split(',')[1]}</p>
              </div>

              <div className="flex flex-col items-center px-2 md:px-4 flex-1">
                <p className="text-[10px] md:text-xs font-bold text-gray-500 mb-2 uppercase tracking-widest">{pnrData.duration}</p>
                <div className="w-full h-[1px] bg-white/20 relative flex items-center justify-between">
                  <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                  <Clock className="w-3 h-3 text-gray-500" />
                  <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                </div>
              </div>

              <div className="text-right">
                <p className="text-2xl md:text-3xl font-black">{pnrData.toCode}</p>
                <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-wide">{pnrData.toStation}</p>
                <p className="text-sm font-medium mt-1 text-gray-300">{pnrData.arrivalDate.split(',')[1]}</p>
              </div>
            </div>
          </div>

          {/* Passenger List (Compact & Dark) */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Passengers</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[180px] overflow-y-auto custom-scrollbar pr-1">
              {pnrData.passengers.map((p, idx) => (
                <div
                  key={idx}
                  onClick={() => handlePassengerClick(p)}
                  className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/20 cursor-pointer group transition-all"
                >
                  <div className="flex flex-col min-w-0">
                    <span className="font-bold text-gray-200 text-sm truncate">{p.name}</span>
                    <span className="text-[11px] text-gray-400 font-mono mt-0.5 flex gap-2">
                      <span className="opacity-70">Bkg:</span> <span className="text-white">{p.booking}</span>
                      <span className="opacity-70">Cur:</span> <span className={`${p.isConfirmed ? 'text-green-400' : 'text-orange-400'}`}>{p.current}</span>
                    </span>
                  </div>
                  <div className={`
                    w-1.5 h-1.5 rounded-full flex-shrink-0 ml-2
                    ${p.isConfirmed ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-orange-500'}
                  `}></div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* === SEPARATOR (Desktop) === */}
        <div className="hidden md:block w-[1px] bg-white/10 relative my-6 md:border-l border-dashed border-white/20">
          <div className="absolute -top-3 -left-3 w-6 h-6 bg-[#2B2B2B] rounded-full"></div>
          <div className="absolute -bottom-3 -left-3 w-6 h-6 bg-[#2B2B2B] rounded-full"></div>
        </div>

        {/* === MOBILE SEPARATOR === */}
        <div className="md:hidden h-[1px] w-full bg-white/10 relative mx-6 border-t border-dashed border-white/20 my-4">
          <div className="absolute -left-3 -top-3 w-6 h-6 bg-[#2B2B2B] rounded-full"></div>
          <div className="absolute -right-3 -top-3 w-6 h-6 bg-[#2B2B2B] rounded-full"></div>
        </div>

        {/* === RIGHT DIVISION (SIDE INFO) === */}
        <div className="w-full md:w-[320px] bg-[#FFFFFF]/5 p-6 md:p-8 flex flex-col justify-between md:border-l border-white/5 text-white">

          <div>
<div className="mb-4">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">PNR Number</span>
                <p className="text-3xl font-black text-white tracking-[0.1em] mt-1 [text-shadow:0_0_20px_rgba(255,255,255,0.1)]">{pnrData.pnr}</p>
              </div>
              <div className="mb-8 flex justify-center bg-white p-3 rounded-xl max-w-fit mx-auto md:mx-0">
                <QRCode value={pnrData.pnr} size={120} level="M" />
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-white/10">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Total Fare</span>
                <span className="text-lg font-bold text-white tracking-wide">{pnrData.totalFare}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-white/10">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Distance</span>
                <span className="text-sm font-bold text-gray-300 font-mono">{pnrData.distance}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-white/10">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Chart Status</span>
                <span className="text-[10px] font-black uppercase bg-white/10 border border-white/10 px-2 py-1 rounded text-gray-300">{pnrData.chartStatus}</span>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-dashed border-white/10">
            <button
              onClick={onReset}
              className="w-full py-3 bg-white text-black font-black rounded-xl hover:bg-gray-200 transition-all text-xs uppercase tracking-[0.15em] hover:scale-[1.02] active:scale-[0.98]"
            >
              Check Another PNR
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}