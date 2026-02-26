import React, { useState, useEffect } from 'react';
import { repository } from '../services/repository';
import { Pedido, PedidoItem, EstadoItem } from '../types';
import GlassCard from '../components/GlassCard';
import { useToast } from '../components/Toast';
import XLSX from 'xlsx-js-style';
import { Search, Loader2, PackageCheck, Trash2, History, AlertTriangle, Download } from 'lucide-react';

const MissingItems: React.FC = () => {
    const [missingItems, setMissingItems] = useState<{ item: PedidoItem, pedido: Pedido }[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const { addToast } = useToast();

    useEffect(() => {
        loadMissingItems();
    }, []);

    const loadMissingItems = async () => {
        try {
            setLoading(true);
            const data = await repository.getMissingItems();
            setMissingItems(data);
        } catch (error) {
            console.error("Error loading missing items:", error);
            addToast("Error al cargar faltantes", 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateItemStatus = async (itemId: string, newStatus: EstadoItem) => {
        try {
            setIsProcessing(true);
            await repository.updatePedidoItem(itemId, { estado_item: newStatus });

            // Update local state by removing from missing items
            setMissingItems(prev => prev.filter(i => i.item.id !== itemId));

            addToast(newStatus === 'Cancelado' ? "Item eliminado de faltantes." : "Item pausado (pendiente).", 'success');
        } catch (error) {
            console.error("Error updating item status:", error);
            addToast("Error al actualizar estado.", 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const filteredMissingItems = missingItems.filter(({ item, pedido }) => {
        const term = searchTerm.toLowerCase();
        return (
            item.producto?.nombre.toLowerCase().includes(term) ||
            item.producto?.marca?.nombre.toLowerCase().includes(term) ||
            pedido.proveedor?.nombre.toLowerCase().includes(term)
        );
    });

    const exportToExcel = () => {
        const ws_data = [
            ["", `REPORTE DE FALTANTES E INCIDENCIAS - ${new Date().toLocaleDateString()}`],
            [""],
            ["", "FECHA", "PROVEEDOR", "PRODUCTO", "SKU", "PEDIDO", "RECIBIDO", "FALTA", "ESTADO"]
        ];

        filteredMissingItems.forEach(({ item, pedido }) => {
            ws_data.push([
                "",
                new Date(pedido.fecha_recepcion!).toLocaleDateString(),
                pedido.proveedor?.nombre || "-",
                item.producto?.nombre || "-",
                item.producto?.sku || "-",
                item.cantidad_pedida.toString(),
                item.cantidad_recibida.toString(),
                (item.cantidad_pedida - item.cantidad_recibida).toString(),
                item.estado_item || "-"
            ]);
        });

        const ws = XLSX.utils.aoa_to_sheet(ws_data);

        // Styling
        if (!ws['!merges']) ws['!merges'] = [];
        ws['!merges'].push({ s: { r: 0, c: 1 }, e: { r: 0, c: 8 } });

        ws['!cols'] = [
            { wch: 4 }, { wch: 15 }, { wch: 25 }, { wch: 40 }, { wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 15 }
        ];

        const borderStyle = {
            top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" }
        };

        const titleStyle = {
            font: { bold: true, sz: 14, color: { rgb: "FFFFFF" } },
            fill: { fgColor: { rgb: "E11D48" } }, // Rose-600
            alignment: { horizontal: "center" },
            border: borderStyle
        };

        const headerStyle = {
            font: { bold: true, color: { rgb: "FFFFFF" } },
            fill: { fgColor: { rgb: "E11D48" } },
            alignment: { horizontal: "center" },
            border: borderStyle
        };

        const cellStyle = { border: borderStyle };

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
        XLSX.utils.book_append_sheet(wb, ws, "Faltantes");
        XLSX.writeFile(wb, `Fluxo_Faltantes_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
                <Loader2 className="animate-spin text-rose-500" size={48} />
                <p className="text-slate-400 animate-pulse">Buscando items faltantes...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold flex items-center gap-2 text-rose-500">
                        <AlertTriangle size={32} />
                        Faltantes
                    </h2>
                    <p className="text-slate-400">Items de los últimos 30 días que no llegaron o llegaron incompletos.</p>
                </div>
                <button
                    onClick={exportToExcel}
                    className="flex items-center gap-2 px-6 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-rose-500/30 transition-all hover:-translate-y-0.5"
                >
                    <Download size={18} />
                    <span>Exportar Incidencias</span>
                </button>
            </header>

            <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                {/* Search */}
                <div className="relative group w-full md:w-auto ml-auto">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-rose-400 transition-colors" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar producto..."
                        className="w-full md:w-80 pl-12 pr-4 py-2.5 input-premium rounded-full focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500/50 focus:outline-none transition-all placeholder:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#334155] shadow-inner"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredMissingItems.length === 0 ? (
                    <div className="col-span-full py-24 text-center card-premium rounded-3xl border border-dashed border-[#334155]">
                        <PackageCheck size={64} className="mx-auto mb-6 opacity-20 text-emerald-500" />
                        <h3 className="text-xl font-bold text-slate-300 mb-2">Todo Resuelto</h3>
                        <p className="text-slate-500">No hay items pendientes de acción.</p>
                    </div>
                ) : (
                    filteredMissingItems.map(({ item, pedido }) => (
                        <GlassCard key={item.id} className="group hover:border-rose-500/30 transition-all border-l-4 border-l-rose-500" noPadding>
                            <div className="p-4">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex flex-col gap-1">
                                        <span className="px-2 py-1 rounded bg-rose-500/10 text-rose-500 text-[10px] font-black uppercase tracking-wider border border-rose-500/20 w-fit">
                                            {item.estado_item}
                                        </span>
                                        {pedido.titulo && (
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                                                {pedido.titulo}
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] text-slate-500 font-mono mr-2">
                                            {new Date(pedido.fecha_recepcion!).toLocaleDateString()}
                                        </span>

                                        {/* Action Buttons */}
                                        <button
                                            onClick={() => handleUpdateItemStatus(item.id, 'Pendiente')}
                                            disabled={isProcessing}
                                            className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-colors border border-amber-200 dark:border-amber-500/20 disabled:opacity-50"
                                            title="Pausar (Pendiente)"
                                        >
                                            <History size={14} />
                                        </button>
                                        <button
                                            onClick={() => handleUpdateItemStatus(item.id, 'Cancelado')}
                                            disabled={isProcessing}
                                            className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-colors border border-rose-200 dark:border-rose-500/20 disabled:opacity-50"
                                            title="Eliminar (No se espera)"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>

                                <h4 className="font-bold text-slate-800 dark:text-white mb-1">{item.producto?.nombre}</h4>
                                <p className="text-xs text-slate-400 mb-4">{
                                    // Try to show Brand, allow fallback to provider
                                    item.producto?.marca?.nombre || pedido.proveedor?.nombre
                                }</p>

                                <div className="flex items-center justify-between bg-slate-50 dark:bg-black/20 p-2 rounded-lg">
                                    <div className="text-center px-2">
                                        <p className="text-[9px] uppercase font-bold text-slate-400">Pedido</p>
                                        <p className="font-mono font-bold text-slate-600 dark:text-slate-300">{item.cantidad_pedida}</p>
                                    </div>
                                    <div className="h-6 w-px bg-slate-200 dark:bg-white/10"></div>
                                    <div className="text-center px-2">
                                        <p className="text-[9px] uppercase font-bold text-rose-500">Recibido</p>
                                        <p className="font-mono font-bold text-rose-500">{item.cantidad_recibida}</p>
                                    </div>
                                    <div className="h-6 w-px bg-slate-200 dark:bg-white/10"></div>
                                    <div className="text-center px-2">
                                        <p className="text-[9px] uppercase font-bold text-slate-400">Falta</p>
                                        <p className="font-mono font-bold text-slate-600 dark:text-slate-300">{item.cantidad_pedida - item.cantidad_recibida}</p>
                                    </div>
                                </div>
                            </div>
                        </GlassCard>
                    ))
                )}
            </div>
        </div>
    );
};

export default MissingItems;
