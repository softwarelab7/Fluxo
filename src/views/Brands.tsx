import React, { useState, useEffect } from 'react';
import GlassCard from '../components/GlassCard';
import { Bookmark, Plus, Edit2, Trash2, Check, X, Loader2, Search, AlertTriangle, Box, Tag } from 'lucide-react';
import { repository } from '../services/repository';
import { Marca, Producto } from '../types';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';

const Brands = () => {
    const { addToast } = useToast();
    const [marcas, setMarcas] = useState<Marca[]>([]);
    const [productos, setProductos] = useState<Producto[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [newValue, setNewValue] = useState("");
    const [confirmConfig, setConfirmConfig] = useState<{ open: boolean; title: string; message: string; onConfirm: () => void } | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [brands, prods] = await Promise.all([
                repository.getMarcas(),
                repository.getProductos()
            ]);
            setMarcas(brands);
            setProductos(prods);
        } catch (error) {
            console.error('Error loading data:', error);
            addToast('Error al cargar datos.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const getStats = (brandId: string) => {
        return productos.filter(p => p.marca_id === brandId).length;
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newValue.trim()) return;
        try {
            await repository.addMarca({ nombre: newValue });
            addToast('Marca agregada.', 'success');
            setNewValue("");
            setShowModal(false);
            await loadData();
        } catch (error) {
            console.error("Error creating brand", error);
            addToast('Error al crear la marca.', 'error');
        }
    };

    const handleUpdate = async (id: string, newNombre: string) => {
        try {
            await repository.updateMarca(id, { nombre: newNombre });
            await loadData();
            addToast('Marca actualizada.', 'success');
        } catch (e) {
            addToast('Error al actualizar marca.', 'error');
        }
    };

    const handleDelete = (id: string, nombre: string) => {
        setConfirmConfig({
            open: true,
            title: 'Eliminar Marca',
            message: `¿Estás seguro de eliminar la marca "${nombre}"? Esta acción no se puede deshacer.`,
            onConfirm: async () => {
                try {
                    await repository.deleteMarca(id);
                    await loadData();
                    addToast('Marca eliminada.', 'success');
                } catch (e) {
                    addToast('Error al eliminar marca. Puede tener productos activos.', 'error');
                } finally {
                    setConfirmConfig(null);
                }
            }
        });
    };

    const filtered = marcas.filter(m => m.nombre.toLowerCase().includes(searchTerm.toLowerCase()));

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
                <Loader2 className="animate-spin text-violet-500" size={48} />
                <p className="text-slate-400 animate-pulse">Cargando catálogo...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-20">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold dark:text-white flex items-center gap-2">
                        <Tag className="text-violet-500" /> Marcas
                    </h2>
                    <p className="text-slate-400 text-sm">Gestiona tus fabricantes.</p>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Buscar..."
                            className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-violet-500/50 outline-none"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={() => { setNewValue(""); setShowModal(true); }}
                        className="px-4 py-2 bg-violet-600 hover:bg-violet-500 rounded-lg text-white text-sm font-bold transition-all shadow-md flex items-center shrink-0"
                    >
                        <Plus size={16} className="mr-2" /> Nueva
                    </button>
                </div>
            </header>

            {/* Grid Layout */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {filtered.map(m => (
                    <EditableBrand
                        key={m.id}
                        brand={m}
                        count={getStats(m.id)}
                        onUpdate={(newName) => handleUpdate(m.id, newName)}
                        onDelete={() => handleDelete(m.id, m.nombre)}
                    />
                ))}
            </div>

            {/* Create Modal */}
            {
                showModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200">
                        <GlassCard hoverEffect={false} className="w-full max-w-sm bg-white dark:bg-[#1e293b] p-6 border-slate-200 dark:border-slate-700 shadow-xl">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                    <Tag className="text-violet-500" size={20} /> Nueva Marca
                                </h3>
                                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                                    <X size={18} />
                                </button>
                            </div>
                            <form onSubmit={handleAdd} className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1 mb-1 block">Nombre</label>
                                    <input
                                        autoFocus
                                        required
                                        placeholder="Ej. Samsung"
                                        value={newValue}
                                        onChange={e => setNewValue(e.target.value)}
                                        className="w-full input-premium rounded-xl px-4 py-3 text-sm border border-slate-200 dark:border-slate-600 focus:ring-2 focus:ring-violet-500/50 outline-none transition-all dark:bg-slate-800 dark:text-white"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    className="w-full py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-bold shadow-lg shadow-violet-500/20 active:scale-95 transition-all"
                                >
                                    Guardar
                                </button>
                            </form>
                        </GlassCard>
                    </div>
                )
            }

            {/* Confirmation Modal */}
            {confirmConfig && (
                <Modal
                    isOpen={confirmConfig.open}
                    onClose={() => setConfirmConfig(null)}
                    title={confirmConfig.title}
                    maxWidth="max-w-md"
                    footer={
                        <>
                            <button
                                onClick={() => setConfirmConfig(null)}
                                className="px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmConfig.onConfirm}
                                className="px-4 py-2 text-sm font-bold bg-rose-500 hover:bg-rose-600 text-white rounded-lg transition-colors shadow-lg shadow-rose-500/20"
                            >
                                Eliminar
                            </button>
                        </>
                    }
                >
                    <div className="flex flex-col items-center text-center p-6">
                        <div className="w-14 h-14 bg-rose-100 dark:bg-rose-500/20 rounded-full flex items-center justify-center mb-4 text-rose-500">
                            <AlertTriangle size={28} />
                        </div>
                        <p className="text-slate-600 dark:text-slate-300 font-medium">
                            {confirmConfig.message}
                        </p>
                    </div>
                </Modal>
            )}
        </div>
    );
};

interface EditableItemProps {
    brand: Marca;
    count: number;
    onUpdate: (val: string) => void;
    onDelete: () => void;
}

const EditableBrand: React.FC<EditableItemProps> = ({ brand, count, onUpdate, onDelete }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [val, setVal] = useState(brand.nombre);

    const handleSave = () => {
        if (val.trim() && val !== brand.nombre) {
            onUpdate(val);
        }
        setIsEditing(false);
    }

    if (isEditing) {
        return (
            <GlassCard className="p-3 border-violet-500 ring-2 ring-violet-500/20 shadow-lg flex items-center gap-1 h-[100px] justify-center flex-col">
                <input
                    autoFocus
                    value={val}
                    onChange={e => setVal(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSave()}
                    className="w-full bg-slate-50 dark:bg-slate-800 text-center focus:outline-none text-slate-800 dark:text-white font-bold text-sm px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-600"
                />
                <div className="flex gap-2 mt-2">
                    <button onClick={handleSave} className="p-1 px-3 bg-emerald-500 text-white hover:bg-emerald-600 rounded-lg transition-colors"><Check size={14} /></button>
                    <button onClick={() => { setVal(brand.nombre); setIsEditing(false); }} className="p-1 px-3 bg-rose-500 text-white hover:bg-rose-600 rounded-lg transition-colors"><X size={14} /></button>
                </div>
            </GlassCard>
        )
    }

    return (
        <GlassCard className="group relative flex flex-col justify-between p-4 min-h-[100px] h-auto hover:scale-[1.02] transition-all duration-300 border-slate-200 dark:border-slate-800 overflow-hidden cursor-default">
            {/* Decorative Background Icon */}
            <div className="absolute -bottom-2 -right-2 text-slate-100 dark:text-slate-800 opacity-50 group-hover:opacity-100 dark:group-hover:opacity-20 transition-all pointer-events-none">
                <Bookmark size={60} strokeWidth={1.5} />
            </div>

            <div className="relative z-10 flex justify-between items-start">
                <div className="font-black text-lg text-slate-800 dark:text-slate-100 leading-tight line-clamp-2 flex-1 min-w-0 pr-2 break-words" title={brand.nombre}>
                    {brand.nombre}
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 -mr-2 -mt-2">
                    <button onClick={() => setIsEditing(true)} className="p-1.5 text-slate-400 hover:text-violet-500 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded transition-colors"><Edit2 size={14} /></button>
                    <button onClick={onDelete} className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded transition-colors"><Trash2 size={14} /></button>
                </div>
            </div>

            <div className="relative z-10 mt-auto">
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50 dark:bg-slate-800/50 px-2 py-1 rounded-full border border-slate-100 dark:border-slate-700">
                    {count} Refs
                </span>
            </div>
        </GlassCard>
    )
}

export default Brands;
