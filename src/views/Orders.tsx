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
import XLSX from 'xlsx-js-style';
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
      setPendingOrders(orders.filter(o => o.estado === 'Pendiente')); // Show only draftsafts

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

  const handleSendToAudit = async (order: Pedido) => {
    try {
      setLoading(true);
      await repository.updatePedido(order.id, { estado: 'En Camino' });
      addToast("Pedido enviado a auditoría (En Camino).", 'success');
      loadData(); // Refresh list
    } catch (error) {
      console.error("Error sending order to audit:", error);
      addToast("Error al enviar el pedido.", 'error');
    } finally {
      setLoading(false);
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
      // Check if product is directly in category OR if product's category is a child of selected category
      const productCat = categories.find(c => c.id === p.subcategoria_id);
      matchesContext = p.subcategoria_id === selectedCategory || productCat?.parent_id === selectedCategory;
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

  const handleSaveOrder = async (stayOpen: boolean = false) => {
    if (cartItems.length === 0) return;

    try {
      if (editingOrder) {
        // UPDATE EXISTING ORDER
        await repository.updatePedido(editingOrder.id, {
          total_items: cartItems.length,
          // Update status if needed, or keep previous
        });

        // Delta for items
        const existingItemMap = new Map<string, PedidoItem>(originalOrderItems.map(i => [i.producto_id, i]));
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

        addToast("Borrador actualizado exitosamente.", 'success');

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
        addToast(`Borrador #${newPedido.id.slice(0, 8)} guardado.`, 'success');

        // If putting into edit mode after creation, we'd need more logic, 
        // but for now simple creation flow:
        if (stayOpen) {
          // To keep editing a NEWLY created order, we would need to switch to EDIT mode.
          // For simplicity in this iteration, 'stayOpen' on NEW orders might just reset/notify, 
          // OR correctly load the new order. Let's load it to allow continued editing.
          await loadOrderForEditing(newPedido);
          return;
        }
      }

      if (!stayOpen) {
        // Cleanup
        setCart({});
        setEditingOrder(null);
        setOriginalOrderItems([]);
        loadData(); // Refresh list
        setViewMode('LIST');
      } else {
        // If staying open (and was already editing), just refresh items to sync IDs if needed?
        // Actually, for "Save Progress", we might not need to re-fetch if we trust local state,
        // but re-fetching ensures we have DB IDs for items.
        if (editingOrder) {
          // Refresh the items to get their IDs if they were new
          const items = await repository.getPedidoItems(editingOrder.id);
          setOriginalOrderItems(items);
        }
      }

    } catch (error) {
      console.error("Error saving order:", error);
      addToast("Error al guardar el borrador.", 'error');
    }
  };

  const handleDownloadExcel = async (order: Pedido) => {
    try {
      setLoading(true);
      const items = await repository.getPedidoItems(order.id);

      // Filename/Title based on Brand
      const firstBrand = items[0]?.producto?.marca?.nombre?.toUpperCase() || 'GENERAL';
      const cleanBrand = firstBrand.replace(/[^a-zA-Z0-9ñÑ]/g, '');
      const title = `PEDIDOS ${firstBrand}`;

      const headers = ['REFERENCIA', 'PRODUCTO / VEHÍCULO', 'MARCA', 'CATEGORÍA', 'SUBCATEGORÍA', 'CANTIDAD'];

      const rows = items.map(item => {
        // Resolve Category Hierarchy
        const subCat = categories.find(c => c.id === item.producto?.subcategoria_id);
        const parentCat = subCat?.parent_id
          ? categories.find(c => c.id === subCat.parent_id)
          : (subCat?.parent_id === null ? subCat : undefined);

        const categoryName = parentCat?.name || (subCat?.parent_id ? 'Desconocida' : subCat?.name);
        const subCategoryName = parentCat ? subCat?.name : '';

        return [
          item.producto?.sku,
          item.producto?.nombre,
          item.producto?.marca?.nombre,
          categoryName,
          subCategoryName,
          item.cantidad_pedida
        ];
      });

      // Calculate Totals
      const totalQuantity = items.reduce((sum, item) => sum + item.cantidad_pedida, 0);

      const ws_data = [
        [title],
        headers,
        ...rows,
        ['', '', '', '', 'TOTAL', totalQuantity] // Totals Row
      ];

      const ws = XLSX.utils.aoa_to_sheet(ws_data);

      // Merge Title Cell
      if (!ws['!merges']) ws['!merges'] = [];
      ws['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } });

      // Configure Freeze Panes (Freeze top 2 rows)
      const splitRow = 2;
      ws['!freeze'] = { xSplit: 0, ySplit: splitRow, topLeftCell: `A${splitRow + 1}`, activePane: 'bottomLeft', state: 'frozen' };

      // Configure AutoFilter (Applies to headers and data, excluding totals)
      const range = XLSX.utils.decode_range(ws['!ref']!);
      ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 1, c: 0 }, e: { r: range.e.r - 1, c: 5 } }) };

      // Styles
      const borderStyle = {
        top: { style: "thin", color: { rgb: "000000" } },
        bottom: { style: "thin", color: { rgb: "000000" } },
        left: { style: "thin", color: { rgb: "000000" } },
        right: { style: "thin", color: { rgb: "000000" } }
      };

      const titleStyle = {
        font: { name: "Calibri", sz: 16, bold: true, color: { rgb: "4472C4" } },
        alignment: { horizontal: "center", vertical: "center" },
        fill: { fgColor: { rgb: "FFFFFF" } }
      };

      const headerStyle = {
        fill: { fgColor: { rgb: "F8CBAD" } }, // Salmon
        font: { name: "Calibri", sz: 11, bold: true, color: { rgb: "000000" } },
        alignment: { horizontal: "center", vertical: "center" },
        border: borderStyle
      };

      const cellStyle = {
        font: { name: "Calibri", sz: 11 },
        alignment: { horizontal: "center", vertical: "center" },
        border: borderStyle
      };

      const quantityCellStyle = {
        fill: { fgColor: { rgb: "BDD7EE" } }, // Light Blue
        font: { name: "Calibri", sz: 11, bold: true },
        alignment: { horizontal: "center", vertical: "center" },
        border: borderStyle
      };

      const totalLabelStyle = {
        fill: { fgColor: { rgb: "E2E8F0" } }, // Light Slate
        font: { name: "Calibri", sz: 12, bold: true },
        alignment: { horizontal: "right", vertical: "center" },
        border: borderStyle
      };

      const totalValueStyle = {
        fill: { fgColor: { rgb: "BDD7EE" } }, // Blue like qty
        font: { name: "Calibri", sz: 12, bold: true },
        alignment: { horizontal: "center", vertical: "center" },
        border: borderStyle
      };

      // Apply Styles
      const finalRange = XLSX.utils.decode_range(ws['!ref']!);

      for (let R = finalRange.s.r; R <= finalRange.e.r; ++R) {
        for (let C = finalRange.s.c; C <= finalRange.e.c; ++C) {
          const cell_address = XLSX.utils.encode_cell({ r: R, c: C });
          if (!ws[cell_address]) continue;

          // Title
          if (R === 0) ws[cell_address].s = titleStyle;
          // Headers
          else if (R === 1) ws[cell_address].s = headerStyle;
          // Totals Row
          else if (R === finalRange.e.r) {
            if (C === 4) ws[cell_address].s = totalLabelStyle;
            else if (C === 5) ws[cell_address].s = totalValueStyle;
            else ws[cell_address].s = cellStyle;
          }
          // Data
          else {
            if (C === 5) { // Cantidad Column
              ws[cell_address].s = quantityCellStyle;
            } else {
              ws[cell_address].s = cellStyle;
            }
          }
        }
      }

      // Column Widths
      ws['!cols'] = [
        { wch: 15 }, // Ref
        { wch: 40 }, // Prod
        { wch: 15 }, // Marca
        { wch: 20 }, // Cat
        { wch: 20 }, // Sub
        { wch: 12 }, // Cant
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Pedido");

      XLSX.writeFile(wb, `Pedido_${cleanBrand}_${order.id.slice(0, 8)}.xlsx`);
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
        <Loader2 className="animate-spin text-blue-500" size={48} />
        <p className="text-slate-400 animate-pulse">Cargando gestión de pedidos...</p>
      </div>
    );
  }

  // - LIST VIEW -
  if (viewMode === 'LIST') {
    return (
      <div className="space-y-6 animate-in fade-in duration-500 pb-10">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold">Borradores de Pedido</h2>
            <p className="text-slate-400">Tus pedidos en preparación. Edítalos antes de enviar.</p>
          </div>
          {/* Hide New Order button if we are strictly in "Pending List" mode from menu, 
                      or keep it to allow jumping modes. Let's allowing jumping for flexibility. */}
          <button
            onClick={() => setViewMode('CREATE')}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-bold shadow-lg shadow-blue-500/30 flex items-center space-x-2 transition-all active:scale-95"
          >
            <Plus size={20} />
            <span>Nuevo Pedido</span>
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {pendingOrders.map(order => (
            <GlassCard key={order.id} className="flex flex-col md:flex-row md:items-center justify-between p-6 group hover:border-blue-500/30 transition-all">
              <div className="flex items-center space-x-4 mb-4 md:mb-0">
                <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center">
                  <Truck className="text-orange-500" size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-800 dark:text-white">
                    {(() => {
                      const brands = Array.from(new Set(order.items?.map(i => i.producto?.marca?.nombre).filter(Boolean)));
                      return brands.length > 0 ? brands.join(', ') : (order.proveedor?.nombre || 'Proveedor Desconocido');
                    })()}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">ID: {order.id.slice(0, 8)} • {new Date(order.fecha_creacion).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="flex items-center space-x-6">
                <div className="text-right">
                  <p className="text-[10px] uppercase font-black text-slate-500 tracking-wider">Items</p>
                  <p className="text-xl font-bold text-blue-400">{order.total_items}</p>
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
                    onClick={() => handleSendToAudit(order)}
                    className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-500/10 rounded-lg transition-colors"
                    title="Enviar a Auditoría (En Camino)"
                  >
                    <Send size={20} />
                  </button>
                  <button
                    onClick={() => loadOrderForEditing(order)}
                    className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
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

  // - CREATE / EDIT VIEW -
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-500 pb-10">
      <div className="lg:col-span-8 space-y-6">

        {/* Header & Toggle */}
        {/* Header & Toggle */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex items-center space-x-3">
            {/* Show Back button if editing OR if we navigated from List mode */}
            {(editingOrder || initialViewMode === 'LIST') && (
              <button onClick={cancelEdit} className="p-2 -ml-2 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-colors">
                <ArrowLeft size={24} />
              </button>
            )}
            <div>
              <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400">
                {editingOrder ? 'Editar Pedido' : 'Nuevo Pedido'}
              </h2>
              <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">
                {editingOrder ? `Editando pedido #${editingOrder.id.slice(0, 8)}` : 'Genera pedidos por Proveedor o Categoría.'}
              </p>
            </div>
          </div>

          {!editingOrder && (
            <div className="flex bg-slate-100 dark:bg-slate-800/50 p-1.5 rounded-2xl border border-slate-200 dark:border-white/5">
              <button
                onClick={() => setOrderMode('PROVIDER')}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 ${orderMode === 'PROVIDER' ? 'bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-md ring-1 ring-black/5 dark:ring-0 scale-105' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
              >
                Por Proveedor
              </button>
              <button
                onClick={() => setOrderMode('CATEGORY')}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 ${orderMode === 'CATEGORY' ? 'bg-white dark:bg-violet-600 text-violet-600 dark:text-white shadow-md ring-1 ring-black/5 dark:ring-0 scale-105' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
              >
                Por Categoría
              </button>
            </div>
          )}
        </header>

        {/* Dynamic Selectors */}
        <div className="space-y-4">
          {orderMode === 'PROVIDER' && (
            <GlassCard noPadding className="rounded-2xl border-slate-200 dark:border-[#334155] animate-in fade-in slide-in-from-left-4 duration-300 overflow-hidden">
              <div className="p-1.5 bg-slate-50/50 dark:bg-white/5 border-b border-slate-100 dark:border-white/5 flex items-center justify-between px-4 py-3">
                <div className="flex items-center space-x-3">
                  <div className="p-1.5 bg-gradient-to-br from-blue-500/10 to-blue-600/10 rounded-lg border border-blue-100 dark:border-blue-500/20">
                    <Truck size={14} className="text-blue-500" />
                  </div>
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Seleccionar Proveedor</span>
                </div>
                <span className="text-[10px] text-blue-500 font-bold bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 rounded-full uppercase border border-blue-100 dark:border-blue-500/20">
                  {selectedProvFilter ? proveedores.find(p => p.id === selectedProvFilter)?.nombre : 'Ninguno'}
                </span>
              </div>
              <div className="p-4 flex flex-wrap gap-2">
                {proveedores.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedProvFilter(p.id)}
                    disabled={!!editingOrder && editingOrder.proveedor_id !== p.id}
                    className={`px-4 py-2 rounded-xl text-[11px] font-bold transition-all border shadow-sm ${selectedProvFilter === p.id
                      ? 'bg-blue-600 text-white border-blue-500 shadow-blue-500/30 ring-2 ring-blue-500/20'
                      : 'bg-white dark:bg-[#0f172a] border-slate-200 dark:border-[#334155] text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#1e293b] hover:border-slate-300 dark:hover:border-slate-500'} 
                      ${editingOrder && editingOrder.proveedor_id !== p.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {p.nombre.split(' ')[0]}
                  </button>
                ))}
              </div>
            </GlassCard>
          )}

          {orderMode === 'CATEGORY' && (
            <GlassCard noPadding className="rounded-2xl border-slate-200 dark:border-[#334155] animate-in fade-in slide-in-from-right-4 duration-300 overflow-hidden">
              <div className="p-1.5 bg-slate-50/50 dark:bg-white/5 border-b border-slate-100 dark:border-white/5 flex items-center justify-between px-4 py-3">
                <div className="flex items-center space-x-3">
                  <div className="p-1.5 bg-gradient-to-br from-violet-500/10 to-violet-600/10 rounded-lg border border-violet-100 dark:border-violet-500/20">
                    <Layers size={14} className="text-violet-500" />
                  </div>
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Seleccionar Categoría</span>
                </div>
                <span className="text-[10px] text-violet-500 font-bold bg-violet-50 dark:bg-violet-500/10 px-2 py-0.5 rounded-full uppercase border border-violet-100 dark:border-violet-500/20">
                  {selectedCategory ? categories.find(c => c.id === selectedCategory)?.name : 'Ninguna'}
                </span>
              </div>
              <div className="p-4">
                <div className="flex flex-wrap gap-2 mb-4">
                  {categories.filter(c => !c.parent_id).map(cat => {
                    const isActive = selectedCategory === cat.id || (categories.find(c => c.id === selectedCategory)?.parent_id === cat.id);
                    return (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`px-4 py-2 rounded-xl text-[11px] font-bold transition-all border shadow-sm ${isActive
                          ? 'bg-violet-600 text-white border-violet-500 shadow-violet-500/30 ring-2 ring-violet-500/20'
                          : 'bg-white dark:bg-[#0f172a] border-slate-200 dark:border-[#334155] text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#1e293b] hover:border-slate-300 dark:hover:border-slate-500'}`}
                      >
                        {cat.name}
                      </button>
                    )
                  })}
                </div>

                {/* Subcategories */}
                {(() => {
                  const current = categories.find(c => c.id === selectedCategory);
                  const parentId = current?.parent_id || (current && !current.parent_id ? current.id : null);
                  const subs = parentId ? categories.filter(c => c.parent_id === parentId) : [];

                  if (subs.length > 0) {
                    return (
                      <div className="pt-3 border-t border-slate-100 dark:border-[#334155] animate-in fade-in slide-in-from-top-1">
                        <div className="flex flex-wrap gap-2 items-center">
                          <span className="text-[10px] font-bold text-slate-400 mr-2 uppercase tracking-wider">Subcategorías:</span>
                          <button
                            onClick={() => setSelectedCategory(parentId!)}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${selectedCategory === parentId
                              ? 'bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-300 border-violet-200 dark:border-violet-500/30'
                              : 'bg-transparent text-slate-500 border-slate-200 dark:border-slate-700 hover:bg-slate-100/50'}`}
                          >
                            Todo
                          </button>
                          {subs.map(sub => (
                            <button
                              key={sub.id}
                              onClick={() => setSelectedCategory(sub.id)}
                              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${selectedCategory === sub.id
                                ? 'bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-300 border-violet-200 dark:border-violet-500/30'
                                : 'bg-transparent text-slate-500 border-slate-200 dark:border-slate-700 hover:bg-slate-100/50'}`}
                            >
                              {sub.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )
                  }
                  return null;
                })()}
              </div>
            </GlassCard>
          )}
        </div>

        {/* Search */}
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={20} />
          <input
            type="text"
            placeholder="Escribe SKU o nombre para buscar..."
            className="w-full pl-12 pr-4 py-4 input-premium rounded-full focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 focus:outline-none transition-all placeholder:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#334155] shadow-inner"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.length > 0 ? (
            filtered.map(p => (
              <GlassCard key={p.id} noPadding className="hover:border-blue-500/30 transition-all duration-300 group overflow-hidden">
                <div className="p-3 flex items-start gap-4 relative">
                  <div className="relative shrink-0">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/5 to-indigo-500/5 dark:from-blue-500/10 dark:to-indigo-500/10 flex items-center justify-center border border-blue-100 dark:border-blue-500/10 group-hover:scale-105 transition-transform duration-300">
                      <Package size={24} className="text-blue-500/80 dark:text-blue-400" />
                    </div>
                    {p.is_high_rotation && (
                      <div className="absolute -top-1 -right-1 flex h-4 w-4">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500 border-2 border-white dark:border-[#1e293b]"></span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col h-full justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-1">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-white/5 text-slate-500 uppercase tracking-wider">
                          {p.marca?.nombre}
                        </span>
                        {p.stock_actual <= p.stock_minimo && (
                          <span className="text-[10px] font-bold text-rose-500 animate-pulse flex items-center">
                            <ArrowLeft size={10} className="mr-0.5 rotate-180" /> Crítico
                          </span>
                        )}
                      </div>
                      <h4 className="font-bold text-slate-800 dark:text-slate-100 truncate text-sm leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {p.nombre}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">{p.sku}</p>
                    </div>

                    <div className="flex justify-between items-end mt-3">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${p.stock_actual <= p.stock_minimo
                        ? 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20'
                        : 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
                        }`}>
                        Stock: {p.stock_actual}
                      </span>

                      <button
                        onClick={() => addToCart(p.id)}
                        className="h-8 w-8 flex items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-600/20 hover:shadow-blue-600/40 hover:scale-110 active:scale-95 transition-all duration-300"
                      >
                        <Plus size={16} strokeWidth={3} />
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
            <div className="flex items-center justify-between mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-gradient-to-br from-blue-500/10 to-indigo-600/10 rounded-xl border border-blue-100 dark:border-blue-500/20">
                  <ShoppingCart className="text-blue-600 dark:text-blue-400" size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white leading-tight">
                    {editingOrder ? 'Editando' : 'Nuevo Pedido'}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-medium">Resumen de items</p>
                </div>
              </div>
              <div className="text-right bg-slate-50 dark:bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-slate-700">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Referencias</p>
                <p className="text-lg font-bold text-blue-600 dark:text-blue-400 leading-none">{cartItems.length}</p>
              </div>
            </div>

            <div className="bg-slate-50/50 dark:bg-[#1e293b]/30 rounded-2xl p-4 mb-6 space-y-3 border border-slate-200/60 dark:border-[#334155]">
              <div>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Contexto Actual</span>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  {activeContextName}
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200/60 dark:border-slate-700/50">
                <Layers size={14} className="text-violet-500/70" />
                <span className="font-medium">
                  {orderMode === 'CATEGORY' ? 'Filtrado por categoría' : `${includedCategoriesCount} categorías incluidas`}
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-2 mb-6">
              {cartItems.map(({ product, qty }) => (
                <div key={product.id} className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-[#0f172a] border border-slate-100 dark:border-[#334155] group hover:border-blue-200 dark:hover:border-blue-500/30 transition-all shadow-sm">
                  <div className="min-w-0 flex-1 mr-3">
                    <p className="text-xs font-bold truncate text-slate-700 dark:text-slate-200">{product.nombre}</p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                      <span className="text-[9px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-[1px] rounded border border-slate-200 dark:border-slate-700">{product.marca?.nombre || 'Gen'}</span>
                      {product.subcategoria_id && (
                        <span className="text-[9px] font-medium text-slate-500 bg-slate-50 dark:bg-slate-800/50 px-1.5 py-[1px] rounded border border-slate-100 dark:border-slate-800">
                          {categories.find(c => c.id === product.subcategoria_id)?.name}
                        </span>
                      )}
                      <span className="text-[9px] text-slate-400 font-mono border-l border-slate-200 pl-1.5">{product.sku}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center bg-slate-50 dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700/50">
                      <button onClick={() => updateCartQty(product.id, qty - 1)} className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded transition-colors text-xs font-bold">-</button>
                      <span className="w-8 text-center text-xs font-bold text-slate-700 dark:text-slate-200">{qty}</span>
                      <button onClick={() => updateCartQty(product.id, qty + 1)} className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded transition-colors text-xs font-bold">+</button>
                    </div>
                    <button onClick={() => removeFromCart(product.id)} className="w-6 h-6 flex items-center justify-center text-slate-300 hover:text-rose-500 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
              {cartItems.length === 0 && (
                <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl bg-slate-50/50 dark:bg-slate-800/20">
                  <ShoppingCart size={32} className="mb-3 text-slate-300 dark:text-slate-600" />
                  <p className="text-xs font-bold text-slate-400 dark:text-slate-500">Carrito Vacío</p>
                  <p className="text-[10px] text-slate-400 text-center px-8 mt-1">Selecciona productos para comenzar</p>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => handleSaveOrder(true)}
                className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all border flex items-center justify-center ${cartItems.length === 0
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed border-slate-200 dark:border-white/5'
                  : 'bg-white dark:bg-transparent text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-white/5 shadow-sm hover:shadow-md'
                  }`}
              >
                <span>Guardar Progreso</span>
              </button>

              <button
                onClick={() => handleSaveOrder(false)}
                className={`flex-[1.5] py-3 rounded-xl text-xs flex items-center justify-center space-x-2 font-bold transition-all shadow-lg group border ${cartItems.length === 0
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed border-slate-200 dark:border-white/5 shadow-none'
                  : 'bg-blue-600 hover:bg-blue-500 text-white border-transparent shadow-blue-600/20 hover:shadow-blue-600/40 active:scale-[0.98]'
                  }`}
              >
                <Save size={16} className={cartItems.length > 0 ? 'group-hover:scale-110 transition-transform' : ''} />
                <span>{editingOrder ? 'Terminar Edición' : 'Crear Pedido'}</span>
              </button>
            </div>
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

