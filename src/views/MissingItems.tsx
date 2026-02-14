import React, { useState, useEffect } from 'react';
import { repository } from '../services/repository';
import { Pedido, PedidoItem, EstadoItem } from '../types';
import { Search, Loader2, PackageCheck, Trash2, History, AlertTriangle } from 'lucide-react';
import GlassCard from '../components/GlassCard';
import { useToast } from '../components/Toast';

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
            const pedidos = await repository.getPedidos();
            // Filter orders that are already audited or in progress
            const auditados = pedidos.filter(p => p.estado === 'Auditado' || p.estado === 'En Camino');

            const missing: { item: PedidoItem, pedido: Pedido }[] = [];

            // Fetch items for all audited orders (Parallel)
            await Promise.all(auditados.map(async (p) => {
                const pItems = await repository.getPedidoItems(p.id);
                pItems.forEach(item => {
                    // Only show items that are 'No llegó' or 'Incompleto'
                    if (item.estado_item === 'No llegó' || item.estado_item === 'Incompleto') {
                        missing.push({ item, pedido: p });
                    }
                });
            }));

            setMissingItems(missing);
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
                    <p className="text-slate-400">Gestión de items que no llegaron o llegaron incompletos.</p>
                </div>
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
                                    <span className="px-2 py-1 rounded bg-rose-500/10 text-rose-500 text-[10px] font-black uppercase tracking-wider border border-rose-500/20">
                                        {item.estado_item}
                                    </span>

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
