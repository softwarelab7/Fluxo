
import React, { useState } from 'react';
import GlassCard from '../components/GlassCard';
import { Truck, Plus, Trash2, Search, X, Edit2 } from 'lucide-react';
import { db } from '../services/mockDb';
import { Proveedor } from '../types';

const Suppliers = () => {
  const [suppliers, setSuppliers] = useState(db.proveedores);
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Proveedor | null>(null);
  const [formData, setFormData] = useState({ nombre: '' });
  const [searchTerm, setSearchTerm] = useState('');

  const handleOpenAdd = () => {
    setEditingSupplier(null);
    setFormData({ nombre: '' });
    setShowModal(true);
  };

  const handleOpenEdit = (s: Proveedor) => {
    setEditingSupplier(s);
    setFormData({ 
      nombre: s.nombre
    });
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSupplier) {
      db.updateSupplier(editingSupplier.id, formData);
    } else {
      db.addSupplier(formData);
    }
    setSuppliers([...db.proveedores]);
    setShowModal(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('¿Eliminar este proveedor?')) {
      db.deleteSupplier(id);
      setSuppliers([...db.proveedores]);
    }
  };

  const filtered = suppliers.filter(s => s.nombre.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold">Proveedores</h2>
          <p className="text-slate-400">Listado de proveedores registrados.</p>
        </div>
        <button 
          onClick={handleOpenAdd}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-sm font-medium transition-all shadow-lg shadow-indigo-600/20 flex items-center"
        >
          <Plus size={18} className="mr-2" /> Agregar Proveedor
        </button>
      </header>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
        <input 
          type="text" 
          placeholder="Buscar proveedor..." 
          className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:ring-1 focus:ring-indigo-500 focus:outline-none"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(s => (
          <GlassCard key={s.id} className="relative group hover:border-indigo-500/30 transition-all flex items-center py-6 px-6">
            <div className="flex items-center space-x-4 flex-1">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                <Truck size={20} />
              </div>
              <h4 className="font-bold text-lg text-slate-200 truncate pr-16">{s.nombre}</h4>
            </div>

            <div className="absolute right-4 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                onClick={() => handleOpenEdit(s)}
                className="p-2 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 rounded-lg transition-all"
                title="Editar Proveedor"
              >
                <Edit2 size={16} />
              </button>
              <button 
                onClick={() => handleDelete(s.id)}
                className="p-2 text-rose-500/40 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all"
                title="Eliminar Proveedor"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </GlassCard>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <GlassCard className="w-full max-w-md animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">{editingSupplier ? 'Editar Proveedor' : 'Nuevo Proveedor'}</h3>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Nombre del Proveedor</label>
                <input 
                  required 
                  placeholder="Ej. Distribuidora Central" 
                  value={formData.nombre} 
                  onChange={e => setFormData({...formData, nombre: e.target.value})} 
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all" 
                />
              </div>

              <button 
                type="submit" 
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-indigo-600/20 transition-all mt-4"
              >
                {editingSupplier ? 'Actualizar' : 'Guardar'}
              </button>
            </form>
          </GlassCard>
        </div>
      )}
    </div>
  );
};

export default Suppliers;
