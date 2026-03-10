import { useState, useRef, useEffect } from 'react';
import { useSmartRail } from '../hooks/useSmartRail';
import { RefreshCw, CheckCircle, XCircle, FileText, PenTool } from 'lucide-react';

export default function Handover() {
    const { stats, tteInfo, fines, incidents, logs, allPassengers: passengers } = useSmartRail();
    const verified = passengers.filter(p => p.verified).length;
    const seatChanges = 3;

    const [incomingTte, setIncomingTte] = useState('');
    const canvasRef = useRef(null);
    const contextRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasSigned, setHasSigned] = useState(false);

    useEffect(() => {
        if (canvasRef.current) {
            const canvas = canvasRef.current;
            // Set actual canvas resolution based on display size to prevent blurry lines
            const rect = canvas.parentElement.getBoundingClientRect();
            canvas.width = rect.width * 2;
            canvas.height = rect.height * 2;
            
            const context = canvas.getContext('2d');
            context.scale(2, 2);
            context.lineCap = 'round';
            context.lineJoin = 'round';
            context.strokeStyle = '#ffffff';
            context.lineWidth = 3;
            contextRef.current = context;
        }
    }, []);

    const startDrawing = ({ nativeEvent }) => {
        if (!contextRef.current) return;
        const { offsetX, offsetY } = nativeEvent;
        contextRef.current.beginPath();
        contextRef.current.moveTo(offsetX, offsetY);
        setIsDrawing(true);
    };

    const draw = ({ nativeEvent }) => {
        if (!isDrawing || !contextRef.current) return;
        const { offsetX, offsetY } = nativeEvent;
        contextRef.current.lineTo(offsetX, offsetY);
        contextRef.current.stroke();
    };

    const isCanvasBlank = (canvas) => {
        const context = canvas.getContext('2d');
        const pixelBuffer = new Uint32Array(
            context.getImageData(0, 0, canvas.width, canvas.height).data.buffer
        );
        return !pixelBuffer.some(color => color !== 0);
    };

    const stopDrawing = () => {
        if (contextRef.current) {
            contextRef.current.closePath();
        }
        setIsDrawing(false);
        if (canvasRef.current) setHasSigned(!isCanvasBlank(canvasRef.current));
    };

    const clearSignature = () => {
        if (canvasRef.current && contextRef.current) {
            contextRef.current.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            setHasSigned(false);
        }
    };

    const handleAccept = () => {
        if (!incomingTte.trim()) return;
        if (canvasRef.current && isCanvasBlank(canvasRef.current)) {
            alert('Please provide a digital signature.');
            return;
        }
        alert(`Handover to ${incomingTte} accepted successfully!`);
        clearSignature();
        setIncomingTte('');
    };

    const summaryCards = [
        { label: 'Passengers Verified', value: verified, color: 'text-emerald-400' },
        { label: 'Seat Changes', value: seatChanges, color: 'text-blue-400' },
        { label: 'Fines Collected', value: `₹${fines.reduce((s, f) => s + f.amount, 0)}`, color: 'text-amber-400' },
        { label: 'Incidents Reported', value: incidents.length, color: 'text-red-400' },
    ];

    return (
        <div className="space-y-6">
            {/* Current TTE */}
            <div className="bg-[#2B2B2B] rounded-2xl border border-[#D4D4D4]/10 p-6">
                <h3 className="text-sm font-bold text-[#B3B3B3] uppercase tracking-wider mb-4 flex items-center gap-2"><RefreshCw size={16} /> Shift Handover Summary</h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-gray-900 rounded-xl p-3 border border-[#D4D4D4]/5">
                        <p className="text-[10px] font-bold text-[#9CA3AF] uppercase">TTE Name</p>
                        <p className="text-sm font-semibold text-white mt-0.5">{tteInfo.name}</p>
                    </div>
                    <div className="bg-gray-900 rounded-xl p-3 border border-[#D4D4D4]/5">
                        <p className="text-[10px] font-bold text-[#9CA3AF] uppercase">TTE ID</p>
                        <p className="text-sm font-semibold text-white mt-0.5">{tteInfo.id}</p>
                    </div>
                    <div className="bg-gray-900 rounded-xl p-3 border border-[#D4D4D4]/5">
                        <p className="text-[10px] font-bold text-[#9CA3AF] uppercase">Shift</p>
                        <p className="text-sm font-semibold text-white mt-0.5">{tteInfo.shift}</p>
                    </div>
                    <div className="bg-gray-900 rounded-xl p-3 border border-[#D4D4D4]/5">
                        <p className="text-[10px] font-bold text-[#9CA3AF] uppercase">Coach</p>
                        <p className="text-sm font-semibold text-white mt-0.5">{tteInfo.coach}</p>
                    </div>
                </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {summaryCards.map(c => (
                    <div key={c.label} className="bg-[#2B2B2B] rounded-2xl border border-[#D4D4D4]/10 p-5">
                        <p className="text-xs font-bold text-[#B3B3B3] uppercase tracking-wider">{c.label}</p>
                        <p className={`text-3xl font-extrabold mt-2 ${c.color}`}>{c.value}</p>
                    </div>
                ))}
            </div>

            {/* Audit Log */}
            <div className="bg-[#2B2B2B] rounded-2xl border border-[#D4D4D4]/10 overflow-hidden">
                <div className="p-5 border-b border-[#D4D4D4]/10"><h3 className="text-sm font-bold text-[#B3B3B3] uppercase tracking-wider">Audit Log</h3></div>
                <div className="max-h-64 overflow-y-auto">
                    {logs.slice(0, 15).map((log, i) => (
                        <div key={i} className="flex items-center gap-3 px-5 py-3 border-b border-[#D4D4D4]/5 last:border-0 hover:bg-white/5">
                            <span className="font-mono text-[11px] w-12 shrink-0 text-[#9CA3AF]">{log.time}</span>
                            <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: log.type === 'verify' ? '#34d399' : log.type === 'fine' ? '#fbbf24' : log.type === 'incident' ? '#ef4444' : '#60a5fa' }} />
                            <p className="text-sm text-white font-medium truncate">{log.action}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Handover Actions */}
            <div className="bg-[#2B2B2B] rounded-2xl border border-[#D4D4D4]/10 p-6">
                <h3 className="text-sm font-bold text-[#B3B3B3] uppercase tracking-wider mb-4">Digital Handover</h3>
                <div className="bg-gray-900 rounded-xl p-4 border border-[#D4D4D4]/5 mb-4">
                    <p className="text-[10px] font-bold text-[#9CA3AF] uppercase mb-2">Incoming TTE Name</p>
                    <input 
                        type="text" 
                        value={incomingTte}
                        onChange={(e) => setIncomingTte(e.target.value)}
                        placeholder="Enter receiving TTE name…" 
                        className="w-full bg-transparent text-sm text-white placeholder:text-[#6B7280] outline-none" 
                    />
                </div>
                
                <div className="relative bg-gray-900 rounded-xl overflow-hidden border border-dashed border-[#D4D4D4]/30 mb-4 h-48 touch-none">
                    <canvas
                        ref={canvasRef}
                        onPointerDown={startDrawing}
                        onPointerMove={draw}
                        onPointerUp={stopDrawing}
                        onPointerOut={stopDrawing}
                        className="w-full h-full cursor-crosshair touch-none"
                    />
                    {!hasSigned && !isDrawing && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none opacity-40">
                            <PenTool size={32} className="text-[#6B7280] mb-2" />
                            <p className="text-xs font-semibold text-[#9CA3AF]">Sign Here</p>
                        </div>
                    )}
                    <button 
                        onClick={clearSignature}
                        className="absolute top-3 right-3 text-[10px] font-bold uppercase tracking-wider text-gray-500 hover:text-white transition"
                    >
                        Clear
                    </button>
                </div>

                <div className="flex gap-3">
                    <button 
                        onClick={handleAccept}
                        disabled={!incomingTte.trim()}
                        className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-500 text-white rounded-xl font-bold text-sm hover:bg-emerald-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <CheckCircle size={16} /> Accept Handover
                    </button>
                    <button 
                        className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl font-bold text-sm hover:bg-red-500 hover:text-white transition"
                    >
                        <XCircle size={16} /> Reject
                    </button>
                </div>
            </div>
        </div>
    );
}
