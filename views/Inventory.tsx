import React, { useState, useEffect } from 'react';
import GlassCard from '../components/GlassCard';
import {
  Search,
  Plus,
  Download,
  Filter,
  Edit2,
  Trash2,
  Package,
  X,
  Loader2,
  AlertTriangle,
  CheckCircle,
  AlertOctagon
} from 'lucide-react';
import { repository } from '../services/repository';
import CustomSelect from '../components/CustomSelect';
import * as XLSX from 'xlsx';
import { Producto, Marca, Categoria } from '../types';

const Inventory = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [products, setProducts] = useState<Producto[]>([]);
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [proveedores, setProveedores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Producto | null>(null);
  const [selectedParentId, setSelectedParentId] = useState('');

  const [newProduct, setNewProduct] = useState({
    sku: '',
    nombre: '',
    marca_id: '',
    subcategoria_id: '',
    stock_actual: 0,
    stock_minimo: 5,
    is_high_rotation: false,
    preferred_supplier_id: '' // added for consistency
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [prods, brands, cats, provs] = await Promise.all([
        repository.getProductos(),
        repository.getMarcas(),
        repository.getCategorias(),
        repository.getProveedores()
      ]);
      setProducts(prods);
      setMarcas(brands);
      setCategorias(cats);
      setProveedores(provs);
    } catch (error) {
      console.error("Error loading inventory:", error);
      alert("Error al cargar inventario");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const data = products.map(p => ({
      Referencia: p.sku,
      Nombre: p.nombre,
      Marca: p.marca?.nombre,
      Categoría: p.categoria?.name,
      'Stock Actual': p.stock_actual,
      'Stock Mínimo': p.stock_minimo,
      'Rotación': p.is_high_rotation ? 'Alta' : 'Normal'
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventario");
    XLSX.writeFile(wb, "Inventario_Fluxo.xlsx");
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar este producto?')) {
      try {
        await repository.deleteProducto(id);
        await loadData();
      } catch (error) {
        console.error(error);
        alert("Error al eliminar producto");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...newProduct,
        marca_id: newProduct.marca_id || marcas[0]?.id,
        subcategoria_id: newProduct.subcategoria_id || categorias[0]?.id
      };

      if (editingProduct) {
        await repository.updateProducto(editingProduct.id, payload);
      } else {
        await repository.addProducto(payload);
      }

      await loadData();
      setShowAddModal(false);
      resetForm();
    } catch (error: any) {
      console.error(error);
      alert("Error al guardar producto: " + (error.message || ""));
    }
  };

  const resetForm = () => {
    setEditingProduct(null);
    setSelectedParentId('');
    setNewProduct({
      sku: '',
      nombre: '',
      marca_id: '',
      subcategoria_id: '',
      stock_actual: 0,
      stock_minimo: 5,
      is_high_rotation: false,
      preferred_supplier_id: ''
    });
  };

  const handleEdit = (p: Producto) => {
    setEditingProduct(p);
    // Find parent category
    const currentCat = categorias.find(c => c.id === p.subcategoria_id);
    if (currentCat && currentCat.parent_id) {
      setSelectedParentId(currentCat.parent_id);
    } else {
      setSelectedParentId('');
    }

    setNewProduct({
      sku: p.sku,
      nombre: p.nombre,
      marca_id: p.marca_id,
      subcategoria_id: p.subcategoria_id,
      stock_actual: p.stock_actual,
      stock_minimo: p.stock_minimo,
      is_high_rotation: p.is_high_rotation || false,
      preferred_supplier_id: p.preferred_supplier_id || ''
    });
    setShowAddModal(true);
  };

  const handleOpenAdd = () => {
    resetForm();
    setShowAddModal(true);
  };

  const filtered = products.filter(p =>
    p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.marca?.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen space-y-4">
        <Loader2 className="animate-spin text-blue-500" size={48} />
        <p className="text-slate-400 animate-pulse">Cargando inventario (Cloud)...</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6 animate-fade-in-up">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold">Catálogo Maestro</h2>
            <p className="text-slate-400">Administra tus productos, marcas y categorías (Supabase).</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={handleExport} className="flex items-center px-4 py-2 bg-white dark:bg-[#1e293b] rounded-full text-sm font-bold hover:bg-emerald-50 dark:hover:bg-[#1e293b] text-emerald-600 dark:text-emerald-400 shadow-sm hover:shadow-md transition-all border border-emerald-200 dark:border-emerald-500/30">
              <Download size={16} className="mr-2" /> Exportar Excel
            </button>
            <button onClick={handleOpenAdd} className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-full text-sm font-bold transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 text-white">
              <Plus size={16} className="mr-2" /> Nuevo Producto
            </button>
          </div>
        </div>

        <GlassCard noPadding>
          <div className="p-6 border-b border-slate-200 dark:border-[#334155] flex flex-col md:flex-row justify-between items-center gap-4 sticky top-0 z-20 bg-white dark:bg-[#1e293b] rounded-t-xl shadow-md">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input
                type="text"
                placeholder="Buscar por referencia, nombre o marca..."
                className="w-full pl-10 pr-4 py-2.5 input-premium rounded-full focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all placeholder:text-slate-400"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center space-x-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
              <button className="px-3 py-1.5 bg-slate-100 dark:bg-[#0f172a] border border-slate-200 dark:border-[#334155] rounded-lg text-xs font-semibold hover:bg-slate-200 dark:hover:bg-[#334155] whitespace-nowrap text-slate-700 dark:text-slate-300">Todas las Categorías</button>
              <button className="px-3 py-1.5 bg-slate-100 dark:bg-[#0f172a] border border-slate-200 dark:border-[#334155] rounded-lg text-xs font-semibold hover:bg-slate-200 dark:hover:bg-[#334155] whitespace-nowrap text-slate-700 dark:text-slate-300">Alta Rotación</button>
              <button className="px-3 py-1.5 bg-slate-100 dark:bg-[#0f172a] border border-slate-200 dark:border-[#334155] rounded-lg text-xs font-semibold hover:bg-slate-200 dark:hover:bg-[#334155] whitespace-nowrap text-slate-700 dark:text-slate-300">Bajo Stock</button>
              <div className="h-6 w-px bg-slate-200 dark:bg-[#334155]"></div>
              <button className="p-2 bg-slate-100 dark:bg-[#0f172a] border border-slate-200 dark:border-[#334155] rounded-lg hover:bg-slate-200 dark:hover:bg-[#334155] text-slate-500"><Filter size={16} /></button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-600 dark:text-slate-400 uppercase tracking-wider text-[11px] font-bold border-b border-slate-200 dark:border-[#334155] bg-slate-100 dark:bg-[#1e293b]">
                  <th className="px-6 py-4 first:rounded-tl-xl">Producto</th>
                  <th className="px-6 py-4 text-center">Categoría</th>
                  <th className="px-6 py-4 text-center">Stock</th>
                  <th className="px-6 py-4 text-center">Mínimo</th>
                  <th className="px-6 py-4 text-center">Estado</th>
                  <th className="px-6 py-4 text-right last:rounded-tr-xl">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-[#334155]">
                {filtered.map(p => {
                  let statusColor = 'text-emerald-500 dark:text-emerald-400';
                  let StatusIcon = CheckCircle;
                  let statusBg = 'bg-emerald-500/10 border-emerald-500/20';
                  let statusTitle = 'Saludable';

                  if (p.stock_actual <= p.stock_minimo) {
                    statusColor = 'text-rose-500 dark:text-rose-400';
                    StatusIcon = AlertOctagon;
                    statusBg = 'bg-rose-500/10 border-rose-500/20 shadow-[0_0_10px_rgba(244,63,94,0.1)]';
                    statusTitle = 'Alerta: Crítico';
                  } else if (p.stock_actual <= p.stock_minimo * 1.5) {
                    statusColor = 'text-amber-500 dark:text-amber-400';
                    StatusIcon = AlertTriangle;
                    statusBg = 'bg-amber-500/10 border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.1)]';
                    statusTitle = 'Advertencia: Bajo';
                  }

                  return (
                    <tr key={p.id} className="group hover:bg-blue-50/30 dark:hover:bg-[#334155]/20 transition-all duration-300 border-b border-slate-200 dark:border-[#334155] last:border-0 relative hover:shadow-sm">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="p-2.5 bg-gradient-to-br from-blue-500/10 to-purple-500/10 dark:from-blue-500/20 dark:to-purple-500/20 rounded-xl group-hover:scale-110 transition-transform duration-300 border border-slate-100 dark:border-white/5">
                            <Package className="text-blue-600 dark:text-blue-400" size={24} />
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-white transition-colors">{p.nombre}</p>
                            <div className="flex items-center space-x-2">
                              <span className="text-[10px] text-slate-500 font-mono tracking-wide">{p.sku}</span>
                              <span className="text-slate-300 dark:text-slate-700">•</span>
                              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">{p.marca?.nombre}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-[#0f172a] border border-slate-200 dark:border-[#334155] text-slate-600 dark:text-slate-300 text-[10px] font-bold uppercase tracking-wider">{p.categoria?.name}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`font-mono text-lg font-bold ${statusColor}`}>
                          {p.stock_actual}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="px-3 py-1 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 font-mono font-bold text-sm">
                          {p.stock_minimo}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center w-full">
                          <div className={`p-2 rounded-lg ${statusBg} ${statusColor} border`} title={statusTitle}>
                            <StatusIcon size={16} />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end space-x-1 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
                          <button className="p-2 hover:bg-rose-500/20 text-rose-500 dark:text-rose-400 rounded-lg transition-colors active:scale-95" onClick={() => handleDelete(p.id)}>
                            <Trash2 size={16} />
                          </button>
                          <button
                            onClick={() => handleEdit(p)}
                            className="p-2 hover:bg-blue-500/20 text-blue-500 dark:text-blue-400 rounded-lg transition-colors active:scale-95">
                            <Edit2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="p-12 text-center text-slate-500">
                <Package size={48} className="mx-auto mb-4 opacity-20" />
                <p>No se encontraron productos que coincidan con la búsqueda.</p>
              </div>
            )}
          </div>
        </GlassCard>
      </div>

      {/* Add Modal */}
      {
        showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 animate-in fade-in duration-200">
            <GlassCard hoverEffect={false} className="w-full max-w-2xl animate-in zoom-in-95 slide-in-from-bottom-5 duration-300 shadow-2xl shadow-blue-500/20 border-slate-200 dark:border-[#334155] bg-white dark:bg-[#1e293b]">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-slate-800 dark:text-white">{editingProduct ? 'Editar Producto' : 'Nuevo Producto (Nube)'}</h3>
                <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition-colors text-slate-500 dark:text-white">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-2">
                <div className="space-y-2">
                  {/* Section: Identificación */}
                  <div className="space-y-2">
                    <h4 className="text-[10px] items-center flex uppercase tracking-widest text-blue-400 font-bold border-b border-blue-500/10 pb-1 mb-1">
                      Identificación
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-0.5">
                        <label className="text-[10px] font-bold text-slate-400">Referencia</label>
                        <input required type="text" value={newProduct.sku} onChange={e => setNewProduct({ ...newProduct, sku: e.target.value })} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs focus:ring-1 focus:ring-blue-500 text-slate-700 dark:text-white" />
                      </div>
                      <div className="space-y-0.5">
                        <label className="text-[10px] font-bold text-slate-400">Vehículos</label>
                        <input required type="text" value={newProduct.nombre} onChange={e => setNewProduct({ ...newProduct, nombre: e.target.value })} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs focus:ring-1 focus:ring-blue-500 text-slate-700 dark:text-white" />
                      </div>
                    </div>
                  </div>

                  {/* Section: Clasificación */}
                  <div className="space-y-2">
                    <h4 className="text-[10px] uppercase tracking-widest text-blue-400 font-bold border-b border-blue-500/10 pb-1 mb-1">
                      Clasificación
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-0.5">
                        <label className="text-[10px] font-bold text-slate-400">Marca</label>
                        <CustomSelect
                          value={newProduct.marca_id}
                          onChange={(val) => setNewProduct({ ...newProduct, marca_id: val })}
                          options={marcas.map(m => ({ value: m.id, label: m.nombre }))}
                          placeholder="Seleccionar..."
                        />
                      </div>
                      <div className="space-y-0.5">
                        <label className="text-[10px] font-bold text-slate-400">Proveedor</label>
                        <CustomSelect
                          value={newProduct.preferred_supplier_id}
                          onChange={(val) => setNewProduct({ ...newProduct, preferred_supplier_id: val })}
                          options={[
                            { value: '', label: 'Opcional...' },
                            ...proveedores.map(p => ({ value: p.id, label: p.nombre }))
                          ]}
                          placeholder="Opcional..."
                        />
                      </div>
                      <div className="space-y-0.5">
                        <label className="text-[10px] font-bold text-slate-400">Categoría</label>
                        <CustomSelect
                          value={selectedParentId}
                          onChange={(val) => {
                            setSelectedParentId(val);
                            setNewProduct({ ...newProduct, subcategoria_id: '' });
                          }}
                          options={categorias.filter(c => !c.parent_id).map(c => ({ value: c.id, label: c.name }))}
                          placeholder="Seleccionar..."
                        />
                      </div>
                      <div className="space-y-0.5">
                        <label className="text-[10px] font-bold text-slate-400">Subcategoría</label>
                        <CustomSelect
                          value={newProduct.subcategoria_id}
                          onChange={(val) => setNewProduct({ ...newProduct, subcategoria_id: val })}
                          options={categorias.filter(c => c.parent_id === selectedParentId).map(c => ({ value: c.id, label: c.name }))}
                          placeholder="Seleccionar..."
                          disabled={!selectedParentId}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section: Inventario */}
                  <div className="space-y-2">
                    <h4 className="text-[10px] uppercase tracking-widest text-blue-400 font-bold border-b border-blue-500/10 pb-1 mb-1">
                      Control de Stock
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-0.5">
                        <label className="text-[10px] font-bold text-slate-400">Stock Inicial</label>
                        <input type="number" value={newProduct.stock_actual} onChange={e => setNewProduct({ ...newProduct, stock_actual: parseInt(e.target.value) })} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs focus:ring-1 focus:ring-blue-500 text-slate-700 dark:text-white" />
                      </div>
                      <div className="space-y-0.5">
                        <label className="text-[10px] font-bold text-slate-400">Stock Mínimo</label>
                        <input type="number" value={newProduct.stock_minimo} onChange={e => setNewProduct({ ...newProduct, stock_minimo: parseInt(e.target.value) })} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs focus:ring-1 focus:ring-blue-500 text-slate-700 dark:text-white" />
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 pt-2">
                      <input type="checkbox" id="rotation" checked={newProduct.is_high_rotation} onChange={e => setNewProduct({ ...newProduct, is_high_rotation: e.target.checked })} className="accent-blue-500 scale-125" />
                      <label htmlFor="rotation" className="text-sm font-medium text-slate-600 dark:text-slate-300">Producto de Alta Rotación</label>
                    </div>
                  </div>
                </div>
                <button type="submit" className="w-full py-2 mt-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold shadow-lg shadow-blue-600/20 transition-all text-sm text-white">
                  {editingProduct ? 'Guardar Cambios' : 'Crear Producto'}
                </button>
              </form>
            </GlassCard>
          </div>
        )
      }
    </>
  );
};

export default Inventory;
