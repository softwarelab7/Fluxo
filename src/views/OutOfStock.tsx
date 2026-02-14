import React, { useState, useEffect } from 'react';
import { repository } from '../services/repository';
import { Pedido, PedidoItem } from '../types';
import { Search, Loader2, PackageX, AlertTriangle } from 'lucide-react';
import GlassCard from '../components/GlassCard';
import { useToast } from '../components/Toast';

const OutOfStock: React.FC = () => {
    const [outOfStockItems, setOutOfStockItems] = useState<{ item: PedidoItem, pedido: Pedido }[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const { addToast } = useToast();

    useEffect(() => {
        loadOutOfStockItems();
    }, []);

    const loadOutOfStockItems = async () => {
        try {
            setLoading(true);
            const pedidos = await repository.getPedidos();
            // Include 'Auditado' and 'En Camino' (since we now allow saving partial progress)
            const auditados = pedidos.filter(p => p.estado === 'Auditado' || p.estado === 'En Camino');
            const items: { item: PedidoItem, pedido: Pedido }[] = [];

            await Promise.all(auditados.map(async (p) => {
                const pItems = await repository.getPedidoItems(p.id);
                pItems.forEach(item => {
                    if (item.estado_item === 'Agotado') {
                        items.push({ item, pedido: p });
                    }
                });
            }));

            setOutOfStockItems(items);
        } catch (error) {
            console.error("Error loading out of stock items:", error);
            addToast("Error al cargar items agotados", 'error');
        } finally {
            setLoading(false);
        }
    };

    const filteredItems = outOfStockItems.filter(({ item, pedido }) => {
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
                <Loader2 className="animate-spin text-slate-400" size={48} />
                <p className="text-slate-400 animate-pulse">Buscando productos agotados...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold flex items-center gap-2 text-slate-700 dark:text-slate-200">
                        <PackageX size={32} />
                        Reporte de Agotados
                    </h2>
                    <p className="text-slate-400">Historial de productos marcados como agotados por el proveedor.</p>
                </div>
            </header>

            <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="relative group w-full md:w-auto ml-auto">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar producto, marca o proveedor..."
                        className="w-full md:w-80 pl-12 pr-4 py-2.5 input-premium rounded-full focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 focus:outline-none transition-all placeholder:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#334155] shadow-inner"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredItems.length === 0 ? (
                    <div className="col-span-full py-24 text-center card-premium rounded-3xl border border-dashed border-[#334155]">
                        <PackageX size={64} className="mx-auto mb-6 opacity-20 text-slate-400" />
                        <h3 className="text-xl font-bold text-slate-300 mb-2">Sin Agotados</h3>
                        <p className="text-slate-500">No hay registros de productos agotados recientemente.</p>
                    </div>
                ) : (
                    filteredItems.map(({ item, pedido }) => (
                        <GlassCard key={item.id} className="group hover:border-slate-500/30 transition-all border-l-4 border-l-slate-500" noPadding>
                            <div className="p-4">
                                <div className="flex justify-between items-start mb-3">
                                    <span className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] font-black uppercase tracking-wider border border-slate-200 dark:border-slate-700">
                                        AGOTADO
                                    </span>
                                    <span className="text-[10px] text-slate-500 font-mono">
                                        {new Date(pedido.fecha_recepcion || pedido.fecha_creacion).toLocaleDateString()}
                                    </span>
                                </div>

                                <h4 className="font-bold text-slate-800 dark:text-white mb-1">{item.producto?.nombre}</h4>
                                <p className="text-xs text-slate-400 mb-4">{
                                    item.producto?.marca?.nombre || pedido.proveedor?.nombre
                                }</p>

                                <div className="flex items-center justify-between bg-slate-50 dark:bg-black/20 p-2 rounded-lg">
                                    <div className="text-center px-2">
                                        <p className="text-[9px] uppercase font-bold text-slate-400">Pedido</p>
                                        <p className="font-mono font-bold text-slate-600 dark:text-slate-300">{item.cantidad_pedida}</p>
                                    </div>
                                    <div className="h-6 w-px bg-slate-200 dark:bg-white/10"></div>
                                    <div className="text-center px-2 w-full">
                                        <p className="text-[9px] uppercase font-bold text-rose-500 flex items-center justify-center gap-1">
                                            <AlertTriangle size={10} />
                                            Sin Stock
                                        </p>
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

export default OutOfStock;
