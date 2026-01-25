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
  Filter
} from 'lucide-react';
import { repository } from '../services/repository';
import { Pedido, PedidoItem, EstadoItem } from '../types';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';

const Audit = () => {
  const { addToast } = useToast();
  const [activePedido, setActivePedido] = useState<Pedido | null>(null);
  const [items, setItems] = useState<PedidoItem[]>([]);
  const [pedidosPendientes, setPedidosPendientes] = useState<Pedido[]>([]);
  const [pedidosHistorial, setPedidosHistorial] = useState<Pedido[]>([]);

  const [viewMode, setViewMode] = useState<'PENDING' | 'HISTORY'>('PENDING');
  const [searchTerm, setSearchTerm] = useState('');

  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [auditedValues, setAuditedValues] = useState<Record<string, { qty: number, status: EstadoItem }>>({});

  // Modal State
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<() => void>(() => { });
  const [confirmTitle, setConfirmTitle] = useState('');
  const [confirmMessage, setConfirmMessage] = useState('');

  useEffect(() => {
    loadPedidos();
  }, []);

  const loadPedidos = async () => {
    try {
      setLoading(true);
      const allPedidos = await repository.getPedidos();
      setPedidosPendientes(allPedidos.filter(p => p.estado === 'Pendiente'));
      setPedidosHistorial(allPedidos.filter(p => p.estado === 'Auditado'));
    } catch (error) {
      console.error("Error loading orders:", error);
      addToast("Error al cargar pedidos.", 'error');
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
    const list = viewMode === 'PENDING' ? pedidosPendientes : pedidosHistorial;
    if (!searchTerm) return list;
    return list.filter(p =>
      p.proveedor?.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.id.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [viewMode, pedidosPendientes, pedidosHistorial, searchTerm]);

  const handleSelectPedido = async (p: Pedido) => {
    try {
      setIsProcessing(true);
      setActivePedido(p);
      const pedidoItems = await repository.getPedidoItems(p.id);
      setItems(pedidoItems);

      // Initialize audit state
      const initialAudit: Record<string, { qty: number, status: EstadoItem }> = {};
      pedidoItems.forEach(item => {
        // If already audited, use received quantity, else use requested
        const qty = p.estado === 'Auditado' ? item.cantidad_recibida : item.cantidad_pedida;
        // If already audited, use item status, else default 'Completo' (as target)
        const status = p.estado === 'Auditado' ? item.estado_item : 'Completo';

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

  const updateAuditValue = (itemId: string, qty: number) => {
    const requested = items.find(i => i.id === itemId)?.cantidad_pedida || 0;
    let status: EstadoItem = 'Completo';
    if (qty === 0) status = 'No llegó';
    else if (qty < requested) status = 'Incompleto';
    else if (qty > requested) status = 'Completo'; // over-delivery

    setAuditedValues(prev => ({
      ...prev,
      [itemId]: { qty, status }
    }));
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

  const handleFinalizeAudit = async () => {
    if (!activePedido) return;
    setIsProcessing(true);

    try {
      // 1. Update Items & Stock
      const promises = items.map(async item => {
        const audit = auditedValues[item.id];

        // Update Master Stock
        await repository.updateStock(item.producto_id, audit.qty);

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
        fecha_recepcion: new Date().toISOString()
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

  // Progress Calculation
  const progressStats = useMemo(() => {
    const total = items.length;
    if (total === 0) return { percent: 0, perfect: 0 };

    let perfectCount = 0;
    items.forEach(item => {
      const audit = auditedValues[item.id];
      if (audit && audit.qty === item.cantidad_pedida) perfectCount++;
    });

    return {
      percent: Math.round((perfectCount / total) * 100),
      perfect: perfectCount
    };
  }, [items, auditedValues]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <Loader2 className="animate-spin text-indigo-500" size={48} />
        <p className="text-slate-400 animate-pulse">Cargando recepciones pendientes...</p>
      </div>
    );
  }

  if (!activePedido) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500 pb-10">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold">Auditoría de Recepción</h2>
            <p className="text-slate-400">Conciliación de pedidos contra inventario en la nube.</p>
          </div>

          <div className="flex bg-slate-100 dark:bg-black/20 p-1 rounded-xl border border-slate-200 dark:border-white/5">
            <button
              onClick={() => setViewMode('PENDING')}
              className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${viewMode === 'PENDING' ? 'bg-white dark:bg-indigo-500 text-indigo-600 dark:text-white shadow-sm ring-1 ring-black/5 dark:ring-0' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              <Truck size={16} />
              <span>Pendientes</span>
              {pedidosPendientes.length > 0 && <span className="bg-indigo-100 dark:bg-white/20 text-indigo-600 dark:text-white px-1.5 rounded-full text-[10px]">{pedidosPendientes.length}</span>}
            </button>
            <button
              onClick={() => setViewMode('HISTORY')}
              className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${viewMode === 'HISTORY' ? 'bg-white dark:bg-emerald-500 text-emerald-600 dark:text-white shadow-sm ring-1 ring-black/5 dark:ring-0' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              <History size={16} />
              <span>Historial</span>
            </button>
          </div>
        </header>

        {/* Search */}
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={20} />
          <input
            type="text"
            placeholder="Buscar por proveedor o ID de pedido..."
            className="w-full pl-12 pr-4 py-4 input-premium rounded-2xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 focus:outline-none transition-all placeholder:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#334155] shadow-inner"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOrders.length === 0 ? (
            <div className="col-span-full py-24 text-center card-premium rounded-3xl border border-dashed border-[#334155]">
              {viewMode === 'PENDING' ? (
                <Truck size={64} className="mx-auto mb-6 opacity-20 text-slate-400" />
              ) : (
                <Archive size={64} className="mx-auto mb-6 opacity-20 text-slate-400" />
              )}
              <h3 className="text-xl font-bold text-slate-300 mb-2">
                {searchTerm ? 'No se encontraron resultados' : 'Lista vacía'}
              </h3>
              <p className="text-slate-500">
                {searchTerm ? 'Intenta con otro término de búsqueda.' :
                  viewMode === 'PENDING' ? 'No hay pedidos pendientes de recepción.' : 'No hay historial de auditorías disponible.'}
              </p>
            </div>
          ) : (
            filteredOrders.map(p => (
              <GlassCard key={p.id} className="group cursor-pointer hover:border-indigo-500/50 hover:shadow-indigo-500/20 transition-all active:scale-[0.98]" noPadding>
                <div className="p-6 border-b border-[#334155] bg-gradient-to-br from-[#1e293b] to-[#0f172a]">
                  <div className="flex justify-between items-start mb-6">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${p.estado === 'Auditado'
                      ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                      }`}>
                      {p.estado === 'Auditado' ? 'Finalizado' : 'En Tránsito'}
                    </span>
                    <span className="text-xs text-slate-500 font-mono">{new Date(p.fecha_creacion).toLocaleDateString()}</span>
                  </div>
                  <h4 className="text-xl font-bold mb-2 text-slate-100">{p.proveedor?.nombre}</h4>
                  <div className="flex items-center text-slate-400 text-sm">
                    <PackageCheck size={16} className="mr-2 opacity-70" />
                    <span>{p.total_items} referencias</span>
                  </div>
                </div>
                {p.estado === 'Pendiente' && (
                  <div className="p-4">
                    <button
                      onClick={() => handleSelectPedido(p)}
                      className="w-full py-3 rounded-xl bg-indigo-600/10 text-indigo-400 font-bold group-hover:bg-indigo-600 group-hover:text-white transition-all flex items-center justify-center border border-indigo-500/20 group-hover:border-transparent"
                    >
                      {isProcessing ? <Loader2 className="animate-spin" /> : <>Iniciar Recepción <ArrowRight size={18} className="ml-2 group-hover:translate-x-1 transition-transform" /></>}
                    </button>
                  </div>
                )}
                {p.estado === 'Auditado' && p.fecha_recepcion && (
                  <div className="p-4 bg-black/20">
                    <div className="flex justify-between items-center px-2">
                      <p className="text-xs text-slate-500">
                        {new Date(p.fecha_recepcion).toLocaleDateString()}
                      </p>
                      <button
                        onClick={() => handleSelectPedido(p)}
                        className="px-3 py-1.5 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-all border border-slate-600/30 hover:border-slate-500"
                      >
                        Ver Detalle
                      </button>
                    </div>
                  </div>
                )}
              </GlassCard>
            ))
          )}
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-8 duration-500 pb-20">
      {/* Active Header */}
      <GlassCard className="sticky top-4 z-40 border-[#334155] shadow-2xl bg-[#1e293b]">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center space-x-4 w-full md:w-auto">
            <button
              onClick={() => {
                if (activePedido.estado === 'Auditado') {
                  setActivePedido(null);
                } else {
                  openConfirmModal(
                    '¿Salir sin guardar?',
                    'Perderás el progreso de la auditoría actual.',
                    () => setActivePedido(null)
                  );
                }
              }}
              className="p-3 glass rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            >
              <ArrowRight size={20} className="rotate-180" />
            </button>
            <div className="min-w-0">
              <h2 className="text-xl font-bold truncate">
                {activePedido.estado === 'Auditado' ? 'Detalle Histórico' : 'Recepción'}: {activePedido.proveedor?.nombre}
              </h2>
              <div className="flex items-center space-x-2 text-xs text-slate-400">
                <span className="font-mono">#{activePedido.id.slice(0, 8)}</span>
                <span>•</span>
                <span>{items.length} ítems</span>
                {activePedido.estado === 'Auditado' && activePedido.fecha_recepcion && (
                  <>
                    <span>•</span>
                    <span className="text-emerald-400">Finalizado el {new Date(activePedido.fecha_recepcion).toLocaleDateString()}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 w-full md:w-auto px-4">
            <div className="flex justify-between items-end mb-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Progreso</span>
              <span className={`text-xs font-black ${progressStats.percent === 100 ? 'text-emerald-400' : 'text-indigo-400'}`}>
                {progressStats.percent}% Completado
              </span>
            </div>
            <div className="h-2 w-full bg-[#0f172a] rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ease-out rounded-full ${progressStats.percent === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                style={{ width: `${progressStats.percent}%` }}
              ></div>
            </div>
          </div>

          <div className="flex gap-3 w-full md:w-auto">
            {activePedido.estado !== 'Auditado' && (
              <>
                <button
                  onClick={handleReceiveAll}
                  disabled={isProcessing}
                  className="px-4 py-2 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-500 border border-emerald-500/30 rounded-xl text-xs font-bold transition-all whitespace-nowrap"
                >
                  Recibir Todo OK
                </button>
                <button
                  onClick={handleFinalizeAudit}
                  disabled={isProcessing}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-600/20 transition-all active:scale-95 whitespace-nowrap flex items-center"
                >
                  {isProcessing && <Loader2 className="animate-spin mr-2" size={16} />}
                  Finalizar
                </button>
              </>
            )}
          </div>
        </div>
      </GlassCard>

      {/* Grid of Items */}
      <div className="grid grid-cols-1 gap-3">
        {items.map(item => {
          const audit = auditedValues[item.id];
          if (!audit) return null; // Guard against race conditions

          const diff = audit.qty - item.cantidad_pedida;
          const isPerfect = diff === 0;
          const isMissing = diff < 0;

          return (
            <GlassCard
              key={item.id}
              noPadding
              className={`transition-all duration-300 ${isPerfect
                ? 'border-emerald-500/30 bg-emerald-500/[0.02]'
                : 'border-amber-500/30 bg-amber-500/[0.02]'
                }`}
            >
              <div className="p-4 flex flex-col md:flex-row items-center gap-6">

                {/* Product Info */}
                <div className="flex items-center space-x-4 flex-1 w-full md:w-auto">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${isPerfect ? 'bg-emerald-500/10 text-emerald-400' : 'bg-[#0f172a] text-slate-400'}`}>
                    {isPerfect ? <Check size={28} /> : <ClipboardList size={28} />}
                  </div>
                  <div className="min-w-0">
                    <h5 className={`font-bold text-lg truncate ${isPerfect ? 'text-emerald-100' : 'text-slate-200'}`}>
                      {item.producto?.nombre}
                    </h5>
                    <div className="flex items-center space-x-2">
                      <span className="px-1.5 py-0.5 rounded-md bg-[#0f172a] text-[10px] font-mono text-slate-400 border border-[#334155]">
                        {item.producto?.sku}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-between w-full md:w-auto gap-8">

                  {/* Expected */}
                  <div className="text-center opacity-60">
                    <p className="text-[9px] uppercase font-black tracking-widest mb-1">Esperado</p>
                    <p className="text-xl font-mono">{item.cantidad_pedida}</p>
                  </div>

                  {/* Divider */}
                  <div className="h-8 w-px bg-white/10 hidden md:block"></div>

                  {/* Received Input */}
                  <div className="text-center">
                    <p className={`text-[9px] uppercase font-black tracking-widest mb-1 ${isPerfect ? 'text-emerald-400' : 'text-amber-400'}`}>Recibido</p>
                    <div className="flex items-center bg-[#0f172a] rounded-xl p-1 border border-[#334155]">
                      {activePedido.estado !== 'Auditado' && (
                        <button
                          onClick={() => updateAuditValue(item.id, Math.max(0, audit.qty - 1))}
                          className="w-10 h-10 rounded-lg bg-white/5 hover:bg-rose-500/20 hover:text-rose-400 flex items-center justify-center transition-colors active:scale-90"
                        >-</button>
                      )}
                      <input
                        type="number"
                        value={audit.qty}
                        readOnly={activePedido.estado === 'Auditado'}
                        onChange={(e) => updateAuditValue(item.id, parseInt(e.target.value) || 0)}
                        className={`w-16 text-center bg-transparent font-mono text-xl font-bold focus:outline-none ${isPerfect ? 'text-emerald-400' : 'text-amber-400'} ${activePedido.estado === 'Auditado' ? 'cursor-default' : ''}`}
                      />
                      {activePedido.estado !== 'Auditado' && (
                        <button
                          onClick={() => updateAuditValue(item.id, audit.qty + 1)}
                          className="w-10 h-10 rounded-lg bg-white/5 hover:bg-emerald-500/20 hover:text-emerald-400 flex items-center justify-center transition-colors active:scale-90"
                        >+</button>
                      )}
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="h-8 w-px bg-white/10 hidden md:block"></div>

                  {/* Status Badge */}
                  <div className="min-w-[120px] flex justify-end">
                    {isPerfect ? (
                      <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                        <CheckCircle2 size={16} />
                        <span className="text-xs font-bold">Completo</span>
                      </div>
                    ) : (
                      <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg border ${isMissing ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-400'}`}>
                        {isMissing ? <XCircle size={16} /> : <AlertCircle size={16} />}
                        <span className="text-xs font-bold">
                          {activePedido.estado === 'Auditado'
                            ? (isMissing ? `Faltaron ${Math.abs(diff)}` : `Sobraron ${diff}`)
                            : (isMissing ? `Faltan ${Math.abs(diff)}` : `Sobran ${diff}`)
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
              className="px-4 py-2 text-sm font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg shadow-lg shadow-indigo-500/30 transition-all"
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
};

export default Audit;
