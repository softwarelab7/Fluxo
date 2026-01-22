
import React, { useState } from 'react';
import GlassCard from '../components/GlassCard';
import {
  Search,
  Plus,
  Download,
  Filter,
  MoreVertical,
  Edit2,
  Trash2,
  Package,
  X
} from 'lucide-react';
import { db } from '../services/mockDb';
import * as XLSX from 'xlsx';

const Inventory = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [products, setProducts] = useState(db.getProductos());
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProduct, setNewProduct] = useState({
    sku: '',
    nombre: '',
    marca_id: db.marcas[0]?.id || '',
    subcategoria_id: db.categorias[0]?.id || '',
    stock_actual: 0,
    stock_minimo: 5,
    is_high_rotation: false,
    imagen_url: `https://picsum.photos/seed/${Math.random()}/200/200`
  });

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

  const handleDelete = (id: string) => {
    if (confirm('¿Estás seguro de eliminar este producto?')) {
      db.deleteProduct(id);
      setProducts(db.getProductos());
    }
  };

  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    db.addProduct(newProduct);
    setProducts(db.getProductos());
    setShowAddModal(false);
    setNewProduct({
      sku: '',
      nombre: '',
      marca_id: db.marcas[0]?.id || '',
      subcategoria_id: db.categorias[0]?.id || '',
      stock_actual: 0,
      stock_minimo: 5,
      is_high_rotation: false,
      imagen_url: `https://picsum.photos/seed/${Math.random()}/200/200`
    });
  };

  const filtered = products.filter(p =>
    p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.marca?.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold">Catálogo Maestro</h2>
          <p className="text-slate-400">Administra tus productos, marcas y categorías.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={handleExport} className="flex items-center px-4 py-2 glass rounded-xl text-sm font-medium glass-hover text-emerald-400 border-emerald-500/20">
            <Download size={18} className="mr-2" /> Exportar Excel
          </button>
          <button onClick={() => setShowAddModal(true)} className="flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-sm font-medium transition-all shadow-lg shadow-indigo-600/20">
            <Plus size={18} className="mr-2" /> Nuevo Producto
          </button>
        </div>
      </div>

      <GlassCard noPadding>
        <div className="p-6 border-b border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input
              type="text"
              placeholder="Buscar por referencia, nombre o marca..."
              className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center space-x-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
            <button className="px-3 py-1.5 glass rounded-lg text-xs font-semibold glass-hover whitespace-nowrap">Todas las Categorías</button>
            <button className="px-3 py-1.5 glass rounded-lg text-xs font-semibold glass-hover whitespace-nowrap">Alta Rotación</button>
            <button className="px-3 py-1.5 glass rounded-lg text-xs font-semibold glass-hover whitespace-nowrap">Bajo Stock</button>
            <div className="h-6 w-px bg-white/10"></div>
            <button className="p-2 glass rounded-lg glass-hover"><Filter size={16} /></button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-400 uppercase tracking-wider text-[11px] font-bold border-b border-white/5 bg-white/[0.02]">
                <th className="px-6 py-4 first:rounded-tl-xl">Producto</th>
                <th className="px-6 py-4">Categoría</th>
                <th className="px-6 py-4 text-center">Stock</th>
                <th className="px-6 py-4 text-center">Mínimo</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4 text-right last:rounded-tr-xl">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map(p => {
                const isCritical = p.stock_actual <= p.stock_minimo;
                return (
                  <tr key={p.id} className="group hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="relative group/img">
                          <img src={p.imagen_url} className="w-10 h-10 rounded-lg object-cover transition-transform group-hover/img:scale-110" alt="" />
                          <div className="absolute inset-0 rounded-lg ring-1 ring-white/10 group-hover/img:ring-indigo-500/30 transition-all"></div>
                        </div>
                        <div>
                          <p className="font-bold text-slate-200 group-hover:text-indigo-300 transition-colors">{p.nombre}</p>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-slate-500">{p.sku}</span>
                            <span className="text-slate-700">•</span>
                            <span className="text-xs text-slate-500">{p.marca?.nombre}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 rounded-md bg-white/5 text-slate-400 text-xs">{p.categoria?.name}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`font-mono text-lg ${isCritical ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {p.stock_actual}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center text-slate-500 font-mono">{p.stock_minimo}</td>
                    <td className="px-6 py-4">
                      {isCritical ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-rose-500/10 text-rose-500">
                          Crítico
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/10 text-emerald-500">
                          Saludable
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-2 hover:bg-rose-500/20 text-rose-400 rounded-lg transition-colors" onClick={() => handleDelete(p.id)}>
                          <Trash2 size={16} />
                        </button>
                        <button className="p-2 hover:bg-white/10 text-slate-400 rounded-lg transition-colors">
                          <MoreVertical size={16} />
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

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <GlassCard className="w-full max-w-lg animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Nuevo Producto</h3>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddProduct} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400">Referencia (SKU)</label>
                  <input required type="text" value={newProduct.sku} onChange={e => setNewProduct({ ...newProduct, sku: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400">Nombre</label>
                  <input required type="text" value={newProduct.nombre} onChange={e => setNewProduct({ ...newProduct, nombre: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400">Marca</label>
                  <select value={newProduct.marca_id} onChange={e => setNewProduct({ ...newProduct, marca_id: e.target.value })} className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm">
                    {db.marcas.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400">Categoría</label>
                  <select value={newProduct.subcategoria_id} onChange={e => setNewProduct({ ...newProduct, subcategoria_id: e.target.value })} className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm">
                    {db.categorias.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400">Stock Inicial</label>
                  <input type="number" value={newProduct.stock_actual} onChange={e => setNewProduct({ ...newProduct, stock_actual: parseInt(e.target.value) })} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400">Stock Mínimo</label>
                  <input type="number" value={newProduct.stock_minimo} onChange={e => setNewProduct({ ...newProduct, stock_minimo: parseInt(e.target.value) })} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm" />
                </div>
              </div>
              <div className="flex items-center space-x-2 pt-2">
                <input type="checkbox" id="rotation" checked={newProduct.is_high_rotation} onChange={e => setNewProduct({ ...newProduct, is_high_rotation: e.target.checked })} className="accent-indigo-500" />
                <label htmlFor="rotation" className="text-sm font-medium text-slate-300">Marcar como Alta Rotación</label>
              </div>
              <button type="submit" className="w-full py-3 mt-4 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-bold shadow-lg shadow-indigo-600/20 transition-all">
                Crear Producto
              </button>
            </form>
          </GlassCard>
        </div>
      )}
    </div>
  );
};

export default Inventory;
