import React, { useState, useEffect } from 'react';
import GlassCard from '../components/GlassCard';
import Modal from '../components/Modal';
import { Layers, Plus, Edit2, Trash2, Check, X, Loader2, Search, ChevronRight, ChevronDown, AlertTriangle, Box, MoreVertical, LayoutGrid } from 'lucide-react';
import { repository } from '../services/repository';
import { Categoria, Producto } from '../types';
import { useToast } from '../components/Toast';

const Categories = () => {
    const { addToast } = useToast();
    const [categorias, setCategorias] = useState<Categoria[]>([]);
    const [productos, setProductos] = useState<Producto[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal
    const [modalConfig, setModalConfig] = useState<{ parentId?: string } | null>(null);
    const [newValue, setNewValue] = useState("");
    const [confirmConfig, setConfirmConfig] = useState<{ open: boolean; title: string; message: string; onConfirm: () => void } | null>(null);
    const [expanded, setExpanded] = useState<Set<string>>(new Set());

    // State for inline editing
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState("");

    const toggleExpand = (id: string) => {
        setExpanded(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const startEdit = (id: string, currentName: string) => {
        setEditingId(id);
        setEditName(currentName);
    };

    const saveEdit = async (id: string) => {
        if (editName.trim() && editName !== tryGetName(id)) {
            await handleUpdate(id, editName);
        }
        setEditingId(null);
        setEditName("");
    };

    const tryGetName = (id: string) => {
        const cat = categorias.find(c => c.id === id);
        return cat ? cat.name : "";
    };

    // Initialize data
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [cats, prods] = await Promise.all([
                repository.getCategorias(),
                repository.getProductos()
            ]);
            setCategorias(cats);
            setProductos(prods);
        } catch (error) {
            console.error('Error loading data:', error);
            addToast('Error al cargar datos.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const getStats = (catId: string) => {
        const directCount = productos.filter(p => p.subcategoria_id === catId || p.categoria?.id === catId).length;
        const subCats = categorias.filter(c => c.parent_id === catId);
        const subCount = subCats.reduce((acc, sub) => {
            return acc + productos.filter(p => p.subcategoria_id === sub.id).length;
        }, 0);
        return directCount + subCount;
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newValue.trim()) return;
        try {
            await repository.addCategoria({ name: newValue, parent_id: modalConfig?.parentId });
            addToast('Categoría creada.', 'success');
            setNewValue("");
            setModalConfig(null);
            await loadData();
        } catch (error) {
            addToast('Error al crear.', 'error');
        }
    };

    const handleUpdate = async (id: string, newName: string) => {
        try {
            await repository.updateCategoria(id, { name: newName });
            const updatedCats = categorias.map(c => c.id === id ? { ...c, name: newName } : c);
            setCategorias(updatedCats); // Optimistic update
            addToast('Categoría renombrada.', 'success');
        } catch (e) {
            addToast('Error al actualizar.', 'error');
            loadData(); // Revert on error
        }
    };

    const handleDelete = (id: string, name: string) => {
        setConfirmConfig({
            open: true,
            title: 'Eliminar Categoría',
            message: `¿Estás seguro de eliminar "${name}" y sus subcategorías?`,
            onConfirm: async () => {
                try {
                    await repository.deleteCategoria(id);
                    await loadData();
                    addToast('Eliminada correctamente.', 'success');
                } catch (e) {
                    addToast('Error al eliminar.', 'error');
                } finally {
                    setConfirmConfig(null);
                }
            }
        });
    };


    const filteredCats = categorias.filter(c => {
        if (!searchTerm) return !c.parent_id;
        // Also show parent if a subcategory matches search
        return !c.parent_id && (
            c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            categorias.some(sub => sub.parent_id === c.id && sub.name.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    });

    if (loading) return <div className="p-10 text-center text-slate-400"><Loader2 className="animate-spin inline mr-2" /> Cargando...</div>;

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-20">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold dark:text-white flex items-center gap-2">
                        <LayoutGrid className="text-blue-500" /> Categorías
                    </h2>
                    <p className="text-slate-400 text-sm">Gestiona la estructura de tu inventario.</p>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Buscar..."
                            className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500/50 outline-none"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={() => { setNewValue(""); setModalConfig({}); }}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white text-sm font-bold transition-all shadow-md flex items-center shrink-0"
                    >
                        <Plus size={16} className="mr-2" /> Nueva
                    </button>
                </div>
            </header>


            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredCats.map((cat) => {
                    const stats = getStats(cat.id);
                    const subcats = categorias.filter(sub => sub.parent_id === cat.id);
                    const isEditingThis = editingId === cat.id;
                    const isExpanded = expanded.has(cat.id);

                    return (
                        <GlassCard
                            key={cat.id}
                            className={`flex flex-col group hover:shadow-lg transition-all duration-300 border-slate-200 dark:border-slate-800 ${isExpanded ? 'row-span-2' : ''}`}
                            noPadding
                        >
                            {/* Card Header: Parent Category */}
                            <div
                                className={`p-4 border-b border-transparent ${isExpanded ? 'border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/5' : ''} rounded-t-2xl flex items-start gap-3 cursor-pointer select-none`}
                                onClick={() => !isEditingThis && toggleExpand(cat.id)}
                            >
                                <div className="min-w-0 flex-1">
                                    {isEditingThis ? (
                                        <input
                                            autoFocus
                                            value={editName}
                                            onChange={e => setEditName(e.target.value)}
                                            onBlur={() => saveEdit(cat.id)}
                                            onKeyDown={e => e.key === 'Enter' && saveEdit(cat.id)}
                                            onClick={e => e.stopPropagation()}
                                            className="w-full font-bold text-lg text-slate-800 dark:text-white bg-white dark:bg-slate-700 border dark:border-slate-500 rounded px-2 py-1 outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    ) : (
                                        <div className="flex items-center gap-2 w-full">
                                            <div className={`p-1 rounded-md transition-colors ${isExpanded ? 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400' : 'text-slate-400 group-hover:text-blue-500'}`}>
                                                <ChevronRight size={16} className={`transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`} />
                                            </div>
                                            <h3 className="font-bold text-base leading-tight text-slate-800 dark:text-white line-clamp-2 flex-1 min-w-0 break-words" title={cat.name}>
                                                {cat.name}
                                            </h3>
                                        </div>
                                    )}
                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 ml-7 text-xs text-slate-500 dark:text-slate-400">
                                        <div className="flex items-center gap-1.5" title="Total de productos">
                                            <Box size={14} className="text-blue-500/70" />
                                            <span className="font-bold text-slate-700 dark:text-slate-300">{stats}</span>
                                            <span className="font-normal">productos</span>
                                        </div>
                                        <div className="flex items-center gap-1.5" title="Total de subcategorías">
                                            <Layers size={14} className="text-indigo-500/70" />
                                            <span className="font-bold text-slate-700 dark:text-slate-300">{subcats.length}</span>
                                            <span className="font-normal">subcategorías</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
                                    <button onClick={() => startEdit(cat.id, cat.name)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-blue-900/40 rounded-full transition-colors"><Edit2 size={18} /></button>
                                    <button onClick={() => handleDelete(cat.id, cat.name)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-900/40 rounded-full transition-colors"><Trash2 size={18} /></button>
                                </div>
                            </div>

                            {/* Card Body: Subcategories */}
                            {isExpanded && (
                                <div className="p-4 flex-1 flex flex-col gap-2 animate-in slide-in-from-top-2 duration-200">
                                    <div className="space-y-2 flex-1">
                                        {subcats.length > 0 ? subcats.map(sub => {
                                            const isEditingSub = editingId === sub.id;
                                            const subStats = getStats(sub.id);
                                            return (
                                                <div key={sub.id} className="group/sub flex items-center justify-between text-sm py-1 px-2 rounded-lg hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                                                    {isEditingSub ? (
                                                        <input
                                                            autoFocus
                                                            value={editName}
                                                            onChange={e => setEditName(e.target.value)}
                                                            onBlur={() => saveEdit(sub.id)}
                                                            onKeyDown={e => e.key === 'Enter' && saveEdit(sub.id)}
                                                            className="flex-1 font-medium text-slate-700 dark:text-white bg-white dark:bg-slate-700 border dark:border-slate-500 rounded px-1 outline-none text-xs"
                                                        />
                                                    ) : (
                                                        <div className="flex items-center gap-2 overflow-hidden">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-300 flex-shrink-0"></div>
                                                            <span className="text-slate-600 dark:text-slate-300 font-medium truncate">{sub.name}</span>
                                                            <span className="text-[10px] text-slate-400">({subStats})</span>
                                                        </div>
                                                    )}

                                                    <div className="flex gap-1 opacity-0 group-hover/sub:opacity-100 transition-opacity">
                                                        <button onClick={() => startEdit(sub.id, sub.name)} className="p-1 text-slate-300 hover:text-blue-500 transition-colors"><Edit2 size={12} /></button>
                                                        <button onClick={() => handleDelete(sub.id, sub.name)} className="p-1 text-slate-300 hover:text-rose-500 transition-colors"><X size={12} /></button>
                                                    </div>
                                                </div>
                                            )
                                        }) : (
                                            <div className="text-center py-4 text-slate-400 text-xs italic">
                                                Sin subcategorías
                                            </div>
                                        )}
                                    </div>

                                    <button
                                        onClick={() => { setNewValue(""); setModalConfig({ parentId: cat.id }); }}
                                        className="w-full mt-2 py-2 border-t border-slate-100 dark:border-slate-700 text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors flex items-center justify-center gap-1 rounded-b-lg"
                                    >
                                        <Plus size={14} /> Nueva Subcategoría
                                    </button>
                                </div>
                            )}
                        </GlassCard>
                    );
                })}
            </div>

            {/* Input Modal */}
            {modalConfig && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200">
                    <GlassCard hoverEffect={false} className="w-full max-w-sm bg-white dark:bg-[#1e293b] p-6 border-slate-200 dark:border-slate-700 shadow-xl">
                        <div className="flex justify-between mb-6">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                {modalConfig.parentId ? <Layers size={20} className="text-blue-500" /> : <LayoutGrid size={20} className="text-blue-500" />}
                                {modalConfig.parentId ? 'Nueva Subcategoría' : 'Nueva Categoría'}
                            </h3>
                            <button onClick={() => setModalConfig(null)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"><X size={18} /></button>
                        </div>
                        <form onSubmit={handleAdd} className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1 mb-1 block">Nombre</label>
                                <input
                                    autoFocus
                                    value={newValue}
                                    onChange={e => setNewValue(e.target.value)}
                                    className="w-full input-premium px-4 py-3 text-sm rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                                    placeholder="Ej. Suspensión, Frenos..."
                                />
                            </div>
                            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold text-sm transition-all shadow-lg shadow-blue-500/20 active:scale-95">
                                Crear
                            </button>
                        </form>
                    </GlassCard>
                </div>
            )}

            {/* Confirm Modal */}
            {confirmConfig && (
                <Modal
                    isOpen={confirmConfig.open}
                    onClose={() => setConfirmConfig(null)}
                    title={confirmConfig.title}
                    maxWidth="max-w-md"
                    footer={
                        <>
                            <button onClick={() => setConfirmConfig(null)} className="px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">Cancelar</button>
                            <button onClick={confirmConfig.onConfirm} className="px-4 py-2 text-sm font-bold bg-rose-500 hover:bg-rose-600 text-white rounded-lg transition-colors shadow-lg shadow-rose-500/20">Eliminar</button>
                        </>
                    }
                >
                    <div className="text-center p-6">
                        <div className="bg-rose-100 dark:bg-rose-900/30 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertTriangle size={28} className="text-rose-500 dark:text-rose-400" />
                        </div>
                        <p className="text-slate-600 dark:text-slate-300 font-medium">{confirmConfig.message}</p>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default Categories;
