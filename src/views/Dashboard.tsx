
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
  BarChart2,
  Medal,

  Activity,
  PlusCircle,
  CheckCircle
} from 'lucide-react';
import { repository } from '../services/repository';
import Modal from '../components/Modal';
import { Skeleton } from '../components/Skeleton';

import { useNavigate } from 'react-router-dom';
import { StatCard } from '../components/StatCard';

const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percentage } = props;

  return (
    <g>

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

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    criticalCount: 0,
    pendingOrdersCount: 0,
    inTransitCount: 0,
    totalProducts: 0,
    inventoryValue: 0,
    incidenceItems: [] as { name: string, count: number }[],
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
    newHighRotation: [] as any[],
    categoryData: [] as any[]
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

      const highRot = products.filter(p => (p as any).rotacion === 'alta');
      const mediumRot = products.filter(p => (p as any).rotacion === 'media');
      const lowRot = products.filter(p => (p as any).rotacion === 'baja' || !(p as any).rotacion);
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
        percentage: products.length > 0 ? ((b.value / products.length) * 100).toFixed(1) : "0"
      }));

      if (othersValue > 0) {
        brandData.push({
          name: 'Otras',
          value: othersValue,
          percentage: products.length > 0 ? ((othersValue / products.length) * 100).toFixed(1) : "0"
        });
      }

      // 3. Calculate Category Distribution (by item count, since stock is gone)
      const catCount: Record<string, number> = {};
      products.forEach(p => {
        const cat = categories.find(c => c.id === p.subcategoria_id) || categories.find(c => c.id === (p.categoria?.id || ''));
        const name = cat?.name || 'Otros';
        catCount[name] = (catCount[name] || 0) + 1;
      });

      const topCategories = Object.entries(catCount)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);

      setStats({
        criticalCount: 0,
        pendingOrdersCount: pending.length,
        inTransitCount: inTransit.length,
        totalProducts: products.length,
        inventoryValue: 0,
        incidenceItems: [],
        highRotationItems: highRot,
        mediumRotationItems: mediumRot,
        lowRotationItems: lowRot,
        brandData,
        statusData,
        categories,
        categoryData: topCategories,
        // Calculate Analysis Metrics
        ...calculateWeeklyAnalysis(products, pedidos)
      });

      // Process Audited Orders for Incidences
      const audited = pedidos.filter(p => p.estado === 'Auditado');
      const brandIncidences: Record<string, number> = {};

      await Promise.all(audited.map(async (p) => {
        const items = await repository.getPedidoItems(p.id);
        items.forEach(item => {
          if (['No llegó', 'Incompleto', 'Dañado'].includes(item.estado_item)) {
            const brandName = item.producto?.marca?.nombre || 'Sin Marca';
            brandIncidences[brandName] = (brandIncidences[brandName] || 0) + 1;
          }
        });
      }));

      const sortedIncidences = Object.entries(brandIncidences)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6);

      setStats(prev => ({
        ...prev,
        incidenceItems: sortedIncidences
      }));

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
      // onNavigate('inventory', { rotation }); // Removed undefined call

      navigate(`/inventory?rotation=${rotation}`);
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
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Resumen Operativo</h2>
          <p className="text-slate-500 dark:text-slate-400">Control total del inventario y flujo de bodega.</p>
        </div>
        <div className="flex space-x-2">
          <button onClick={handleWeeklyReport} className="px-4 py-2 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-full text-sm font-bold hover:bg-slate-50 dark:hover:bg-[#334155] text-slate-700 dark:text-slate-300 transition-all shadow-sm">Reporte Semanal</button>
          <button
            onClick={() => navigate('/orders')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-full text-sm font-bold transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 text-white"
          >
            Nuevo Pedido
          </button>
        </div>
      </header>

      {/* Bento Grid Indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 animate-in fade-in zoom-in-95 duration-500 delay-100">
        <StatCard
          title="Incidencias"
          value={stats.incidenceItems.reduce((acc, curr) => acc + curr.count, 0)}
          icon={AlertTriangle}
          color="bg-rose-500"
          trend="Auditoría"
          onClick={() => navigate('/missing-items')}
        />
        <StatCard
          title="Media Rotación"
          value={stats.mediumRotationItems.length}
          icon={TrendingUp}
          color="bg-amber-500"
          onClick={() => navigate('/inventory?rotation=media')}
        />
        <StatCard
          title="Baja Rotación"
          value={stats.lowRotationItems.length}
          icon={TrendingUp}
          color="bg-slate-500"
          onClick={() => navigate('/inventory?rotation=baja')}
        />
        <StatCard
          title={stats.inTransitCount > 0 ? "En Camino" : "Borradores"}
          value={stats.inTransitCount > 0 ? stats.inTransitCount : stats.pendingOrdersCount}
          icon={stats.inTransitCount > 0 ? Truck : Clock}
          color={stats.inTransitCount > 0 ? "bg-blue-500" : "bg-amber-500"}
          trend={stats.inTransitCount > 0 ? "Por Recibir" : undefined}
          onClick={() => navigate(stats.inTransitCount > 0 ? '/audit' : '/pending-orders')}
        />
        <StatCard
          title="Total Referencias"
          value={stats.totalProducts}
          icon={Box}
          color="bg-blue-500"
          onClick={() => navigate('/inventory')}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 animate-in fade-in zoom-in-95 duration-500 delay-200">
        {/* High Rotation List */}
        <div className="lg:col-span-2">
          <GlassCard className="h-full">


            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Top - Alta Rotación</h3>
              <button
                onClick={() => navigate('/inventory?rotation=alta')}
                className="text-blue-600 dark:text-blue-400 text-sm font-medium hover:text-blue-500 dark:hover:text-blue-300 transition-colors flex items-center gap-1 group"
              >
                Ver todo <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-slate-500 dark:text-slate-400 text-[10px] uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                    <th className="pb-3 pl-4 font-bold w-[5%]">#</th>
                    <th className="pb-3 pl-2 font-bold w-[45%]">Producto</th>
                    <th className="pb-3 text-center font-bold w-[15%]">Marca</th>
                    <th className="pb-3 text-center font-bold w-[15%]">Categoría</th>
                    <th className="pb-3 text-right pr-4 font-bold w-[20%]">Rotación</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {stats.highRotationItems.slice(0, 8).map((p, index) => (
                    <tr key={p.id} onClick={() => navigate('/inventory?rotation=alta')} className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all duration-200 cursor-pointer">

                      <td className="py-3 pl-4">
                        <span className={`flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-black ${index === 0 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' : index === 1 ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400' : index === 2 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' : 'text-slate-400'}`}>
                          {index + 1}
                        </span>
                      </td>
                      <td className="py-3 pl-2">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-gradient-to-br from-rose-50 to-rose-100 dark:from-rose-900/20 dark:to-rose-900/10 rounded-lg group-hover:scale-110 transition-transform duration-300 shadow-sm">
                            <TrendingUp className="text-rose-600 dark:text-rose-400" size={16} />
                          </div>
                          <div className="flex flex-col max-w-[200px] sm:max-w-xs">
                            <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">{p.nombre}</p>
                            <p className="text-[10px] text-slate-400 font-mono tracking-wider">{p.sku}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 text-center">
                        <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700">
                          {p.marca?.nombre || '-'}
                        </span>
                      </td>
                      <td className="py-3 text-center text-[10px] text-slate-500 dark:text-slate-400 capitalize">
                        {stats.categories.find((c: any) => c.id === p.subcategoria_id)?.name?.toLowerCase() || '-'}
                      </td>
                      <td className="py-3 text-right pr-4">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></div>
                          <span className="text-rose-600 dark:text-rose-400 text-[10px] font-black uppercase tracking-widest">
                            Alta
                          </span>
                        </div>
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

          <div className="flex flex-col gap-6 flex-1 min-h-[350px]">
            {/* Top: Chart (Centered) */}
            <div className="relative h-[240px] w-full flex justify-center items-center">
              <div className="w-full max-w-[280px] h-full relative">
                {/* Center Metric with Dynamic Content */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none transform -translate-y-2 transition-all duration-300">
                  {activeIndex === -1 ? (
                    <>
                      <span className="text-4xl font-black text-slate-800 dark:text-white animate-in zoom-in duration-300 tracking-tighter">{stats.totalProducts}</span>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Referencias</span>
                    </>
                  ) : (
                    <>
                      <span className="text-4xl font-black text-blue-600 dark:text-blue-400 animate-in zoom-in duration-300 tracking-tighter">
                        {stats.brandData[activeIndex]?.value}
                      </span>
                      <span className="text-[9px] font-bold text-slate-500 dark:text-slate-300 uppercase tracking-widest mt-1 max-w-[120px] text-center truncate px-2">
                        {stats.brandData[activeIndex]?.name}
                      </span>
                    </>
                  )}
                </div>

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
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={activeIndex !== -1 ? 6 : 2}
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
                            navigate(`/inventory?searchTerm=${encodeURIComponent(entry.name)}`);
                          }}
                          fillOpacity={activeIndex === -1 ? 1 : activeIndex === index ? 1 : 0.3}
                          stroke={activeIndex === index ? '#fff' : 'none'}
                          strokeWidth={activeIndex === index ? 2 : 0}
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
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Bottom: Detailed Legend */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
              {stats.brandData.map((entry, index) => (
                <div
                  key={entry.name}
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseLeave={onPieLeave}
                  onClick={() => navigate(`/inventory?searchTerm=${encodeURIComponent(entry.name)}`)}
                  className={`group flex items-center justify-between p-2 rounded-lg transition-all duration-200 cursor-pointer ${activeIndex === index
                    ? 'bg-slate-100 dark:bg-white/10 shadow-sm translate-x-1'
                    : 'hover:bg-slate-50 dark:hover:bg-white/5'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-1.5 h-8 rounded-full shadow-sm transition-all duration-300 ${activeIndex === index ? 'scale-y-110' : ''}`} style={{ backgroundColor: index === 0 ? '#3b82f6' : index === 1 ? '#8b5cf6' : index === 2 ? '#ec4899' : index === 3 ? '#f43f5e' : index === 4 ? '#f59e0b' : '#94a3b8' }}></div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-tight">{entry.name}</span>
                      <span className="text-[10px] font-medium text-slate-400">{entry.value} Refs</span>
                    </div>
                  </div>
                  <span className="text-xs font-black text-slate-800 dark:text-white">{entry.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
        </GlassCard>

      </div >

      {/* Bottom Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 animate-in fade-in zoom-in-95 duration-500 delay-300">

        {/* Incidences Panel (Moved to bottom) */}
        <div className="lg:col-span-1">
          <GlassCard className="h-full border-l-4 border-l-rose-500/50">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-black text-rose-500 uppercase tracking-widest flex items-center gap-2 text-red-500">
                <AlertTriangle size={16} /> Incidencias / Marca
              </h3>
              <button
                onClick={() => navigate('/missing-items')}
                className="text-[10px] font-bold text-slate-400 hover:text-rose-500 transition-colors"
              >
                Ver Faltantes
              </button>
            </div>
            <div className="space-y-3">
              {stats.incidenceItems.map((inc) => (
                <div
                  key={inc.name}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-white/5 transition-all"
                >
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-[11px] font-bold text-slate-700 dark:text-slate-200 truncate pr-2 uppercase tracking-tighter">{inc.name}</p>
                    <span className="text-[10px] font-black text-rose-600 dark:text-rose-400">-{inc.count}</span>
                  </div>
                  <div className="w-full h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-rose-500"
                      style={{ width: `${Math.min(100, (inc.count / (stats.totalProducts || 1)) * 100)}%` }}
                    ></div>
                  </div>
                </div>
              ))}
              {stats.incidenceItems.length === 0 && (
                <div className="py-10 text-center text-slate-400 text-xs text-red-500">Sin incidencias reportadas.</div>
              )}
            </div>
          </GlassCard>
        </div>

        {/* Rotation Distribution */}
        <GlassCard className="h-full p-4">
          <h3 className="text-sm font-bold mb-4 text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <BarChart2 size={16} className="text-slate-400" />
            Distribución por Rotación
          </h3>
          <div className="w-full h-32">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.statusData} onClick={handleBarClick} barSize={40}>
                <defs>
                  <linearGradient id="gradAlta" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f43f5e" stopOpacity={1} />
                    <stop offset="100%" stopColor="#e11d48" stopOpacity={0.8} />
                  </linearGradient>
                  <linearGradient id="gradMedia" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={1} />
                    <stop offset="100%" stopColor="#d97706" stopOpacity={0.8} />
                  </linearGradient>
                  <linearGradient id="gradBaja" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#64748b" stopOpacity={1} />
                    <stop offset="100%" stopColor="#475569" stopOpacity={0.8} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.1} />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
                  dy={10}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      const color = data.name === 'Alta' ? 'text-rose-500' : data.name === 'Media' ? 'text-amber-500' : 'text-slate-500';
                      return (
                        <div className="bg-white dark:bg-slate-800 p-2 rounded-lg shadow-xl border border-slate-100 dark:border-slate-700">
                          <p className={`text-[9px] font-black uppercase tracking-widest mb-0.5 ${color}`}>{data.name} Rotación</p>
                          <p className="text-lg font-black text-slate-800 dark:text-white">
                            {data.value} <span className="text-[9px] text-slate-400 font-bold ml-0.5">REFS</span>
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="value" radius={[6, 6, 6, 6]} animationDuration={1000}>
                  {stats.statusData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.name === 'Alta' ? 'url(#gradAlta)' : entry.name === 'Media' ? 'url(#gradMedia)' : 'url(#gradBaja)'}
                      className="hover:opacity-80 transition-opacity cursor-pointer filter drop-shadow-sm"
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* Top Categories Chart */}
        <GlassCard className="h-full p-4">
          <h3 className="text-sm font-bold mb-4 text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Box size={16} className="text-slate-400" />
            Top Categorías (Volumen)
          </h3>
          <div className="w-full h-32">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.categoryData} layout="vertical" barSize={15}>
                <defs>
                  <linearGradient id="gradCat" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                    <stop offset="100%" stopColor="#2563eb" stopOpacity={0.8} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#334155" opacity={0.1} />
                <XAxis type="number" hide />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={80}
                  tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white dark:bg-slate-800 p-2 rounded-lg shadow-xl border border-slate-100 dark:border-slate-700">
                          <p className="text-[9px] font-black uppercase tracking-widest mb-0.5 text-blue-500">{data.name}</p>
                          <p className="text-lg font-black text-slate-800 dark:text-white">
                            {data.value} <span className="text-[9px] text-slate-400 font-bold ml-0.5">UNI</span>
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="value" fill="url(#gradCat)" radius={[0, 4, 4, 0]} animationDuration={1000} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

      </div>
      <Modal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        title="Resumen Ejecutivo de Inventario"
        maxWidth="sm:max-w-5xl"
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
        <div className="space-y-3 p-1">
          {/* Header Analytics */}
          <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                <BarChart3 size={24} className="text-white" />
              </div>
              <div>
                <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] mb-0.5">Reporte de Desempeño</p>
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight leading-none">
                    {new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - {new Date().toLocaleDateString(undefined, { year: 'numeric' })}
                  </h2>
                  <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 text-[10px] font-black rounded-full uppercase">Al Día</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Column 1: Metrics */}
            <div className="space-y-3">
              <div className="p-4 bg-white dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800/50 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Auditorías</p>
                  <div className="flex items-center gap-1 text-[10px] font-bold text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-full">
                    <CheckCircle size={10} /> 7 días
                  </div>
                </div>
                <p className="text-4xl font-black text-slate-800 dark:text-white">{stats.weeklyAudits}</p>
              </div>

              <div className="p-4 bg-white dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800/50 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Eficiencia</p>
                  <p className="text-4xl font-black text-emerald-500">{stats.receptionEfficiency}%</p>
                </div>
                <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500" style={{ width: `${stats.receptionEfficiency}%` }}></div>
                </div>
              </div>
            </div>

            {/* Column 2: Growth (Hero Card) */}
            <div className="h-full">
              <div className="p-4 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-3xl text-white shadow-xl shadow-indigo-500/20 flex flex-col justify-between h-full">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-white/20 rounded-lg">
                        <PlusCircle size={16} className="text-white" />
                      </div>
                      <p className="text-[10px] font-black uppercase opacity-80 tracking-widest">Nuevas<br />Referencias</p>
                    </div>
                  </div>
                  <p className="text-6xl font-black leading-none tracking-tighter mb-1">+{stats.newReferences}</p>
                </div>
                <div>
                  <div className="h-px w-full bg-white/20 mb-3"></div>
                  <p className="text-sm font-medium opacity-90 leading-relaxed">
                    Tu catálogo ha crecido un <span className="font-black bg-white/20 px-1.5 py-0.5 rounded text-white">{stats.inventoryGrowth}%</span> esta semana.
                  </p>
                </div>
              </div>
            </div>

            {/* Column 3: Logistics */}
            <div className="space-y-3">
              <div className="p-4 bg-white dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800/50 shadow-sm h-full flex flex-col">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-3 tracking-widest flex items-center gap-2">
                  <Medal size={12} className="text-amber-500" /> Top Proveedores
                </p>
                <div className="space-y-2 flex-1">
                  {stats.topSuppliers.length > 0 ? stats.topSuppliers.map((s, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group">
                      <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-[10px] shadow-sm ${i === 0 ? 'bg-amber-100 text-amber-600 ring-2 ring-amber-50 dark:ring-amber-900/20' :
                          i === 1 ? 'bg-slate-100 text-slate-600' :
                            'bg-orange-100 text-orange-600'
                          }`}>
                          {i + 1}
                        </div>
                        <p className="text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase truncate max-w-[100px] group-hover:text-blue-600 transition-colors">{s.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[12px] font-black text-slate-800 dark:text-white leading-none">{s.value}</p>
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wide">Refs</p>
                      </div>
                    </div>
                  )) : (
                    <p className="text-center py-2 text-xs font-medium text-slate-400 italic">Sin datos</p>
                  )}
                </div>

                {/* Integrated Rotation Alerts */}
                {stats.newHighRotation.length > 0 && (
                  <div className="mt-auto pt-3">
                    <div className="p-3 bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-800/30 dashed-border">
                      <div className="flex items-center gap-1.5 mb-2">
                        <div className="p-1 bg-amber-100 dark:bg-amber-900/30 rounded-md">
                          <Zap size={10} className="text-amber-600 dark:text-amber-400 fill-amber-600" />
                        </div>
                        <h4 className="text-[9px] font-black text-amber-800 dark:text-amber-200 uppercase tracking-wide">Boom en Rotación</h4>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {stats.newHighRotation.slice(0, 3).map((p, i) => (
                          <span key={i} className="px-2 py-1 bg-white dark:bg-slate-800 rounded-lg text-[9px] font-bold text-slate-600 dark:text-slate-300 border border-amber-200 dark:border-amber-800/50 shadow-sm">
                            {p.sku}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Dashboard;
