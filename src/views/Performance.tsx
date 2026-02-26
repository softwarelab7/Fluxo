import React, { useState, useEffect } from 'react';
import { repository } from '../services/repository';
import { Loader2, TrendingUp, CheckCircle, AlertCircle, ShoppingBag, Download } from 'lucide-react';
import GlassCard from '../components/GlassCard';
import { StatCard } from '../components/StatCard';
import { useToast } from '../components/Toast';
import XLSX from 'xlsx-js-style';

const Performance: React.FC = () => {
    const [stats, setStats] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { addToast } = useToast();

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            setLoading(true);
            const data = await repository.getSupplierPerformanceStats();
            setStats(data);
        } catch (error) {
            console.error("Error loading performance stats:", error);
            addToast("Error al cargar estadísticas de desempeño", 'error');
        } finally {
            setLoading(false);
        }
    };

    const exportToExcel = () => {
        const ws_data = [
            ["", `REPORTE DE DESEMPEÑO DE PROVEEDORES - ${new Date().toLocaleDateString()}`],
            [""],
            ["", "PROVEEDOR", "PEDIDOS TOTALES", "PEDIDOS PERFECTOS", "TOTAL INCIDENCIAS", "EFICIENCIA %"]
        ];

        stats.sort((a, b) => (b.perfectOrders / b.totalOrders) - (a.perfectOrders / a.totalOrders)).forEach(s => {
            const efficiency = (s.perfectOrders / s.totalOrders * 100).toFixed(1);
            ws_data.push([
                "",
                s.name,
                s.totalOrders.toString(),
                s.perfectOrders.toString(),
                s.totalIncidences.toString(),
                `${efficiency}%`
            ]);
        });

        const ws = XLSX.utils.aoa_to_sheet(ws_data);

        // Styling
        if (!ws['!merges']) ws['!merges'] = [];
        ws['!merges'].push({ s: { r: 0, c: 1 }, e: { r: 0, c: 5 } });

        ws['!cols'] = [
            { wch: 4 }, { wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }
        ];

        const borderStyle = {
            top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" }
        };

        const titleStyle = {
            font: { bold: true, sz: 14, color: { rgb: "FFFFFF" } },
            fill: { fgColor: { rgb: "3B82F6" } }, // Blue-500
            alignment: { horizontal: "center" },
            border: borderStyle
        };

        const headerStyle = {
            font: { bold: true, color: { rgb: "FFFFFF" } },
            fill: { fgColor: { rgb: "3B82F6" } },
            alignment: { horizontal: "center" },
            border: borderStyle
        };

        const cellStyle = { border: borderStyle, alignment: { horizontal: "center" } };

        const range = XLSX.utils.decode_range(ws['!ref']!);
        for (let R = range.s.r; R <= range.e.r; ++R) {
            for (let C = range.s.c; C <= range.e.c; ++C) {
                if (C === 0) continue;
                const addr = XLSX.utils.encode_cell({ r: R, c: C });
                if (!ws[addr]) continue;
                if (R === 0) ws[addr].s = titleStyle;
                else if (R === 2) ws[addr].s = headerStyle;
                else if (R > 2) ws[addr].s = cellStyle;
            }
        }

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Desempeño");
        XLSX.writeFile(wb, `Fluxo_Desempeno_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
                <Loader2 className="animate-spin text-blue-500" size={48} />
                <p className="text-slate-400 animate-pulse">Analizando desempeño de proveedores...</p>
            </div>
        );
    }

    const totalOrders = stats.reduce((acc, s) => acc + s.totalOrders, 0);
    const totalPerfect = stats.reduce((acc, s) => acc + s.perfectOrders, 0);
    const globalEfficiency = totalOrders > 0 ? (totalPerfect / totalOrders * 100).toFixed(1) : "0";

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <TrendingUp className="text-blue-500" size={32} />
                        Desempeño de Proveedores
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400">Análisis de precisión en entregas y cumplimiento de auditorías.</p>
                </div>
                <button
                    onClick={exportToExcel}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-sm shadow-lg shadow-blue-500/30 transition-all hover:-translate-y-0.5"
                >
                    <Download size={18} />
                    <span>Exportar Reporte</span>
                </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard
                    title="Eficiencia Global"
                    value={`${globalEfficiency}%`}
                    icon={CheckCircle}
                    color="bg-emerald-500"
                    trend="Entregas Perfectas"
                />
                <StatCard
                    title="Total Pedidos Auditados"
                    value={totalOrders}
                    icon={ShoppingBag}
                    color="bg-blue-500"
                />
                <StatCard
                    title="Total Incidencias"
                    value={stats.reduce((acc, s) => acc + s.totalIncidences, 0)}
                    icon={AlertCircle}
                    color="bg-rose-500"
                    trend="Items faltantes/dañados"
                />
            </div>

            <GlassCard title="Ranking de Cumplimiento">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider border-b border-slate-100 dark:border-white/5">
                                <th className="py-4 font-bold">Proveedor</th>
                                <th className="py-4 font-bold text-center">Pedidos</th>
                                <th className="py-4 font-bold text-center">Perfectos</th>
                                <th className="py-4 font-bold text-center">Incidencias</th>
                                <th className="py-4 font-bold text-right">Eficiencia</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                            {stats.sort((a, b) => (b.perfectOrders / b.totalOrders) - (a.perfectOrders / a.totalOrders)).map((s) => {
                                const efficiency = (s.perfectOrders / s.totalOrders * 100);
                                return (
                                    <tr key={s.id} className="group hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                                        <td className="py-4 font-bold text-slate-700 dark:text-slate-200">{s.name}</td>
                                        <td className="py-4 text-center text-slate-600 dark:text-slate-400">{s.totalOrders}</td>
                                        <td className="py-4 text-center text-emerald-600 dark:text-emerald-400 font-bold">{s.perfectOrders}</td>
                                        <td className="py-4 text-center text-rose-500 dark:text-rose-400">{s.totalIncidences}</td>
                                        <td className="py-4 text-right">
                                            <div className="flex flex-col items-end gap-1">
                                                <span className={`text-sm font-black ${efficiency > 90 ? 'text-emerald-500' : efficiency > 70 ? 'text-amber-500' : 'text-rose-500'}`}>
                                                    {efficiency.toFixed(1)}%
                                                </span>
                                                <div className="w-24 h-1.5 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full transition-all duration-1000 ${efficiency > 90 ? 'bg-emerald-500' : efficiency > 70 ? 'bg-amber-500' : 'bg-rose-500'}`}
                                                        style={{ width: `${efficiency}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {stats.length === 0 && (
                        <div className="py-12 text-center text-slate-400">
                            No hay datos de auditoría suficientes para calcular el desempeño.
                        </div>
                    )}
                </div>
            </GlassCard>
        </div>
    );
};

export default Performance;
