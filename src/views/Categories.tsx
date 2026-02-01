import React, { useState, useEffect } from 'react';
import GlassCard from '../components/GlassCard';
import Modal from '../components/Modal';
import { Layers, Plus, Edit2, Trash2, Check, X, Loader2, Search, ChevronRight, ChevronDown, AlertTriangle, Box } from 'lucide-react';
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

    const toggleExpand = (id: string) => {
        setExpanded(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
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
            await loadData();
            addToast('Categoría renombrada.', 'success');
        } catch (e) {
            addToast('Error al actualizar.', 'error');
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
        return !c.parent_id && c.name.toLowerCase().includes(searchTerm.toLowerCase());
    });

    if (loading) return <div className="p-10 text-center text-slate-400"><Loader2 className="animate-spin inline mr-2" /> Cargando...</div>;

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-20">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold dark:text-white">Categorías</h2>
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


            <div className="flex flex-col gap-2">
                {filteredCats.map((cat, idx) => {
                    const stats = getStats(cat.id);
                    const subcats = categorias.filter(sub => sub.parent_id === cat.id);
                    const isExpanded = expanded.has(cat.id);

                    return (
                        <div
                            key={cat.id}
                            className={`group rounded-xl border transition-all duration-300 overflow-hidden ${isExpanded
                                    ? 'bg-white dark:bg-[#1e293b] border-blue-200 dark:border-blue-900 shadow-md ring-1 ring-blue-500/10'
                                    : 'bg-white dark:bg-[#1e293b] border-slate-200 dark:border-[#334155] hover:border-blue-300 dark:hover:border-blue-700'
                                }`}
                        >
                            {/* Parent Row */}
                            <div
                                onClick={() => toggleExpand(cat.id)}
                                className={`flex items-center justify-between p-4 cursor-pointer select-none transition-colors ${isExpanded ? 'bg-blue-50/50 dark:bg-blue-900/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                    }`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`p-2 rounded-lg transition-all duration-300 ${isExpanded ? 'bg-blue-100 text-blue-600 rotate-90' : 'bg-slate-100 text-slate-400 rotate-0 dark:bg-slate-800'}`}>
                                        <ChevronRight size={18} className={`transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`} />
                                    </div>
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-3">
                                            <div onClick={(e) => e.stopPropagation()}>
                                                <EditableItem
                                                    id={cat.id}
                                                    name={cat.name}
                                                    onUpdate={handleUpdate}
                                                    className="font-bold text-base text-slate-700 dark:text-slate-200"
                                                />
                                            </div>
                                            {subcats.length > 0 && (
                                                <span className={`px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded-full ${isExpanded ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>
                                                    {subcats.length} sub
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5 bg-white dark:bg-black/20 px-3 py-1.5 rounded-full border border-slate-100 dark:border-white/5 shadow-sm">
                                        <Box size={14} className="text-blue-500" /> {stats} productos
                                    </span>
                                    <div className={`flex items-center gap-1 transition-opacity duration-200 ${isExpanded ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} onClick={(e) => e.stopPropagation()}>
                                        <button onClick={() => { setNewValue(""); setModalConfig({ parentId: cat.id }); }} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors" title="Añadir Subcategoría"><Plus size={16} /></button>
                                        <button onClick={() => handleDelete(cat.id, cat.name)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"><Trash2 size={16} /></button>
                                    </div>
                                </div>
                            </div>

                            {/* Subcategories Row - Collapsible */}
                            {isExpanded && (
                                <div className="border-t border-slate-100 dark:border-slate-800/50 bg-slate-50/50 dark:bg-black/20 p-4 animate-in slide-in-from-top-2 duration-300">
                                    <div className="flex flex-wrap gap-3 pl-14">
                                        {subcats.map(sub => (
                                            <div key={sub.id} className="group/sub relative flex items-center gap-2 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 rounded-xl pl-3 pr-2 py-1.5 shadow-sm hover:shadow-md hover:border-blue-400 dark:hover:border-blue-500 transition-all hover:-translate-y-0.5">
                                                <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                                                <EditableItem id={sub.id} name={sub.name} onUpdate={handleUpdate} className="text-sm font-medium text-slate-600 dark:text-slate-300 mr-2" />
                                                <span className="text-[10px] text-slate-400 bg-slate-50 dark:bg-slate-800 px-1.5 rounded-md" title="Productos">{getStats(sub.id)}</span>
                                                <button onClick={() => handleDelete(sub.id, sub.name)} className="ml-1 p-1 text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-full transition-colors"><X size={12} /></button>
                                            </div>
                                        ))}

                                        <button
                                            onClick={() => { setNewValue(""); setModalConfig({ parentId: cat.id }); }}
                                            className="flex items-center gap-2 px-4 py-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 border-2 border-blue-200/50 dark:border-blue-800/30 border-dashed rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 transition-all active:scale-95"
                                        >
                                            <Plus size={14} /> Nueva
                                        </button>
                                    </div>

                                    {subcats.length === 0 && (
                                        <div className="pl-14 pt-2 text-sm text-slate-400 italic flex items-center gap-2">
                                            <span>Esta categoría está vacía.</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Input Modal */}
            {modalConfig && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <GlassCard hoverEffect={false} className="w-full max-w-sm bg-white dark:bg-[#1e293b] p-4 border-slate-200 dark:border-slate-700">
                        <div className="flex justify-between mb-4">
                            <h3 className="font-bold text-slate-800 dark:text-white">{modalConfig.parentId ? 'Nueva Subcategoría' : 'Nueva Categoría'}</h3>
                            <button onClick={() => setModalConfig(null)} className="p-1 hover:bg-slate-100 rounded-full"><X size={16} /></button>
                        </div>
                        <form onSubmit={handleAdd} className="flex gap-2">
                            <input
                                autoFocus
                                value={newValue}
                                onChange={e => setNewValue(e.target.value)}
                                className="flex-1 input-premium px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Nombre..."
                            />
                            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors">Crear</button>
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
                            <button onClick={() => setConfirmConfig(null)} className="px-3 py-1.5 text-sm font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">Cancelar</button>
                            <button onClick={confirmConfig.onConfirm} className="px-3 py-1.5 text-sm font-bold bg-rose-500 hover:bg-rose-600 text-white rounded-lg transition-colors">Eliminar</button>
                        </>
                    }
                >
                    <div className="text-center p-4">
                        <div className="bg-rose-100 dark:bg-rose-900/30 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                            <AlertTriangle size={24} className="text-rose-500 dark:text-rose-400" />
                        </div>
                        <p className="text-slate-600 dark:text-slate-300">{confirmConfig.message}</p>
                    </div>
                </Modal>
            )}
        </div>
    );
};

// Helper Components
interface EditableItemProps {
    id: string;
    name: string;
    onUpdate: (id: string, name: string) => Promise<void>;
    className?: string;
}

const EditableItem: React.FC<EditableItemProps> = ({ id, name, onUpdate, className }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [val, setVal] = useState(name);

    const handleSave = () => {
        if (val.trim() && val !== name) {
            onUpdate(id, val);
        }
        setIsEditing(false);
    };

    if (isEditing) {
        return (
            <input
                autoFocus
                value={val}
                onChange={e => setVal(e.target.value)}
                onBlur={handleSave}
                onKeyDown={e => e.key === 'Enter' && handleSave()}
                className="bg-white dark:bg-slate-800 border dark:border-slate-600 rounded px-1 py-0.5 text-xs outline-none w-32 dark:text-white"
            />
        );
    }

    return (
        <span
            onDoubleClick={() => setIsEditing(true)}
            className={`cursor-pointer hover:text-blue-500 truncate max-w-[150px] transition-colors ${className}`}
            title={name}
        >
            {name}
        </span>
    );
};

export default Categories;
