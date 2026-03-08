import { useState } from "react";

export default function StationManagement() {
    const defaultStations = [
        { code: 'CAN', name: 'Kannur', city: 'Kannur', state: 'Kerala', platforms: 3 },
        { code: 'SRR', name: 'Shoranur', city: 'Shoranur', state: 'Kerala', platforms: 7 },
        { code: 'TVC', name: 'Thiruvananthapuram', city: 'Thiruvananthapuram', state: 'Kerala', platforms: 5 },
        { code: 'ERS', name: 'Ernakulam Jn', city: 'Kochi', state: 'Kerala', platforms: 6 },
    ];

    const [stations, setStations] = useState(defaultStations);

    return (
        <div className="space-y-6 animate-fade-in text-gray-100 font-sans">
            <div className="flex justify-between items-center mb-6 pt-4 px-2">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-wide flex items-center gap-3">
                        <span className="text-blue-500 text-3xl">🚉</span> Station Management
                    </h1>
                    <p className="text-sm text-gray-400 mt-1">Manage station codes, platform counts, and metadata.</p>
                </div>
                <button className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg transition border border-blue-500/50">
                    + Add Station
                </button>
            </div>

            <div className="bg-[#1D2332] rounded-2xl border border-white/5 shadow-2xl overflow-hidden mx-2">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-[#0f172a] text-xs uppercase tracking-widest text-gray-400 border-b border-gray-700/50">
                            <th className="p-4 font-bold">Code</th>
                            <th className="p-4 font-bold">Station Name</th>
                            <th className="p-4 font-bold">City / State</th>
                            <th className="p-4 font-bold text-center">Platforms</th>
                            <th className="p-4 font-bold text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm">
                        {stations.map((st, idx) => (
                            <tr key={idx} className="border-b border-gray-700/20 hover:bg-white/[0.02] transition-colors">
                                <td className="p-4">
                                    <span className="font-mono bg-blue-500/10 text-blue-400 px-2 py-1 rounded font-bold border border-blue-500/20">{st.code}</span>
                                </td>
                                <td className="p-4 font-bold text-white text-base">{st.name}</td>
                                <td className="p-4 text-gray-400">{st.city}, <span className="text-gray-500">{st.state}</span></td>
                                <td className="p-4 text-center text-gray-300 font-bold">{st.platforms}</td>
                                <td className="p-4 text-right">
                                    <button className="text-gray-500 hover:text-white px-2 py-1 transition-colors">⚙️ Edit</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
