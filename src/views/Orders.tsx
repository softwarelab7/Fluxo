import React, { useState, useMemo, useEffect } from 'react';
import GlassCard from '../components/GlassCard';
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Save,
  Truck,
  ChevronDown,
  ChevronRight,
  Filter,
  X,
  FileSpreadsheet,
  ArrowLeft,
  Loader2,
  Send,
  Edit,
  PackageCheck
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
  const [orderTitle, setOrderTitle] = useState('');

  // Context States
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedProvFilter, setSelectedProvFilter] = useState<string | null>(null);
  // Track expanded categories for accordion behavior
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const [cart, setCart] = useState<Record<string, number>>({});
  const [showMobileCart, setShowMobileCart] = useState(false);

  // Preview State
  const [previewOrder, setPreviewOrder] = useState<Pedido | null>(null);
  const [previewItems, setPreviewItems] = useState<PedidoItem[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  // Effect: Auto-expand parent category when a subcategory is selected
  useEffect(() => {
    if (selectedCategory && categories.length > 0) {
      const cat = categories.find(c => c.id === selectedCategory);
      if (cat && cat.parent_id) {
        setExpandedCategories(prev => {
          const next = new Set(prev);
          next.add(cat.parent_id);
          return next;
        });
      }
    }
  }, [selectedCategory, categories]);

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
      setProveedores(provs.map(p => ({ ...p, is_active: p.is_active ?? true })));
      setProducts(prods);
      setPendingOrders(orders.filter(o => o.estado === 'Pendiente')); // Show only draftsafts

      // Init default filters
      const activeProvs = provs.filter(p => p.is_active !== false);
      if (activeProvs.length > 0) setSelectedProvFilter(activeProvs[0].id);
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
      setOrderTitle(order.titulo || ''); // Load title
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
      if (proveedores.length > 0 && !selectedProvFilter) {
        const firstActive = proveedores.find(p => p.is_active !== false);
        if (firstActive) setSelectedProvFilter(firstActive.id);
      }
      // setCart({}); // Cart preserved
    } else {
      setSelectedProvFilter(null);
      if (categories.length > 0 && !selectedCategory) setSelectedCategory(categories[0].id);
      // setCart({}); // Cart preserved
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
    setOrderTitle(''); // Reset title
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

    // If searching, ignore context (Global Search)
    if (searchTerm.trim() !== '') {
      return matchesSearch;
    }

    let matchesContext = false;
    if (orderMode === 'PROVIDER') {
      matchesContext = p.preferred_supplier_id === selectedProvFilter;
    } else {
      // Check if product is directly in category OR if product's category is a child of selected category
      const productCat = categories.find(c => c.id === p.subcategoria_id);
      matchesContext = p.subcategoria_id === selectedCategory || productCat?.parent_id === selectedCategory;
    }

    return matchesContext;
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

    if (!orderTitle.trim()) {
      addToast("El título del pedido es obligatorio.", 'error');
      return;
    }

    try {
      if (editingOrder) {
        // UPDATE EXISTING ORDER
        await repository.updatePedido(editingOrder.id, {
          total_items: cartItems.length,
          titulo: orderTitle // Update Title
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
          titulo: orderTitle, // Save Title
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
        setOrderTitle(''); // Reset title
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

  const handlePreviewOrder = async (order: Pedido) => {
    setPreviewOrder(order);
    setPreviewLoading(true);
    try {
      const items = await repository.getPedidoItems(order.id);
      setPreviewItems(items);
    } catch (error) {
      console.error("Error creating preview:", error);
      addToast("Error al cargar detalles del pedido.", 'error');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleDownloadExcel = async (order: Pedido) => {
    try {
      setLoading(true);
      const items = await repository.getPedidoItems(order.id);

      // Filename/Title based on Brand or custom Title
      const firstBrand = items[0]?.producto?.marca?.nombre?.toUpperCase() || 'GENERAL';
      const cleanBrand = firstBrand.replace(/[^a-zA-Z0-9ñÑ]/g, '');

      // Use custom title if available, otherwise fallback to standard naming
      const title = order.titulo?.toUpperCase() || `PEDIDOS ${firstBrand}`;

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
            <GlassCard
              key={order.id}
              className="flex flex-col md:flex-row md:items-center justify-between p-6 group hover:border-blue-500/30 transition-all cursor-pointer"
              onClick={() => handlePreviewOrder(order)}
            >
              <div className="flex items-center space-x-4 mb-4 md:mb-0">
                <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center">
                  <Truck className="text-orange-500" size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-800 dark:text-white">
                    {order.titulo || (() => {
                      const brands = Array.from(new Set(order.items?.map(i => i.producto?.marca?.nombre).filter(Boolean)));
                      return brands.length > 0 ? brands.join(', ') : (order.proveedor?.nombre || 'Proveedor Desconocido');
                    })()}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">ID: {order.id.slice(0, 8)} • {new Date(order.fecha_creacion).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="flex items-center space-x-6" onClick={(e) => e.stopPropagation()}>
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

        {/* Preview Modal */}
        <Modal
          isOpen={!!previewOrder}
          onClose={() => setPreviewOrder(null)}
          title={previewOrder?.titulo || 'Detalles del Pedido'}
          footer={
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setPreviewOrder(null)}
                className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 transition-colors"
              >
                Cerrar
              </button>
              <button
                onClick={() => {
                  if (previewOrder) {
                    setPreviewOrder(null);
                    loadOrderForEditing(previewOrder);
                  }
                }}
                className="px-4 py-2 text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow-lg shadow-blue-500/30 transition-all flex items-center gap-2"
              >
                <Edit size={16} />
                Editar Pedido
              </button>
            </div>
          }
        >
          {previewLoading ? (
            <div className="flex flex-col items-center justify-center py-10 space-y-4">
              <Loader2 className="animate-spin text-blue-500" size={32} />
              <p className="text-slate-400 text-sm">Cargando productos...</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                  <p className="text-[10px] uppercase font-black text-slate-400">Proveedor / Contexto</p>
                  <p className="font-bold text-slate-700 dark:text-slate-200">
                    {previewOrder?.proveedor?.nombre || 'N/A'}
                  </p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                  <p className="text-[10px] uppercase font-black text-slate-400">Total Items</p>
                  <p className="font-bold text-blue-500 text-lg">
                    {previewOrder?.total_items}
                  </p>
                </div>
              </div>

              <div className="max-h-[50vh] overflow-y-auto custom-scrollbar border rounded-xl border-slate-100 dark:border-slate-700">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-500">Producto</th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-slate-500">Cant.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {previewItems.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-700 dark:text-slate-200">{item.producto?.nombre}</div>
                          <div className="text-xs text-slate-400 font-mono mt-0.5">
                            {item.producto?.sku} • {item.producto?.marca?.nombre}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-slate-800 dark:text-white bg-slate-50/50 dark:bg-white/5">
                          {item.cantidad_pedida}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Modal>
      </div >
    );
  }

  // - CREATE / EDIT VIEW -
  return (
    <div className="lg:col-span-12 flex flex-col h-auto min-h-0 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* New Unified Toolbar */}
      {!editingOrder && (
        <div className="bg-white dark:bg-[#1e293b] p-3 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between mb-6 gap-4 sticky top-0 z-30">

          {/* Left: Mode Switcher */}
          <div className="flex p-1 bg-slate-100 dark:bg-slate-800/50 rounded-xl">
            <button
              onClick={() => setOrderMode('PROVIDER')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${orderMode === 'PROVIDER' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Proveedores
            </button>
            <button
              onClick={() => setOrderMode('CATEGORY')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${orderMode === 'CATEGORY' ? 'bg-white dark:bg-slate-700 text-violet-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Categorías
            </button>
          </div>

          {/* Center: Title Input */}
          <div className="relative group w-full md:w-96">
            <input
              type="text"
              placeholder="Título del Pedido *"
              className={`w-full text-center px-4 py-2 bg-transparent border-b-2 ${!orderTitle ? 'border-slate-200' : 'border-blue-500'} focus:border-blue-600 outline-none transition-all font-bold text-slate-700 dark:text-slate-200 placeholder:text-slate-300`}
              value={orderTitle}
              onChange={e => setOrderTitle(e.target.value)}
            />
          </div>

          {/* Right: Search */}
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Buscar..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Editing Header */}
      {
        editingOrder && (
          <div className="flex items-center justify-between mb-6 border-b border-slate-200 dark:border-white/5 pb-4">
            <div className="flex items-center space-x-4">
              <button onClick={cancelEdit} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-colors">
                <ArrowLeft size={20} className="text-slate-500" />
              </button>
              <div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-white">Editando Pedido #{editingOrder.id.slice(0, 6)}</h2>
                <p className="text-xs text-slate-400">Modifica las cantidades o agrega nuevos productos</p>
              </div>
            </div>
            {/* Title Input Edit & Search */}
            <div className="flex items-center gap-4">
              <div className="relative w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Buscar producto..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="w-64">
                <input
                  type="text"
                  placeholder="Título del Pedido *"
                  className={`w-full px-4 py-2 bg-white dark:bg-[#1e293b] border ${!orderTitle ? 'border-red-300' : 'border-slate-200'} dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all font-bold text-slate-700 dark:text-slate-200`}
                  value={orderTitle}
                  onChange={e => setOrderTitle(e.target.value)}
                />
              </div>
            </div>
          </div>
        )
      }

      <div className="flex-1 grid grid-cols-12 gap-6 min-h-0">

        {/* LEFT SIDEBAR - FILTERS */}
        <div className="col-span-2 hidden lg:flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar pb-20 animate-in slide-in-from-left-6 duration-500">

          {/* List */}
          <div className="space-y-1">
            <h3 className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-3 pl-2">
              {orderMode === 'PROVIDER' ? 'Proveedores' : 'Categorías'}
            </h3>

            {orderMode === 'PROVIDER' ? (
              proveedores
                .filter(p => (p.is_active ?? true) || (editingOrder && editingOrder.proveedor_id === p.id))
                .map(p => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedProvFilter(p.id)}
                    disabled={!!editingOrder && editingOrder.proveedor_id !== p.id}
                    className={`w-full text-left pl-4 pr-3 py-3 text-xs font-bold transition-all flex items-center justify-between group relative ${selectedProvFilter === p.id
                      ? 'text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/10'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5'
                      } ${editingOrder && editingOrder.proveedor_id !== p.id ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    {selectedProvFilter === p.id && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600 rounded-r-lg"></div>
                    )}
                    <span className="truncate">{p.nombre}</span>
                  </button>
                ))
            ) : (
              // Categories Tree
              <div className="space-y-2">
                {categories.filter(c => !c.parent_id).map(cat => {
                  const isSelected = selectedCategory === cat.id;
                  const hasSubs = categories.some(sub => sub.parent_id === cat.id);
                  const isExpanded = expandedCategories.has(cat.id);
                  const isParentOfSelected = categories.find(c => c.id === selectedCategory)?.parent_id === cat.id;

                  const toggleExpand = (e: React.MouseEvent, catId: string) => {
                    e.stopPropagation();
                    setExpandedCategories(prev => {
                      const next = new Set(prev);
                      if (next.has(catId)) next.delete(catId);
                      else next.add(catId);
                      return next;
                    });
                  };

                  return (
                    <div key={cat.id}>
                      <div className={`flex items-center w-full rounded-lg transition-all group ${(isSelected || isParentOfSelected)
                        ? 'bg-violet-50 dark:bg-violet-600/10 border border-violet-200 dark:border-violet-600/20'
                        : 'hover:bg-slate-50 dark:hover:bg-white/5 border border-transparent'
                        }`}>
                        <button
                          onClick={(e) => {
                            setSelectedCategory(cat.id);
                            if (hasSubs) toggleExpand(e, cat.id);
                          }}
                          className={`flex-1 text-left px-3 py-2.5 text-xs font-bold ${(isSelected || isParentOfSelected) ? 'text-violet-600 dark:text-violet-400' : 'text-slate-600 dark:text-slate-400'
                            }`}
                        >
                          {cat.name}
                        </button>

                        {hasSubs && (
                          <button
                            onClick={(e) => toggleExpand(e, cat.id)}
                            className={`p-2 mr-1 rounded-md transition-colors ${(isSelected || isParentOfSelected)
                              ? 'text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-500/20'
                              : 'text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10'
                              }`}
                          >
                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </button>
                        )}
                      </div>

                      {/* Subcategories */}
                      {isExpanded && hasSubs && (
                        <div className="ml-3 mt-1 pl-3 border-l-2 border-slate-100 dark:border-slate-800 space-y-1 animate-in slide-in-from-top-1 duration-200">
                          {categories.filter(s => s.parent_id === cat.id).map(sub => (
                            <button
                              key={sub.id}
                              onClick={() => setSelectedCategory(sub.id)}
                              className={`w-full text-left px-2 py-1.5 rounded-md text-[11px] font-medium transition-colors ${selectedCategory === sub.id
                                ? 'text-violet-600 bg-violet-50 dark:bg-violet-500/10'
                                : 'text-slate-400 hover:text-slate-600'
                                }`}
                            >
                              {sub.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* MAIN GRID */}
        <div className="col-span-12 lg:col-span-6 flex flex-col min-h-0 animate-in fade-in zoom-in-95 duration-500 delay-100">

          {/* Mobile Cart Toggle FAB */}
          <button
            onClick={() => setShowMobileCart(true)}
            className="lg:hidden fixed bottom-6 right-6 z-40 bg-blue-600 text-white w-14 h-14 rounded-full shadow-xl shadow-blue-600/30 flex items-center justify-center animate-bounce"
          >
            <div className="relative">
              <ShoppingCart size={24} />
              {cartItems.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-blue-600">
                  {cartItems.length}
                </span>
              )}
            </div>
          </button>

          {/* Context Banner */}
          <div className="mb-4 bg-white dark:bg-[#1e293b] p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-800 dark:text-slate-200 text-lg">
                {activeContextName}
              </h3>
              <p className="text-xs text-slate-400">
                {orderMode === 'CATEGORY'
                  ? 'Explorando catálogo'
                  : 'Productos del proveedor'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-lg">
                {filtered.length} Resultados
              </span>
            </div>
          </div>

          <div className="flex-1 min-h-0 pb-24 lg:pb-0">
            {filtered.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                {filtered.map(product => {
                  const inCart = cart[product.id] || 0;
                  const subCategoryName = categories.find(c => c.id === product.subcategoria_id)?.name;

                  return (
                    <div key={product.id} className={`group relative bg-white dark:bg-[#1e293b] p-3 rounded-lg border transition-all duration-200 ${inCart > 0 ? 'border-blue-500 ring-1 ring-blue-500' : 'border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-600'}`}>

                      {/* Top: SKU, Subcat & Brand */}
                      <div className="flex flex-col gap-0.5 mb-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] font-mono text-slate-500 dark:text-slate-400">{product.sku}</span>
                          <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase">{product.marca?.nombre}</span>
                        </div>
                        {subCategoryName && (
                          <span className="text-[8px] font-bold text-violet-500 dark:text-violet-400 uppercase truncate">{subCategoryName}</span>
                        )}
                      </div>

                      {/* Content: Name */}
                      <div className="mb-2 h-8">
                        <h4 className="font-bold text-slate-700 dark:text-slate-200 text-[10px] leading-snug line-clamp-2" title={product.nombre}>
                          {product.nombre}
                        </h4>
                      </div>

                      {/* Footer: Action */}
                      <div className="flex items-center justify-end">
                        {inCart === 0 ? (
                          <button
                            onClick={() => addToCart(product.id)}
                            className="bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-600 dark:bg-slate-800 dark:text-blue-400 dark:hover:bg-blue-600 dark:hover:text-white rounded-md p-1 transition-colors"
                          >
                            <Plus size={14} />
                          </button>
                        ) : (
                          <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 rounded-md p-0.5">
                            <button
                              onClick={() => updateCartQty(product.id, inCart - 1)}
                              className="text-slate-400 hover:text-rose-500 transition-colors p-0.5"
                            >
                              <Minus size={12} />
                            </button>
                            <span className="font-bold text-slate-700 dark:text-white text-[10px] w-4 text-center">{inCart}</span>
                            <button
                              onClick={() => updateCartQty(product.id, inCart + 1)}
                              className="text-slate-400 hover:text-blue-500 transition-colors p-0.5"
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                <Search size={48} className="mb-4 opacity-20" />
                <p>No se encontraron productos</p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT SIDEBAR - CART */}
        {/* Mobile Backdrop */}
        {showMobileCart && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setShowMobileCart(false)}
          />
        )}

        <div className={`
            col-span-4 flex-col pl-2 py-2 transition-transform duration-300
            ${showMobileCart ? 'fixed inset-y-0 right-0 z-50 w-80 bg-white dark:bg-[#0f172a] shadow-2xl p-0 h-full' : 'hidden lg:flex sticky top-0 h-[calc(100vh-2rem)]'}
        `}>

          <div className="flex-1 flex flex-col bg-white dark:bg-[#1e293b] lg:rounded-[2rem] shadow-xl shadow-slate-200/50 dark:shadow-black/20 border border-slate-100 dark:border-slate-800 overflow-hidden h-full">

            {/* Header */}
            <div className="px-6 pt-6 pb-4 bg-slate-50/50 dark:bg-slate-800/20 border-b border-slate-100 dark:border-slate-800/50 flex items-center justify-between">
              <div>
                <div className="flex items-center justify-between mb-1 gap-2">
                  <h3 className="font-black text-slate-800 dark:text-white text-lg tracking-tight flex items-center gap-2">
                    <ShoppingCart size={20} className="text-blue-600 dark:text-blue-400" />
                    Carrito
                  </h3>
                  <span className="bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 text-xs font-black px-2.5 py-1 rounded-full">
                    {cartItems.length}
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-medium pl-1">
                  Resumen de tu pedido actual.
                </p>
              </div>

              {/* Close Button (Mobile Only) */}
              <button
                onClick={() => setShowMobileCart(false)}
                className="lg:hidden p-2 text-slate-400 hover:text-slate-600 bg-slate-100 dark:bg-slate-700 rounded-full"
              >
                <ChevronRight size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3 min-h-0">
              {cartItems.map(({ product, qty }) => {
                const subCategoryName = categories.find(c => c.id === product.subcategoria_id)?.name;
                return (
                  <div key={product.id} className="group flex flex-col bg-white dark:bg-[#0f172a] p-3 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm relative hover:border-blue-200 dark:hover:border-blue-700 transition-colors">

                    {/* Remove Button */}
                    <button
                      onClick={() => removeFromCart(product.id)}
                      className="absolute top-2 right-2 p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors opacity-100 lg:opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={14} />
                    </button>

                    <div className="pr-6 mb-2">
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate leading-snug">{product.nombre}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-[10px] text-slate-400 font-mono">{product.sku}</p>
                        {subCategoryName && (
                          <p className="text-[9px] font-bold text-violet-500 dark:text-violet-400 uppercase truncate max-w-[100px]">{subCategoryName}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{product.marca?.nombre}</span>
                      <div className="flex items-center bg-slate-50 dark:bg-slate-800 rounded-lg p-0.5 border border-slate-100 dark:border-slate-700">
                        <button
                          onClick={() => updateCartQty(product.id, qty - 1)}
                          className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-white dark:hover:bg-slate-700 rounded-md transition-all font-bold text-lg leading-none pb-0.5"
                        >-</button>
                        <span className="text-sm font-black text-slate-700 dark:text-white w-6 text-center tabular-nums">{qty}</span>
                        <button
                          onClick={() => updateCartQty(product.id, qty + 1)}
                          className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-white dark:hover:bg-slate-700 rounded-md transition-all font-bold text-lg leading-none pb-0.5"
                        >+</button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {cartItems.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 opacity-60">
                  <div className="w-20 h-20 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center mb-4">
                    <ShoppingCart size={32} className="text-slate-300 dark:text-slate-600" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-500 dark:text-slate-400">Carrito vacío</h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-[150px]">
                    Agrega productos desde el catálogo.
                  </p>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="p-4 bg-slate-50/50 dark:bg-slate-800/20 border-t border-slate-100 dark:border-slate-800 space-y-3">

              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-500">Unidades Totales</span>
                <span className="font-black text-slate-800 dark:text-white text-base">
                  {cartItems.reduce((acc, item) => acc + item.qty, 0)}
                </span>
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => handleSaveOrder(false)}
                  disabled={cartItems.length === 0}
                  className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-600/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
                >
                  <Truck size={18} />
                  {editingOrder ? 'Finalizar Edición' : 'Confirmar Pedido'}
                </button>
                <button
                  onClick={() => handleSaveOrder(true)}
                  className="w-full py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Save size={16} />
                  Guardar Borrador
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div >

  );
};

export default Orders;
