
import React from 'react';
import GlassCard from '../components/GlassCard';
import { 
  AlertTriangle, 
  TrendingUp, 
  Clock, 
  Box, 
  ArrowUpRight,
  ChevronRight
} from 'lucide-react';
import { db } from '../services/mockDb';

interface DashboardProps {
  onNavigate: (view: string) => void;
}

const StatCard = ({ title, value, icon: Icon, color, trend }: any) => (
  <GlassCard className="flex flex-col justify-between h-full">
    <div className="flex justify-between items-start mb-4">
      <div className={`p-3 rounded-2xl ${color}`}>
        <Icon size={24} className="text-white" />
      </div>
      {trend && (
        <span className="flex items-center text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full">
          {trend} <ArrowUpRight size={12} className="ml-1" />
        </span>
      )}
    </div>
    <div>
      <p className="text-slate-400 text-sm font-medium">{title}</p>
      <h3 className="text-3xl font-bold mt-1">{value}</h3>
    </div>
  </GlassCard>
);

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const products = db.getProductos();
  const criticalStock = products.filter(p => p.stock_actual <= p.stock_minimo);
  const highRotation = products.filter(p => p.is_high_rotation);
  const pendingOrders = db.pedidos.filter(p => p.estado === 'Pendiente').length;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold">Resumen Operativo</h2>
          <p className="text-slate-400">Control total del inventario y flujo de bodega.</p>
        </div>
        <div className="flex space-x-2">
          <button className="px-4 py-2 glass rounded-xl text-sm font-medium glass-hover">Reporte Semanal</button>
          <button 
            onClick={() => onNavigate('orders')}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-sm font-medium transition-all shadow-lg shadow-indigo-600/20"
          >
            Nuevo Pedido
          </button>
        </div>
      </header>

      {/* Bento Grid Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Stock Crítico" 
          value={criticalStock.length} 
          icon={AlertTriangle} 
          color="bg-rose-500" 
          trend="+2 vs ayer"
        />
        <StatCard 
          title="Pedidos en Curso" 
          value={pendingOrders} 
          icon={Clock} 
          color="bg-amber-500" 
        />
        <StatCard 
          title="Total Referencias" 
          value={products.length} 
          icon={Box} 
          color="bg-indigo-500" 
        />
        <StatCard 
          title="Faltantes de Semana" 
          value="14" 
          icon={TrendingUp} 
          color="bg-violet-500" 
          trend="+5%"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Critical Items List */}
        <div className="lg:col-span-2">
          <GlassCard className="h-full">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Productos en Alerta</h3>
              <button 
                onClick={() => onNavigate('inventory')}
                className="text-indigo-400 text-sm font-medium hover:underline"
              >
                Ver todo
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-slate-500 text-xs uppercase tracking-wider">
                    <th className="pb-4">Producto</th>
                    <th className="pb-4 text-center">Stock</th>
                    <th className="pb-4 text-center">Mínimo</th>
                    <th className="pb-4">Estado</th>
                    <th className="pb-4 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {criticalStock.map(p => (
                    <tr key={p.id} className="group hover:bg-white/5 transition-colors">
                      <td className="py-4">
                        <div className="flex items-center space-x-3">
                          <img src={p.imagen_url} className="w-10 h-10 rounded-lg object-cover" alt="" />
                          <div>
                            <p className="font-medium text-slate-200">{p.nombre}</p>
                            <p className="text-xs text-slate-500">{p.sku}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 font-semibold text-rose-400 text-center">{p.stock_actual}</td>
                      <td className="py-4 text-slate-400 text-center">{p.stock_minimo}</td>
                      <td className="py-4">
                        <span className="px-2 py-1 rounded-full bg-rose-500/10 text-rose-500 text-[10px] font-bold uppercase whitespace-nowrap">Stock Bajo</span>
                      </td>
                      <td className="py-4 text-right">
                        <button 
                          onClick={() => onNavigate('orders')}
                          className="p-2 hover:bg-white/10 rounded-lg text-slate-400 group-hover:text-white transition-all"
                        >
                          <ChevronRight size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {criticalStock.length === 0 && (
                <div className="py-10 text-center text-slate-500">Todo el inventario está en niveles óptimos.</div>
              )}
            </div>
          </GlassCard>
        </div>

        {/* High Rotation Sidebar */}
        <div>
          <GlassCard className="h-full">
            <h3 className="text-xl font-bold mb-6">Alta Rotación</h3>
            <div className="space-y-4">
              {highRotation.map(p => (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-400 font-bold overflow-hidden">
                      {p.imagen_url ? <img src={p.imagen_url} className="w-full h-full object-cover" /> : p.nombre[0]}
                    </div>
                    <div>
                      <p className="text-sm font-semibold truncate w-32">{p.nombre}</p>
                      <p className="text-xs text-slate-500">{p.marca?.nombre}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium text-emerald-400">En Stock: {p.stock_actual}</p>
                  </div>
                </div>
              ))}
              {highRotation.length === 0 && (
                <div className="py-10 text-center text-slate-500 text-sm">No hay productos de alta rotación definidos.</div>
              )}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
