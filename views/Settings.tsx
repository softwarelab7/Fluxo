
import React, { useState } from 'react';
import GlassCard from '../components/GlassCard';
import {
  Database,
  Shield,
  RefreshCw,
  Layers,
  Bookmark,
  Edit2,
  Check,
  X,
  Plus,
  Trash2
} from 'lucide-react';
import { db } from '../services/mockDb';

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
          className="bg-white/10 border border-indigo-500/50 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 w-full text-white"
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
        <span className="px-3 py-1 bg-white/5 rounded-full text-xs border border-white/10 flex items-center space-x-2">
          <span>{value}</span>
          <div className="flex items-center space-x-1 ml-1">
            <button onClick={() => setIsEditing(true)} className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:text-indigo-400">
              <Edit2 size={10} />
            </button>
            <button onClick={onDelete} className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:text-rose-400">
              <Trash2 size={10} />
            </button>
          </div>
        </span>
      ) : (
        <>
          <span className={type === 'subcategory' ? 'text-xs text-slate-400 font-medium' : 'font-bold text-sm text-slate-200'}>
            {type === 'subcategory' ? `• ${value}` : value}
          </span>
          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-all">
            {onAddSub && (
              <button
                onClick={onAddSub}
                title="Añadir Subcategoría"
                className="p-1.5 hover:bg-white/10 text-emerald-400 rounded-lg"
              >
                <Plus size={14} />
              </button>
            )}
            <button
              onClick={() => setIsEditing(true)}
              className="p-1.5 hover:bg-white/10 text-indigo-400 rounded-lg"
            >
              <Edit2 size={14} />
            </button>
            <button
              onClick={onDelete}
              className="p-1.5 hover:bg-rose-500/10 text-rose-400 rounded-lg"
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
  const [, setTick] = useState(0);
  const forceUpdate = () => setTick(t => t + 1);

  const handleAddCategory = (parentId?: string) => {
    const name = prompt(parentId ? "Nombre de la subcategoría:" : "Nombre de la categoría principal:");
    if (name) {
      db.addCategoria(name, parentId);
      forceUpdate();
    }
  };

  const handleAddBrand = () => {
    const name = prompt("Nombre de la nueva marca:");
    if (name) {
      db.addMarca(name);
      forceUpdate();
    }
  };

  const handleUpdateCategory = (id: string, newName: string) => {
    db.updateCategoria(id, newName);
    forceUpdate();
  };

  const handleDeleteCategory = (id: string) => {
    if (confirm("¿Estás seguro de eliminar esta categoría? Si es una categoría principal, se eliminarán sus subcategorías.")) {
      db.deleteCategoria(id);
      forceUpdate();
    }
  };

  const handleUpdateMarca = (id: string, newNombre: string) => {
    db.updateMarca(id, newNombre);
    forceUpdate();
  };

  const handleDeleteMarca = (id: string) => {
    if (confirm("¿Eliminar esta marca?")) {
      db.deleteMarca(id);
      forceUpdate();
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in slide-in-from-top-4 duration-500 pb-20">
      <header>
        <h2 className="text-3xl font-bold">Configuración del Sistema</h2>
        <p className="text-slate-400">Gestiona los datos maestros y parámetros de la plataforma.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Categories Section */}
        <GlassCard className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-indigo-500/20 rounded-lg">
                <Layers className="text-indigo-400" size={20} />
              </div>
              <h3 className="font-bold text-lg">Estructura de Categorías</h3>
            </div>
            <button
              onClick={() => handleAddCategory()}
              className="p-2 bg-white/5 hover:bg-white/10 text-indigo-400 rounded-xl transition-all border border-white/10"
              title="Nueva Categoría Principal"
            >
              <Plus size={18} />
            </button>
          </div>

          <div className="space-y-3">
            {db.categorias.filter(c => !c.parent_id).length === 0 && (
              <p className="text-center text-slate-500 text-sm py-10">No hay categorías. Crea una arriba.</p>
            )}
            {db.categorias.filter(c => !c.parent_id).map(cat => (
              <div key={cat.id} className="p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-white/10 transition-all">
                <EditableItem
                  initialValue={cat.name}
                  onSave={(newName) => handleUpdateCategory(cat.id, newName)}
                  onDelete={() => handleDeleteCategory(cat.id)}
                  onAddSub={() => handleAddCategory(cat.id)}
                  type="category"
                />
                <div className="pl-4 mt-3 space-y-2 border-l border-white/10">
                  {db.categorias.filter(sub => sub.parent_id === cat.id).map(sub => (
                    <EditableItem
                      key={sub.id}
                      initialValue={sub.name}
                      onSave={(newName) => handleUpdateCategory(sub.id, newName)}
                      onDelete={() => handleDeleteCategory(sub.id)}
                      type="subcategory"
                      className="ml-2"
                    />
                  ))}
                  {db.categorias.filter(sub => sub.parent_id === cat.id).length === 0 && (
                    <p className="text-[10px] text-slate-600 italic ml-4">Sin subcategorías</p>
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
              <h3 className="font-bold text-lg">Catálogo de Marcas</h3>
            </div>
            <button
              onClick={handleAddBrand}
              className="p-2 bg-white/5 hover:bg-white/10 text-violet-400 rounded-xl transition-all border border-white/10"
              title="Nueva Marca"
            >
              <Plus size={18} />
            </button>
          </div>
          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Haz clic en editar para renombrar o eliminar.</p>
          <div className="flex flex-wrap gap-3">
            {db.marcas.length === 0 && (
              <p className="text-slate-500 text-sm py-4">No hay marcas registradas.</p>
            )}
            {db.marcas.map(m => (
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
            <h3 className="font-bold text-lg">Estadísticas de Base de Datos</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-white/5 rounded-2xl border border-white/5">
              <p className="text-2xl font-bold text-indigo-400">{db.productos.length}</p>
              <p className="text-[10px] text-slate-500 uppercase font-bold">Referencias</p>
            </div>
            <div className="text-center p-4 bg-white/5 rounded-2xl border border-white/5">
              <p className="text-2xl font-bold text-violet-400">{db.proveedores.length}</p>
              <p className="text-[10px] text-slate-500 uppercase font-bold">Proveedores</p>
            </div>
            <div className="text-center p-4 bg-white/5 rounded-2xl border border-white/5">
              <p className="text-2xl font-bold text-amber-400">{db.pedidos.length}</p>
              <p className="text-[10px] text-slate-500 uppercase font-bold">Pedidos</p>
            </div>
            <div className="text-center p-4 bg-white/5 rounded-2xl border border-white/5">
              <p className="text-2xl font-bold text-emerald-400">{db.categorias.length}</p>
              <p className="text-[10px] text-slate-500 uppercase font-bold">Categorías</p>
            </div>
          </div>
        </GlassCard>

        {/* Danger Zone */}
        <GlassCard className="md:col-span-2 border-rose-500/20 bg-rose-500/5">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-rose-500/20 rounded-lg">
                <RefreshCw className="text-rose-500" size={20} />
              </div>
              <div>
                <h3 className="font-bold text-lg">Zona de Peligro</h3>
                <p className="text-sm text-slate-500">Elimina toda la información local y restaura los valores iniciales.</p>
              </div>
            </div>
            <button
              onClick={() => confirm('¿Resetear toda la base de datos? Se perderán todos los cambios personalizados.') && db.reset()}
              className="px-6 py-3 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white border border-rose-500/30 rounded-2xl text-sm font-bold transition-all shadow-lg hover:shadow-rose-500/20"
            >
              Resetear Base de Datos
            </button>
          </div>
        </GlassCard>
      </div>

      <div className="pt-10 pb-6 text-center text-slate-600 text-[10px] uppercase tracking-widest font-bold">
        Fluxo Premium Inventory Management • v1.4.0
      </div>
    </div>
  );
};

export default Settings;
