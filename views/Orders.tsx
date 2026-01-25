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
  Package,
  Loader2,
  Save,
  FileSpreadsheet,
  Edit,
  ArrowLeft
} from 'lucide-react';
import { repository } from '../services/repository';
import * as XLSX from 'xlsx';
import { Categoria, Proveedor, Producto, Pedido, PedidoItem } from '../types';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';

interface OrdersProps {
  initialViewMode?: 'CREATE' | 'LIST';
}

const Orders: React.FC<OrdersProps> = ({ initialViewMode = 'CREATE' }) => {
  const { addToast } = useToast();
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<Pedido | null>(null);

  // Initialize with prop, but allow switching (though menu navigation will reset it via key usually)
  const [viewMode, setViewMode] = useState<'CREATE' | 'LIST'>(initialViewMode);

  // Sync viewMode if prop changes
  useEffect(() => {
    setViewMode(initialViewMode);
  }, [initialViewMode]);

  const [orderMode, setOrderMode] = useState<'PROVIDER' | 'CATEGORY'>('PROVIDER');
  const [searchTerm, setSearchTerm] = useState('');

  // Data State
  const [categories, setCategories] = useState<Categoria[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [products, setProducts] = useState<Producto[]>([]);
  const [pendingOrders, setPendingOrders] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit State
  const [editingOrder, setEditingOrder] = useState<Pedido | null>(null);
  const [originalOrderItems, setOriginalOrderItems] = useState<PedidoItem[]>([]);

  // Context States
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedProvFilter, setSelectedProvFilter] = useState<string | null>(null);

  const [cart, setCart] = useState<Record<string, number>>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [cats, provs, prods, orders] = await Promise.all([
        repository.getCategorias(),
        repository.getProveedores(),
        repository.getProductos(),
        repository.getPedidos()
      ]);
      setCategories(cats);
      setProveedores(provs);
      setProducts(prods);
      setPendingOrders(orders.filter(o => o.estado !== 'Cancelado')); // Show active orders

      // Init default filters
      if (provs.length > 0) setSelectedProvFilter(provs[0].id);
      if (cats.length > 0) setSelectedCategory(cats[0].id);

    } catch (error) {
      console.error("Error loading orders data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadOrderForEditing = async (order: Pedido) => {
    try {
      setLoading(true);
      const items = await repository.getPedidoItems(order.id);

      // Set Context based on order
      if (order.proveedor_id) {
        setOrderMode('PROVIDER');
        setSelectedProvFilter(order.proveedor_id);
      }

      // Populate Cart
      const newCart: Record<string, number> = {};
      items.forEach(item => {
        newCart[item.producto_id] = item.cantidad_pedida;
      });
      setCart(newCart);

      setEditingOrder(order);
      setOriginalOrderItems(items);
      setViewMode('CREATE');

    } catch (error) {
      console.error("Error loading order for edit:", error);
      addToast("Error al cargar el pedido para edición.", 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteOrder = (order: Pedido) => {
    setOrderToDelete(order);
    setDeleteModalOpen(true);
  };

  const confirmDeleteOrder = async () => {
    if (!orderToDelete) return;

    try {
      setLoading(true);
      await repository.deletePedido(orderToDelete.id);
      addToast("Pedido eliminado exitosamente.", 'success');
      loadData(); // Refresh list
    } catch (error) {
      console.error("Error deleting order:", error);
      addToast("Error al eliminar el pedido.", 'error');
    } finally {
      setLoading(false);
      setDeleteModalOpen(false);
      setOrderToDelete(null);
    }
  };

  // Effect: Clean up when switching modes to ensure strict context
  useEffect(() => {
    if (editingOrder) return; // Don't reset if we are just loading an edit

    if (orderMode === 'PROVIDER') {
      setSelectedCategory(null);
      if (proveedores.length > 0 && !selectedProvFilter) setSelectedProvFilter(proveedores[0].id);
      setCart({});
    } else {
      setSelectedProvFilter(null);
      if (categories.length > 0 && !selectedCategory) setSelectedCategory(categories[0].id);
      setCart({});
    }
  }, [orderMode, categories, proveedores]); // Removed editingOrder from dependencies to avoid loop

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

  const cancelEdit = () => {
    setEditingOrder(null);
    setOriginalOrderItems([]);
    setCart({});
    // If we came from list, go back to list
    if (initialViewMode === 'LIST') {
      setViewMode('LIST');
    } else {
      setViewMode('LIST');
    }
  };

  // Strict Filtering
  const filtered = products.filter(p => {
    const matchesSearch = p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase());

    let matchesContext = false;
    if (orderMode === 'PROVIDER') {
      matchesContext = p.preferred_supplier_id === selectedProvFilter;
    } else {
      matchesContext = p.subcategoria_id === selectedCategory;
    }

    return matchesSearch && matchesContext;
  });

  const cartItems = Object.entries(cart).map(([id, qty]) => ({
    product: products.find(p => p.id === id)!,
    qty: qty as number
  }));

  const activeContextName = useMemo(() => {
    if (orderMode === 'PROVIDER') {
      return proveedores.find(p => p.id === selectedProvFilter)?.nombre || 'Seleccionar Proveedor';
    } else {
      return categories.find(c => c.id === selectedCategory)?.name || 'Seleccionar Categoría';
    }
  }, [orderMode, selectedProvFilter, selectedCategory, proveedores, categories]);

  const includedCategoriesCount = useMemo(() => {
    return [...new Set(cartItems.map(i => i.product.subcategoria_id))].length;
  }, [cartItems]);

  const handleSaveOrder = async () => {
    if (cartItems.length === 0) return;

    try {
      if (editingOrder) {
        // UPDATE EXISTING ORDER
        await repository.updatePedido(editingOrder.id, {
          total_items: cartItems.length,
          // Update status if needed, or keep previous
        });

        // Delta for items
        const existingItemMap = new Map(originalOrderItems.map(i => [i.producto_id, i]));
        const currentItemIds = new Set(cartItems.map(i => i.product.id));

        // 1. Updates & Inserts
        const itemsUpsert = [];
        for (const item of cartItems) {
          const existing = existingItemMap.get(item.product.id);
          if (existing) {
            // Logic to update ONLY if changed could be here, but simpler to just update qty
            if (existing.cantidad_pedida !== item.qty) {
              await repository.updatePedidoItem(existing.id, { cantidad_pedida: item.qty });
            }
          } else {
            // Insert New
            itemsUpsert.push({
              pedido_id: editingOrder.id,
              producto_id: item.product.id,
              cantidad_pedida: item.qty,
              cantidad_recibida: 0,
              estado_item: 'No llegó' as const
            });
          }
        }

        if (itemsUpsert.length > 0) {
          await repository.addPedidoItems(itemsUpsert);
        }

        // 2. Deletes (Items in original but not in current cart)
        for (const original of originalOrderItems) {
          if (!currentItemIds.has(original.producto_id)) {
            await repository.deletePedidoItem(original.id);
          }
        }

        addToast("Pedido actualizado exitosamente.", 'success');

      } else {
        // CREATE NEW ORDER
        const mainProviderId = orderMode === 'PROVIDER'
          ? selectedProvFilter!
          : (cartItems[0]?.product.preferred_supplier_id || proveedores[0]?.id || 'unknown');

        const newPedido = await repository.createPedido({
          proveedor_id: mainProviderId,
          estado: 'Pendiente',
          total_items: cartItems.length,
          observaciones_generales: `Pedido creado por ${orderMode === 'PROVIDER' ? 'Proveedor' : 'Categoría'}`
        });

        const itemsPayload = cartItems.map(item => ({
          pedido_id: newPedido.id,
          producto_id: item.product.id,
          cantidad_pedida: item.qty,
          cantidad_recibida: 0,
          estado_item: 'No llegó' as const
        }));

        await repository.addPedidoItems(itemsPayload);
        addToast(`Pedido #${newPedido.id.slice(0, 8)} guardado en Pendientes.`, 'success');
      }

      // Cleanup
      setCart({});
      setEditingOrder(null);
      setOriginalOrderItems([]);
      loadData(); // Refresh list
      setViewMode('LIST');

    } catch (error) {
      console.error("Error saving order:", error);
      addToast("Error al guardar el pedido.", 'error');
    }
  };

  const handleDownloadExcel = async (order: Pedido) => {
    try {
      setLoading(true);
      const items = await repository.getPedidoItems(order.id);

      const data = items.map(item => ({
        'Referencia': item.producto?.sku,
        'Producto': item.producto?.nombre,
        'Categoría': item.producto?.categoria?.name,
        'Marca': item.producto?.marca?.nombre,
        'Proveedor': order.proveedor?.nombre,
        'Cantidad': item.cantidad_pedida
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Pedido");

      const providerName = order.proveedor?.nombre || 'General';
      const cleanName = providerName.replace(/[^a-zA-Z0-9]/g, '');
      XLSX.writeFile(wb, `Pedido_${cleanName}_${order.id.slice(0, 8)}.xlsx`);
    } catch (error) {
      console.error("Error downloading excel", error);
      addToast("Error al generar el Excel.", 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen space-y-4">
        <Loader2 className="animate-spin text-indigo-500" size={48} />
        <p className="text-slate-400 animate-pulse">Cargando gestión de pedidos...</p>
      </div>
    );
  }

  // --- LIST VIEW ---
  if (viewMode === 'LIST') {
    return (
      <div className="space-y-6 animate-in fade-in duration-500 pb-10">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold">Pedidos Pendientes</h2>
            <p className="text-slate-400">Administra, edita y descarga tus pedidos.</p>
          </div>
          {/* Hide New Order button if we are strictly in "Pending List" mode from menu, 
                      or keep it to allow jumping modes. Let's allowing jumping for flexibility. */}
          <button
            onClick={() => setViewMode('CREATE')}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/30 flex items-center space-x-2 transition-all active:scale-95"
          >
            <Plus size={20} />
            <span>Nuevo Pedido</span>
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {pendingOrders.map(order => (
            <GlassCard key={order.id} className="flex flex-col md:flex-row md:items-center justify-between p-6 group hover:border-indigo-500/30 transition-all">
              <div className="flex items-center space-x-4 mb-4 md:mb-0">
                <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center">
                  <Truck className="text-orange-500" size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-800 dark:text-white">
                    {order.proveedor?.nombre || 'Proveedor Desconocido'}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">ID: {order.id.slice(0, 8)} • {new Date(order.fecha_creacion).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="flex items-center space-x-6">
                <div className="text-right">
                  <p className="text-[10px] uppercase font-black text-slate-500 tracking-wider">Items</p>
                  <p className="text-xl font-bold text-indigo-400">{order.total_items}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase font-black text-slate-500 tracking-wider">Estado</p>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                    {order.estado}
                  </span>
                </div>

                <div className="h-10 w-px bg-slate-200 dark:bg-white/10 mx-2"></div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => loadOrderForEditing(order)}
                    className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors"
                    title="Editar Pedido"
                  >
                    <Edit size={20} />
                  </button>
                  <button
                    onClick={() => handleDownloadExcel(order)}
                    className="p-2 text-slate-400 hover:text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-colors"
                    title="Descargar Excel"
                  >
                    <FileSpreadsheet size={20} />
                  </button>
                  <button
                    onClick={() => handleDeleteOrder(order)}
                    className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
                    title="Eliminar Pedido"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            </GlassCard>
          ))}

          {pendingOrders.length === 0 && (
            <div className="text-center py-20 opacity-50">
              <PackageCheck size={64} className="mx-auto mb-4 text-slate-300" />
              <p className="text-slate-400">No hay pedidos pendientes.</p>
            </div>
          )}
        </div>
        <Modal
          isOpen={deleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          title="Eliminar Pedido"
          footer={
            <>
              <button
                onClick={() => setDeleteModalOpen(false)}
                className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDeleteOrder}
                className="px-4 py-2 text-sm font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-lg shadow-lg shadow-rose-500/30 transition-all"
              >
                Confirmar Eliminar
              </button>
            </>
          }
        >
          <p>
            ¿Estás seguro de que deseas eliminar este pedido?
            <br />
            <span className="text-sm text-slate-400 mt-2 block">
              Proveedor: <strong className="text-slate-600 dark:text-slate-200">{orderToDelete?.proveedor?.nombre}</strong>
            </span>
          </p>
        </Modal>
      </div >
    );
  }

  // --- CREATE / EDIT VIEW ---
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-500 pb-10">
      <div className="lg:col-span-8 space-y-6">

        {/* Header & Toggle */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex items-center space-x-3">
            {/* Show Back button if editing OR if we navigated from List mode (but are now in Create mode) */}
            {(editingOrder || initialViewMode === 'LIST') && (
              <button onClick={cancelEdit} className="p-2 -ml-2 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-colors">
                <ArrowLeft size={24} />
              </button>
            )}
            <div>
              <h2 className="text-3xl font-bold">{editingOrder ? 'Editar Pedido' : 'Nuevo Pedido'}</h2>
              <p className="text-slate-400">
                {editingOrder ? `Editando pedido #${editingOrder.id.slice(0, 8)}` : 'Genera pedidos por Proveedor o Categoría.'}
              </p>
            </div>
          </div>

          {!editingOrder && (
            <div className="flex bg-slate-100 dark:bg-black/20 p-1 rounded-xl border border-slate-200 dark:border-white/5">
              <button
                onClick={() => setOrderMode('PROVIDER')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${orderMode === 'PROVIDER' ? 'bg-white dark:bg-indigo-500 text-indigo-600 dark:text-white shadow-sm ring-1 ring-black/5 dark:ring-0' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
              >
                Por Proveedor
              </button>
              <button
                onClick={() => setOrderMode('CATEGORY')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${orderMode === 'CATEGORY' ? 'bg-white dark:bg-violet-500 text-violet-600 dark:text-white shadow-sm ring-1 ring-black/5 dark:ring-0' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
              >
                Por Categoría
              </button>
            </div>
          )}
        </header>

        {/* Dynamic Selectors */}
        <div className="space-y-4">
          {orderMode === 'PROVIDER' && (
            <div className="card-premium rounded-2xl p-4 border border-[#334155] space-y-3 animate-in fade-in slide-in-from-left-4 duration-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Truck size={14} className="text-indigo-400" />
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Seleccionar Proveedor</span>
                </div>
                <span className="text-[10px] text-indigo-400 font-bold bg-indigo-400/10 px-2 py-0.5 rounded-full uppercase">
                  {selectedProvFilter ? proveedores.find(p => p.id === selectedProvFilter)?.nombre : 'Ninguno'}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {proveedores.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedProvFilter(p.id)}
                    disabled={!!editingOrder && editingOrder.proveedor_id !== p.id} // Lock provider during edit if desired, or allow change carefully
                    className={`px-4 py-2 rounded-xl text-[11px] font-bold transition-all border shadow-lg ${selectedProvFilter === p.id ? 'bg-indigo-600/90 text-white border-indigo-400/50 shadow-indigo-600/30 scale-105' : 'bg-white dark:bg-[#1e293b] border-slate-200 dark:border-[#334155] text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#334155] hover:border-slate-300 dark:hover:border-slate-500'} ${editingOrder && editingOrder.proveedor_id !== p.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {p.nombre.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {orderMode === 'CATEGORY' && (
            <div className="card-premium rounded-2xl p-4 border border-slate-200 dark:border-[#334155] space-y-3 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Layers size={14} className="text-violet-400" />
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Seleccionar Categoría</span>
                </div>
                <span className="text-[10px] text-violet-400 font-bold bg-violet-400/10 px-2 py-0.5 rounded-full uppercase">
                  {selectedCategory ? categories.find(c => c.id === selectedCategory)?.name : 'Ninguna'}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-4 py-2 rounded-xl text-[11px] font-bold transition-all border shadow-lg ${selectedCategory === cat.id ? 'bg-violet-600/90 text-white border-violet-400/50 shadow-violet-600/30 scale-105' : 'bg-white dark:bg-[#1e293b] border-slate-200 dark:border-[#334155] text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#334155] hover:border-slate-300 dark:hover:border-slate-500'}`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Search */}
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={20} />
          <input
            type="text"
            placeholder="Escribe SKU o nombre para buscar..."
            className="w-full pl-12 pr-4 py-4 input-premium rounded-2xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 focus:outline-none transition-all placeholder:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#334155] shadow-inner"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.length > 0 ? (
            filtered.map(p => (
              <GlassCard key={p.id} noPadding className="hover:border-indigo-500/30 transition-all group">
                <div className="p-4 flex items-center space-x-4">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                      <Package size={32} className="text-indigo-400" />
                    </div>
                    {p.is_high_rotation && <div className="absolute -top-1 -left-1 w-3 h-3 bg-amber-500 rounded-full border-2 border-slate-900 shadow-lg"></div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-slate-700 dark:text-slate-200 truncate text-sm mb-0.5">{p.nombre}</h4>
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
                        className="p-2 bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white rounded-xl transition-all shadow-[0_0_10px_rgba(79,70,229,0)] hover:shadow-[0_0_15px_rgba(79,70,229,0.4)] active:scale-95 border border-indigo-600/20 hover:border-transparent"
                      >
                        <Plus size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              </GlassCard>
            ))
          ) : (
            <div className="col-span-full py-16 text-center card-premium rounded-3xl border border-dashed border-slate-300 dark:border-[#334155]">
              <PackageCheck size={48} className="mx-auto mb-4 opacity-10 text-slate-400" />
              <p className="text-slate-500 font-medium">No se encontraron productos con estos filtros.</p>
            </div>
          )}
        </div>
      </div>

      {/* Sidebar Summary */}
      <div className="lg:col-span-4">
        <div className="sticky top-8 space-y-6">
          <GlassCard className="border border-slate-200 dark:border-[#334155] shadow-2xl flex flex-col min-h-[500px]">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-indigo-500/20 rounded-xl">
                  <ShoppingCart className="text-indigo-400" size={24} />
                </div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                  {editingOrder ? 'Editando' : 'Nuevo Pedido'}
                </h3>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Refs</p>
                <p className="text-xl font-bold text-indigo-400">{cartItems.length}</p>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-[#1e293b] rounded-2xl p-4 mb-6 space-y-4 border border-slate-200 dark:border-[#334155]">
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-700 dark:text-slate-200 py-1">
                  {activeContextName}
                </p>
              </div>
              <div className="h-px bg-slate-200 dark:bg-[#334155] w-full"></div>
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <Layers size={12} className="text-violet-400" />
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Contexto Técnico</span>
                </div>
                <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">
                  {orderMode === 'CATEGORY' ? activeContextName : `${includedCategoriesCount} categorías incluidas`}
                </p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3 mb-8">
              {cartItems.map(({ product, qty }) => (
                <div key={product.id} className="flex items-center justify-between p-2.5 rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-[#334155] group hover:bg-slate-50 dark:hover:bg-[#1e293b] transition-all">
                  <div className="min-w-0 flex-1 mr-3">
                    <p className="text-xs font-bold truncate text-slate-700 dark:text-slate-200">{product.nombre}</p>
                    <p className="text-xs text-slate-500 font-mono uppercase">{product.sku}</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center bg-slate-100 dark:bg-black/30 rounded-lg px-1.5 py-0.5 border border-slate-200 dark:border-white/5">
                      <button onClick={() => updateCartQty(product.id, qty - 1)} className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-slate-900 dark:hover:text-white">-</button>
                      <span className="w-6 text-center text-xs font-bold text-indigo-400">{qty}</span>
                      <button onClick={() => updateCartQty(product.id, qty + 1)} className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-slate-900 dark:hover:text-white">+</button>
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
              onClick={handleSaveOrder}
              disabled={cartItems.length === 0}
              className={`w-full py-4 rounded-2xl flex items-center justify-center space-x-3 font-bold transition-all shadow-lg group border ${cartItems.length === 0
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed border-slate-200 dark:border-white/5'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white border-transparent shadow-emerald-600/30 active:scale-[0.98]'
                }`}
            >
              <Save size={18} className={cartItems.length > 0 ? 'group-hover:scale-110 transition-transform' : ''} />
              <span>{editingOrder ? 'Guardar Cambios' : 'Guardar Pedido'}</span>
            </button>
          </GlassCard>
        </div>
      </div>
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Eliminar Pedido"
        footer={
          <>
            <button
              onClick={() => setDeleteModalOpen(false)}
              className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={confirmDeleteOrder}
              className="px-4 py-2 text-sm font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-lg shadow-lg shadow-rose-500/30 transition-all"
            >
              Confirmar Eliminar
            </button>
          </>
        }
      >
        <p>
          ¿Estás seguro de que deseas eliminar este pedido?
          <br />
          <span className="text-sm text-slate-400 mt-2 block">
            Proveedor: <strong className="text-slate-600 dark:text-slate-200">{orderToDelete?.proveedor?.nombre}</strong>
          </span>
        </p>
      </Modal>
    </div >
  );
};

export default Orders;
