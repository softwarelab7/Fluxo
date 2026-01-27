import React, { useState, useEffect } from 'react';
import GlassCard from '../components/GlassCard';
import {
  Shield,
  Layers,
  Bookmark,
  Edit2,
  Check,
  X,
  Plus,
  Trash2,
  Loader2
} from 'lucide-react';
import { repository } from '../services/repository';
import { Categoria, Marca } from '../types';

interface EditableItemProps {
  initialValue: string;
  onSave: (newValue: string) => void;
  onDelete: () => void;
  onAddSub?: () => void;
  className?: string;
  type?: 'category' | 'brand' | 'subcategory';
}

const EditableItem: React.FC<EditableItemProps> = ({
  initialValue,
  onSave,
  onDelete,
  onAddSub,
  className = "",
  type = 'category'
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(initialValue);

  const handleSave = () => {
    if (value.trim() && value !== initialValue) {
      onSave(value);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setValue(initialValue);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className={`flex items-center space-x-2 animate-in fade-in zoom-in-95 duration-200 ${className}`}>
        <input
          autoFocus
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          onKeyDownCapture={(e) => e.key === 'Escape' && handleCancel()}
          className="input-premium rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 w-full text-slate-700 dark:text-white"
        />
        <button onClick={handleSave} className="p-1.5 hover:bg-emerald-500/20 text-emerald-400 rounded-lg">
          <Check size={14} />
        </button>
        <button onClick={handleCancel} className="p-1.5 hover:bg-rose-500/20 text-rose-400 rounded-lg">
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-between group ${className}`}>
      {type === 'brand' ? (
        <span className="px-3 py-1 bg-slate-100 dark:bg-[#1e293b] rounded-full text-xs border border-slate-200 dark:border-[#334155] flex items-center space-x-2 text-slate-700 dark:text-slate-200">
          <span>{value}</span>
          <div className="flex items-center space-x-1 ml-1">
            <button onClick={() => setIsEditing(true)} className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:text-blue-400">
              <Edit2 size={10} />
            </button>
            <button onClick={onDelete} className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:text-rose-400">
              <Trash2 size={10} />
            </button>
          </div>
        </span>
      ) : (
        <>
          <span className={type === 'subcategory' ? 'text-xs text-slate-500 font-medium' : 'font-bold text-sm text-slate-700 dark:text-slate-200'}>
            {type === 'subcategory' ? `• ${value}` : value}
          </span>
          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-all">
            {onAddSub && (
              <button
                onClick={onAddSub}
                title="Añadir Subcategoría"
                className="p-1.5 hover:bg-emerald-500/10 text-emerald-500 rounded-lg"
              >
                <Plus size={14} />
              </button>
            )}
            <button
              onClick={() => setIsEditing(true)}
              className="p-1.5 hover:bg-blue-500/10 text-blue-500 dark:text-blue-400 rounded-lg"
            >
              <Edit2 size={14} />
            </button>
            <button
              onClick={onDelete}
              className="p-1.5 hover:bg-rose-500/10 text-rose-500 dark:text-rose-400 rounded-lg"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </>
      )}
    </div>
  );
};

const Settings = () => {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ products: 0, suppliers: 0, categories: 0 });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [cats, brands, prods, provs] = await Promise.all([
        repository.getCategorias(),
        repository.getMarcas(),
        repository.getProductos(),
        repository.getProveedores()
      ]);
      setCategorias(cats);
      setMarcas(brands);
      setStats({
        products: prods.length,
        suppliers: provs.length,
        categories: cats.filter(c => !c.parent_id).length
      });
    } catch (error) {
      console.error("Error loading settings data", error);
    } finally {
      setLoading(false);
    }
  };

  /* Modal State */
  const [modalConfig, setModalConfig] = useState<{ type: 'category' | 'brand', parentId?: string } | null>(null);
  const [newValue, setNewValue] = useState("");

  const handleOpenAddCategory = (parentId?: string) => {
    setNewValue("");
    setModalConfig({ type: 'category', parentId });
  };

  const handleOpenAddBrand = () => {
    setNewValue("");
    setModalConfig({ type: 'brand' });
  };

  const handleConfirmAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newValue.trim() || !modalConfig) return;

    try {
      if (modalConfig.type === 'category') {
        await repository.addCategoria({ name: newValue, parent_id: modalConfig.parentId });
      } else {
        await repository.addMarca({ nombre: newValue });
      }
      await loadData();
      setModalConfig(null);
    } catch (err) {
      console.error(err);
      alert("Error al crear el elemento");
    }
  };

  // ... keep existing update/delete handlers ...

  const handleUpdateCategory = async (id: string, newName: string) => {
    try {
      await repository.updateCategoria(id, { name: newName });
      await loadData();
    } catch (e) {
      alert("Error al actualizar categoría");
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (confirm("¿Estás seguro de eliminar esta categoría? Si es una categoría principal, se eliminarán sus subcategorías.")) {
      try {
        await repository.deleteCategoria(id);
        await loadData();
      } catch (e) {
        alert("Error al eliminar categoría");
      }
    }
  };

  const handleUpdateMarca = async (id: string, newNombre: string) => {
    try {
      await repository.updateMarca(id, { nombre: newNombre });
      await loadData();
    } catch (e) {
      alert("Error al actualizar marca");
    }
  };

  const handleDeleteMarca = async (id: string) => {
    if (confirm("¿Eliminar esta marca?")) {
      try {
        await repository.deleteMarca(id);
        await loadData();
      } catch (e) {
        alert("Error al eliminar marca");
      }
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen space-y-4">
        <Loader2 className="animate-spin text-blue-500" size={48} />
        <p className="text-slate-400 animate-pulse">Cargando configuración...</p>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-4xl mx-auto space-y-6 animate-in slide-in-from-top-4 duration-500 pb-20">
        <header>
          <h2 className="text-3xl font-bold">Configuración del Sistema</h2>
          <p className="text-slate-400">Gestiona los datos maestros (Nube) y parámetros de la plataforma.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Categories Section */}
          <GlassCard className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Layers className="text-blue-400" size={20} />
                </div>
                <h3 className="font-bold text-lg">Estructura de Categorías</h3>
              </div>
              <button
                onClick={() => handleOpenAddCategory()}
                className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all shadow-lg shadow-blue-600/20"
                title="Nueva Categoría Principal"
              >
                <Plus size={18} />
              </button>
            </div>

            <div className="space-y-3">
              {categorias.filter(c => !c.parent_id).length === 0 && (
                <p className="text-center text-slate-500 text-sm py-10">No hay categorías. Crea una arriba.</p>
              )}
              {categorias.filter(c => !c.parent_id).map(cat => (
                <div key={cat.id} className="p-4 bg-white dark:bg-[#1e293b] rounded-2xl border border-slate-200 dark:border-[#334155] hover:border-blue-500/30 transition-all">
                  <EditableItem
                    initialValue={cat.name}
                    onSave={(newName) => handleUpdateCategory(cat.id, newName)}
                    onDelete={() => handleDeleteCategory(cat.id)}
                    onAddSub={() => handleOpenAddCategory(cat.id)}
                    type="category"
                  />
                  <div className="pl-4 mt-3 space-y-2 border-l border-slate-200 dark:border-white/10">
                    {categorias.filter(sub => sub.parent_id === cat.id).map(sub => (
                      <EditableItem
                        key={sub.id}
                        initialValue={sub.name}
                        onSave={(newName) => handleUpdateCategory(sub.id, newName)}
                        onDelete={() => handleDeleteCategory(sub.id)}
                        type="subcategory"
                        className="ml-2"
                      />
                    ))}
                    {categorias.filter(sub => sub.parent_id === cat.id).length === 0 && (
                      <p className="text-[10px] text-slate-400 dark:text-slate-600 italic ml-4">Sin subcategorías</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>

          {/* Brands Section */}
          <GlassCard className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-violet-500/20 rounded-lg">
                  <Bookmark className="text-violet-400" size={20} />
                </div>
                <h3 className="font-bold text-lg text-slate-800 dark:text-white">Catálogo de Marcas</h3>
              </div>
              <button
                onClick={handleOpenAddBrand}
                className="p-2 bg-violet-600 hover:bg-violet-500 text-white dark:bg-[#1e293b] dark:hover:bg-[#334155] dark:text-violet-400 rounded-xl transition-all shadow-lg shadow-violet-600/20 dark:shadow-none dark:border dark:border-[#334155]"
                title="Nueva Marca"
              >
                <Plus size={18} />
              </button>
            </div>
            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Haz clic en editar para renombrar o eliminar.</p>
            <div className="flex flex-wrap gap-3">
              {marcas.length === 0 && (
                <p className="text-slate-500 text-sm py-4">No hay marcas registradas.</p>
              )}
              {marcas.map(m => (
                <EditableItem
                  key={m.id}
                  initialValue={m.nombre}
                  onSave={(newName) => handleUpdateMarca(m.id, newName)}
                  onDelete={() => handleDeleteMarca(m.id)}
                  type="brand"
                />
              ))}
            </div>
          </GlassCard>

          {/* Security / System Info */}
          <GlassCard className="md:col-span-2">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-emerald-500/20 rounded-lg">
                <Shield className="text-emerald-400" size={20} />
              </div>
              <h3 className="font-bold text-lg text-slate-800 dark:text-white">Estadísticas de Base de Datos</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center p-4 bg-slate-100 dark:bg-[#1e293b] rounded-2xl border border-slate-200 dark:border-[#334155] group hover:border-blue-500/30 transition-all">
                <div className="mr-3 p-3 bg-gradient-to-br from-blue-500/10 to-purple-500/10 dark:from-blue-500/20 dark:to-purple-500/20 rounded-xl text-blue-500 dark:text-blue-400 group-hover:scale-110 transition-transform">
                  <Layers size={20} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-800 dark:text-white">{stats.products}</p>
                  <p className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Referencias</p>
                </div>
              </div>

              <div className="flex items-center p-4 bg-slate-100 dark:bg-[#1e293b] rounded-2xl border border-slate-200 dark:border-[#334155] group hover:border-violet-500/30 transition-all">
                <div className="mr-3 p-3 bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 dark:from-violet-500/20 dark:to-fuchsia-500/20 rounded-xl text-violet-500 dark:text-violet-400 group-hover:scale-110 transition-transform">
                  <Shield size={20} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-800 dark:text-white">{stats.suppliers}</p>
                  <p className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Proveedores</p>
                </div>
              </div>

              <div className="flex items-center p-4 bg-slate-100 dark:bg-[#1e293b] rounded-2xl border border-slate-200 dark:border-[#334155] group hover:border-amber-500/30 transition-all">
                <div className="mr-3 p-3 bg-gradient-to-br from-amber-500/10 to-orange-500/10 dark:from-amber-500/20 dark:to-orange-500/20 rounded-xl text-amber-500 dark:text-amber-400 group-hover:scale-110 transition-transform">
                  <Bookmark size={20} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-800 dark:text-white">?</p>
                  <p className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Pedidos</p>
                </div>
              </div>

              <div className="flex items-center p-4 bg-slate-100 dark:bg-[#1e293b] rounded-2xl border border-slate-200 dark:border-[#334155] group hover:border-emerald-500/30 transition-all">
                <div className="mr-3 p-3 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 dark:from-emerald-500/20 dark:to-teal-500/20 rounded-xl text-emerald-500 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                  <Check size={20} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-800 dark:text-white">{stats.categories}</p>
                  <p className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Categorías</p>
                </div>
              </div>
            </div>
          </GlassCard>


        </div>

        <div className="pt-10 pb-6 text-center text-slate-400 dark:text-slate-600 text-[10px] uppercase tracking-widest font-bold">
          Fluxo Premium Inventory Management • v2.0 Cloud
        </div>
      </div>

      {/* Input Modal */}
      {modalConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
          <GlassCard hoverEffect={false} className="w-full max-w-sm animate-in zoom-in-95 duration-200 bg-white dark:bg-[#1e293b] border-slate-200 dark:border-[#334155]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                {modalConfig.type === 'category'
                  ? (modalConfig.parentId ? 'Nueva Subcategoría' : 'Nueva Categoría')
                  : 'Nueva Marca'}
              </h3>
              <button onClick={() => setModalConfig(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition-colors text-slate-500 dark:text-white">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleConfirmAdd} className="space-y-4">
              <div className="space-y-1">
                <input
                  autoFocus
                  required
                  placeholder="Nombre..."
                  value={newValue}
                  onChange={e => setNewValue(e.target.value)}
                  className="w-full input-premium rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all"
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg shadow-blue-600/20 transition-all"
              >
                Crear
              </button>
            </form>
          </GlassCard>
        </div>
      )}
    </>
  );
};

export default Settings;

