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
  PackageCheck,
  Package,
  TrendingUp
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

  const [orderMode, setOrderMode] = useState<'PROVIDER' | 'CATEGORY'>('PROVIDER');  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [showHighRotation, setShowHighRotation] = useState(false);
  const [showMediumRotation, setShowMediumRotation] = useState(false);

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

  // Export State
  const AVAILABLE_COLUMNS = [
    { id: 'sku', label: 'REFERENCIA' },
    { id: 'producto', label: 'PRODUCTO / VEHÍCULO' },
    { id: 'marca', label: 'MARCA' },
    { id: 'categoria', label: 'CATEGORÍA' },
    { id: 'subcategoria', label: 'SUBCATEGORÍA' },
    { id: 'unidad', label: 'UNIDAD' },
    { id: 'es_nueva', label: 'NUEVA REF' },
    { id: 'cantidad', label: 'CANTIDAD' },
  ];

  const [showExportModal, setShowExportModal] = useState(false);
  const [orderToExport, setOrderToExport] = useState<Pedido | null>(null);
  const [selectedColumns, setSelectedColumns] = useState<string[]>(AVAILABLE_COLUMNS.map(c => c.id));

  const openExportModal = (order: Pedido) => {
    setOrderToExport(order);
    setSelectedColumns(AVAILABLE_COLUMNS.map(c => c.id));
    setShowExportModal(true);
  };

  const toggleColumn = (columnId: string) => {
    setSelectedColumns(prev =>
      prev.includes(columnId)
        ? prev.filter(id => id !== columnId)
        : [...prev, columnId]
    );
  };

  const [cart, setCart] = useState<Record<string, { qty: number, unit: 'Unidad' | 'Paquete', isNew: boolean }>>({});
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
      // Sort orders by date descending if possible, or just keep them
      setPendingOrders(orders.filter(o => o.estado === 'Pendiente').sort((a, b) => new Date(b.fecha_creacion).getTime() - new Date(a.fecha_creacion).getTime()));

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
      const newCart: Record<string, { qty: number, unit: 'Unidad' | 'Paquete', isNew: boolean }> = {};
      items.forEach(item => {
        newCart[item.producto_id] = {
          qty: item.cantidad_pedida,
          unit: (item.unidad as 'Unidad' | 'Paquete') || 'Unidad',
          isNew: item.es_nueva || false
        };
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
      const items = await repository.getPedidoItems(order.id);
      await repository.updatePedido(order.id, {
        estado: 'En Camino',
        total_items: items.length
      });
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
    if (orderMode === 'PROVIDER') {
      setSelectedCategory(null);
      if (proveedores.length > 0 && !selectedProvFilter) {
        const firstActive = proveedores.find(p => p.is_active !== false);
        if (firstActive) setSelectedProvFilter(firstActive.id);
      }
    } else {
      setSelectedProvFilter(null);
      if (categories.length > 0 && !selectedCategory) setSelectedCategory(categories[0].id);
    }
  }, [orderMode, categories, proveedores]);

  const addToCart = (productId: string) => {
    setCart(prev => ({
      ...prev,
      [productId]: {
        qty: (prev[productId]?.qty || 0) + 1,
        unit: 'Unidad',
        isNew: false
      }
    }));
  };

  const removeFromCart = (productId: string) => {
    const newCart = { ...cart };
    delete newCart[productId];
    setCart(newCart);
  };

  const updateCartQty = (productId: string, qty: number) => {
    if (qty <= 0) return removeFromCart(productId);
    setCart(prev => ({
      ...prev,
      [productId]: { ...prev[productId], qty }
    }));
  };

  const updateCartUnit = (productId: string, unit: 'Unidad' | 'Paquete') => {
    setCart(prev => ({
      ...prev,
      [productId]: { ...prev[productId], unit }
    }));
  };

  const updateCartIsNew = (productId: string, isNew: boolean) => {
    setCart(prev => ({
      ...prev,
      [productId]: { ...prev[productId], isNew }
    }));
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

    // 2. Check Context (Provider or Category)
    let matchesContext = false;
    if (orderMode === 'PROVIDER') {
      matchesContext = p.preferred_supplier_id === selectedProvFilter;
    } else {
      // Check if product is directly in category OR if product's category is a child of selected category
      const productCat = categories.find(c => c.id === p.subcategoria_id);
      matchesContext = p.subcategoria_id === selectedCategory || productCat?.parent_id === selectedCategory;
    }

    if (!matchesContext) return false;

    // 3. Apply Rotation Filter (AND logic)
    if (showHighRotation) {
      if (p.rotacion !== 'alta') return false;
    }

    if (showMediumRotation) {
      if (p.rotacion !== 'media') return false;
    }

    return true;
  });

  const cartItems = Object.entries(cart).map(([id, data]) => {
    const itemData = data as { qty: number, unit: 'Unidad' | 'Paquete', isNew: boolean };
    return {
      product: products.find(p => p.id === id)!,
      qty: itemData.qty,
      unit: itemData.unit,
      isNew: itemData.isNew
    };
  });

  const activeContextName = useMemo(() => {
    const contextName = orderMode === 'PROVIDER'
      ? (proveedores.find(p => p.id === selectedProvFilter)?.nombre || 'Seleccionar Proveedor')
      : (categories.find(c => c.id === selectedCategory)?.name || 'Seleccionar Categoría');

    if (showHighRotation) return `${contextName} (Alta Rotación)`;
    if (showMediumRotation) return `${contextName} (Media Rotación)`;

    return contextName;
  }, [orderMode, selectedProvFilter, selectedCategory, proveedores, categories, showHighRotation, showMediumRotation]);

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
            if (existing.cantidad_pedida !== item.qty || existing.unidad !== item.unit || existing.es_nueva !== item.isNew) {
              await repository.updatePedidoItem(existing.id, {
                cantidad_pedida: item.qty,
                unidad: item.unit,
                es_nueva: item.isNew
              });
            }
          } else {
            // Insert New
            itemsUpsert.push({
              pedido_id: editingOrder.id,
              producto_id: item.product.id,
              cantidad_pedida: item.qty,
              cantidad_recibida: 0,
              unidad: item.unit,
              es_nueva: item.isNew,
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
          unidad: item.unit,
          es_nueva: item.isNew,
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

  const handleDownloadExcel = async () => {
    if (!orderToExport) return;
    const order = orderToExport;
    console.log("Starting Excel export for order:", order.id);

    try {
      setLoading(true);
      const items = await repository.getPedidoItems(order.id);
      console.log("Items fetched:", items.length);

      // Filename/Title based on Brand or custom Title
      const firstBrand = items[0]?.producto?.marca?.nombre?.toUpperCase() || 'GENERAL';
      const cleanBrand = firstBrand.replace(/[^a-zA-Z0-9ñÑ]/g, '');

      // Use custom title if available, otherwise fallback to standard naming
      const title = ['', order.titulo?.toUpperCase() || `PEDIDOS ${firstBrand}`];

      // Get Headers based on selection
      const activeCols = AVAILABLE_COLUMNS.filter(c => selectedColumns.includes(c.id));
      const headers = ['', ...activeCols.map(c => c.label)];

      const rows = items.map(item => {
        // Resolve Category Hierarchy
        const subCat = categories.find(c => c.id === item.producto?.subcategoria_id);
        const parentCat = subCat?.parent_id
          ? categories.find(c => c.id === subCat.parent_id)
          : (subCat?.parent_id === null ? subCat : undefined);

        const categoryName = parentCat?.name || (subCat?.parent_id ? 'Desconocida' : subCat?.name);
        const subCategoryName = parentCat ? subCat?.name : '';

        // Build row data based on selected columns
        const rowData = [];
        rowData.push(''); // Empty Col A

        if (selectedColumns.includes('sku')) rowData.push(item.producto?.sku);
        if (selectedColumns.includes('producto')) rowData.push(item.producto?.nombre);
        if (selectedColumns.includes('marca')) rowData.push(item.producto?.marca?.nombre);
        if (selectedColumns.includes('categoria')) rowData.push(categoryName);
        if (selectedColumns.includes('subcategoria')) rowData.push(subCategoryName);
        if (selectedColumns.includes('unidad')) rowData.push(item.unidad || 'Unidad');
        if (selectedColumns.includes('es_nueva')) rowData.push(item.es_nueva ? 'SÍ' : 'NO');
        if (selectedColumns.includes('cantidad')) rowData.push(item.cantidad_pedida);

        return rowData;
      });

      const ws_data = [
        title,
        [], // Spacing Row
        headers,
        ...rows
      ];

      const ws = XLSX.utils.aoa_to_sheet(ws_data);

      // Merge Title Cell (B1:EndCol)
      if (!ws['!merges']) ws['!merges'] = [];
      // Data starts at Column 1 (B) to headers.length - 1
      ws['!merges'].push({ s: { r: 0, c: 1 }, e: { r: 0, c: headers.length - 1 } }); // Adjusted merge width

      // Configure Freeze Panes (Freeze top 2 rows)
      const splitRow = 3;
      ws['!freeze'] = { xSplit: 0, ySplit: splitRow, topLeftCell: `B${splitRow + 1}`, activePane: 'bottomLeft', state: 'frozen' };

      // AutoFilter REMOVED per user request

      // Styles
      const borderStyle = {
        top: { style: "thin", color: { rgb: "000000" } },
        bottom: { style: "thin", color: { rgb: "000000" } },
        left: { style: "thin", color: { rgb: "000000" } },
        right: { style: "thin", color: { rgb: "000000" } }
      };

      const titleStyle = {
        font: { name: "Calibri Light", sz: 18, bold: true, color: { rgb: "4472C4" } }, // Bold, Standard Blue
        alignment: { horizontal: "center", vertical: "center" },
        fill: { fgColor: { rgb: "FFFFFF" } },
        border: { bottom: { style: "medium", color: { rgb: "4472C4" } } } // Back to Medium
      };

      const headerStyle = {
        fill: { fgColor: { rgb: "F8CBAD" } }, // Salmon
        font: { name: "Calibri", sz: 11, bold: true, color: { rgb: "000000" } },
        alignment: { horizontal: "center", vertical: "center" },
        border: borderStyle
      };

      // Styles Loop
      const finalRange = XLSX.utils.decode_range(ws['!ref']!);

      // Ensure Title cells exist to apply borders correctly across the merge
      for (let C = 1; C < headers.length; ++C) {
        const addr = XLSX.utils.encode_cell({ r: 0, c: C });
        if (!ws[addr]) ws[addr] = { t: 's', v: '' };
        ws[addr].s = titleStyle; // Apply style to ALL cells in title row for consistent border
      }

      for (let R = finalRange.s.r; R <= finalRange.e.r; ++R) {
        for (let C = finalRange.s.c; C <= finalRange.e.c; ++C) {
          if (C === 0) continue; // Skip Col A
          const cell_address = XLSX.utils.encode_cell({ r: R, c: C });
          if (!ws[cell_address]) continue;

          // Title Row (Reviewing again to be safe, though loop above handles it)
          if (R === 0) ws[cell_address].s = titleStyle;
          else if (R === 2) ws[cell_address].s = headerStyle;
          else if (R > 2) {
            ws[cell_address].s = {
              font: { name: "Calibri", sz: 11 },
              alignment: { horizontal: "center", vertical: "center" },
              border: borderStyle
            };
          }
        }
      }

      // Estimate Column Widths
      const colWidths = [{ wch: 4 }]; // A padding
      activeCols.forEach(col => {
        if (col.id === 'producto') colWidths.push({ wch: 40 });
        else if (col.id === 'cantidad') colWidths.push({ wch: 12 });
        else colWidths.push({ wch: 20 });
      });
      ws['!cols'] = colWidths;

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Pedido");

      console.log("Exportando Pedido v4");
      // Use Order Title for filename
      const rawTitle = order.titulo || `PEDIDO_${cleanBrand}`;
      // Sanitize filename (remove special chars except spaces, dashes, underscores)
      const safeTitle = rawTitle.replace(/[^a-zA-Z0-9ñÑ \-_]/g, '').trim();
      XLSX.writeFile(wb, `${safeTitle}.xlsx`);

      setShowExportModal(false);
      setOrderToExport(null);

    } catch (error) {
      console.error("Error downloading excel", error);
      addToast("Error al generar el Excel. Revisa la consola.", 'error');
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
                    onClick={() => openExportModal(order)}
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
                    {previewItems.length}
                  </p>
                </div>
              </div>

              <div className="max-h-[50vh] overflow-y-auto custom-scrollbar border rounded-xl border-slate-100 dark:border-slate-700">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-500">Producto</th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-slate-500">Tipo</th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-slate-500">Unidad</th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-slate-500">Cant.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {previewItems.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-700 dark:text-slate-200">{item.producto?.nombre}</div>
                          <div className="text-xs text-slate-950 dark:text-white font-black font-mono mt-0.5">
                            {item.producto?.sku} <span className="text-slate-400 font-normal ml-1">• {item.producto?.marca?.nombre}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {item.es_nueva && (
                            <span className="text-[9px] font-black bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded border border-amber-200">
                              NUEVA
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center text-[10px] font-black text-slate-400">
                          {item.unidad?.toUpperCase() || 'UNIDAD'}
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
        <Modal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          title="Configurar Exportación"
          footer={
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDownloadExcel}
                className="px-4 py-2 text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow-lg shadow-emerald-500/30 transition-all flex items-center gap-2"
              >
                <FileSpreadsheet size={16} />
                Descargar Excel
              </button>
            </div>
          }
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Selecciona las columnas que deseas incluir en el archivo Excel:</p>
            <div className="grid grid-cols-2 gap-3">
              {AVAILABLE_COLUMNS.map(col => (
                <label key={col.id} className="flex items-center space-x-3 p-3 rounded-lg border border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={selectedColumns.includes(col.id)}
                    onChange={() => toggleColumn(col.id)}
                    className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 border-gray-300"
                  />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{col.label}</span>
                </label>
              ))}
            </div>
            {selectedColumns.length === 0 && (
              <p className="text-xs text-rose-500 font-bold mt-2">Debes seleccionar al menos una columna.</p>
            )}
          </div>
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
          <div className="flex items-center justify-between mb-6 border-b border-slate-200 dark:border-white/5 pb-4 flex-wrap gap-4">
            <div className="flex items-center space-x-4">
              <button onClick={cancelEdit} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-colors">
                <ArrowLeft size={20} className="text-slate-500" />
              </button>
              <div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-white">Editando Pedido #{editingOrder.id.slice(0, 6)}</h2>
                <p className="text-xs text-slate-400">Modifica las cantidades o agrega nuevos productos</p>
              </div>
            </div>
            {/* Mode Switcher + Title Input Edit & Search */}
            <div className="flex items-center gap-4 flex-wrap">
              {/* Mode Switcher */}
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
                    className={`w-full text-left pl-4 pr-3 py-3 text-xs font-bold transition-all flex items-center justify-between group relative ${selectedProvFilter === p.id
                      ? 'text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/10'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5'
                      }`}
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
        <div className="col-span-12 lg:col-span-10 flex flex-col min-h-0 animate-in fade-in zoom-in-95 duration-500 delay-100">

          {/* Mobile Cart Toggle FAB */}
          <button
            onClick={() => setShowMobileCart(true)}
            className="fixed bottom-6 right-6 z-40 bg-blue-600 hover:bg-blue-500 text-white w-16 h-16 rounded-full shadow-2xl shadow-blue-600/40 flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
          >
            <div className="relative">
              <ShoppingCart size={28} />
              {cartItems.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full border-2 border-white dark:border-slate-900">
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
              <button
                onClick={() => {
                  setShowHighRotation(!showHighRotation);
                  if (!showHighRotation) setShowMediumRotation(false); // Mutually exclusive
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${showHighRotation
                  ? 'bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
              >
                <TrendingUp size={14} />
                <span>Alta Rotación</span>
              </button>
              <button
                onClick={() => {
                  setShowMediumRotation(!showMediumRotation);
                  if (showHighRotation) setShowHighRotation(false); // Toggle off high if medium is clicked? Or allow both?
                  // If we allow both, logic above needs adjustment (OR logic). 
                  // Current logic: if (high) return high; if (medium) return medium;
                  // This means High takes precedence. 
                  // Let's make them mutually exclusive for simplicity as "Global filters".
                  if (!showMediumRotation) setShowHighRotation(false);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${showMediumRotation
                  ? 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
              >
                <TrendingUp size={14} className={showMediumRotation ? "rotate-90" : ""} />
                <span>Media Rotación</span>
              </button>
              <span className="text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-lg">
                {filtered.length} Resultados
              </span>
            </div>
          </div>

          <div className="flex-1 min-h-0 pb-24 lg:pb-0">
            {filtered.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                {filtered.map(product => {
                  const inCartQty = cart[product.id]?.qty || 0;
                  const subCategoryName = categories.find(c => c.id === product.subcategoria_id)?.name;

                  return (
                    <div key={product.id} className={`bg-white dark:bg-[#1e293b] rounded-2xl p-4 border transition-all duration-300 group shadow-sm hover:shadow-md flex flex-col h-full relative overflow-hidden hover:-translate-y-1 ${inCartQty > 0 ? 'border-blue-500 ring-1 ring-blue-500' : 'border-slate-100 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500/50'}`}>

                      {/* Decorative Background Icon */}
                      <div className="absolute -right-4 -bottom-4 opacity-[0.03] dark:opacity-[0.05] group-hover:scale-125 transition-transform duration-500 pointer-events-none">
                        <Package size={100} />
                      </div>

                      {/* Rotation Badge only if High or Low */}
                      {product.rotacion === 'alta' && (
                        <div className="absolute top-0 right-0">
                          <div className="w-0 h-0 border-t-[12px] border-r-[12px] border-l-[12px] border-b-[12px] border-t-rose-500 border-r-rose-500 border-l-transparent border-b-transparent rounded-bl-sm shadow-sm" title="Alta Rotación"></div>
                        </div>
                      )}
                      {product.rotacion === 'media' && (
                        <div className="absolute top-0 right-0">
                          <div className="w-0 h-0 border-t-[12px] border-r-[12px] border-l-[12px] border-b-[12px] border-t-amber-400 border-r-amber-400 border-l-transparent border-b-transparent rounded-bl-sm shadow-sm" title="Media Rotación"></div>
                        </div>
                      )}
                      {product.rotacion === 'baja' && (
                        <div className="absolute top-0 right-0">
                          <div className="w-0 h-0 border-t-[12px] border-r-[12px] border-l-[12px] border-b-[12px] border-t-slate-300 border-r-slate-300 border-l-transparent border-b-transparent rounded-bl-sm shadow-sm" title="Baja Rotación"></div>
                        </div>
                      )}

                      {/* Top Tags */}
                      <div className="flex flex-wrap gap-2 mb-3 items-center">
                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                          {product.marca?.nombre || 'genérico'}
                        </span>
                        {product.subcategoria_id && (
                          <span className="text-[10px] font-bold text-violet-600 dark:text-violet-300 bg-violet-50 dark:bg-violet-500/10 px-2 py-0.5 rounded-full border border-violet-100 dark:border-violet-500/20 capitalize">
                            {categories.find(c => c.id === product.subcategoria_id)?.name?.toLowerCase()}
                          </span>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 mb-4">
                        <h4 className="font-bold text-base text-slate-800 dark:text-slate-100 leading-snug mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2" title={product.nombre}>
                          {product.nombre}
                        </h4>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-[10px] text-slate-950 dark:text-white font-black font-mono bg-slate-50 dark:bg-slate-900/50 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                            {product.sku}
                          </span>

                          <div className="flex items-center gap-1.5">
                            {/* Stock Display Removed */}
                          </div>
                        </div>
                      </div>

                      {/* Actions Footer */}
                      <div className="mt-auto border-t border-slate-100 dark:border-slate-800 pt-3 relative z-10">
                        {inCartQty === 0 ? (
                          <button
                            onClick={() => addToCart(product.id)}
                            className="w-full py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 transition-colors flex items-center justify-center gap-2 shadow-sm"
                          >
                            <Plus size={14} />
                            <span>Agregar</span>
                          </button>
                        ) : (
                          <div className="flex items-center justify-between bg-white dark:bg-slate-800 rounded-lg p-0.5 border border-blue-200 dark:border-blue-800 w-full shadow-sm">
                            <button
                              onClick={() => updateCartQty(product.id, inCartQty - 1)}
                              className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-md transition-all"
                            >
                              <Minus size={14} />
                            </button>
                            <span className="font-black text-blue-600 dark:text-blue-400 text-sm">{inCartQty}</span>
                            <button
                              onClick={() => updateCartQty(product.id, inCartQty + 1)}
                              className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-blue-500 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-md transition-all"
                            >
                              <Plus size={14} />
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

        {/* RIGHT SIDEBAR - CART DRAWER */}
        {/* Backdrop */}
        {showMobileCart && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={() => setShowMobileCart(false)}
          />
        )}

        <div className={`
            fixed inset-y-0 right-0 z-50 w-full md:w-[450px] bg-white dark:bg-[#0f172a] shadow-2xl transform transition-transform duration-300 ease-in-out
            ${showMobileCart ? 'translate-x-0' : 'translate-x-full'}
        `}>

          <div className="flex flex-col h-full bg-white dark:bg-[#1e293b] border-l border-slate-100 dark:border-slate-800 overflow-hidden">

            {/* Header */}
            <div className="px-6 py-5 bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800/50 flex items-center justify-between backdrop-blur-md">
              <div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                    <ShoppingCart size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 dark:text-white text-lg leading-tight">
                      Tu Carrito
                    </h3>
                    <p className="text-xs text-slate-400 font-medium">
                      {cartItems.length} items seleccionados
                    </p>
                  </div>
                </div>
              </div>

              {/* Close Button */}
              <button
                onClick={() => setShowMobileCart(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3 min-h-0">
              {cartItems.map(({ product, qty, unit, isNew }) => {
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
                        <p className="text-[10px] text-slate-950 dark:text-white font-black font-mono">{product.sku}</p>
                        {subCategoryName && (
                          <p className="text-[9px] font-bold text-violet-500 dark:text-violet-400 uppercase truncate max-w-[100px]">{subCategoryName}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-2 gap-4">
                      {/* Unit & New Selector */}
                      <div className="flex flex-col gap-2">
                        <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700">
                          <button
                            onClick={() => updateCartUnit(product.id, 'Unidad')}
                            className={`px-3 py-1 rounded-md text-[9px] font-black transition-all ${unit === 'Unidad'
                              ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                              }`}
                          >
                            UNIDAD
                          </button>
                          <button
                            onClick={() => updateCartUnit(product.id, 'Paquete')}
                            className={`px-3 py-1 rounded-md text-[9px] font-black transition-all ${unit === 'Paquete'
                              ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                              }`}
                          >
                            PAQUETE
                          </button>
                        </div>

                        <button
                          onClick={() => updateCartIsNew(product.id, !isNew)}
                          className={`flex items-center gap-1.5 px-2 py-1 rounded-md border transition-all ${isNew
                            ? 'bg-amber-100 border-amber-200 text-amber-700 dark:bg-amber-500/20 dark:border-amber-500/30 dark:text-amber-400'
                            : 'bg-slate-50 border-slate-100 text-slate-400 dark:bg-slate-800 dark:border-slate-700'
                            }`}
                        >
                          <div className={`w-2 h-2 rounded-full ${isNew ? 'bg-amber-500 animate-pulse' : 'bg-slate-300'}`}></div>
                          <span className="text-[9px] font-bold uppercase tracking-tight">Referencia Nueva</span>
                        </button>
                      </div>

                      <div className="flex items-center bg-slate-50 dark:bg-slate-800 rounded-lg p-0.5 border border-slate-100 dark:border-slate-700 h-fit">
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
