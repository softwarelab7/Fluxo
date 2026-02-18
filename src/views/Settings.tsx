
import React, { useState, useEffect } from 'react';
import GlassCard from '../components/GlassCard';
import {
  Shield,
  Layers,
  Bookmark,
  Check,
  Loader2,
  Truck,
  Users as UsersIcon,
  Activity
} from 'lucide-react';
import { repository } from '../services/repository';
import Suppliers from './Suppliers';
import { Users } from './Users';

interface SettingsProps {
  userRole?: 'admin' | 'employee' | null;
}

const Settings: React.FC<SettingsProps> = ({ userRole }) => {
  const [activeTab, setActiveTab] = useState<'general' | 'suppliers' | 'users'>('general');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ products: 0, suppliers: 0, categories: 0, brands: 0 });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [cats, brands, prods, provs] = await Promise.all([
        repository.getCategorias(),
        repository.getMarcas(),
        repository.getProductos(),
        repository.getProveedores()
      ]);
      setStats({
        products: prods.length,
        suppliers: provs.length,
        categories: cats.length,
        brands: brands.length
      });
    } catch (error) {
      console.error("Error loading settings data", error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'general', label: 'General', icon: Activity },
    { id: 'suppliers', label: 'Proveedores', icon: Truck },
  ];

  if (userRole === 'admin') {
    // @ts-ignore
    tabs.push({ id: 'users', label: 'Usuarios', icon: UsersIcon });
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <Loader2 className="animate-spin text-blue-500" size={48} />
        <p className="text-slate-400 animate-pulse">Cargando métricas del sistema...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in slide-in-from-top-4 duration-500 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold dark:text-white">Configuración</h2>
          <p className="text-slate-400">Administra los parámetros generales del sistema.</p>
        </div>

        {/* Tabs */}
        <div className="flex p-1 bg-white dark:bg-[#1e293b] rounded-xl border border-slate-200 dark:border-[#334155]">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === tab.id
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#0f172a]'
                }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* Content */}
      <div className="animate-in fade-in duration-300">
        {activeTab === 'general' && (
          <div className="grid grid-cols-1 gap-6">
            {/* Security / System Info */}
            <GlassCard>
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 bg-slate-500/20 rounded-lg">
                  <Shield className="text-slate-400" size={20} />
                </div>
                <h3 className="font-bold text-lg text-slate-800 dark:text-white">Estadísticas de Base de Datos</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center p-4 bg-slate-100 dark:bg-[#1e293b] rounded-2xl border border-slate-200 dark:border-[#334155] group hover:border-blue-500/30 transition-all">
                  <div className="mr-3 p-3 bg-gradient-to-br from-blue-500/10 to-purple-500/10 dark:from-blue-500/20 dark:to-purple-500/20 rounded-xl text-blue-500 dark:text-blue-400 group-hover:scale-110 transition-transform">
                    <Layers size={20} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-800 dark:text-white">{stats.products}</p>
                    <p className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Referencias</p>
                  </div>
                </div>

                <div className="flex items-center p-4 bg-slate-100 dark:bg-[#1e293b] rounded-2xl border border-slate-200 dark:border-[#334155] group hover:border-violet-500/30 transition-all">
                  <div className="mr-3 p-3 bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 dark:from-violet-500/20 dark:to-fuchsia-500/20 rounded-xl text-violet-500 dark:text-violet-400 group-hover:scale-110 transition-transform">
                    <Bookmark size={20} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-800 dark:text-white">{stats.brands}</p>
                    <p className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Marcas</p>
                  </div>
                </div>

                <div className="flex items-center p-4 bg-slate-100 dark:bg-[#1e293b] rounded-2xl border border-slate-200 dark:border-[#334155] group hover:border-amber-500/30 transition-all">
                  <div className="mr-3 p-3 bg-gradient-to-br from-amber-500/10 to-orange-500/10 dark:from-amber-500/20 dark:to-orange-500/20 rounded-xl text-amber-500 dark:text-amber-400 group-hover:scale-110 transition-transform">
                    <Shield size={20} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-800 dark:text-white">{stats.suppliers}</p>
                    <p className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Proveedores</p>
                  </div>
                </div>

                <div className="flex items-center p-4 bg-slate-100 dark:bg-[#1e293b] rounded-2xl border border-slate-200 dark:border-[#334155] group hover:border-emerald-500/30 transition-all">
                  <div className="mr-3 p-3 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 dark:from-emerald-500/20 dark:to-teal-500/20 rounded-xl text-emerald-500 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                    <Check size={20} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-800 dark:text-white">{stats.categories}</p>
                    <p className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Categorías</p>
                  </div>
                </div>
              </div>
            </GlassCard>

            <div className="pt-10 pb-6 text-center text-slate-400 dark:text-slate-600 text-[10px] uppercase tracking-widest font-bold">
              Fluxo Premium Inventory Management • v2.1 Cloud
            </div>
          </div >
        )}

        {activeTab === 'suppliers' && <Suppliers />}
        {activeTab === 'users' && userRole === 'admin' && <Users />}
      </div>
    </div >
  );
};

export default Settings;
