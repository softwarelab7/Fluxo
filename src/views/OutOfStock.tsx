import React, { useState, useEffect } from 'react';
import { repository } from '../services/repository';
import { Pedido, PedidoItem } from '../types';
import { Search, Loader2, PackageX, AlertTriangle } from 'lucide-react';
import GlassCard from '../components/GlassCard';
import { useToast } from '../components/Toast';

const OutOfStock: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
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
            // Include 'Auditado' and 'En Camino'
            const auditados = pedidos.filter(p => p.estado === 'Auditado' || p.estado === 'En Camino');
            const items: { item: PedidoItem, pedido: Pedido }[] = [];

            await Promise.all(auditados.map(async (p) => {
                const pItems = await repository.getPedidoItems(p.id);
                pItems.forEach(item => {
                    // Include both 'Agotado' and 'Cancelado'
                    if (item.estado_item === 'Agotado' || item.estado_item === 'Cancelado') {
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

    const handleDismiss = async (itemId: string) => {
        if (!confirm('¿Estás seguro de que deseas eliminar este ítem de la lista de agotados?')) return;

        try {
            await repository.updatePedidoItem(itemId, { estado_item: 'Cancelado' });
            // Update local state by changing the status of the item instead of removing it filter-wise immediately if separate lists,
            // but for simplicity we re-map.
            setOutOfStockItems(prev => prev.map(entry =>
                entry.item.id === itemId
                    ? { ...entry, item: { ...entry.item, estado_item: 'Cancelado' } }
                    : entry
            ));
            addToast("Ítem movido al historial", 'success');
        } catch (error) {
            console.error("Error al eliminar ítem:", error);
            addToast("Error al eliminar el ítem", 'error');
        }
    };

    const handleRestore = async (itemId: string) => {
        try {
            await repository.updatePedidoItem(itemId, { estado_item: 'Agotado' });
            setOutOfStockItems(prev => prev.map(entry =>
                entry.item.id === itemId
                    ? { ...entry, item: { ...entry.item, estado_item: 'Agotado' } }
                    : entry
            ));
            addToast("Ítem restaurado a pendientes", 'success');
        } catch (error) {
            console.error("Error al restaurar ítem:", error);
            addToast("Error al restaurar el ítem", 'error');
        }
    };

    const filteredItems = outOfStockItems.filter(({ item, pedido }) => {
        // First filter by Tab Status
        const statusMatch = activeTab === 'pending'
            ? item.estado_item === 'Agotado'
            : item.estado_item === 'Cancelado';

        if (!statusMatch) return false;

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
                <p className="text-slate-400 animate-pulse">Buscando productos...</p>
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
                    <p className="text-slate-400">Gestiona los productos agotados y su historial.</p>
                </div>
            </header>

            <div className="flex flex-col md:flex-row gap-4 justify-between items-center">

                {/* Tabs */}
                <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                    <button
                        onClick={() => setActiveTab('pending')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'pending'
                                ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm'
                                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                            }`}
                    >
                        Pendientes
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'history'
                                ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm'
                                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                            }`}
                    >
                        Historial
                    </button>
                </div>

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
                        <h3 className="text-xl font-bold text-slate-300 mb-2">
                            {activeTab === 'pending' ? 'Sin Pendientes' : 'Historial Vacío'}
                        </h3>
                        <p className="text-slate-500">
                            {activeTab === 'pending'
                                ? 'No hay productos agotados pendientes.'
                                : 'No hay ítems eliminados en el historial.'}
                        </p>
                    </div>
                ) : (
                    filteredItems.map(({ item, pedido }) => (
                        <GlassCard key={item.id} className={`group hover:border-slate-500/30 transition-all border-l-4 ${activeTab === 'pending' ? 'border-l-slate-500' : 'border-l-rose-500'} relative`} noPadding>
                            {activeTab === 'pending' ? (
                                <button
                                    onClick={() => handleDismiss(item.id)}
                                    className="absolute top-2 right-2 p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-full transition-all opacity-0 group-hover:opacity-100"
                                    title="Eliminar (Mover al Historial)"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trash-2"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line x1="10" x2="10" y1="11" y2="17" /><line x1="14" x2="14" y1="11" y2="17" /></svg>
                                </button>
                            ) : (
                                <button
                                    onClick={() => handleRestore(item.id)}
                                    className="absolute top-2 right-2 p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-all opacity-0 group-hover:opacity-100"
                                    title="Restaurar a Pendientes"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-rotate-ccw"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
                                </button>
                            )}

                            <div className="p-4">
                                <div className="flex justify-between items-start mb-3">
                                    <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider border ${activeTab === 'pending'
                                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
                                            : 'bg-rose-50 dark:bg-rose-900/20 text-rose-500 border-rose-200 dark:border-rose-900/30'
                                        }`}>
                                        {activeTab === 'pending' ? 'AGOTADO' : 'ELIMINADO'}
                                    </span>
                                    <span className="text-[10px] text-slate-500 font-mono pr-6">
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
