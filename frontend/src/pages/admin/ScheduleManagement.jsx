import { useState } from "react";

export default function ScheduleManagement() {
    return (
        <div className="space-y-6 animate-fade-in text-gray-100 font-sans">
            <div className="flex justify-between items-center mb-6 pt-4 px-2">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-wide flex items-center gap-3">
                        <span className="text-teal-500 text-3xl">🕒</span> Schedule Management
                    </h1>
                    <p className="text-sm text-gray-400 mt-1">Adjust train timings and station halts.</p>
                </div>
            </div>

            <div className="bg-[#1D2332] rounded-2xl border border-white/5 shadow-2xl overflow-hidden mx-2 p-12 text-center">
                <div className="text-5xl mb-4">🗓️</div>
                <h2 className="text-xl font-bold text-white mb-2">Schedule Engine Core</h2>
                <p className="text-gray-400 max-w-md mx-auto">
                    The train scheduling engine is heavily coupled with the booking system. This module is locked for the demo.
                </p>
                <div className="mt-8 flex justify-center">
                    <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 text-left font-mono text-sm inline-block shadow-inner w-full max-w-lg">
                        <div className="text-gray-500 mb-2">Example Route Timetable (16346)</div>
                        <div className="grid grid-cols-4 gap-4 text-xs mt-3 bg-[#0f172a] p-3 rounded border border-gray-700/50">
                            <span className="text-gray-400 uppercase tracking-widest font-bold">Station</span>
                            <span className="text-gray-400 uppercase tracking-widest font-bold">Arr</span>
                            <span className="text-gray-400 uppercase tracking-widest font-bold">Dep</span>
                            <span className="text-gray-400 uppercase tracking-widest font-bold text-right">Halt</span>

                            <span className="text-white font-bold">Kannur (CAN)</span><span className="text-gray-500">—</span><span className="text-teal-400">06:00</span><span className="text-right text-gray-500">—</span>
                            <span className="text-white font-bold">Shoranur (SRR)</span><span className="text-teal-400">11:00</span><span className="text-teal-400">11:10</span><span className="text-right text-orange-400 font-bold">10m</span>
                            <span className="text-white font-bold">Trivandrum (TVC)</span><span className="text-teal-400">18:00</span><span className="text-gray-500">—</span><span className="text-right text-gray-500">—</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
