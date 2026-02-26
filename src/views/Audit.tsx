import React, { useState, useMemo, useEffect } from 'react';
import GlassCard from '../components/GlassCard';
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Truck,
  ArrowRight,
  ClipboardList,
  Check,
  PackageCheck,
  Loader2,
  Search,
  History,
  Archive,
  Filter,
  ClipboardCheck,
  BarChart3,
  AlertTriangle,
  Edit,
  Save,
  Lock,
  Unlock,
  Trash2,
  Replace,
  RotateCcw,
  PlusCircle,
  PackageX
} from 'lucide-react';
import CustomSelect from '../components/CustomSelect';
import { repository } from '../services/repository';
import { Pedido, PedidoItem, EstadoItem, Producto } from '../types';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';

interface AuditProps {
  initialViewMode?: 'PENDING' | 'HISTORY' | 'MISSING' | 'TRASH';
}

const Audit: React.FC<AuditProps> = ({ initialViewMode = 'PENDING' }) => {
  const { addToast } = useToast();
  // Mode State
  // Reception State
  const [activePedido, setActivePedido] = useState<Pedido | null>(null);
  const [items, setItems] = useState<PedidoItem[]>([]);
  const [pedidosPendientes, setPedidosPendientes] = useState<Pedido[]>([]);
  const [pedidosHistorial, setPedidosHistorial] = useState<Pedido[]>([]);
  const [pedidosPapelera, setPedidosPapelera] = useState<Pedido[]>([]);
  const [missingItems, setMissingItems] = useState<{ item: PedidoItem, pedido: Pedido }[]>([]);
  const [viewMode, setViewMode] = useState<'PENDING' | 'HISTORY' | 'MISSING' | 'TRASH'>(initialViewMode);
  const [isEditingHistory, setIsEditingHistory] = useState(false);
  const [isEditingOrder, setIsEditingOrder] = useState(false);
  const [itemsToDelete, setItemsToDelete] = useState<string[]>([]);
  // Track dirty state
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Add Item State
  const [addItemModalOpen, setAddItemModalOpen] = useState(false);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [allProducts, setAllProducts] = useState<Producto[]>([]);
  const [isSearchingProducts, setIsSearchingProducts] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');

  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [auditedValues, setAuditedValues] = useState<Record<string, { qty: number, status: EstadoItem }>>({});
  const [itemSearchTerm, setItemSearchTerm] = useState('');

  // Modal State
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<() => void>(() => { });
  const [confirmTitle, setConfirmTitle] = useState('');
  const [confirmMessage, setConfirmMessage] = useState('');

  // Exit Confirmation
  const [showExitModal, setShowExitModal] = useState(false);

  // Substitution state
  const [substitutionModalOpen, setSubstitutionModalOpen] = useState(false);
  const [substitutionItem, setSubstitutionItem] = useState<PedidoItem | null>(null);
  const [availableBrands, setAvailableBrands] = useState<{ id: string, nombre: string }[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState('');
  const [availableProducts, setAvailableProducts] = useState<Producto[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');

  useEffect(() => {
    repository.getMarcas().then(setAvailableBrands);
  }, []);

  useEffect(() => {
    loadPedidos();
  }, []);

  useEffect(() => {
    if (viewMode === 'MISSING') {
      loadMissingItems();
    }
  }, [viewMode]);

  const loadPedidos = async () => {
    try {
      setLoading(true);
      const allPedidos = await repository.getPedidos();
      setPedidosPendientes(allPedidos.filter(p => p.estado === 'En Camino'));
      setPedidosHistorial(allPedidos.filter(p => p.estado === 'Auditado'));
      setPedidosPapelera(allPedidos.filter(p => p.estado === 'Cancelado'));
    } catch (error) {
      console.error("Error loading orders:", error);
      addToast("Error al cargar pedidos.", 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadMissingItems = async () => {
    try {
      setLoading(true);
      const allPedidos = await repository.getPedidos();
      const auditados = allPedidos.filter(p => p.estado === 'Auditado');

      const missing: { item: PedidoItem, pedido: Pedido }[] = [];

      // Fetch items for all audited orders (Parallel)
      await Promise.all(auditados.map(async (p) => {
        const pItems = await repository.getPedidoItems(p.id);
        pItems.forEach(item => {
          if (item.estado_item === 'No llegó' || item.estado_item === 'Incompleto') {
            missing.push({ item, pedido: p });
          }
        });
      }));

      setMissingItems(missing);
    } catch (error) {
      console.error("Error loading missing items:", error);
    } finally {
      setLoading(false);
    }
  };

  const openConfirmModal = (title: string, message: string, action: () => void) => {
    setConfirmTitle(title);
    setConfirmMessage(message);
    setConfirmAction(() => action);
    setConfirmModalOpen(true);
  };

  const filteredOrders = useMemo(() => {
    let list = pedidosPendientes;
    if (viewMode === 'HISTORY') list = pedidosHistorial;
    if (viewMode === 'TRASH') list = pedidosPapelera;

    if (!searchTerm) return list;
    return list.filter(p =>
      p.proveedor?.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.id.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [viewMode, pedidosPendientes, pedidosHistorial, pedidosPapelera, searchTerm]);

  const filteredMissingItems = useMemo(() => {
    if (!searchTerm) return missingItems;
    return missingItems.filter(({ item, pedido }) =>
      item.producto?.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pedido.proveedor?.nombre.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [missingItems, searchTerm]);

  const filteredItems = useMemo(() => {
    if (!itemSearchTerm) return items;
    return items.filter(item =>
      item.producto?.nombre.toLowerCase().includes(itemSearchTerm.toLowerCase()) ||
      item.producto?.sku.toLowerCase().includes(itemSearchTerm.toLowerCase())
    );
  }, [items, itemSearchTerm]);


  const handleUpdateItemStatus = async (itemId: string, newStatus: EstadoItem) => {
    try {
      setIsProcessing(true);
      await repository.updatePedidoItem(itemId, { estado_item: newStatus });

      // Update local state by removing from missing items
      setMissingItems(prev => prev.filter(i => i.item.id !== itemId));

      addToast(newStatus === 'Cancelado' ? "Item eliminado de faltantes." : "Item pausado (pendiente).", 'success');
    } catch (error) {
      console.error("Error updating item status:", error);
      addToast("Error al actualizar estado.", 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    if (selectedBrandId && substitutionModalOpen) {
      setIsProcessing(true);
      repository.getProductos().then(all => {
        const filtered = all.filter(p => p.marca_id === selectedBrandId);
        setAvailableProducts(filtered);
        setIsProcessing(false);
      });
    } else {
      setAvailableProducts([]);
    }
  }, [selectedBrandId, substitutionModalOpen]);

  const handleSelectPedido = async (p: Pedido) => {
    try {
      setIsProcessing(true);
      setActivePedido(p);
      setIsEditingHistory(false);
      setIsEditingOrder(false);
      setItemsToDelete([]);
      setHasUnsavedChanges(false);
      setItemSearchTerm(''); // Reset search
      const pedidoItems = await repository.getPedidoItems(p.id);
      setItems(pedidoItems);

      // Initialize audit state
      const initialAudit: Record<string, { qty: number, status: EstadoItem }> = {};
      pedidoItems.forEach(item => {
        // Use stored received quantity if available (for history edits or returning from pending)
        const hasStoredData = p.estado === 'Auditado' || item.cantidad_recibida > 0 || item.estado_item !== 'No llegó';

        const qty = hasStoredData ? item.cantidad_recibida : 0;
        const status = hasStoredData ? item.estado_item : 'No llegó';

        initialAudit[item.id] = { qty, status };
      });
      setAuditedValues(initialAudit);
    } catch (error) {
      console.error(error);
      addToast("Error al cargar items del pedido", 'error');
      setActivePedido(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const updateAuditValue = (itemId: string, val: number, field: 'qty' | 'expected' = 'qty', explicitStatus?: EstadoItem) => {
    let requested = items.find(i => i.id === itemId)?.cantidad_pedida || 0;

    // If editing expected, update the 'requested' used for calculation
    if (field === 'expected') {
      requested = val;
      // Also update local item state for immediate feedback
      setItems(prev => prev.map(i => i.id === itemId ? { ...i, cantidad_pedida: val } : i));
    }

    const currentAudit = auditedValues[itemId];
    const qty = field === 'qty' ? val : (currentAudit?.qty || 0);

    let status: EstadoItem = explicitStatus || (qty === requested ? 'Completo' : 'Incompleto');

    if (!explicitStatus) {
      if (qty === 0) status = 'No llegó';
      else if (qty === requested) status = 'Completo';
      else status = 'Incompleto'; // Se usa Incompleto para cualquier diferencia (menos o más) que requiera revisión
    }

    setAuditedValues(prev => ({
      ...prev,
      [itemId]: { qty, status }
    }));
    setHasUnsavedChanges(true);
  };

  const handleMoveToTrash = (pedido: Pedido) => {
    openConfirmModal(
      'Mover a Papelera',
      '¿Estás seguro de mover este registro a la papelera? Podrás consultarlo en la pestaña de Papelera.',
      async () => {
        try {
          setIsProcessing(true); // Changed from setLoading to avoid full unmount
          await repository.updatePedido(pedido.id, { estado: 'Cancelado' });
          addToast("Pedido movido a la papelera.", 'success');
          await loadPedidos();
        } catch (error) {
          console.error("Error moving to trash:", error);
          addToast("Error al mover a papelera.", 'error');
        } finally {
          setIsProcessing(false);
        }
      }
    );
  };

  const handleDeleteForever = (pedido: Pedido) => {
    openConfirmModal(
      'Eliminar Definitivamente',
      '¿Estás seguro de eliminar este registro permanentemente? Esta acción es irreversible.',
      async () => {
        try {
          setIsProcessing(true);
          await repository.deletePedido(pedido.id);
          addToast("Registro eliminado permanentemente.", 'success');
          await loadPedidos();
        } catch (error) {
          console.error("Error deleting order:", error);
          addToast("Error al eliminar el registro.", 'error');
        } finally {
          setIsProcessing(false);
        }
      }
    );
  };

  const handleReturnToPending = (pedido: Pedido) => {
    const isAuditado = pedido.estado === 'Auditado';
    openConfirmModal(
      'Regresar a Pendientes',
      isAuditado
        ? '¿Estás seguro de regresar este pedido a "Pendientes"? Se revertirán los cambios en el inventario para evitar duplicidad al volver a auditar.'
        : '¿Estás seguro de regresar este pedido a "Pendientes"? Podrás volver a editarlo en la sección de Pedidos.',
      async () => {
        try {
          setIsProcessing(true);

          // Get current items to have accurate count and for stock reversion if needed
          const currentItems = await repository.getPedidoItems(pedido.id);

          if (isAuditado) {
            // Revert stock changes for items that were received
            await Promise.all(currentItems.map(async (item) => {
              if (item.cantidad_recibida > 0) {
                const targetProductId = item.producto_real_id || item.producto_id;
                // Subtract received quantity from stock
                await repository.updateStock(targetProductId, -item.cantidad_recibida);
              }
            }));
          }

          await repository.updatePedido(pedido.id, {
            estado: 'Pendiente',
            total_items: currentItems.length
          });
          addToast(isAuditado ? "Pedido regresado a pendientes. Inventario revertido." : "Pedido regresado a pendientes.", 'success');
          await loadPedidos();
        } catch (error) {
          console.error("Error returning to pending:", error);
          addToast("Error al regresar el pedido.", 'error');
        } finally {
          setIsProcessing(false);
        }
      }
    );
  };

  const handleReceiveAll = () => {
    openConfirmModal(
      'Recibir Todo Correcto',
      '¿Estás seguro de marcar TODO lo pendiente como recibido correctamente? Esto sobrescribirá los valores actuales.',
      () => {
        const newAudit = { ...auditedValues };
        items.forEach(item => {
          newAudit[item.id] = { qty: item.cantidad_pedida, status: 'Completo' };
        });
        setAuditedValues(newAudit);
        addToast("Todos los items marcados como completos.", 'success');
      }
    );
  };

  const handleOpenSubstitution = (item: PedidoItem) => {
    setSubstitutionItem(item);
    setSelectedBrandId('');
    setSelectedProductId('');
    setAvailableProducts([]);
    setSubstitutionModalOpen(true);
  };

  const handleApplySubstitution = async () => {
    if (!substitutionItem || !selectedProductId) return;

    try {
      setIsProcessing(true);

      // 2. Update item with producto_real_id AND mark as received
      await repository.updatePedidoItem(substitutionItem.id, {
        producto_real_id: selectedProductId,
        cantidad_recibida: substitutionItem.cantidad_pedida,
        estado_item: 'Completo'
      });

      addToast("Sustitución aplicada. Item marcado como completo.", 'success');
      setSubstitutionModalOpen(false);
      setSubstitutionItem(null);
      setSelectedBrandId('');
      setSelectedProductId('');

      // Reload items to reflect changes
      const updatedItems = await repository.getPedidoItems(activePedido!.id);
      setItems(updatedItems);

      // Update local audit state to reflect completion
      setAuditedValues(prev => ({
        ...prev,
        [substitutionItem.id]: {
          qty: substitutionItem.cantidad_pedida,
          status: 'Completo'
        }
      }));

    } catch (error) {
      console.error("Error substituting product:", error);
      addToast("Error al aplicar sustitución.", 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const processFinalization = async () => {
    if (!activePedido) return;
    setIsProcessing(true);

    try {
      // 1. Update Items & Stock
      const promises = items.map(async item => {
        const audit = auditedValues[item.id];

        // Update Master Stock (Target Real product if substituted)
        const targetProductId = item.producto_real_id || item.producto_id;
        await repository.updateStock(targetProductId, audit.qty);

        // Update Item Status
        await repository.updatePedidoItem(item.id, {
          cantidad_recibida: audit.qty,
          estado_item: audit.status,
          auditado_at: new Date().toISOString()
        });
      });

      await Promise.all(promises);

      // 2. Update Order Status
      await repository.updatePedido(activePedido.id, {
        estado: 'Auditado',
        fecha_recepcion: new Date().toISOString(),
        total_items: items.length
      });

      addToast('Auditoría finalizada con éxito. Inventario actualizado.', 'success');
      setActivePedido(null);
      setItems([]);
      await loadPedidos(); // Refresh list

    } catch (error) {
      console.error("Error finalizing audit:", error);
      addToast("Hubo un error al finalizar la auditoría.", 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveProgress = async () => {
    if (!activePedido) return;
    setIsProcessing(true);

    try {
      // Update item quantities and status in DB without modifying stock or order status
      const promises = items.map(async item => {
        const audit = auditedValues[item.id];
        // Only update if there's a change or it's been audited locally
        if (audit) {
          await repository.updatePedidoItem(item.id, {
            cantidad_recibida: audit.qty,
            estado_item: audit.status
          });
        }
      });

      await Promise.all(promises);
      addToast('Progreso guardado. Puedes continuar más tarde.', 'success');
      setHasUnsavedChanges(false);

      // Optionally reload items to be sure
      const updatedItems = await repository.getPedidoItems(activePedido.id);
      setItems(updatedItems);

    } catch (error) {
      console.error("Error saving progress:", error);
      addToast("Error al guardar el progreso.", 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFinalizeAudit = () => {
    // Check for discrepancies
    const discrepancies = items.filter(item => {
      const audit = auditedValues[item.id];
      return audit.qty !== item.cantidad_pedida || audit.status === 'Agotado';
    });

    if (discrepancies.length > 0) {
      openConfirmModal(
        '⚠ Confirmar Discrepancias',
        `Hay ${discrepancies.length} ítem(s) con discrepancias (faltas o excedentes). ¿Estás seguro de finalizar la auditoría así?`,
        processFinalization
      );
    } else {
      processFinalization();
    }
  };

  const handleSaveHistory = async () => {
    if (!activePedido) return;
    setIsProcessing(true);
    try {
      // 1. Process Deletions
      if (itemsToDelete.length > 0) {
        await Promise.all(itemsToDelete.map(async (id) => {
          const item = items.find(i => i.id === id);
          if (item && item.cantidad_recibida > 0) {
            // Revert stock for the deleted item
            const targetProductId = item.producto_real_id || item.producto_id;
            await repository.updateStock(targetProductId, -item.cantidad_recibida);
          }
          await repository.deletePedidoItem(id);
        }));
      }

      // 2. Process Updates for remaining items
      const validItems = items.filter(i => !itemsToDelete.includes(i.id));

      const promises = validItems.map(async item => {
        const audit = auditedValues[item.id];
        if (!audit) return; // Should not happen

        // Only update if changed (qty or status)
        if (audit.qty !== item.cantidad_recibida || audit.status !== item.estado_item) {
          const delta = audit.qty - item.cantidad_recibida;

          // Update Stock with Delta
          const targetProductId = item.producto_real_id || item.producto_id;
          await repository.updateStock(targetProductId, delta);

          // Update Item
          await repository.updatePedidoItem(item.id, {
            cantidad_recibida: audit.qty,
            estado_item: audit.status
          });
        }
      });

      await Promise.all(promises);

      // 3. Update parent order total items count to stay in sync
      const finalItems = await repository.getPedidoItems(activePedido.id);
      await repository.updatePedido(activePedido.id, { total_items: finalItems.length });

      addToast('Corrección guardada. Inventario actualizado.', 'success');
      setIsEditingHistory(false);
      setItemsToDelete([]); // Clear deletions

      // Refresh local items
      setItems(finalItems);

      // Update auditedValues to match new DB state
      const newAudit: Record<string, { qty: number, status: EstadoItem }> = {};
      finalItems.forEach(item => {
        newAudit[item.id] = { qty: item.cantidad_recibida, status: item.estado_item };
      });
      setAuditedValues(newAudit);

    } catch (error) {
      console.error("Error saving history:", error);
      addToast("Error al guardar corrección.", 'error');
    } finally {
      setIsProcessing(false);
    }
  };



  const handleSaveOrderChanges = async () => {
    if (!activePedido) return;
    setIsProcessing(true);
    try {
      // 1. Process Deletions
      if (itemsToDelete.length > 0) {
        await Promise.all(itemsToDelete.map(id => repository.deletePedidoItem(id)));
      }

      // 2. Process Updates (Expected Qty) & New Items
      // We filter out deleted items from the update list
      const validItems = items.filter(i => !itemsToDelete.includes(i.id));

      const newItemsToInsert = validItems.filter(i => i.id.startsWith('NEW_'));
      const existingItemsToUpdate = validItems.filter(i => !i.id.startsWith('NEW_'));

      // Update existing
      await Promise.all(existingItemsToUpdate.map(item =>
        repository.updatePedidoItem(item.id, { cantidad_pedida: item.cantidad_pedida })
      ));

      // Insert new
      if (newItemsToInsert.length > 0) {
        await repository.addPedidoItems(newItemsToInsert.map(i => ({
          pedido_id: activePedido.id,
          producto_id: i.producto_id,
          cantidad_pedida: i.cantidad_pedida,
          cantidad_recibida: 0,
          estado_item: 'No llegó'
        })));
      }

      addToast('Orden actualizada correctamente.', 'success');
      setIsEditingOrder(false);
      setItemsToDelete([]);

      addToast('Orden actualizada correctamente.', 'success');
      setIsEditingOrder(false);
      setItemsToDelete([]);

      // Reload items to ensure sync
      const updatedItems = await repository.getPedidoItems(activePedido.id);

      // Update parent order total items count to stay in sync
      await repository.updatePedido(activePedido.id, { total_items: updatedItems.length });

      setItems(updatedItems);

      // Re-initialize audit values based on new expected quantities
      const newAudit: Record<string, { qty: number, status: EstadoItem }> = {};
      updatedItems.forEach(item => {
        const qty = 0;
        const prev = auditedValues[item.id]?.qty || 0;
        const status = prev === 0 ? 'No llegó' : (prev === item.cantidad_pedida ? 'Completo' : 'Incompleto');
        newAudit[item.id] = { qty: prev, status };
      });
      setAuditedValues(newAudit);

    } catch (error) {
      console.error("Error updating order:", error);
      addToast("Error al actualizar la orden.", 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenAddItem = async () => {
    setAddItemModalOpen(true);
    if (allProducts.length === 0) {
      setIsSearchingProducts(true);
      try {
        const prods = await repository.getProductos();
        setAllProducts(prods);
      } catch (error) {
        console.error("Error loading products", error);
        addToast("Error al cargar productos", 'error');
      } finally {
        setIsSearchingProducts(false);
      }
    }
  };

  const handleAddNewItem = (product: Producto) => {
    // Check if already exists in items
    if (items.some(i => i.producto_id === product.id)) {
      addToast("Este producto ya está en la orden.", 'error');
      return;
    }

    const newItem: PedidoItem = {
      id: `NEW_${Date.now()}`, // Temp ID
      pedido_id: activePedido!.id,
      producto_id: product.id,
      cantidad_pedida: 1, // Default 1
      cantidad_recibida: 0,
      unidad: 'Unidad',
      estado_item: 'No llegó',
      producto: product
    };

    setItems(prev => [newItem, ...prev]);
    // Initialize audit value for new item
    setAuditedValues(prev => ({
      ...prev,
      [newItem.id]: { qty: 0, status: 'No llegó' }
    }));

    addToast("Producto agregado. Define la cantidad esperada.", 'success');
    setAddItemModalOpen(false);
    setProductSearchTerm('');
  };

  const { percent, perfect, hasDiscrepancies, missingCount } = useMemo(() => {
    const total = items.length;
    if (total === 0) return { percent: 0, perfect: 0, hasDiscrepancies: false, missingCount: 0 };

    let progressWeight = 0;
    let missing = 0;

    items.forEach(item => {
      const audit = auditedValues[item.id];
      if (audit) {
        const qty = Number(audit.qty) || 0;
        const requested = Number(item.cantidad_pedida) || 0;

        // Line progress: 1.0 if fully received or more, partial if less
        const lineProgress = requested > 0
          ? Math.min(qty / requested, 1)
          : (qty > 0 ? 1 : 0);

        progressWeight += lineProgress;

        // Discrepancies: anything that doesn't match the order exactly or is out of stock
        if (qty !== requested || audit.status === 'Agotado') {
          missing++;
        }
      }
    });

    const calculatedPercent = Math.round((progressWeight / total) * 100);

    return {
      percent: calculatedPercent,
      perfect: items.filter(i => {
        const a = auditedValues[i.id];
        return a && Number(a.qty) === Number(i.cantidad_pedida) && a.status !== 'Agotado';
      }).length,
      hasDiscrepancies: missing > 0,
      missingCount: missing
    };
  }, [items, auditedValues]);


  const calculatePedidoProgress = (pedido: Pedido) => {
    const pItems = pedido.items || [];
    if (pItems.length === 0) return 0;

    let weight = 0;
    pItems.forEach(i => {
      const req = Number(i.cantidad_pedida) || 0;
      const rec = Number(i.cantidad_recibida) || 0;
      weight += req > 0 ? Math.min(rec / req, 1) : (rec > 0 ? 1 : 0);
    });

    return Math.round((weight / pItems.length) * 100);
  };

  const getDisplayBrand = (pedido: Pedido) => {
    // Priority: User-defined title
    if (pedido.titulo) return pedido.titulo;

    // If no items loaded (shouldn't happen with new fetch) or no brands
    if (!pedido.items || pedido.items.length === 0) return pedido.proveedor?.nombre || "Proveedor Desconocido";

    // Extract unique brands
    const brands = Array.from(new Set(
      pedido.items
        .map(i => i.producto?.marca?.nombre)
        .filter((b): b is string => !!b)
    ));

    if (brands.length === 0) return pedido.proveedor?.nombre || "Proveedor Desconocido";
    if (brands.length === 1) return brands[0];
    return brands.join(', ');
  };

  const formattedBrand = activePedido ? getDisplayBrand(activePedido) : '';

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <Loader2 className="animate-spin text-blue-500" size={48} />
        <p className="text-slate-400 animate-pulse">Cargando recepciones pendientes...</p>
      </div>
    );
  }

  if (!activePedido) {
    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold">Auditoría de Recepción</h2>
            <p className="text-slate-400">Conciliación de pedidos contra inventario.</p>
          </div>
        </header>

        <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="flex bg-slate-100 dark:bg-black/20 p-1 rounded-xl border border-slate-200 dark:border-white/5">
            <button
              onClick={() => setViewMode('PENDING')}
              className={`px-4 lg:px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${viewMode === 'PENDING' ? 'bg-white dark:bg-blue-500 text-blue-600 dark:text-white shadow-sm ring-1 ring-black/5 dark:ring-0' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              <Truck size={16} />
              <span className="hidden md:inline">Pendientes</span>
              {pedidosPendientes.length > 0 && <span className="bg-blue-100 dark:bg-white/20 text-blue-600 dark:text-white px-1.5 rounded-full text-[10px]">{pedidosPendientes.length}</span>}
            </button>
            <button
              onClick={() => setViewMode('HISTORY')}
              className={`px-4 lg:px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${viewMode === 'HISTORY' ? 'bg-white dark:bg-emerald-500 text-emerald-600 dark:text-white shadow-sm ring-1 ring-black/5 dark:ring-0' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              <History size={16} />
              <span className="hidden md:inline">Historial</span>
            </button>

            <button
              onClick={() => setViewMode('TRASH')}
              className={`px-4 lg:px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${viewMode === 'TRASH' ? 'bg-white dark:bg-slate-500 text-slate-600 dark:text-white shadow-sm ring-1 ring-black/5 dark:ring-0' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              <Trash2 size={16} />
              <span className="hidden md:inline">Papelera</span>
            </button>
          </div>

          {/* Search */}
          <div className="relative group w-full md:w-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={20} />
            <input
              type="text"
              placeholder={viewMode === 'MISSING' ? "Buscar producto faltante..." : "Buscar proveedor, marca o ID..."}
              className="w-full md:w-80 pl-12 pr-4 py-2.5 input-premium rounded-full focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 focus:outline-none transition-all placeholder:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#334155] shadow-inner"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOrders.length === 0 ? (
            <div className="col-span-full py-24 text-center card-premium rounded-3xl border border-dashed border-[#334155]">
              {viewMode === 'PENDING' ? (
                <Truck size={64} className="mx-auto mb-6 opacity-20 text-slate-400" />
              ) : (
                viewMode === 'TRASH' ? (
                  <Trash2 size={64} className="mx-auto mb-6 opacity-20 text-slate-400" />
                ) : (
                  <Archive size={64} className="mx-auto mb-6 opacity-20 text-slate-400" />
                )
              )}
              <h3 className="text-xl font-bold text-slate-300 mb-2">
                {searchTerm ? 'No se encontraron resultados' : 'Lista vacía'}
              </h3>
              <p className="text-slate-500">
                {searchTerm ? 'Intenta con otro término de búsqueda.' :
                  viewMode === 'PENDING' ? 'No hay pedidos pendientes de recepción.' :
                    viewMode === 'TRASH' ? 'La papelera está vacía.' : 'No hay historial de auditorías disponible.'}
              </p>
            </div>
          ) : (
            filteredOrders.map(p => (
              <GlassCard
                key={p.id}
                className="group hover:border-blue-500/50 hover:shadow-blue-500/20 transition-all"
                noPadding
              >
                <div className="p-6 border-b border-slate-100 dark:border-[#334155] bg-white dark:bg-gradient-to-br dark:from-[#1e293b] dark:to-[#0f172a]">
                  <div className="flex justify-between items-start mb-6">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${p.estado === 'Auditado'
                      ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                      : p.estado === 'Cancelado' ? 'bg-slate-500/10 text-slate-500 border-slate-500/20'
                        : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                      }`}>
                      {p.estado === 'Auditado' ? 'Finalizado' : p.estado === 'Cancelado' ? 'Eliminado' : 'En Tránsito'}
                    </span>
                    <span className="text-xs text-slate-500 font-mono">{new Date(p.fecha_creacion).toLocaleDateString()}</span>
                  </div>
                  {/* Display BRAND instead of PROVIDER */}
                  <h4 className="text-xl font-bold mb-2 text-slate-800 dark:text-slate-100">
                    {getDisplayBrand(p)}
                  </h4>
                  {/* Show Provider as subtitle if different from title/available */}
                  <div className="text-sm text-slate-400 mb-3 flex items-center">
                    <span className="text-xs font-bold bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded text-slate-500">
                      {(() => {
                        // If no items loaded (shouldn't happen with new fetch) fallback to main provider
                        if (!p.items || p.items.length === 0) return p.proveedor?.nombre || "Proveedor Desconocido";

                        // Extract unique providers from items
                        const providers = Array.from(new Set(
                          p.items
                            .map(i => i.producto?.proveedor?.nombre)
                            .filter((name): name is string => !!name)
                        ));

                        // If no item providers found, fallback to main provider
                        if (providers.length === 0) return p.proveedor?.nombre || "Proveedor Desconocido";

                        return providers.join(', ');
                      })()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-sm mb-2">
                    <div className="flex items-center">
                      <PackageCheck size={16} className="mr-2 opacity-70" />
                      <span>{p.items?.length || p.total_items} referencias</span>
                    </div>
                    {(p.estado === 'Auditado' || p.estado === 'En Camino') && (
                      <span className="text-[10px] font-black text-blue-500 dark:text-blue-400">
                        {calculatePedidoProgress(p)}%
                      </span>
                    )}
                  </div>

                  {(p.estado === 'Auditado' || p.estado === 'En Camino') && (
                    <div className="h-1.5 w-full bg-slate-100 dark:bg-black/20 rounded-full overflow-hidden mb-1">
                      <div
                        className="h-full bg-blue-500 transition-all duration-1000 ease-out"
                        style={{ width: `${calculatePedidoProgress(p)}%` }}
                      ></div>
                    </div>
                  )}
                </div>
                {p.estado === 'En Camino' && (
                  <div className="p-4 flex gap-3">
                    <button
                      onClick={() => handleSelectPedido(p)}
                      className="flex-1 py-3 rounded-xl bg-blue-600/10 text-blue-400 font-bold group-hover:bg-blue-600 group-hover:text-white transition-all flex items-center justify-center border border-blue-500/20 group-hover:border-transparent"
                    >
                      {isProcessing ? <Loader2 className="animate-spin" /> : <>Iniciar Recepción <ArrowRight size={18} className="ml-2 group-hover:translate-x-1 transition-transform" /></>}
                    </button>
                    <button
                      onClick={() => handleReturnToPending(p)}
                      className="p-3 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500 hover:text-white transition-all"
                      title="Devolver a Pendientes"
                    >
                      <RotateCcw size={20} />
                    </button>
                  </div>
                )}
                {p.estado === 'Auditado' && p.fecha_recepcion && (
                  <div className="p-4 bg-slate-50 dark:bg-black/20 border-t border-slate-100 dark:border-white/5">
                    <div className="flex justify-between items-center px-2">
                      <p className="text-xs text-slate-500 font-medium">
                        {new Date(p.fecha_recepcion).toLocaleDateString()}
                      </p>
                      <div className="flex items-center gap-2">
                        {/* Return to Pending Button */}
                        <button
                          onClick={() => handleReturnToPending(p)}
                          className="p-1.5 rounded-lg hover:bg-amber-500/10 text-slate-400 hover:text-amber-500 transition-colors"
                          title="Regresar a Pendientes"
                        >
                          <RotateCcw size={16} />
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={() => handleMoveToTrash(p)}
                          className="p-1.5 rounded-lg hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 transition-colors"
                          title="Mover a Papelera"
                        >
                          <Trash2 size={16} />
                        </button>

                        {/* View Detail Button */}
                        <button
                          onClick={() => handleSelectPedido(p)}
                          className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs font-bold transition-all border border-slate-200 dark:border-slate-600/30 shadow-sm"
                        >
                          Ver Detalle
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                {p.estado === 'Cancelado' && (
                  <div className="p-4 bg-rose-50 dark:bg-rose-900/10 border-t border-rose-100 dark:border-rose-900/20">
                    <div className="flex justify-between items-center px-2">
                      <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
                        Eliminado
                      </span>
                      <button
                        onClick={() => handleDeleteForever(p)}
                        className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold shadow-sm flex items-center gap-2 transition-all hover:shadow-rose-600/20"
                      >
                        <Trash2 size={14} />
                        Eliminar definitivamente
                      </button>
                    </div>
                  </div>
                )}
              </GlassCard>
            ))
          )
          }
        </div>


        {/* Confirmation Modal for List View */}
        <Modal
          isOpen={confirmModalOpen}
          onClose={() => setConfirmModalOpen(false)}
          title={confirmTitle}
          footer={
            <>
              <button
                onClick={() => setConfirmModalOpen(false)}
                className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  confirmAction();
                  setConfirmModalOpen(false);
                }}
                className="px-4 py-2 text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow-lg shadow-blue-500/30 transition-all"
              >
                Confirmar
              </button>
            </>
          }
        >
          <p>{confirmMessage}</p>
        </Modal>



      </div >
    );
  }
  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-8 duration-700 pb-20">
      {/* Active Header */}
      <GlassCard className="sticky top-4 z-40 border-slate-100 dark:border-[#334155] shadow-xl dark:shadow-2xl bg-white dark:bg-[#1e293b]">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center space-x-4 w-full md:w-auto">
            <button
              onClick={() => {
                if (activePedido.estado === 'Auditado' || !hasUnsavedChanges) {
                  setActivePedido(null);
                } else {
                  setShowExitModal(true);
                }
              }}
              className="p-3 glass rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              <ArrowRight size={20} className="rotate-180" />
            </button>
            <div className="min-w-0">
              <h2 className="text-xl font-bold truncate text-slate-900 dark:text-white">
                {activePedido.estado === 'Auditado' ? 'Detalle Histórico' : 'Recepción'}: {formattedBrand}
              </h2>
              <div className="flex items-center space-x-2 text-xs text-slate-400">
                <span className="font-mono">#{activePedido.id.slice(0, 8)}</span>
                <span>•</span>
                <span>{activePedido.proveedor?.nombre}</span>
                <span>•</span>
                <span>{items.length} ítems</span>
                {activePedido.estado === 'Auditado' && activePedido.fecha_recepcion && (
                  <>
                    <span>•</span>
                    <span className="text-emerald-500 dark:text-emerald-400">Finalizado el {new Date(activePedido.fecha_recepcion).toLocaleDateString()}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 w-full md:w-auto px-4">
            {/* Alert Banner for Discrepancies */}
            {activePedido.estado === 'Auditado' && hasDiscrepancies && (
              <div className="mb-2 px-3 py-2 rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 flex items-center gap-2 text-rose-500 dark:text-rose-400">
                <AlertCircle size={16} className="shrink-0" />
                <span className="text-xs font-bold leading-tight">
                  Atención: Se cerró con {missingCount} discrepancias encontradas.
                </span>
              </div>
            )}

            {/* Item Search Input */}
            <div className="relative group w-full mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
              <input
                type="text"
                placeholder="Buscar en este pedido..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 focus:outline-none transition-all placeholder:text-slate-400"
                value={itemSearchTerm}
                onChange={(e) => setItemSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex justify-between items-end mb-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Progreso</span>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-500">
                  {perfect}/{items.length} productos
                </span>
                <span className={`text-xs font-black ${percent === 100 ? 'text-emerald-500 dark:text-emerald-400' : 'text-blue-500 dark:text-blue-400'}`}>
                  {percent}% Completado
                </span>
              </div>
            </div>
            <div className="h-2 w-full bg-slate-100 dark:bg-[#0f172a] rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ease-out rounded-full ${percent === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                style={{ width: `${percent}%` }}
              ></div>
            </div>
          </div>

          <div className="flex gap-3 w-full md:w-auto">
            <div className="flex gap-3 w-full md:w-auto">
              {activePedido.estado === 'Auditado' ? (
                isEditingHistory ? (
                  <>
                    <button
                      onClick={() => {
                        setIsEditingHistory(false);
                        setItemsToDelete([]); // Reset deletions
                        // Reset values to original
                        const resetAudit: Record<string, { qty: number, status: EstadoItem }> = {};
                        items.forEach(item => {
                          resetAudit[item.id] = { qty: item.cantidad_recibida, status: item.estado_item };
                        });
                        setAuditedValues(resetAudit);
                      }}
                      className="px-4 py-2 text-slate-400 hover:text-slate-600 dark:hover:text-white font-bold transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSaveHistory}
                      disabled={isProcessing}
                      className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full text-sm font-bold shadow-lg shadow-emerald-600/20 transition-all active:scale-95 flex items-center"
                    >
                      {isProcessing ? <Loader2 className="animate-spin mr-2" size={16} /> : <Save size={16} className="mr-2" />}
                      Guardar Corrección
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setIsEditingHistory(true)}
                    className="px-4 py-2 bg-white dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-full text-xs font-bold transition-all border border-slate-200 dark:border-slate-600/30 shadow-sm flex items-center"
                  >
                    <Edit size={14} className="mr-2" />
                    Corregir Recepción
                  </button>
                )
              ) : (
                !isEditingOrder && (
                  <>
                    <button
                      onClick={handleReceiveAll}
                      disabled={isProcessing}
                      className="px-4 py-2 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-500 border border-emerald-500/30 rounded-full text-xs font-bold transition-all whitespace-nowrap"
                    >
                      Recibir Todo OK
                    </button>
                    <button
                      onClick={handleFinalizeAudit}
                      disabled={isProcessing}
                      className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-full text-sm font-bold shadow-lg shadow-blue-600/20 transition-all active:scale-95 whitespace-nowrap flex items-center"
                    >
                      {isProcessing && <Loader2 className="animate-spin mr-2" size={16} />}
                      Finalizar
                    </button>
                  </>
                )
              )}
            </div>

            <div className="flex gap-3 w-full md:w-auto mt-2 md:mt-0">
              {/* EDIT ORDER BUTTON (Only for non-audited) */}
              {activePedido.estado !== 'Auditado' && !isEditingOrder && (
                <button
                  onClick={() => setIsEditingOrder(true)}
                  className="px-4 py-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 font-bold transition-all rounded-lg text-xs border border-transparent hover:border-blue-200"
                >
                  Editar Pedido
                </button>
              )}

              {isEditingOrder && (
                <>
                  <button
                    onClick={handleOpenAddItem}
                    className="px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 font-bold transition-colors rounded-lg flex items-center gap-2"
                  >
                    <PlusCircle size={16} />
                    <span className="hidden sm:inline">Producto</span>
                  </button>
                  <div className="h-6 w-px bg-slate-200 dark:bg-white/10 mx-1"></div>
                  <button
                    onClick={async () => {
                      setIsEditingOrder(false);
                      setItemsToDelete([]);
                      // Reload to revert changes
                      const original = await repository.getPedidoItems(activePedido.id);
                      setItems(original);
                    }}
                    className="px-4 py-2 text-slate-500 hover:text-slate-700 font-bold transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveProgress}
                    disabled={isProcessing}
                    className="px-6 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-full text-sm font-bold transition-all active:scale-95 flex items-center border border-slate-200 dark:border-slate-700"
                  >
                    {isProcessing ? <Loader2 className="animate-spin mr-2" size={16} /> : <Save size={16} className="mr-2" />}
                    Guardar Progreso
                  </button>
                  <button
                    onClick={handleSaveOrderChanges}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-full text-sm font-bold shadow-lg shadow-blue-600/20 transition-all active:scale-95 flex items-center"
                  >
                    {isProcessing ? <Loader2 className="animate-spin mr-2" size={16} /> : <Save size={16} className="mr-2" />}
                    Guardar Cambios
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Grid of Items */}
      <div className="grid grid-cols-1 gap-3">
        {filteredItems.map(item => {
          if (itemsToDelete.includes(item.id) && !isEditingOrder && !isEditingHistory) return null; // Don't show if deleted (visual optimization)
          // Actually, we want to show them crossed out if isEditingOrder

          const audit = auditedValues[item.id];
          if (!audit) return null; // Guard against race conditions

          const diff = audit.qty - item.cantidad_pedida;
          const isPerfect = diff === 0;
          const isMissing = diff < 0;
          const isMarkedForDeletion = itemsToDelete.includes(item.id);

          return (
            <GlassCard
              key={item.id}
              noPadding
              className={`transition-all duration-300 ${isMarkedForDeletion
                ? 'opacity-50 grayscale !border-rose-500 !bg-rose-50 !border'
                : audit.status === 'Agotado'
                  ? '!border-l-4 !border-l-red-500 !bg-red-50 dark:!bg-red-900/10'
                  : isPerfect
                    ? 'border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-500/[0.02] border'
                    : (activePedido.estado === 'Auditado' && isMissing) // Highlight missing in history
                      ? 'border-rose-500/30 bg-rose-500/5 dark:bg-rose-500/[0.05] border'
                      : 'border-amber-500/30 bg-amber-500/5 dark:bg-amber-500/[0.02] border'
                }`}
            >
              <div className="p-4 flex flex-col md:flex-row items-center gap-6">

                {/* Product Info */}
                <div className="flex items-center space-x-4 flex-1 w-full md:w-auto min-w-0">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${isPerfect
                    ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'bg-slate-100 dark:bg-[#0f172a] text-slate-500 dark:text-slate-400'
                    }`}>
                    {isPerfect ? <Check size={28} /> : <ClipboardList size={28} />}
                  </div>
                  <div className="min-w-0">
                    <h5 className={`font-bold text-lg truncate ${isPerfect
                      ? 'text-emerald-700 dark:text-emerald-100'
                      : 'text-slate-800 dark:text-slate-200'
                      }`}>
                      {item.producto?.nombre}
                    </h5>
                    <div className="flex items-center space-x-2">
                      <span className="px-1.5 py-0.5 rounded-md bg-white dark:bg-[#0f172a] text-[10px] font-mono font-black text-slate-950 dark:text-white border border-slate-300 dark:border-[#334155] shadow-sm">
                        {item.producto?.sku}
                      </span>
                      {item.producto?.categoria && (
                        <span className="px-1.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/20 text-[10px] font-bold text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-500/30">
                          {item.producto.categoria.name}
                        </span>
                      )}
                      {item.producto_real && (
                        <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-500/20 text-[10px] font-bold text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30 flex items-center gap-1">
                          <Replace size={10} />
                          Real: {item.producto_real.marca?.nombre}
                        </span>
                      )}
                      {item.es_nueva && (
                        <span className="px-1.5 py-0.5 rounded-md bg-amber-500/10 text-[10px] font-black text-amber-600 dark:text-amber-400 border border-amber-500/20 shadow-sm">
                          NUEVA
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-between w-full md:w-auto gap-8">

                  {/* Expected */}
                  <div className="text-center opacity-70">
                    <p className="text-[9px] uppercase font-black tracking-widest mb-1 text-slate-500">Esperado ({item.unidad === 'Paquete' ? 'PAQ' : 'UNID'})</p>
                    {isEditingOrder ? (
                      <input
                        type="number"
                        value={item.cantidad_pedida}
                        onChange={(e) => updateAuditValue(item.id, parseInt(e.target.value) || 0, 'expected')}
                        className="w-16 text-center bg-white dark:bg-white/5 border border-blue-300 dark:border-blue-500/50 rounded text-xl font-mono font-bold text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <p className="text-xl font-mono text-slate-700 dark:text-white">{item.cantidad_pedida}</p>
                    )}
                  </div>

                  {/* Divider */}
                  <div className="h-8 w-px bg-slate-200 dark:bg-white/10 hidden md:block"></div>

                  {/* Received Input */}
                  <div className="text-center">
                    <p className={`text-[9px] uppercase font-black tracking-widest mb-1 ${isPerfect ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>Recibido ({item.unidad === 'Paquete' ? 'PAQ' : 'UNID'})</p>
                    <div className="flex items-center bg-white dark:bg-[#0f172a] rounded-xl p-1 border border-slate-200 dark:border-[#334155] shadow-sm">
                      {(activePedido.estado !== 'Auditado' || isEditingHistory) && (
                        <button
                          onClick={() => updateAuditValue(item.id, Math.max(0, audit.qty - 1))}
                          className="w-10 h-10 rounded-lg bg-slate-50 dark:bg-white/5 hover:bg-rose-500/20 hover:text-rose-600 dark:hover:text-rose-400 flex items-center justify-center transition-colors active:scale-90 text-slate-400"
                        >-</button>
                      )}
                      <input
                        type="number"
                        value={audit.qty}
                        readOnly={(activePedido.estado === 'Auditado' && !isEditingHistory) || isEditingOrder}
                        onChange={(e) => updateAuditValue(item.id, parseInt(e.target.value) || 0)}
                        className={`w-16 text-center bg-transparent font-mono text-xl font-bold focus:outline-none ${isPerfect ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                          } ${(activePedido.estado === 'Auditado' && !isEditingHistory) ? 'cursor-default' : ''}`}
                      />
                      {(activePedido.estado !== 'Auditado' || isEditingHistory) && (
                        <button
                          onClick={() => updateAuditValue(item.id, audit.qty + 1)}
                          className="w-10 h-10 rounded-lg bg-slate-50 dark:bg-white/5 hover:bg-emerald-500/20 hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center justify-center transition-colors active:scale-90 text-slate-400"
                        >+</button>
                      )}
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="h-8 w-px bg-slate-200 dark:bg-white/10 hidden md:block"></div>

                  {/* Status & Check Action */}
                  <div className="min-w-[120px] flex items-center justify-end gap-3">
                    {((activePedido.estado !== 'Auditado' || isEditingHistory) && !isPerfect && !isEditingOrder) && (
                      <button
                        onClick={() => updateAuditValue(item.id, item.cantidad_pedida)}
                        className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-emerald-500 hover:text-white text-slate-400 transition-all shadow-sm border border-slate-200 dark:border-slate-700"
                        title="Marcar como Completo"
                      >
                        <Check size={18} />
                      </button>
                    )}

                    {/* Delete Button for Edit Order Mode OR History Mode */}
                    {(isEditingOrder || isEditingHistory) && (
                      <button
                        onClick={() => {
                          if (itemsToDelete.includes(item.id)) {
                            setItemsToDelete(prev => prev.filter(id => id !== item.id));
                          } else {
                            setItemsToDelete(prev => [...prev, item.id]);
                          }
                        }}
                        className={`p-2 rounded-lg transition-all shadow-sm border ${itemsToDelete.includes(item.id)
                          ? 'bg-rose-100 text-rose-600 border-rose-200'
                          : 'bg-slate-100 text-slate-400 hover:bg-rose-500 hover:text-white border-slate-200'
                          }`}
                        title="Eliminar de la orden"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}

                    {/* Mark as Out of Stock Button */}
                    {((activePedido.estado !== 'Auditado' || isEditingHistory) && !isPerfect && !isEditingOrder) && (
                      <button
                        onClick={() => {
                          if (audit.status === 'Agotado') {
                            // Desmarcar: Pasar undefined para que recalcule basado en cantidad (probablemente volverá a 'No llegó')
                            updateAuditValue(item.id, audit.qty, 'qty', undefined);
                          } else {
                            // Marcar como Agotado y poner cantidad en 0
                            updateAuditValue(item.id, 0, 'qty', 'Agotado');
                          }
                        }}
                        className={`p-2 rounded-lg transition-all shadow-sm border ${audit.status === 'Agotado'
                          ? 'bg-red-100 text-red-600 border-red-200 hover:bg-red-200'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-red-500 hover:text-white'}`}
                        title={audit.status === 'Agotado' ? "Desmarcar Agotado" : "Marcar como Agotado"}
                      >
                        <PackageX size={18} />
                      </button>
                    )}

                    {/* Substitution Button */}
                    {((activePedido.estado !== 'Auditado' && !isPerfect) || isEditingHistory) && (
                      <button
                        onClick={() => handleOpenSubstitution(item)}
                        className={`p-2 rounded-lg transition-all shadow-sm border ${item.producto_real_id
                          ? 'bg-amber-100 text-amber-600 border-amber-200 hover:bg-amber-200'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-blue-500 hover:text-white'}`}
                        title="Recibido en otra marca"
                      >
                        <Replace size={18} />
                      </button>
                    )}

                    {isPerfect ? (
                      <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400">
                        <CheckCircle2 size={16} />
                        <span className="text-xs font-bold">Completo</span>
                      </div>
                    ) : (
                      <div
                        onClick={() => {
                          if (activePedido.estado === 'Auditado' && !isEditingHistory) {
                            setIsEditingHistory(true);
                            addToast("Modo de edición activado. Haz clic nuevamente para desmarcar.", 'info');
                            return;
                          }
                          if ((activePedido.estado !== 'Auditado' || isEditingHistory) && !isEditingOrder && audit.status === 'Agotado') {
                            updateAuditValue(item.id, audit.qty, 'qty', undefined);
                          }
                        }}
                        className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg border ${audit.status === 'Agotado'
                          ? 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400'
                          : isMissing
                            ? 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400'
                            : 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20 text-amber-600 dark:text-amber-400'
                          } ${(activePedido.estado !== 'Auditado' || isEditingHistory || audit.status === 'Agotado') && !isEditingOrder ? 'cursor-pointer hover:scale-105 transition-transform select-none' : ''}`}
                        title={
                          activePedido.estado === 'Auditado' && !isEditingHistory
                            ? "Haz clic para editar"
                            : (audit.status === 'Agotado' ? "Click para desmarcar Agotado" : undefined)
                        }
                      >
                        {audit.status === 'Agotado' ? <PackageX size={16} /> : (isMissing ? <XCircle size={16} /> : <AlertCircle size={16} />)}
                        <span className="text-xs font-bold">
                          {audit.status === 'Agotado'
                            ? 'Agotadito!'
                            : (activePedido.estado === 'Auditado'
                              ? (isMissing ? `Faltaron ${Math.abs(diff)}` : `Sobraron ${diff}`)
                              : (isMissing ? `Faltan ${Math.abs(diff)}` : `Sobran ${diff}`))
                          }
                        </span>
                      </div>
                    )}
                  </div>

                </div>
              </div>
            </GlassCard>
          );
        })}
      </div>

      <Modal
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        title={confirmTitle}
        footer={
          <>
            <button
              onClick={() => setConfirmModalOpen(false)}
              className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={() => {
                confirmAction();
                setConfirmModalOpen(false);
              }}
              className="px-4 py-2 text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow-lg shadow-blue-500/30 transition-all"
            >
              Confirmar
            </button>
          </>
        }
      >
        <p>{confirmMessage}</p>
      </Modal>

      {/* Substitution Modal */}
      <Modal
        isOpen={substitutionModalOpen}
        onClose={() => setSubstitutionModalOpen(false)}
        title="Recibido Otra Marca"
        footer={
          <>
            <button
              onClick={() => setSubstitutionModalOpen(false)}
              className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleApplySubstitution}
              disabled={!selectedProductId || isProcessing}
              className="px-4 py-2 text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? <Loader2 className="animate-spin" /> : 'Confirmar Cambio'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-500/10 rounded-lg border border-blue-100 dark:border-blue-500/20 text-sm text-blue-800 dark:text-blue-300">
            <p className="font-bold mb-1">Intercambio de Producto</p>
            <p>Selecciona la marca y el producto que realmente llegó para actualizar el inventario correctamente.</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Marca Recibida</label>
            <CustomSelect
              options={availableBrands.map(b => ({ value: b.id, label: b.nombre }))}
              value={selectedBrandId}
              onChange={(val) => {
                setSelectedBrandId(val);
                setSelectedProductId('');
              }}
              placeholder="Buscar marca..."
              className="w-full"
            />
          </div>

          {selectedBrandId && (
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Producto Recibido</label>
              <CustomSelect
                options={availableProducts.map(p => ({ value: p.id, label: `${p.sku} - ${p.nombre}` }))}
                value={selectedProductId}
                onChange={(val) => setSelectedProductId(val)}
                disabled={isProcessing || availableProducts.length === 0}
                placeholder="Buscar producto..."
                className="w-full"
              />
              {availableProducts.length === 0 && !isProcessing && (
                <p className="text-xs text-amber-500 mt-1">No hay productos registrados para esta marca.</p>
              )}
            </div>
          )}
        </div>
      </Modal>

      {/* Add Item Modal */}
      <Modal
        isOpen={addItemModalOpen}
        onClose={() => setAddItemModalOpen(false)}
        title="Agregar Producto a la Orden"
        maxWidth="max-w-xl"
        footer={
          <button
            onClick={() => setAddItemModalOpen(false)}
            className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors"
          >
            Cerrar
          </button>
        }
      >
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              autoFocus
              type="text"
              placeholder="Buscar por nombre o SKU..."
              className="w-full pl-10 pr-4 py-2.5 input-premium rounded-xl"
              value={productSearchTerm}
              onChange={e => setProductSearchTerm(e.target.value)}
            />
          </div>

          <div className="h-64 overflow-y-auto space-y-2 pr-1">
            {isSearchingProducts ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="animate-spin text-blue-500" />
              </div>
            ) : (
              allProducts
                .filter(p => p.nombre.toLowerCase().includes(productSearchTerm.toLowerCase()) || p.sku.toLowerCase().includes(productSearchTerm.toLowerCase()))
                .map(p => {
                  const alreadyAdded = items.some(i => i.producto_id === p.id);
                  return (
                    <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                      <div>
                        <p className="font-bold text-sm text-slate-800 dark:text-slate-200">{p.nombre}</p>
                        <div className="flex gap-2 mt-1">
                          <span className="text-[10px] bg-white dark:bg-black/40 px-1.5 py-0.5 rounded text-slate-950 dark:text-white font-black font-mono border border-slate-200 dark:border-slate-800 shadow-sm">{p.sku}</span>
                          <span className="text-[10px] text-slate-400">{p.marca?.nombre}</span>
                          {p.categoria && <span className="text-[10px] text-blue-500 font-bold">{p.categoria.name}</span>}
                          {p.es_nueva && (
                            <span className="text-[9px] font-black bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded border border-amber-200">
                              NUEVA
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleAddNewItem(p)}
                        disabled={alreadyAdded}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${alreadyAdded
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-500/20'
                          }`}
                      >
                        {alreadyAdded ? 'Agregado' : 'Agregar'}
                      </button>
                    </div>
                  );
                })
            )}
            {!isSearchingProducts && allProducts.length > 0 && allProducts.filter(p => p.nombre.toLowerCase().includes(productSearchTerm.toLowerCase())).length === 0 && (
              <p className="text-center text-slate-400 text-sm py-8">No se encontraron productos.</p>
            )}
          </div>
        </div>
      </Modal>

      {/* Exit Confirmation Modal */}
      {showExitModal && (
        <Modal
          isOpen={showExitModal}
          onClose={() => setShowExitModal(false)}
          title="Guardar cambios"
          footer={
            <>
              <button
                onClick={() => {
                  setShowExitModal(false);
                  setActivePedido(null);
                }}
                className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors"
              >
                Salir sin guardar
              </button>
              <button
                onClick={() => setShowExitModal(false)}
                className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  setShowExitModal(false);
                  handleSaveProgress().then(() => setActivePedido(null));
                }}
                className="px-4 py-2 text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow-lg shadow-blue-500/30 transition-all flex items-center"
              >
                <Save size={16} className="mr-2" />
                Guardar y Salir
              </button>
            </>
          }
        >
          <p>Tienes cambios sin guardar. ¿Deseas guardar el progreso antes de salir? El pedido se mantendrá como "En Camino".</p>
        </Modal>
      )}

    </div >
  );
};

export default Audit;

