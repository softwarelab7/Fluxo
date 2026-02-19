
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
  CartesianGrid,
  Sector
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
  Calendar,
  Zap,
  BarChart3,
  Medal,
  Activity,
  PlusCircle,
  CheckCircle
} from 'lucide-react';
import { repository } from '../services/repository';
import Modal from '../components/Modal';
import { Skeleton } from '../components/Skeleton';

interface DashboardProps {
  onNavigate: (view: string, params?: any) => void;
}

const StatCard = ({ title, value, icon: Icon, color, trend, onClick }: any) => {
  // Extract base color styles
  let styles = {
    bgFrom: "from-blue-500/5",
    bgTo: "to-blue-600/5",
    text: "text-blue-600 dark:text-blue-400",
    iconBg: "bg-blue-100 dark:bg-blue-500/20",
    trendText: "text-blue-600",
    trendBg: "bg-blue-100 dark:bg-blue-500/10",
    border: "group-hover:border-blue-200 dark:group-hover:border-blue-800"
  };

  if (color.includes("rose") || color.includes("red")) {
    styles = {
      bgFrom: "from-rose-500/5",
      bgTo: "to-rose-600/5",
      text: "text-rose-600 dark:text-rose-400",
      iconBg: "bg-rose-100 dark:bg-rose-500/20",
      trendText: "text-rose-600",
      trendBg: "bg-rose-100 dark:bg-rose-500/10",
      border: "group-hover:border-rose-200 dark:group-hover:border-rose-800"
    };
  } else if (color.includes("emerald") || color.includes("green")) {
    styles = {
      bgFrom: "from-emerald-500/5",
      bgTo: "to-emerald-600/5",
      text: "text-emerald-600 dark:text-emerald-400",
      iconBg: "bg-emerald-100 dark:bg-emerald-500/20",
      trendText: "text-emerald-600",
      trendBg: "bg-emerald-100 dark:bg-emerald-500/10",
      border: "group-hover:border-emerald-200 dark:group-hover:border-emerald-800"
    };
  } else if (color.includes("amber") || color.includes("yellow")) {
    styles = {
      bgFrom: "from-amber-500/5",
      bgTo: "to-amber-600/5",
      text: "text-amber-600 dark:text-amber-400",
      iconBg: "bg-amber-100 dark:bg-amber-500/20",
      trendText: "text-amber-600",
      trendBg: "bg-amber-100 dark:bg-amber-500/10",
      border: "group-hover:border-amber-200 dark:group-hover:border-amber-800"
    };
  } else if (color.includes("slate") || color.includes("gray")) {
    styles = {
      bgFrom: "from-slate-500/5",
      bgTo: "to-slate-600/5",
      text: "text-slate-600 dark:text-slate-400",
      iconBg: "bg-slate-100 dark:bg-slate-500/20",
      trendText: "text-slate-600",
      trendBg: "bg-slate-100 dark:bg-slate-500/10",
      border: "group-hover:border-slate-200 dark:group-hover:border-slate-800"
    };
  }

  return (
    <GlassCard
      onClick={onClick}
      className={`flex flex-col justify-between h-full group transition-all duration-300 shadow-sm hover:shadow-lg relative overflow-hidden bg-gradient-to-br ${styles.bgFrom} ${styles.bgTo} to-transparent border-slate-200 dark:border-slate-800 ${styles.border} ${onClick ? 'cursor-pointer' : ''}`}
    >

      {/* Decorative Background Icon */}
      <div className={`absolute -bottom-4 -right-4 opacity-[0.05] group-hover:opacity-[0.1] transition-opacity duration-500 pointer-events-none`}>
        <Icon size={120} className={styles.text} />
      </div>

      <div className="relative z-10 flex justify-between items-start mb-4">
        <div className={`p-2.5 rounded-xl ${styles.iconBg} backdrop-blur-sm shadow-sm border border-white/20 group-hover:scale-110 transition-transform duration-300`}>
          <Icon size={20} className={styles.text} />
        </div>

        {trend && (
          <span className={`flex items-center text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${styles.trendBg} ${styles.trendText} border border-transparent group-hover:border-current transition-colors`}>
            {trend} <ArrowUpRight size={12} className="ml-1" />
          </span>
        )}
      </div>

      <div className="relative z-10">
        <p className="text-slate-500 dark:text-slate-400 text-xs font-bold tracking-widest uppercase mb-1">{title}</p>
        <h3 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">{value}</h3>
      </div>
    </GlassCard>
  );
};

const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percentage } = props;

  return (
    <g>
      <text x={cx} y={cy - 8} textAnchor="middle" fill={fill} className="text-[10px] font-black uppercase tracking-tighter transition-all duration-300">
        {payload.name}
      </text>
      <text x={cx} y={cy + 12} textAnchor="middle" fill="#94a3b8" className="text-[9px] uppercase font-black tracking-widest opacity-80">
        {payload.value} Refs ({percentage}%)
      </text>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 6}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        cornerRadius={10}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 10}
        outerRadius={outerRadius + 13}
        fill={fill}
        cornerRadius={4}
        opacity={0.3}
      />
    </g>
  );
};

const calculateWeeklyAnalysis = (products: any[], pedidos: any[]) => {
  const now = new Date();
  const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const weeklyOrders = pedidos.filter(p => new Date(p.created_at || p.fecha_creacion) >= lastWeek);
  const auditedWeekly = weeklyOrders.filter(p => p.estado === 'Auditado');

  let totalItems = 0;
  let acceptedItems = 0;

  auditedWeekly.forEach(p => {
    const items = p.items || [];
    totalItems += items.length;
    acceptedItems += items.filter((i: any) => i.estado_item === 'Aceptado').length;
  });

  const efficiency = totalItems > 0 ? Math.round((acceptedItems / totalItems) * 100) : 0;
  const newProds = products.filter(p => new Date(p.created_at) >= lastWeek);

  const growth = products.length > newProds.length
    ? Math.round((newProds.length / (products.length - newProds.length)) * 100)
    : 100;

  const supplierVolume: Record<string, { val: number, count: number }> = {};
  auditedWeekly.forEach(p => {
    const name = p.proveedor?.nombre || 'Desconocido';
    const itemsCount = p.items?.length || 0;
    if (!supplierVolume[name]) supplierVolume[name] = { val: 0, count: 0 };
    supplierVolume[name].val += itemsCount;
    supplierVolume[name].count += 1;
  });

  const topSuppliers = Object.entries(supplierVolume)
    .map(([name, data]) => ({ name, value: data.val, count: data.count }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 3);

  const recentHigh = newProds.filter(p => p.rotacion === 'alta');

  return {
    weeklyAudits: auditedWeekly.length,
    receptionEfficiency: efficiency,
    newReferences: newProds.length,
    inventoryGrowth: growth,
    topSuppliers,
    newHighRotation: recentHigh.slice(0, 5)
  };
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
    mediumRotationItems: [] as any[],
    lowRotationItems: [] as any[],
    brandData: [] as any[],
    statusData: [] as any[],
    categories: [] as any[],
    // Analysis Metrics
    weeklyAudits: 0,
    receptionEfficiency: 0,
    newReferences: 0,
    inventoryGrowth: 0,
    topSuppliers: [] as { name: string, value: number, count: number }[],
    newHighRotation: [] as any[]
  });
  const [showReportModal, setShowReportModal] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  const onPieLeave = () => {
    setActiveIndex(-1);
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [products, pedidos, categories] = await Promise.all([
        repository.getProductos(),
        repository.getPedidos(),
        repository.getCategorias()
      ]);

      const critical = products.filter(p => p.stock_actual <= p.stock_minimo);
      const highRot = products.filter(p => p.rotacion === 'alta');
      const mediumRot = products.filter(p => p.rotacion === 'media');
      const lowRot = products.filter(p => p.rotacion === 'baja' || !p.rotacion);
      const pending = pedidos.filter(p => p.estado === 'Pendiente');
      const inTransit = pedidos.filter(p => p.estado === 'En Camino');

      // 1. Calculate Status Distribution (Rotation)
      const statusCounts = {
        'Alta': products.filter(p => p.rotacion === 'alta').length,
        'Media': products.filter(p => p.rotacion === 'media').length,
        'Baja': products.filter(p => p.rotacion === 'baja' || !p.rotacion).length
      };

      // Filter out empty counts to make chart cleaner? Or keep for completeness. Kept.
      const statusData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));

      // 2. Calculate Brand Distribution (Top 5)
      const brandCounts: Record<string, number> = {};
      products.forEach(p => {
        const brandName = p.marca?.nombre || 'Otros';
        brandCounts[brandName] = (brandCounts[brandName] || 0) + 1;
      });

      const allBrandData = Object.entries(brandCounts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

      const top5 = allBrandData.slice(0, 5);
      const othersValue = allBrandData.slice(5).reduce((acc, curr) => acc + curr.value, 0);

      const brandData = top5.map(b => ({
        ...b,
        percentage: ((b.value / products.length) * 100).toFixed(1)
      }));

      if (othersValue > 0) {
        brandData.push({
          name: 'Otras',
          value: othersValue,
          percentage: ((othersValue / products.length) * 100).toFixed(1)
        });
      }

      setStats({
        criticalCount: critical.length,
        pendingOrdersCount: pending.length,
        inTransitCount: inTransit.length,
        totalProducts: products.length,
        inventoryValue: 0,
        criticalItems: critical,
        highRotationItems: highRot,
        mediumRotationItems: mediumRot,
        lowRotationItems: lowRot,
        brandData,
        statusData,
        categories,
        // Calculate Analysis Metrics
        ...calculateWeeklyAnalysis(products, pedidos)
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

  const handleBarClick = (data: any) => {
    if (data && data.activePayload && data.activePayload.length > 0) {
      const rotationName = data.activePayload[0].payload.name;
      const rotation = rotationName === 'Alta' ? 'alta' : rotationName === 'Media' ? 'media' : 'baja';
      onNavigate('inventory', { rotation });
    }
  };

  if (loading) {
    // ... existing skeleton code ...
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 animate-in fade-in zoom-in-95 duration-500 delay-100">
        <StatCard
          title="Alta Rotación"
          value={stats.highRotationItems.length}
          icon={TrendingUp}
          color="bg-rose-500"
          trend="Prioridad"
          onClick={() => onNavigate('inventory', { rotation: 'alta' })}
        />
        <StatCard
          title="Media Rotación"
          value={stats.mediumRotationItems.length}
          icon={TrendingUp}
          color="bg-amber-500"
          onClick={() => onNavigate('inventory', { rotation: 'media' })}
        />
        <StatCard
          title="Baja Rotación"
          value={stats.lowRotationItems.length}
          icon={TrendingUp}
          color="bg-slate-500"
          onClick={() => onNavigate('inventory', { rotation: 'baja' })}
        />
        <StatCard
          title={stats.inTransitCount > 0 ? "En Camino" : "Borradores"}
          value={stats.inTransitCount > 0 ? stats.inTransitCount : stats.pendingOrdersCount}
          icon={stats.inTransitCount > 0 ? Truck : Clock}
          color={stats.inTransitCount > 0 ? "bg-blue-500" : "bg-amber-500"}
          trend={stats.inTransitCount > 0 ? "Por Recibir" : undefined}
          onClick={() => onNavigate(stats.inTransitCount > 0 ? 'audit' : 'pending-orders')}
        />
        <StatCard
          title="Total Referencias"
          value={stats.totalProducts}
          icon={Box}
          color="bg-blue-500"
          onClick={() => onNavigate('inventory')}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 animate-in fade-in zoom-in-95 duration-500 delay-200">
        {/* Critical Items List */}
        <div className="lg:col-span-2">
          <GlassCard className="h-full">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Top - Alta Rotación</h3>
              <button
                onClick={() => onNavigate('inventory', { rotation: 'alta' })}
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
                    <th className="pb-4 text-center font-semibold">Marca</th>
                    <th className="pb-4 text-center font-semibold">Categoría</th>
                    <th className="pb-4 font-semibold">Rotación</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-[#334155]">
                  {stats.highRotationItems.slice(0, 5).map(p => (
                    <tr key={p.id} onClick={() => onNavigate('inventory', { rotation: 'alta' })} className="group hover:bg-slate-50 dark:hover:bg-[#334155]/20 transition-all duration-300 border-b border-slate-200 dark:border-[#334155] last:border-0 relative hover:shadow-lg cursor-pointer">
                      <td className="py-2 pl-4">
                        <div className="flex items-center space-x-3">
                          <div className="p-2.5 bg-rose-500/10 rounded-xl group-hover:bg-rose-500/20 transition-colors group-hover:scale-110 duration-300">
                            <TrendingUp className="text-rose-600 dark:text-rose-400" size={18} />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-slate-200 group-hover:text-rose-600 dark:group-hover:text-white transition-colors">{p.nombre}</p>
                            <p className="text-[10px] text-slate-950 dark:text-white font-black font-mono tracking-wide group-hover:text-rose-600 transition-colors uppercase">
                              {p.sku}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-2 text-slate-600 dark:text-slate-400 text-center text-xs font-bold">{p.marca?.nombre || '-'}</td>
                      <td className="py-2 text-slate-500 dark:text-slate-400 text-center font-mono text-xs capitalize">
                        {stats.categories.find((c: any) => c.id === p.subcategoria_id)?.name?.toLowerCase() || '-'}
                      </td>
                      <td className="py-2">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-[10px] font-bold uppercase tracking-wider">
                          Alta
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {stats.highRotationItems.length === 0 && (
                <div className="py-10 text-center text-slate-500">No hay productos marcados como alta rotación.</div>
              )}
            </div>
          </GlassCard>
        </div>

        {/* Brand Distribution Chart */}
        <GlassCard className="h-full flex flex-col p-4 sm:p-6 relative overflow-hidden bg-white/50 dark:bg-slate-900/50">
          <div className="flex justify-between items-center mb-4 sm:mb-6 relative z-10">
            <div>
              <h3 className="text-[12px] sm:text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest">Distribución por Marca</h3>
              <p className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-0.5">Top 5 + Otras</p>
            </div>
            <div className="p-1.5 sm:p-2 bg-blue-500/10 rounded-lg">
              <TrendingUp size={14} className="text-blue-600 dark:text-blue-400 sm:w-4 sm:h-4" />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 flex-1 min-h-[280px]">
            {/* Left: Chart */}
            <div className="relative h-[220px] sm:h-full min-h-[200px] sm:min-h-[220px]">
              {/* Default Center Metric (if nothing hovered) */}
              {activeIndex === -1 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none transform -translate-y-2">
                  <span className="text-4xl font-black text-slate-800 dark:text-white animate-in zoom-in duration-500">{stats.totalProducts}</span>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest opacity-60">Referencias</span>
                </div>
              )}

              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <defs>
                    <linearGradient id="grad0" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" />
                      <stop offset="100%" stopColor="#2563eb" />
                    </linearGradient>
                    <linearGradient id="grad1" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" />
                      <stop offset="100%" stopColor="#7c3aed" />
                    </linearGradient>
                    <linearGradient id="grad2" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#ec4899" />
                      <stop offset="100%" stopColor="#db2777" />
                    </linearGradient>
                    <linearGradient id="grad3" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#f43f5e" />
                      <stop offset="100%" stopColor="#e11d48" />
                    </linearGradient>
                    <linearGradient id="grad4" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#f59e0b" />
                      <stop offset="100%" stopColor="#d97706" />
                    </linearGradient>
                    <linearGradient id="grad5" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#94a3b8" />
                      <stop offset="100%" stopColor="#64748b" />
                    </linearGradient>
                  </defs>
                  <Pie
                    activeIndex={activeIndex}
                    activeShape={renderActiveShape}
                    data={stats.brandData}
                    cx="50%"
                    cy="50%"
                    innerRadius="65%"
                    outerRadius="85%"
                    paddingAngle={activeIndex !== -1 ? 8 : 4}
                    cornerRadius={8}
                    dataKey="value"
                    stroke="none"
                    animationBegin={0}
                    animationDuration={1500}
                    onMouseEnter={onPieEnter}
                    onMouseLeave={onPieLeave}
                  >
                    {stats.brandData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={`url(#grad${index % 6})`}
                        className="transition-all duration-500"
                        cursor="pointer"
                        onClick={() => {
                          onNavigate('inventory', { searchTerm: entry.name });
                        }}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-slate-900/95 backdrop-blur-md border border-white/10 p-3 rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200">
                            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">{payload[0].name}</p>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-white">{payload[0].value} Productos</span>
                              <span className="text-[10px] font-bold bg-white/10 px-1.5 py-0.5 rounded text-white/70">{payload[0].payload.percentage}%</span>
                            </div>
                            <p className="text-[9px] text-slate-400 mt-2 font-bold uppercase italic">Click para filtrar inventario</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Right: Detailed Legend */}
            <div className="flex flex-col justify-center space-y-3">
              {stats.brandData.map((entry, index) => (
                <div
                  key={entry.name}
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseLeave={onPieLeave}
                  onClick={() => onNavigate('inventory', { searchTerm: entry.name })}
                  className={`group p-2.5 rounded-xl border transition-all duration-300 cursor-pointer flex flex-col gap-1.5 ${activeIndex === index
                    ? 'bg-white dark:bg-white/5 border-blue-500/30 shadow-md translate-x-1'
                    : 'bg-transparent border-transparent hover:bg-slate-100 dark:hover:bg-white/5'
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-2.5 h-2.5 rounded-full shrink-0 shadow-sm`} style={{ backgroundColor: index === 0 ? '#3b82f6' : index === 1 ? '#8b5cf6' : index === 2 ? '#ec4899' : index === 3 ? '#f43f5e' : index === 4 ? '#f59e0b' : '#94a3b8' }}></div>
                      <span className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-tight truncate">{entry.name}</span>
                    </div>
                    <span className="text-[10px] font-black text-slate-400 group-hover:text-blue-500 transition-colors uppercase">{entry.percentage}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-1000 ease-out"
                      style={{
                        width: `${entry.percentage}%`,
                        backgroundColor: index === 0 ? '#3b82f6' : index === 1 ? '#8b5cf6' : index === 2 ? '#ec4899' : index === 3 ? '#f43f5e' : index === 4 ? '#f59e0b' : '#94a3b8',
                        opacity: activeIndex === -1 ? 0.7 : activeIndex === index ? 1 : 0.4
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Stock Status Bar Chart */}
      <div className="h-52 animate-in fade-in zoom-in-95 duration-500 delay-300">
        <GlassCard className="h-full p-4">
          <h3 className="text-sm font-bold mb-2 text-slate-900 dark:text-slate-100">Distribución por Rotación</h3>
          <div className="w-full h-36">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.statusData} onClick={handleBarClick}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                <XAxis dataKey="name" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                />
                <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} cursor="pointer">
                  {stats.statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.name === 'Alta' ? '#f43f5e' : entry.name === 'Media' ? '#f59e0b' : '#64748b'} />
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
        title="Resumen Ejecutivo de Inventario"
        maxWidth="sm:max-w-2xl"
        footer={
          <div className="w-full flex justify-between items-center px-2">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Análisis generado por Fluxo Engine v2</p>
            <button
              onClick={() => setShowReportModal(false)}
              className="px-6 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-black text-xs hover:scale-105 active:scale-95 transition-all shadow-lg"
            >
              ENTENDIDO
            </button>
          </div>
        }
      >
        <div className="space-y-6 p-1">
          {/* Header Analytics */}
          <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                <BarChart3 size={24} className="text-white" />
              </div>
              <div>
                <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] mb-0.5">Reporte de Desempeño</p>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-black text-slate-800 dark:text-white tracking-tight leading-none">
                    {new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - {new Date().toLocaleDateString(undefined, { year: 'numeric' })}
                  </h2>
                  <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 text-[10px] font-black rounded-full uppercase">Al Día</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left Column: Core Performance */}
            <div className="space-y-4">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1">
                <Activity size={12} className="text-blue-500" /> Rendimiento Semanal
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800/50 shadow-sm">
                  <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Auditorías</p>
                  <p className="text-3xl font-black text-slate-800 dark:text-white">{stats.weeklyAudits}</p>
                  <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-blue-500">
                    <CheckCircle size={10} /> 7 días
                  </div>
                </div>
                <div className="p-4 bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800/50 shadow-sm">
                  <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Eficiencia</p>
                  <p className="text-3xl font-black text-emerald-500">{stats.receptionEfficiency}%</p>
                  <div className="mt-2 h-1 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500" style={{ width: `${stats.receptionEfficiency}%` }}></div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl text-white shadow-lg shadow-indigo-500/20">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-[10px] font-black uppercase opacity-80 tracking-widest">Nuevas Referencias</p>
                    <p className="text-4xl font-black leading-none mt-1">+{stats.newReferences}</p>
                  </div>
                  <PlusCircle size={32} className="opacity-40" />
                </div>
                <p className="text-[11px] font-medium opacity-90">
                  Tu catálogo ha crecido un <span className="font-black underline">{stats.inventoryGrowth}%</span> esta semana.
                </p>
              </div>
            </div>

            {/* Right Column: Insights & Logistics */}
            <div className="space-y-4">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1">
                <Medal size={12} className="text-amber-500" /> Logística & Proveedores
              </h3>

              <div className="p-5 bg-white dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800/50 shadow-sm">
                <p className="text-[10px] font-black text-slate-500 uppercase mb-4 tracking-tighter">Top 3 Aliados Estratégicos (Volumen)</p>
                <div className="space-y-4">
                  {stats.topSuppliers.length > 0 ? stats.topSuppliers.map((s, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs ${i === 0 ? 'bg-amber-100 text-amber-600' :
                          i === 1 ? 'bg-slate-100 text-slate-600' :
                            'bg-orange-100 text-orange-600'
                          }`}>
                          {i + 1}
                        </div>
                        <p className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase truncate max-w-[120px]">{s.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-black text-slate-800 dark:text-white leading-none">{s.value} <span className="text-[10px] font-normal text-slate-400">Refs</span></p>
                        <p className="text-[10px] font-bold text-slate-400">{s.count} Pedidos</p>
                      </div>
                    </div>
                  )) : (
                    <p className="text-center py-4 text-xs font-medium text-slate-400 italic">No hay actividad registrada aún.</p>
                  )}
                </div>
              </div>

              {/* Rotation Alerts Section */}
              {stats.newHighRotation.length > 0 && (
                <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-2xl border border-amber-100 dark:border-amber-900/30">
                  <div className="flex items-center gap-2 mb-3">
                    <Zap size={14} className="text-amber-500 fill-amber-500" />
                    <h4 className="text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-wide">Boom en Rotación</h4>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {stats.newHighRotation.map((p, i) => (
                      <span key={i} className="px-2 py-1 bg-white dark:bg-slate-900 rounded-lg text-[10px] font-black text-slate-600 dark:text-slate-300 border border-amber-200 dark:border-amber-800/50">
                        {p.sku}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </Modal>
    </div >
  );
};

export default Dashboard;
