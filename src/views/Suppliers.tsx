import React, { useState, useEffect, useMemo } from 'react';
import GlassCard from '../components/GlassCard';
import { Truck, Plus, Trash2, Search, X, Edit2, Loader2, RefreshCw, AlertTriangle, Archive } from 'lucide-react';
import { repository } from '../services/repository';
import { Proveedor } from '../types';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';

const Suppliers = () => {
  const { addToast } = useToast();
  const [suppliers, setSuppliers] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);

  // View Mode: ACTIVE = Truck, TRASH = Trash2
  const [viewMode, setViewMode] = useState<'ACTIVE' | 'TRASH'>('ACTIVE');

  // Edit/Add Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Proveedor | null>(null);
  const [formData, setFormData] = useState({ nombre: '' });

  // Delete/Restore Confirmation State
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [actionSupplier, setActionSupplier] = useState<Proveedor | null>(null);
  const [actionType, setActionType] = useState<'TRASH' | 'DELETE' | 'RESTORE'>('TRASH');

  const [searchTerm, setSearchTerm] = useState('');

  // Fetch data on mount
  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    try {
      setLoading(true);
      const data = await repository.getProveedores();
      // Ensure compatibility with older data that might lack is_active
      const normalized = data.map(d => ({ ...d, is_active: d.is_active ?? true }));
      setSuppliers(normalized);
    } catch (error) {
      console.error('Error loading suppliers:', error);
      addToast('Error al cargar proveedores.', 'error');
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
        addToast('Proveedor actualizado exitosamente.', 'success');
      } else {
        await repository.addProveedor({ ...formData, is_active: true });
        addToast('Proveedor creado exitosamente.', 'success');
      }
      await loadSuppliers();
      setShowModal(false);
    } catch (error: any) {
      console.error('Error saving supplier:', error);
      const errorMessage = error.message || error.error_description || 'Error al guardar proveedor.';
      addToast(`Error: ${errorMessage}`, 'error');
    }
  };

  const handleActionClick = (supplier: Proveedor, type: 'TRASH' | 'DELETE' | 'RESTORE') => {
    setActionSupplier(supplier);
    setActionType(type);
    setConfirmModalOpen(true);
  };

  const confirmAction = async () => {
    if (!actionSupplier) return;
    try {
      if (actionType === 'TRASH') {
        await repository.updateProveedor(actionSupplier.id, { is_active: false });
        addToast('Proveedor movido a la papelera.', 'success');
      } else if (actionType === 'RESTORE') {
        await repository.updateProveedor(actionSupplier.id, { is_active: true });
        addToast('Proveedor restaurado.', 'success');
      } else if (actionType === 'DELETE') {
        await repository.deleteProveedor(actionSupplier.id);
        addToast('Proveedor eliminado permanentemente.', 'success');
      }
      await loadSuppliers();
    } catch (error) {
      console.error('Error performing action:', error);
      addToast('Ocurrió un error al procesar la solicitud.', 'error');
    } finally {
      setConfirmModalOpen(false);
      setActionSupplier(null);
    }
  };

  // derived state
  const activeSuppliers = suppliers.filter(s => s.is_active);
  const trashSuppliers = suppliers.filter(s => !s.is_active);

  const filtered = useMemo(() => {
    const list = viewMode === 'ACTIVE' ? activeSuppliers : trashSuppliers;
    return list.filter(s => s.nombre.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [suppliers, viewMode, searchTerm]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <Loader2 className="animate-spin text-blue-500" size={48} />
        <p className="text-slate-400 animate-pulse">Cargando proveedores...</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6 animate-in fade-in duration-500 pb-20">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold dark:text-white">Proveedores</h2>
            <p className="text-slate-400">Gestión de socios comerciales y fuentes de suministro.</p>
          </div>
          {viewMode === 'ACTIVE' && (
            <button
              onClick={handleOpenAdd}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 rounded-full text-white text-sm font-bold transition-all shadow-lg shadow-blue-600/20 flex items-center hover:-translate-y-0.5"
            >
              <Plus size={18} className="mr-2" /> Agregar Proveedor
            </button>
          )}
        </header>

        {/* Filters & Tabs */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="flex bg-slate-100 dark:bg-black/20 p-1 rounded-xl border border-slate-200 dark:border-white/5">
            <button
              onClick={() => setViewMode('ACTIVE')}
              className={`px-4 lg:px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${viewMode === 'ACTIVE' ? 'bg-white dark:bg-blue-500 text-blue-600 dark:text-white shadow-sm ring-1 ring-black/5 dark:ring-0' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              <Truck size={16} />
              <span className="hidden md:inline">Activos</span>
              <span className="bg-blue-100 dark:bg-white/20 text-blue-600 dark:text-white px-1.5 rounded-full text-[10px]">{activeSuppliers.length}</span>
            </button>
            <button
              onClick={() => setViewMode('TRASH')}
              className={`px-4 lg:px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${viewMode === 'TRASH' ? 'bg-white dark:bg-slate-500 text-slate-600 dark:text-white shadow-sm ring-1 ring-black/5 dark:ring-0' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              <Trash2 size={16} />
              <span className="hidden md:inline">Papelera</span>
              {trashSuppliers.length > 0 && <span className="bg-slate-200 dark:bg-white/20 text-slate-600 dark:text-white px-1.5 rounded-full text-[10px]">{trashSuppliers.length}</span>}
            </button>
          </div>

          <div className="relative w-full md:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Buscar proveedor..."
              className="w-full md:w-80 pl-10 pr-4 py-2.5 input-premium rounded-full focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 focus:outline-none dark:bg-[#1e293b] dark:text-white dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-[#334155] transition-colors"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.length === 0 ? (
            <div className="col-span-full py-24 text-center card-premium rounded-3xl border border-dashed border-[#334155]">
              {viewMode === 'ACTIVE' ? (
                <Truck size={64} className="mx-auto mb-6 opacity-20 text-blue-500" />
              ) : (
                <Trash2 size={64} className="mx-auto mb-6 opacity-20 text-slate-400" />
              )}
              <h3 className="text-xl font-bold text-slate-300 mb-2">
                {searchTerm ? 'No se encontraron resultados' : (viewMode === 'ACTIVE' ? 'No hay proveedores activos' : 'Papelera vacía')}
              </h3>
              <p className="text-slate-500">
                {searchTerm ? 'Intenta con otro término de búsqueda.' : (viewMode === 'ACTIVE' ? 'Agrega tu primer proveedor para comenzar.' : 'Los proveedores eliminados aparecerán aquí.')}
              </p>
            </div>
          ) : (
            filtered.map(s => (
              <div key={s.id} className={`relative bg-white dark:bg-[#1e293b] rounded-lg shadow-sm border border-slate-200 dark:border-[#334155] hover:shadow-md transition-all group overflow-hidden ${viewMode === 'ACTIVE' ? 'border-l-[4px] border-l-emerald-500' : 'border-l-[4px] border-l-rose-500'}`}>

                <div className="p-4 flex items-start gap-3">
                  {/* Icon - No Container */}
                  <div className={`shrink-0 pt-0.5 ${viewMode === 'ACTIVE' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`}>
                    {viewMode === 'ACTIVE' ? <Truck size={22} /> : <Trash2 size={22} />}
                  </div>

                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate pr-2" title={s.nombre}>
                        {s.nombre}
                      </h4>
                      {/* Actions (Top Right) */}
                      <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity -mt-1 -mr-1">
                        {viewMode === 'ACTIVE' ? (
                          <>
                            <button onClick={() => handleOpenEdit(s)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded" title="Editar">
                              <Edit2 size={14} />
                            </button>
                            <button onClick={() => handleActionClick(s, 'TRASH')} className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded" title="Papelera">
                              <Trash2 size={14} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => handleActionClick(s, 'RESTORE')} className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded" title="Restaurar">
                              <RefreshCw size={14} />
                            </button>
                            <button onClick={() => handleActionClick(s, 'DELETE')} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded" title="Eliminar">
                              <X size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Contact Info Compact */}
                    <div className="mt-2 space-y-1">
                      {s.email ? (
                        <div className="flex items-center text-[11px] text-slate-500 dark:text-slate-400">
                          <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mr-2 shrink-0"></span>
                          <span className="truncate">{s.email}</span>
                        </div>
                      ) : null}
                      {s.telefono ? (
                        <div className="flex items-center text-[11px] text-slate-500 dark:text-slate-400">
                          <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full mr-2 shrink-0"></span>
                          <span className="truncate">{s.telefono}</span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

      </div>

      {/* Confirmation Modal */}
      <Modal
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        title={
          actionType === 'TRASH' ? 'Mover a Papelera' :
            actionType === 'RESTORE' ? 'Restaurar Proveedor' : 'Eliminar Definitivamente'
        }
        maxWidth="sm:max-w-md"
        footer={
          <>
            <button
              onClick={() => setConfirmModalOpen(false)}
              className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-sm font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={confirmAction}
              className={`px-4 py-2 text-white rounded-lg text-sm font-bold shadow-lg transition-all ${actionType === 'TRASH' ? 'bg-amber-500 hover:bg-amber-400 shadow-amber-500/20' :
                actionType === 'RESTORE' ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20' :
                  'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20'
                }`}
            >
              Confirmar
            </button>
          </>
        }
      >
        <div className="flex flex-col items-center text-center p-4">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${actionType === 'TRASH' ? 'bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400' :
            actionType === 'RESTORE' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' :
              'bg-rose-100 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400'
            }`}>
            {actionType === 'TRASH' ? <Archive size={24} /> :
              actionType === 'RESTORE' ? <RefreshCw size={24} /> :
                <AlertTriangle size={24} />}
          </div>
          <p className="text-slate-800 dark:text-slate-100 mb-2 font-bold text-lg">
            {actionSupplier?.nombre}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {actionType === 'TRASH' ? 'El proveedor dejará de estar visible en las listas activas, pero podrás restaurarlo después.' :
              actionType === 'RESTORE' ? 'El proveedor volverá a estar activo y visible.' :
                'Esta acción es irreversible y eliminará todos los datos asociados.'}
          </p>
        </div>
      </Modal>

      {/* Edit/Add Modal */}
      {
        showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
            <GlassCard hoverEffect={false} className="w-full max-w-lg shadow-2xl shadow-blue-500/20 border-blue-100 dark:border-blue-900/30 bg-white dark:bg-[#1e293b]">
              <div className="flex justify-between items-center mb-6 border-b border-slate-100 dark:border-white/5 pb-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-800 dark:text-white">{editingSupplier ? 'Editar Proveedor' : 'Nuevo Proveedor'}</h3>
                  <p className="text-xs text-slate-400">Información básica de la empresa.</p>
                </div>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-slate-600">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Nombre Comercial</label>
                  <input
                    required
                    placeholder="Ej. Distribuidora Central S.A."
                    value={formData.nombre}
                    onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                    className="w-full input-premium rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none transition-all dark:bg-slate-800 dark:text-white dark:border-slate-700"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg shadow-blue-600/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Truck size={18} />
                    {editingSupplier ? 'Actualizar Información' : 'Registrar Proveedor'}
                  </button>
                </div>
              </form>
            </GlassCard>
          </div>
        )
      }
    </>
  );
};

export default Suppliers;
