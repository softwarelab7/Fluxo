
import React, { useState } from 'react';
import GlassCard from '../components/GlassCard';
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Search,
  Truck,
  ArrowRight,
  ClipboardList
} from 'lucide-react';
import { db } from '../services/mockDb';
import { Pedido, PedidoItem, EstadoItem } from '../types';

const Audit = () => {
  const [activePedido, setActivePedido] = useState<Pedido | null>(null);
  const [items, setItems] = useState<PedidoItem[]>([]);
  const [auditedValues, setAuditedValues] = useState<Record<string, { qty: number, status: EstadoItem }>>({});

  const handleSelectPedido = (p: Pedido) => {
    const pedidoItems = db.pedidoItems.filter(item => item.pedido_id === p.id).map(item => ({
      ...item,
      producto: db.productos.find(prod => prod.id === item.producto_id)
    }));
    setActivePedido(p);
    setItems(pedidoItems);
    
    // Initialize audit state
    const initialAudit: Record<string, { qty: number, status: EstadoItem }> = {};
    pedidoItems.forEach(item => {
      initialAudit[item.id] = { qty: item.cantidad_pedida, status: 'Completo' };
    });
    setAuditedValues(initialAudit);
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

  const handleFinalizeAudit = () => {
    if (!activePedido) return;

    // Update the master stock and mark items as received
    items.forEach(item => {
      const audit = auditedValues[item.id];
      db.updateStock(item.producto_id, audit.qty);
      
      const itemIdx = db.pedidoItems.findIndex(pi => pi.id === item.id);
      if (itemIdx !== -1) {
        db.pedidoItems[itemIdx].cantidad_recibida = audit.qty;
        db.pedidoItems[itemIdx].estado_item = audit.status;
        db.pedidoItems[itemIdx].auditado_at = new Date().toISOString();
      }
    });

    const pedIdx = db.pedidos.findIndex(p => p.id === activePedido.id);
    if (pedIdx !== -1) {
      db.pedidos[pedIdx].estado = 'Auditado';
      db.pedidos[pedIdx].fecha_recepcion = new Date().toISOString();
    }
    
    db.save();
    alert('Auditoría finalizada con éxito. El inventario ha sido actualizado.');
    setActivePedido(null);
  };

  if (!activePedido) {
    return (
      <div className="space-y-6">
        <header>
          <h2 className="text-3xl font-bold">Auditoría de Recepción</h2>
          <p className="text-slate-400">Verifica lo pedido contra lo recibido físicamente.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {db.pedidos.filter(p => p.estado === 'Pendiente').length === 0 ? (
            <div className="col-span-full py-20 text-center glass rounded-[20px]">
              <Truck size={48} className="mx-auto mb-4 opacity-20" />
              <p className="text-slate-500">No hay pedidos pendientes para auditar.</p>
            </div>
          ) : (
            db.pedidos.filter(p => p.estado === 'Pendiente').map(p => (
              <GlassCard key={p.id} className="group cursor-pointer hover:scale-[1.02] transition-transform" noPadding>
                <div className="p-6 border-b border-white/10">
                  <div className="flex justify-between items-start mb-4">
                    <span className="px-2 py-1 rounded bg-amber-500/10 text-amber-500 text-[10px] font-bold uppercase">
                      Pendiente
                    </span>
                    <span className="text-xs text-slate-500">{new Date(p.fecha_creacion).toLocaleDateString()}</span>
                  </div>
                  <h4 className="text-lg font-bold mb-1">{p.proveedor?.nombre}</h4>
                  <p className="text-sm text-slate-400">{p.total_items} productos por verificar</p>
                </div>
                <button 
                  onClick={() => handleSelectPedido(p)}
                  className="w-full py-4 text-center text-sm font-semibold text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-all flex items-center justify-center"
                >
                  Iniciar Auditoría <ArrowRight size={16} className="ml-2" />
                </button>
              </GlassCard>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center space-x-4">
          <button onClick={() => setActivePedido(null)} className="p-2 glass rounded-xl hover:bg-white/10">
            <ClipboardList size={20} />
          </button>
          <div>
            <h2 className="text-2xl font-bold">Conciliación: {activePedido.proveedor?.nombre}</h2>
            <p className="text-slate-400">ID Pedido: {activePedido.id}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setActivePedido(null)} className="px-4 py-2 glass rounded-xl text-sm font-medium">Cancelar</button>
          <button onClick={handleFinalizeAudit} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-sm font-bold shadow-lg shadow-emerald-600/20">
            Finalizar y Actualizar Stock
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4">
        {items.map(item => {
          const audit = auditedValues[item.id];
          const diff = audit.qty - item.cantidad_pedida;
          
          return (
            <GlassCard key={item.id} noPadding className="border-l-4 border-indigo-500">
              <div className="p-4 md:p-6 flex flex-col md:flex-row items-center gap-6">
                <div className="flex items-center space-x-4 flex-1">
                  <img src={item.producto?.imagen_url} className="w-16 h-16 rounded-xl object-cover" alt="" />
                  <div>
                    <h5 className="font-bold text-lg">{item.producto?.nombre}</h5>
                    <p className="text-xs text-slate-500 font-mono">{item.producto?.sku}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-8">
                  <div className="text-center">
                    <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Pedido</p>
                    <p className="text-xl font-mono">{item.cantidad_pedida}</p>
                  </div>
                  
                  <div className="h-10 w-px bg-white/10 hidden md:block"></div>

                  <div className="text-center">
                    <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Recibido</p>
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={() => updateAuditValue(item.id, Math.max(0, audit.qty - 1))}
                        className="w-8 h-8 rounded-lg glass flex items-center justify-center text-xl hover:bg-white/10"
                      >-</button>
                      <input 
                        type="number" 
                        value={audit.qty}
                        onChange={(e) => updateAuditValue(item.id, parseInt(e.target.value) || 0)}
                        className="w-16 text-center bg-white/5 border border-white/10 rounded-lg py-1 font-mono text-lg focus:outline-none focus:border-indigo-500"
                      />
                      <button 
                        onClick={() => updateAuditValue(item.id, audit.qty + 1)}
                        className="w-8 h-8 rounded-lg glass flex items-center justify-center text-xl hover:bg-white/10"
                      >+</button>
                    </div>
                  </div>

                  <div className="text-center min-w-[100px]">
                    <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Estado</p>
                    {diff === 0 ? (
                      <span className="flex items-center justify-center text-emerald-400 text-sm font-bold">
                        <CheckCircle2 size={16} className="mr-1" /> OK
                      </span>
                    ) : diff < 0 ? (
                      <span className="flex items-center justify-center text-rose-400 text-sm font-bold">
                        <XCircle size={16} className="mr-1" /> Faltan {Math.abs(diff)}
                      </span>
                    ) : (
                      <span className="flex items-center justify-center text-amber-400 text-sm font-bold">
                        <AlertCircle size={16} className="mr-1" /> Sobran {diff}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
};

export default Audit;
