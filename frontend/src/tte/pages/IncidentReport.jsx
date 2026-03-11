import { useState, useRef } from 'react';
import { useSmartRail } from '../hooks/useSmartRail';
import { AlertTriangle, Heart, Shield, Wrench, Users, Phone, Radio, Camera, X, Loader2, CheckCircle } from 'lucide-react';

const REPORT_TYPES = [
    { type: 'Medical', icon: Heart, color: 'red' },
    { type: 'Security', icon: Shield, color: 'blue' },
    { type: 'Complaint', icon: Users, color: 'amber' },
    { type: 'Technical', icon: Wrench, color: 'purple' },
    { type: 'Overcrowding', icon: Users, color: 'cyan' },
];

const colorMap = { red: 'bg-red-500/10 border-red-500/20 text-red-400', blue: 'bg-blue-500/10 border-blue-500/20 text-blue-400', amber: 'bg-amber-500/10 border-amber-500/20 text-amber-400', purple: 'bg-purple-500/10 border-purple-500/20 text-purple-400', cyan: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400' };

export default function IncidentReport() {
    const { incidents, addIncident, tteInfo } = useSmartRail();
    const [selected, setSelected] = useState(null);
    const [desc, setDesc] = useState('');
    const [photo, setPhoto] = useState(null); // base64 data URL for preview and upload
    const [submitting, setSubmitting] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState(false);
    const fileInputRef = useRef(null);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Compress image before storing
            const reader = new FileReader();
            reader.onloadend = () => {
                // Create image to resize
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const maxSize = 1200;
                    let width = img.width;
                    let height = img.height;
                    
                    if (width > height && width > maxSize) {
                        height = (height * maxSize) / width;
                        width = maxSize;
                    } else if (height > maxSize) {
                        width = (width * maxSize) / height;
                        height = maxSize;
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    // Convert to JPEG with 80% quality
                    setPhoto(canvas.toDataURL('image/jpeg', 0.8));
                };
                img.src = reader.result;
            };
            reader.readAsDataURL(file);
        }
    };

    const triggerFileInput = () => fileInputRef.current.click();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selected || !desc || submitting) return;
        
        setSubmitting(true);
        try {
            const result = await addIncident({ 
                type: selected, 
                description: desc, 
                coach: tteInfo.coach || tteInfo.coachLabel, 
                reporter: 'TTE',
                photo: photo 
            });
            
            if (result.success) {
                setSubmitSuccess(true);
                setSelected(null);
                setDesc('');
                setPhoto(null);
                
                // Reset success message after 3 seconds
                setTimeout(() => setSubmitSuccess(false), 3000);
            }
        } catch (error) {
            console.error('Failed to submit incident:', error);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Report Type Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {REPORT_TYPES.map(rt => (
                    <button key={rt.type} onClick={() => setSelected(rt.type)}
                        className={`p-5 rounded-2xl border transition-all text-center ${selected === rt.type ? `${colorMap[rt.color]} border-2` : 'bg-[#2B2B2B] border-[#D4D4D4]/10 text-[#B3B3B3] hover:border-[#D4D4D4]/25'}`}>
                        <rt.icon size={28} className={`mx-auto mb-2 ${selected === rt.type ? '' : 'opacity-50'}`} />
                        <p className="text-sm font-bold">{rt.type}</p>
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Report Form */}
                <div className="bg-[#2B2B2B] rounded-2xl border border-[#D4D4D4]/10 p-6">
                    <h3 className="text-sm font-bold text-[#B3B3B3] uppercase tracking-wider mb-5 flex items-center gap-2"><AlertTriangle size={16} /> File Incident Report</h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="bg-gray-900 rounded-xl p-3 border border-[#D4D4D4]/5 flex items-center justify-between">
                            <span className="text-sm text-[#9CA3AF]">Type</span>
                            <span className="text-sm font-bold text-white">{selected || 'Select type above'}</span>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider block mb-1">Description</label>
                            <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={4} required className="w-full bg-gray-900 border border-[#D4D4D4]/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-[#6B7280] outline-none resize-none focus:border-[#D4D4D4]/30 transition" placeholder="Describe the incident…" />
                        </div>
                        {photo && (
                            <div className="relative group rounded-xl overflow-hidden border border-[#D4D4D4]/10 bg-black/40">
                                <img src={photo} alt="Incident" className="w-full h-40 object-cover" />
                                <button type="button" onClick={() => setPhoto(null)} className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full text-white hover:bg-black transition opacity-0 group-hover:opacity-100"><X size={14}/></button>
                            </div>
                        )}

                        <div className="flex gap-2">
                            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" capture="environment" className="hidden" />
                            <button type="button" onClick={triggerFileInput} disabled={submitting} className={`flex-1 flex items-center justify-center gap-2 py-3 border border-[#D4D4D4]/10 rounded-xl text-sm font-semibold transition ${photo ? 'bg-[#4ab86d]/10 text-[#4ab86d] border-[#4ab86d]/20' : 'bg-white/10 text-[#B3B3B3] hover:bg-white/20'} ${submitting ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                <Camera size={16} /> {photo ? 'Change Photo' : 'Attach Photo'}
                            </button>
                            <button type="button" className="flex-1 flex items-center justify-center gap-2 py-3 bg-white/10 text-[#B3B3B3] border border-[#D4D4D4]/10 rounded-xl text-sm font-semibold hover:bg-white/20 transition"><Phone size={16} /> Emergency Call</button>
                        </div>
                        
                        {/* Success Message */}
                        {submitSuccess && (
                            <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm">
                                <CheckCircle size={16} />
                                <span>Incident reported successfully!</span>
                            </div>
                        )}
                        
                        <div className="grid grid-cols-2 gap-2">
                            <button 
                                type="submit" 
                                disabled={submitting || !selected || !desc}
                                className={`flex items-center justify-center gap-2 py-3 bg-red-500 text-white rounded-xl font-bold text-sm transition ${submitting || !selected || !desc ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-600'}`}
                            >
                                {submitting ? <Loader2 size={16} className="animate-spin" /> : <Radio size={16} />}
                                {submitting ? 'Submitting...' : 'Notify Control'}
                            </button>
                            <button type="button" className="flex items-center justify-center gap-2 py-3 bg-blue-500 text-white rounded-xl font-bold text-sm hover:bg-blue-600 transition"><Shield size={16} /> Notify RPF</button>
                        </div>
                    </form>
                </div>

                {/* Incident Log */}
                <div className="bg-[#2B2B2B] rounded-2xl border border-[#D4D4D4]/10 overflow-hidden">
                    <div className="p-5 border-b border-[#D4D4D4]/10"><h3 className="text-sm font-bold text-[#B3B3B3] uppercase tracking-wider">Incident Log</h3></div>
                    {incidents.length === 0 ? (
                        <div className="p-8 text-center text-[#6B7280]">
                            <AlertTriangle size={32} className="mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No incidents reported yet</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead><tr className="bg-black/20 text-[#B3B3B3] text-xs uppercase tracking-wider"><th className="p-4 font-semibold">Time</th><th className="p-4 font-semibold">Type</th><th className="p-4 font-semibold">Description</th><th className="p-4 font-semibold">Photo</th><th className="p-4 font-semibold">Status</th></tr></thead>
                                <tbody className="divide-y divide-[#D4D4D4]/5">
                                    {incidents.map(inc => (
                                        <tr key={inc.id} className="hover:bg-white/5">
                                            <td className="p-4 text-sm font-mono text-[#9CA3AF]">{inc.time}</td>
                                            <td className="p-4"><span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${inc.type === 'Medical' ? 'bg-red-500/10 text-red-400 border-red-500/20' : inc.type === 'Security' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : inc.type === 'Technical' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>{inc.type}</span></td>
                                            <td className="p-4 text-sm text-white font-medium max-w-[200px] truncate">{inc.description}</td>
                                            <td className="p-4">
                                                {inc.photo ? (
                                                    <a href={inc.photo} target="_blank" rel="noopener noreferrer" className="block w-12 h-12 rounded-lg overflow-hidden border border-[#D4D4D4]/10 hover:border-blue-500/50 transition">
                                                        <img src={inc.photo} alt="Evidence" className="w-full h-full object-cover" />
                                                    </a>
                                                ) : (
                                                    <span className="text-[#6B7280] text-xs">—</span>
                                                )}
                                            </td>
                                            <td className="p-4"><span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${inc.status === 'Active' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>{inc.status}</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
