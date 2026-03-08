import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function StatCard({ label, value, icon: Icon, color = 'blue', trend, trendLabel }) {
    const colorMap = {
        blue: { iconBg: 'bg-blue-500/10', text: 'text-blue-400' },
        green: { iconBg: 'bg-emerald-500/10', text: 'text-emerald-400' },
        yellow: { iconBg: 'bg-amber-500/10', text: 'text-amber-400' },
        red: { iconBg: 'bg-red-500/10', text: 'text-red-400' },
        purple: { iconBg: 'bg-purple-500/10', text: 'text-purple-400' },
        cyan: { iconBg: 'bg-cyan-500/10', text: 'text-cyan-400' },
    };
    const c = colorMap[color] || colorMap.blue;

    return (
        <div className="bg-[#2B2B2B] rounded-2xl border border-[#D4D4D4]/10 p-5 hover:border-[#D4D4D4]/25 transition-all duration-300 group">
            <div className="flex items-start justify-between">
                <div className="space-y-3">
                    <p className="text-xs font-bold text-[#B3B3B3] uppercase tracking-wider">{label}</p>
                    <p className="text-3xl font-extrabold text-white">{value}</p>
                    {trend !== undefined && (
                        <div className="flex items-center gap-1.5">
                            {trend > 0 ? <TrendingUp size={14} className="text-emerald-400" /> :
                                trend < 0 ? <TrendingDown size={14} className="text-red-400" /> :
                                    <Minus size={14} className="text-[#B3B3B3]" />}
                            <span className={`text-xs font-semibold ${trend > 0 ? 'text-emerald-400' : trend < 0 ? 'text-red-400' : 'text-[#B3B3B3]'}`}>
                                {trendLabel || `${Math.abs(trend)}%`}
                            </span>
                        </div>
                    )}
                </div>
                <div className={`${c.iconBg} p-3 rounded-2xl group-hover:scale-110 transition-transform duration-300`}>
                    {Icon && <Icon size={24} className={c.text} />}
                </div>
            </div>
        </div>
    );
}
