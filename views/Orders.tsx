
import React, { useState, useMemo, useEffect } from 'react';
import GlassCard from '../components/GlassCard';
import { 
  Search, 
  ShoppingCart, 
  Plus, 
  Trash2, 
  Send,
  PackageCheck,
  Truck,
  Layers,
  X,
  AlertCircle
} from 'lucide-react';
import { db } from '../services/mockDb';
import * as XLSX from 'xlsx';

const Orders = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedProvFilter, setSelectedProvFilter] = useState<string | null>(null);
  const [targetProveedor, setTargetProveedor] = useState(db.proveedores[0]?.id);
  const [cart, setCart] = useState<Record<string, number>>({});

  const categories = db.categorias;
  const proveedores = db.proveedores;
  const products = useMemo(() => db.getProductos(), []);

  // Sync cart target provider with provider filter if one is selected
  useEffect(() => {
    if (selectedProvFilter) {
      setTargetProveedor(selectedProvFilter);
    }
  }, [selectedProvFilter]);

  const clearFilters = () => {
    setSelectedCategory(null);
    setSelectedProvFilter(null);
    setSearchTerm('');
  };

  const addToCart = (productId: string) => {
    setCart(prev => ({
      ...prev,
      [productId]: (prev[productId] || 0) + 1
    }));
  };

  const removeFromCart = (productId: string) => {
    const newCart = { ...cart };
    delete newCart[productId];
    setCart(newCart);
  };

  const updateCartQty = (productId: string, qty: number) => {
    if (qty <= 0) return removeFromCart(productId);
    setCart(prev => ({ ...prev, [productId]: qty }));
  };

  const filtered = products.filter(p => {
    const matchesSearch = p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         p.sku.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = !selectedCategory || p.subcategoria_id === selectedCategory;
    const matchesProvider = !selectedProvFilter || p.preferred_supplier_id === selectedProvFilter;
    
    return matchesSearch && matchesCategory && matchesProvider;
  });

  const cartItems = Object.entries(cart).map(([id, qty]) => ({
    product: products.find(p => p.id === id)!,
    qty: qty as number
  }));

  const selectedProviderName = useMemo(() => 
    proveedores.find(p => p.id === targetProveedor)?.nombre || 'Sin seleccionar',
  [targetProveedor, proveedores]);

  const activeCategoryName = useMemo(() => 
    categories.find(c => c.id === selectedCategory)?.name || 'Todas las Categorías',
  [selectedCategory, categories]);

  const includedCategoriesCount = useMemo(() => {
    return [...new Set(cartItems.map(i => i.product.subcategoria_id))].length;
  }, [cartItems]);

  const hasMixedSuppliers = cartItems.some(item => item.product.preferred_supplier_id !== targetProveedor);

  const handleCreateOrder = () => {
    if (cartItems.length === 0) return;
    const provider = db.proveedores.find(p => p.id === targetProveedor);
    const providerName = provider ? provider.nombre : 'Desconocido';
    const newPedido = db.createPedido(targetProveedor, cartItems.map(item => ({
      productId: item.product.id,
      qty: item.qty
    })));

    // Export Excel
    const data = cartItems.map(item => ({
      'Referencia': item.product.sku,
      'Producto': item.product.nombre,
      'Categoría': item.product.categoria?.name,
      'Marca': item.product.marca?.nombre,
      'Cantidad Pedida': item.qty
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pedido");
    XLSX.writeFile(wb, `Pedido_${newPedido.id}.xlsx`);

    setCart({});
    alert(`Pedido ${newPedido.id} finalizado correctamente.`);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-500 pb-10">
      <div className="lg:col-span-8 space-y-6">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold">Gestión de Pedidos</h2>
            <p className="text-slate-400">Selecciona proveedor o categoría para filtrar repuestos.</p>
          </div>
          {(selectedCategory || selectedProvFilter || searchTerm) && (
            <button 
              onClick={clearFilters}
              className="flex items-center text-xs font-bold text-rose-400 hover:text-rose-300 transition-colors"
            >
              <X size={14} className="mr-1" /> Limpiar Filtros
            </button>
          )}
        </header>

        {/* Paneles de Selección (Chips/Buttons) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Selección de Proveedor */}
          <div className="glass rounded-2xl p-4 border border-white/5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Truck size={14} className="text-indigo-400" />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Proveedor</span>
              </div>
              <span className="text-[10px] text-indigo-400 font-bold bg-indigo-400/10 px-2 py-0.5 rounded-full uppercase">
                {selectedProvFilter ? proveedores.find(p => p.id === selectedProvFilter)?.nombre.split(' ')[0] : 'Todos'}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedProvFilter(null)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all border ${
                  !selectedProvFilter ? 'bg-indigo-600 text-white border-indigo-400 shadow-lg shadow-indigo-600/20' : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'
                }`}
              >
                Todos
              </button>
              {proveedores.map(p => (
                <button
                  key={p.id}
                  onClick={() => setSelectedProvFilter(p.id)}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all border ${
                    selectedProvFilter === p.id ? 'bg-indigo-600 text-white border-indigo-400 shadow-lg shadow-indigo-600/20' : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'
                  }`}
                >
                  {p.nombre.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Selección de Categoría */}
          <div className="glass rounded-2xl p-4 border border-white/5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Layers size={14} className="text-violet-400" />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Categoría</span>
              </div>
              <span className="text-[10px] text-violet-400 font-bold bg-violet-400/10 px-2 py-0.5 rounded-full uppercase">
                {selectedCategory ? categories.find(c => c.id === selectedCategory)?.name : 'Todas'}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all border ${
                  !selectedCategory ? 'bg-violet-600 text-white border-violet-400 shadow-lg shadow-violet-600/20' : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'
                }`}
              >
                Todas
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all border ${
                    selectedCategory === cat.id ? 'bg-violet-600 text-white border-violet-400 shadow-lg shadow-violet-600/20' : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Buscador */}
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={20} />
          <input 
            type="text" 
            placeholder="Escribe SKU o nombre para buscar..." 
            className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all glass placeholder:text-slate-600"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Lista de Productos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.length > 0 ? (
            filtered.map(p => (
              <GlassCard key={p.id} noPadding className="hover:border-indigo-500/30 transition-all group">
                <div className="p-4 flex items-center space-x-4">
                  <div className="relative">
                    <img src={p.imagen_url} className="w-16 h-16 rounded-xl object-cover shadow-lg" alt="" />
                    {p.is_high_rotation && <div className="absolute -top-1 -left-1 w-3 h-3 bg-amber-500 rounded-full border-2 border-slate-900 shadow-lg"></div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-slate-200 truncate text-sm mb-0.5">{p.nombre}</h4>
                      <span className="text-[8px] font-black bg-indigo-500/10 text-indigo-400 px-1.5 py-0.5 rounded uppercase tracking-tighter shrink-0 ml-2">
                        {p.marca?.nombre}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-mono mb-2">{p.sku}</p>
                    <div className="flex justify-between items-center">
                      <span className={`text-[10px] font-bold ${p.stock_actual <= p.stock_minimo ? 'text-rose-400' : 'text-emerald-500'}`}>
                        Stock: {p.stock_actual}
                      </span>
                      <button 
                        onClick={() => addToCart(p.id)}
                        className="p-1.5 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-400 hover:text-white rounded-lg transition-all active:scale-90"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </GlassCard>
            ))
          ) : (
            <div className="col-span-full py-16 text-center glass rounded-3xl border border-dashed border-white/10">
              <PackageCheck size={48} className="mx-auto mb-4 opacity-10 text-slate-400" />
              <p className="text-slate-500 font-medium">No se encontraron productos con estos filtros.</p>
            </div>
          )}
        </div>
      </div>

      {/* Sidebar de Resumen */}
      <div className="lg:col-span-4">
        <div className="sticky top-8 space-y-6">
          <GlassCard className="border border-white/10 shadow-2xl flex flex-col min-h-[500px]">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-indigo-500/20 rounded-xl">
                  <ShoppingCart className="text-indigo-400" size={24} />
                </div>
                <h3 className="text-xl font-bold">Resumen</h3>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Refs</p>
                <p className="text-xl font-bold text-indigo-400">{cartItems.length}</p>
              </div>
            </div>

            <div className="bg-white/5 rounded-2xl p-4 mb-6 space-y-4 border border-white/5">
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-200 py-1">
                  {selectedProviderName}
                </p>
              </div>
              <div className="h-px bg-white/5 w-full"></div>
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <Layers size={12} className="text-violet-400" />
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Contexto Técnico</span>
                </div>
                <p className="text-sm font-bold text-slate-200 truncate">
                  {selectedCategory ? activeCategoryName : `${includedCategoriesCount} categorías incluidas`}
                </p>
              </div>
            </div>

            {hasMixedSuppliers && (
              <div className="mb-6 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start space-x-2">
                <AlertCircle size={14} className="text-amber-500 mt-0.5 shrink-0" />
                <p className="text-[10px] text-amber-200/70 leading-tight">
                  Has incluido productos de otros proveedores. El pedido se consolidará para {selectedProviderName}.
                </p>
              </div>
            )}

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3 mb-8">
              {cartItems.map(({ product, qty }) => (
                <div key={product.id} className="flex items-center justify-between p-2.5 rounded-2xl bg-white/5 border border-white/5 group hover:bg-white/10 transition-all">
                  <div className="min-w-0 flex-1 mr-3">
                    <p className="text-xs font-bold truncate text-slate-200">{product.nombre}</p>
                    <p className="text-[9px] text-slate-500 font-mono uppercase">{product.sku}</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center bg-black/30 rounded-lg px-1.5 py-0.5 border border-white/5">
                      <button onClick={() => updateCartQty(product.id, qty - 1)} className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-white">-</button>
                      <span className="w-6 text-center text-xs font-bold text-indigo-400">{qty}</span>
                      <button onClick={() => updateCartQty(product.id, qty + 1)} className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-white">+</button>
                    </div>
                    <button onClick={() => removeFromCart(product.id)} className="text-rose-500/30 hover:text-rose-500">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
              {cartItems.length === 0 && (
                <div className="flex flex-col items-center justify-center h-48 opacity-20">
                  <ShoppingCart size={32} className="mb-2" />
                  <p className="text-xs font-bold uppercase tracking-widest">Carrito Vacío</p>
                </div>
              )}
            </div>

            <button 
              onClick={handleCreateOrder}
              disabled={cartItems.length === 0}
              className={`w-full py-4 rounded-2xl flex items-center justify-center space-x-3 font-bold transition-all shadow-xl group ${
                cartItems.length === 0 
                  ? 'bg-slate-800 text-slate-600 cursor-not-allowed border border-white/5' 
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30 active:scale-[0.98]'
              }`}
            >
              <Send size={18} className={cartItems.length > 0 ? 'group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform' : ''} />
              <span>Finalizar Pedido</span>
            </button>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};

export default Orders;
