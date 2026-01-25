import React, { useState, useEffect } from 'react';
import GlassCard from '../components/GlassCard';
import { Truck, Plus, Trash2, Search, X, Edit2, Loader2 } from 'lucide-react';
import { repository } from '../services/repository';
import { Proveedor } from '../types';

const Suppliers = () => {
  const [suppliers, setSuppliers] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Proveedor | null>(null);
  const [formData, setFormData] = useState({ nombre: '' });
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch data on mount
  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    try {
      setLoading(true);
      const data = await repository.getProveedores();
      setSuppliers(data);
    } catch (error) {
      console.error('Error loading suppliers:', error);
      alert('Error al cargar proveedores. Revisa la consola.');
    } finally {
      setLoading(false);
    }
  };

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingSupplier) {
        await repository.updateProveedor(editingSupplier.id, formData);
      } else {
        await repository.addProveedor(formData);
      }
      await loadSuppliers();
      setShowModal(false);
    } catch (error) {
      console.error('Error saving supplier:', error);
      alert('Error al guardar proveedor.');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Eliminar este proveedor?')) {
      try {
        await repository.deleteProveedor(id);
        await loadSuppliers();
      } catch (error) {
        console.error('Error deleting supplier:', error);
        alert('Error al borrar proveedor.');
      }
    }
  };

  const filtered = suppliers.filter(s => s.nombre.toLowerCase().includes(searchTerm.toLowerCase()));

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <Loader2 className="animate-spin text-indigo-500" size={48} />
        <p className="text-slate-400 animate-pulse">Cargando proveedores...</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6 animate-in fade-in duration-500">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold">Proveedores</h2>
            <p className="text-slate-400">Listado de proveedores registrados (Nube).</p>
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
            className="w-full pl-10 pr-4 py-2.5 input-premium rounded-xl focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.length === 0 ? (
            <div className="col-span-full py-10 text-center text-slate-500">
              No se encontraron proveedores.
            </div>
          ) : (
            filtered.map(s => (
              <GlassCard key={s.id} className="relative group hover:border-indigo-500/30 transition-all flex items-center py-6 px-6 bg-white dark:bg-[#1e293b] border-slate-200 dark:border-[#334155] shadow-sm hover:shadow-md">
                <div className="flex items-center space-x-4 flex-1">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 dark:from-indigo-500/20 dark:to-purple-500/20 flex items-center justify-center text-indigo-500 dark:text-indigo-400 shrink-0 border border-slate-100 dark:border-white/5">
                    <Truck size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg text-slate-800 dark:text-slate-100 truncate pr-4">{s.nombre}</h4>
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Proveedor Activo</p>
                  </div>
                </div>

                <div className="absolute right-4 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleOpenEdit(s)}
                    className="p-2 text-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all rounded-lg"
                    title="Editar Proveedor"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(s.id)}
                    className="p-2 text-rose-400 hover:text-rose-500 hover:bg-rose-50 transition-all rounded-lg"
                    title="Eliminar Proveedor"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </GlassCard>
            ))
          )}
        </div>

      </div>

      {
        showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
            <GlassCard hoverEffect={false} className="w-full max-w-md animate-in zoom-in-95 duration-200 bg-white dark:bg-[#1e293b] border-slate-200 dark:border-[#334155]">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-slate-800 dark:text-white">{editingSupplier ? 'Editar Proveedor' : 'Nuevo Proveedor'}</h3>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition-colors text-slate-500 dark:text-white">
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
                    onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                    className="w-full input-premium rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all"
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
        )
      }
    </>
  );
};

export default Suppliers;
