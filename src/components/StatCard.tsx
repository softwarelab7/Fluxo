import GlassCard from './GlassCard';
import { ArrowUpRight } from 'lucide-react';

interface StatCardProps {
    title: string;
    value: string | number;
    icon: any;
    color: string;
    trend?: string;
    onClick?: () => void;
}

export const StatCard = ({ title, value, icon: Icon, color, trend, onClick }: StatCardProps) => {
    // Extract base color styles
    let styles = {
        bgFrom: "from-blue-500/5",
        bgTo: "to-blue-600/5",
        text: "text-blue-600 dark:text-blue-400",
        iconBg: "bg-blue-100 dark:bg-blue-500/20",
        trendText: "text-blue-600",
        trendBg: "bg-blue-100 dark:bg-blue-500/10",
        border: "group-hover:border-blue-200 dark:group-hover:border-blue-800"
    };

    if (color.includes("rose") || color.includes("red")) {
        styles = {
            bgFrom: "from-rose-500/5",
            bgTo: "to-rose-600/5",
            text: "text-rose-600 dark:text-rose-400",
            iconBg: "bg-rose-100 dark:bg-rose-500/20",
            trendText: "text-rose-600",
            trendBg: "bg-rose-100 dark:bg-rose-500/10",
            border: "group-hover:border-rose-200 dark:group-hover:border-rose-800"
        };
    } else if (color.includes("emerald") || color.includes("green")) {
        styles = {
            bgFrom: "from-emerald-500/5",
            bgTo: "to-emerald-600/5",
            text: "text-emerald-600 dark:text-emerald-400",
            iconBg: "bg-emerald-100 dark:bg-emerald-500/20",
            trendText: "text-emerald-600",
            trendBg: "bg-emerald-100 dark:bg-emerald-500/10",
            border: "group-hover:border-emerald-200 dark:group-hover:border-emerald-800"
        };
    } else if (color.includes("amber") || color.includes("yellow")) {
        styles = {
            bgFrom: "from-amber-500/5",
            bgTo: "to-amber-600/5",
            text: "text-amber-600 dark:text-amber-400",
            iconBg: "bg-amber-100 dark:bg-amber-500/20",
            trendText: "text-amber-600",
            trendBg: "bg-amber-100 dark:bg-amber-500/10",
            border: "group-hover:border-amber-200 dark:group-hover:border-amber-800"
        };
    } else if (color.includes("slate") || color.includes("gray")) {
        styles = {
            bgFrom: "from-slate-500/5",
            bgTo: "to-slate-600/5",
            text: "text-slate-600 dark:text-slate-400",
            iconBg: "bg-slate-100 dark:bg-slate-500/20",
            trendText: "text-slate-600",
            trendBg: "bg-slate-100 dark:bg-slate-500/10",
            border: "group-hover:border-slate-200 dark:group-hover:border-slate-800"
        };
    }

    return (
        <GlassCard
            onClick={onClick}
            className={`flex flex-col justify-between h-full group transition-all duration-300 shadow-sm hover:shadow-lg relative overflow-hidden bg-gradient-to-br ${styles.bgFrom} ${styles.bgTo} to-transparent border-slate-200 dark:border-slate-800 ${styles.border} ${onClick ? 'cursor-pointer' : ''}`}
        >

            {/* Decorative Background Icon */}
            <div className={`absolute -bottom-4 -right-4 opacity-[0.05] group-hover:opacity-[0.1] transition-opacity duration-500 pointer-events-none`}>
                <Icon size={120} className={styles.text} />
            </div>

            <div className="relative z-10 flex justify-between items-start mb-4">
                <div className={`p-2.5 rounded-xl ${styles.iconBg} backdrop-blur-sm shadow-sm border border-white/20 group-hover:scale-110 transition-transform duration-300`}>
                    <Icon size={20} className={styles.text} />
                </div>

                {trend && (
                    <span className={`flex items-center text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${styles.trendBg} ${styles.trendText} border border-transparent group-hover:border-current transition-colors`}>
                        {trend} <ArrowUpRight size={12} className="ml-1" />
                    </span>
                )}
            </div>

            <div className="relative z-10">
                <p className="text-slate-500 dark:text-slate-400 text-xs font-bold tracking-widest uppercase mb-1">{title}</p>
                <h3 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">{value}</h3>
            </div>
        </GlassCard>
    );
};
