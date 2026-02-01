
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';

import React, { useState, useEffect } from 'react';
import GlassCard from '../components/GlassCard';
import {
  AlertTriangle,
  TrendingUp,
  Clock,
  Box,
  ArrowUpRight,
  ChevronRight,
  Truck,
  FileText,
  Calendar
} from 'lucide-react';
import { repository } from '../services/repository';
import Modal from '../components/Modal';
import { Skeleton } from '../components/Skeleton';

interface DashboardProps {
  onNavigate: (view: string) => void;
}

const StatCard = ({ title, value, icon: Icon, color, trend }: any) => {
  // Extract base color name for gradient construction (simplistic approach for this constrained set)
  let gradientClass = "from-blue-500/10 to-purple-500/10 dark:from-blue-500/20 dark:to-purple-500/20 text-blue-500 dark:text-blue-400"; // Default

  if (color.includes("rose") || color.includes("red")) {
    gradientClass = "from-rose-500/10 to-orange-500/10 dark:from-rose-500/20 dark:to-orange-500/20 text-rose-500 dark:text-rose-400";
  } else if (color.includes("emerald") || color.includes("green")) {
    gradientClass = "from-emerald-500/10 to-teal-500/10 dark:from-emerald-500/20 dark:to-teal-500/20 text-emerald-500 dark:text-emerald-400";
  } else if (color.includes("amber") || color.includes("yellow")) {
    gradientClass = "from-amber-500/10 to-yellow-500/10 dark:from-amber-500/20 dark:to-yellow-500/20 text-amber-500 dark:text-amber-400";
  }

  return (
    <GlassCard className="flex flex-col justify-between h-full group hover:bg-white dark:hover:bg-[#334155] border-slate-200 dark:border-[#334155] transition-all duration-300 shadow-sm hover:shadow-md">
      <div className="flex justify-between items-start mb-1">
        <div className={`p-1.5 rounded-lg bg-gradient-to-br ${gradientClass} shadow-sm group-hover:scale-110 transition-transform duration-300 border border-slate-100 dark:border-white/5`}>
          <Icon size={16} />
        </div>
        {trend && (
          <span className="flex items-center text-[10px] font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 px-2 py-1 rounded-full uppercase tracking-wider">
            {trend} <ArrowUpRight size={12} className="ml-1" />
          </span>
        )}
      </div>
      <div>
        <p className="text-slate-500 dark:text-slate-400 text-xs font-medium tracking-wide uppercase">{title}</p>
        <h3 className="text-xl font-bold mt-0.5 text-slate-800 dark:text-white">{value}</h3>
      </div>
    </GlassCard>
  );
};

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    criticalCount: 0,
    pendingOrdersCount: 0,
    inTransitCount: 0,
    totalProducts: 0,
    inventoryValue: 0,
    criticalItems: [] as any[],
    highRotationItems: [] as any[],
    brandData: [] as any[],
    statusData: [] as any[]
  });
  const [showReportModal, setShowReportModal] = useState(false);

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
      const inTransit = pedidos.filter(p => p.estado === 'En Camino');

      // 1. Calculate Status Distribution
      const statusCounts = {
        'Crítico': critical.length,
        'Bajo': products.filter(p => p.stock_actual > p.stock_minimo && p.stock_actual <= p.stock_minimo * 1.5).length,
        'Óptimo': products.filter(p => p.stock_actual > p.stock_minimo * 1.5).length
      };

      const statusData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));

      // 2. Calculate Brand Distribution (Top 5)
      const brandCounts: Record<string, number> = {};
      products.forEach(p => {
        const brandName = p.marca?.nombre || 'Otros';
        brandCounts[brandName] = (brandCounts[brandName] || 0) + p.stock_actual;
      });

      const brandData = Object.entries(brandCounts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);

      setStats({
        criticalCount: critical.length,
        pendingOrdersCount: pending.length,
        inTransitCount: inTransit.length,
        totalProducts: products.length,
        inventoryValue: 0, // Placeholder if we had price
        criticalItems: critical,
        highRotationItems: highRot,
        brandData,
        statusData
      });
    } catch (error) {
      console.error("Error loading dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleWeeklyReport = () => {
    setShowReportModal(true);
  };

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        {/* Header Skeleton */}
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-32 rounded-full" />
            <Skeleton className="h-10 w-32 rounded-full" />
          </div>
        </div>

        {/* Bento Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>

        {/* Main Content Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="lg:col-span-2">
            <Skeleton className="h-96" />
          </div>
          <div>
            <Skeleton className="h-96" />
          </div>
        </div>

        {/* Bottom Chart Skeleton */}
        <Skeleton className="h-52" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Resumen Operativo</h2>
          <p className="text-slate-500 dark:text-slate-400">Control total del inventario y flujo de bodega.</p>
        </div>
        <div className="flex space-x-2">
          <button onClick={handleWeeklyReport} className="px-4 py-2 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-full text-sm font-bold hover:bg-slate-50 dark:hover:bg-[#334155] text-slate-700 dark:text-slate-300 transition-all shadow-sm">Reporte Semanal</button>
          <button
            onClick={() => onNavigate('orders')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-full text-sm font-bold transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 text-white"
          >
            Nuevo Pedido
          </button>
        </div>
      </header>

      {/* Bento Grid Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 animate-in fade-in zoom-in-95 duration-500 delay-100">
        <StatCard
          title="Stock Crítico"
          value={stats.criticalCount}
          icon={AlertTriangle}
          color={stats.criticalCount > 0 ? "bg-rose-500" : "bg-emerald-500"}
          trend={stats.criticalCount > 0 ? "Atención" : undefined}
        />
        <StatCard
          title={stats.inTransitCount > 0 ? "En Camino" : "Borradores"}
          value={stats.inTransitCount > 0 ? stats.inTransitCount : stats.pendingOrdersCount}
          icon={stats.inTransitCount > 0 ? Truck : Clock}
          color={stats.inTransitCount > 0 ? "bg-blue-500" : "bg-amber-500"}
          trend={stats.inTransitCount > 0 ? "Por Recibir" : undefined}
        />
        <StatCard
          title="Total Referencias"
          value={stats.totalProducts}
          icon={Box}
          color="bg-blue-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 animate-in fade-in zoom-in-95 duration-500 delay-200">
        {/* Critical Items List */}
        <div className="lg:col-span-2">
          <GlassCard className="h-full">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Productos en Alerta</h3>
              <button
                onClick={() => onNavigate('inventory')}
                className="text-blue-600 dark:text-blue-400 text-sm font-medium hover:text-blue-500 dark:hover:text-blue-300 transition-colors flex items-center gap-1 group"
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
                      <td className="py-2 pl-4">
                        <div className="flex items-center space-x-3">
                          <div className="p-2.5 bg-blue-500/10 rounded-xl group-hover:bg-blue-500/20 transition-colors group-hover:scale-110 duration-300">
                            <Box className="text-blue-600 dark:text-blue-400" size={18} />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-white transition-colors">{p.nombre}</p>
                            <p className="text-[10px] text-slate-500 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors font-mono tracking-wide">{p.sku}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-2 font-bold text-rose-500 dark:text-rose-400 text-center text-lg">{p.stock_actual}</td>
                      <td className="py-2 text-slate-500 dark:text-slate-400 text-center font-mono">{p.stock_minimo}</td>
                      <td className="py-2">
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

        {/* Brand Distribution Chart */}
        <div>
          <GlassCard className="h-full flex flex-col p-4">
            <h3 className="text-sm font-bold mb-2 text-slate-900 dark:text-slate-100">Distribución por Marca</h3>
            <div className="flex-1 w-full min-h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.brandData}
                    cx="50%"
                    cy="45%"
                    innerRadius={40}
                    outerRadius={60}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {stats.brandData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b'][index % 5]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc', fontSize: '12px' }}
                    itemStyle={{ color: '#f8fafc' }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconSize={10} wrapperStyle={{ fontSize: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Stock Status Bar Chart */}
      <div className="h-52 animate-in fade-in zoom-in-95 duration-500 delay-300">
        <GlassCard className="h-full p-4">
          <h3 className="text-sm font-bold mb-2 text-slate-900 dark:text-slate-100">Estado del Inventario</h3>
          <div className="w-full h-36">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.statusData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                <XAxis dataKey="name" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                />
                <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]}>
                  {stats.statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.name === 'Crítico' ? '#f43f5e' : entry.name === 'Bajo' ? '#f59e0b' : '#10b981'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </div>
      <Modal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        title="Reporte Semanal"
        maxWidth="sm:max-w-xl"
        footer={
          <div className="w-full flex justify-between items-center">
            <p className="text-xs text-slate-400 font-medium">Actualizado: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
            <button
              onClick={() => setShowReportModal(false)}
              className="px-5 py-1.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg font-bold text-xs hover:opacity-90 transition-opacity"
            >
              Cerrar
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          {/* Header Info */}
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-blue-50 dark:bg-blue-500/10 rounded-lg">
                <Calendar size={18} className="text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Semana Actual</p>
                <h2 className="text-sm font-bold text-slate-800 dark:text-white capitalize">
                  {new Date().toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-500/10 rounded-full border border-emerald-100 dark:border-emerald-500/20">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">100% Operativo</span>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between group hover:border-blue-200 transition-all">
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-0.5">Referencias</span>
                <p className="text-2xl font-bold text-slate-800 dark:text-white">{stats.totalProducts}</p>
              </div>
              <Box size={20} className="text-slate-400 group-hover:text-blue-500 transition-colors opacity-70" />
            </div>

            <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between group hover:border-rose-200 transition-all">
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-0.5 group-hover:text-rose-500 transition-colors">Críticos</span>
                <p className="text-2xl font-bold text-slate-800 dark:text-white group-hover:text-rose-500 transition-colors">{stats.criticalCount}</p>
              </div>
              <AlertTriangle size={20} className="text-slate-400 group-hover:text-rose-500 transition-colors opacity-70" />
            </div>

            <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between group hover:border-blue-200 transition-all">
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-0.5 group-hover:text-blue-500 transition-colors">En Camino</span>
                <p className="text-2xl font-bold text-slate-800 dark:text-white group-hover:text-blue-500 transition-colors">{stats.inTransitCount}</p>
              </div>
              <Truck size={20} className="text-slate-400 group-hover:text-blue-500 transition-colors opacity-70" />
            </div>

            <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between group hover:border-amber-200 transition-all">
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-0.5 group-hover:text-amber-500 transition-colors">Borradores</span>
                <p className="text-2xl font-bold text-slate-800 dark:text-white group-hover:text-amber-500 transition-colors">{stats.pendingOrdersCount}</p>
              </div>
              <Clock size={20} className="text-slate-400 group-hover:text-amber-500 transition-colors opacity-70" />
            </div>
          </div>

          {/* Critical Items List */}
          {stats.criticalItems.length > 0 && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between px-1">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Alertas ({stats.criticalItems.length})</h4>
                {stats.criticalItems.length > 3 && (
                  <button onClick={() => onNavigate('inventory')} className="text-xs font-bold text-blue-600 hover:underline">Ver todo</button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {stats.criticalItems.slice(0, 4).map(p => (
                  <div key={p.id} className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800/50 hover:shadow-sm transition-all">
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="h-7 w-7 rounded-lg bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center text-xs font-bold text-rose-600 dark:text-rose-400 shrink-0">
                        {p.sku.slice(0, 2)}
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate leading-tight">{p.nombre}</p>
                        <p className="text-[10px] text-slate-400 leading-none mt-0.5">{p.sku}</p>
                      </div>
                    </div>
                    <div className="text-right ml-2 shrink-0">
                      <p className="text-sm font-bold text-rose-500">{p.stock_actual} <span className="text-[10px] text-slate-400 font-normal">/ {p.stock_minimo}</span></p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div >
  );
};

export default Dashboard;
