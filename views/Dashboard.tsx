
import React, { useState, useEffect } from 'react';
import GlassCard from '../components/GlassCard';
import {
  AlertTriangle,
  TrendingUp,
  Clock,
  Box,
  ArrowUpRight,
  ChevronRight
} from 'lucide-react';
import { repository } from '../services/repository';

interface DashboardProps {
  onNavigate: (view: string) => void;
}

const StatCard = ({ title, value, icon: Icon, color, trend }: any) => {
  // Extract base color name for gradient construction (simplistic approach for this constrained set)
  let gradientClass = "from-indigo-500/10 to-purple-500/10 dark:from-indigo-500/20 dark:to-purple-500/20 text-indigo-500 dark:text-indigo-400"; // Default

  if (color.includes("rose") || color.includes("red")) {
    gradientClass = "from-rose-500/10 to-orange-500/10 dark:from-rose-500/20 dark:to-orange-500/20 text-rose-500 dark:text-rose-400";
  } else if (color.includes("emerald") || color.includes("green")) {
    gradientClass = "from-emerald-500/10 to-teal-500/10 dark:from-emerald-500/20 dark:to-teal-500/20 text-emerald-500 dark:text-emerald-400";
  } else if (color.includes("amber") || color.includes("yellow")) {
    gradientClass = "from-amber-500/10 to-yellow-500/10 dark:from-amber-500/20 dark:to-yellow-500/20 text-amber-500 dark:text-amber-400";
  }

  return (
    <GlassCard className="flex flex-col justify-between h-full group hover:bg-white dark:hover:bg-[#334155] border-slate-200 dark:border-[#334155] transition-all duration-300 shadow-sm hover:shadow-md">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-2xl bg-gradient-to-br ${gradientClass} shadow-sm group-hover:scale-110 transition-transform duration-300 border border-slate-100 dark:border-white/5`}>
          <Icon size={24} />
        </div>
        {trend && (
          <span className="flex items-center text-[10px] font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 px-2 py-1 rounded-full uppercase tracking-wider">
            {trend} <ArrowUpRight size={12} className="ml-1" />
          </span>
        )}
      </div>
      <div>
        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium tracking-wide uppercase">{title}</p>
        <h3 className="text-3xl font-bold mt-1 text-slate-800 dark:text-white">{value}</h3>
      </div>
    </GlassCard>
  );
};

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    criticalCount: 0,
    pendingOrdersCount: 0,
    totalProducts: 0,
    criticalItems: [] as any[],
    highRotationItems: [] as any[]
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [products, pedidos] = await Promise.all([
        repository.getProductos(),
        repository.getPedidos()
      ]);

      const critical = products.filter(p => p.stock_actual <= p.stock_minimo);
      const highRot = products.filter(p => p.is_high_rotation);
      const pending = pedidos.filter(p => p.estado === 'Pendiente');

      setStats({
        criticalCount: critical.length,
        pendingOrdersCount: pending.length,
        totalProducts: products.length,
        criticalItems: critical,
        highRotationItems: highRot
      });
    } catch (error) {
      console.error("Error loading dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <p className="text-slate-400 animate-pulse">Cargando métricas...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in-up">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Resumen Operativo</h2>
          <p className="text-slate-500 dark:text-slate-400">Control total del inventario y flujo de bodega.</p>
        </div>
        <div className="flex space-x-2">
          <button className="px-4 py-2 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-xl text-sm font-medium hover:bg-slate-50 dark:hover:bg-[#334155] text-slate-700 dark:text-slate-300 transition-all">Reporte Semanal</button>
          <button
            onClick={() => onNavigate('orders')}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-sm font-medium transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_25px_rgba(79,70,229,0.5)] active:scale-95 text-white"
          >
            Nuevo Pedido
          </button>
        </div>
      </header>

      {/* Bento Grid Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard
          title="Stock Crítico"
          value={stats.criticalCount}
          icon={AlertTriangle}
          color={stats.criticalCount > 0 ? "bg-rose-500" : "bg-emerald-500"}
          trend={stats.criticalCount > 0 ? "Atención" : undefined}
        />
        <StatCard
          title="Pedidos en Curso"
          value={stats.pendingOrdersCount}
          icon={Clock}
          color="bg-amber-500"
        />
        <StatCard
          title="Total Referencias"
          value={stats.totalProducts}
          icon={Box}
          color="bg-indigo-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Critical Items List */}
        <div className="lg:col-span-2">
          <GlassCard className="h-full">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Productos en Alerta</h3>
              <button
                onClick={() => onNavigate('inventory')}
                className="text-indigo-600 dark:text-indigo-400 text-sm font-medium hover:text-indigo-500 dark:hover:text-indigo-300 transition-colors flex items-center gap-1 group"
              >
                Ver todo <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider border-b border-slate-200 dark:border-[#334155]">
                    <th className="pb-4 pl-4 font-semibold">Producto</th>
                    <th className="pb-4 text-center font-semibold">Stock</th>
                    <th className="pb-4 text-center font-semibold">Mínimo</th>
                    <th className="pb-4 font-semibold">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-[#334155]">
                  {stats.criticalItems.slice(0, 5).map(p => (
                    <tr key={p.id} className="group hover:bg-slate-50 dark:hover:bg-[#334155]/20 transition-all duration-300 border-b border-slate-200 dark:border-[#334155] last:border-0 relative hover:shadow-lg">
                      <td className="py-4 pl-4">
                        <div className="flex items-center space-x-3">
                          <div className="p-2.5 bg-indigo-500/10 rounded-xl group-hover:bg-indigo-500/20 transition-colors group-hover:scale-110 duration-300">
                            <Box className="text-indigo-600 dark:text-indigo-400" size={20} />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-white transition-colors">{p.nombre}</p>
                            <p className="text-[11px] text-slate-500 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors font-mono tracking-wide">{p.sku}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 font-bold text-rose-500 dark:text-rose-400 text-center text-lg">{p.stock_actual}</td>
                      <td className="py-4 text-slate-500 dark:text-slate-400 text-center font-mono">{p.stock_minimo}</td>
                      <td className="py-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-[10px] font-bold uppercase tracking-wider">
                          Stock Bajo
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {stats.criticalItems.length === 0 && (
                <div className="py-10 text-center text-slate-500">Todo el inventario está en niveles óptimos.</div>
              )}
            </div>
          </GlassCard>
        </div>

        {/* High Rotation Sidebar */}
        <div>
          <GlassCard className="h-full">
            <h3 className="text-xl font-bold mb-6 text-slate-900 dark:text-slate-100">Alta Rotación</h3>
            <div className="space-y-4">
              {stats.highRotationItems.slice(0, 5).map(p => (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-[#1e293b] hover:bg-white dark:hover:bg-[#334155] border border-slate-200 dark:border-[#334155] hover:border-indigo-500/30 transition-all hover:translate-x-1 cursor-default group shadow-sm">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 dark:from-indigo-500/20 dark:to-purple-500/20 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold overflow-hidden border border-slate-200 dark:border-white/5 group-hover:border-indigo-500/30 transition-colors">
                      <Box size={24} className="group-hover:scale-110 transition-transform" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-white transition-colors truncate w-32">{p.nombre}</p>
                      <p className="text-[10px] text-slate-500 font-mono tracking-wide">{p.marca?.nombre}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 px-2 py-1 rounded-lg bg-emerald-500/10">{p.stock_actual} un.</p>
                  </div>
                </div>
              ))}
              {stats.highRotationItems.length === 0 && (
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
