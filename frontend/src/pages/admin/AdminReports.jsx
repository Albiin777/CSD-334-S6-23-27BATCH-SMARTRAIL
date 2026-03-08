export default function AdminReports() {
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
                <div className="bg-[#1D2332] rounded-2xl border border-white/5 shadow-2xl p-6">
                    <h3 className="font-bold text-white mb-4">Passenger Density (7 Days)</h3>
                    <div className="h-48 w-full flex items-end gap-2 px-2 border-b border-l border-gray-700/50 pb-2">
                        {/* Placeholder Bar Chart */}
                        <div className="w-1/7 bg-blue-500/80 rounded-t h-[40%] flex-1 hover:bg-blue-400 transition-colors"></div>
                        <div className="w-1/7 bg-blue-500/80 rounded-t h-[60%] flex-1 hover:bg-blue-400 transition-colors"></div>
                        <div className="w-1/7 bg-blue-500/80 rounded-t h-[50%] flex-1 hover:bg-blue-400 transition-colors"></div>
                        <div className="w-1/7 bg-blue-500/80 rounded-t h-[80%] flex-1 hover:bg-blue-400 transition-colors"></div>
                        <div className="w-1/7 bg-blue-500/80 rounded-t h-[70%] flex-1 hover:bg-blue-400 transition-colors"></div>
                        <div className="w-1/7 bg-blue-500/80 rounded-t h-[90%] flex-1 hover:bg-blue-400 transition-colors shadow-[0_0_15px_rgba(59,130,246,0.3)]"></div>
                        <div className="w-1/7 bg-blue-500/80 rounded-t h-[65%] flex-1 hover:bg-blue-400 transition-colors"></div>
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-500 uppercase tracking-widest mt-2 px-2 font-bold">
                        <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span className="text-white">Sat</span><span>Sun</span>
                    </div>
                </div>

                <div className="bg-[#1D2332] rounded-2xl border border-white/5 shadow-2xl p-6">
                    <h3 className="font-bold text-white mb-4">TTE Duty Hours Map</h3>
                    <div className="space-y-3 flex items-center justify-center h-48 text-gray-500 font-medium text-sm">
                        Live TTE Duty Tracking is Syncing...
                    </div>
                </div>
            </div>
        </div>
    );
}
