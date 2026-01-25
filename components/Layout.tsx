
import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  ClipboardCheck,
  Settings,
  Menu,
  X,
  Truck,
  Moon,
  Sun,
  Layers,
  Clock // Optional if I want to use clock for pending
} from 'lucide-react';
import { Logo } from './Logo';

interface SidebarItemProps {
  icon: React.ElementType;
  label: string;
  active?: boolean;
  onClick: () => void;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ icon: Icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-300 group ${active
      ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-600/10 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20'
      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-slate-200'
      }`}
  >
    <Icon size={20} />
    <span className="font-medium">{label}</span>
  </button>
);

interface LayoutProps {
  children: React.ReactNode;
  activeView: string;
  setActiveView: (view: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeView, setActiveView }) => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isDark, setIsDark] = useState(true);

  // Initialize theme
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldBeDark = savedTheme === 'dark' || (!savedTheme && prefersDark);

    setIsDark(shouldBeDark);
    if (shouldBeDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    const newDark = !isDark;
    setIsDark(newDark);
    if (newDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'inventory', label: 'Inventario', icon: Package },
    { id: 'orders', label: 'Nuevo Pedido', icon: ShoppingCart },
    { id: 'pending-orders', label: 'Pendientes', icon: ClipboardCheck }, // Using ClipboardCheck temporarily or any other icon like Clock/List
    { id: 'suppliers', label: 'Proveedores', icon: Truck },
    { id: 'audit', label: 'Auditoría', icon: Layers }, // Swapped icon for variety or keep existing

  ];

  return (
    <div className="flex h-screen overflow-hidden bg-[#f8fafc] dark:bg-gradient-to-br dark:from-[#0f172a] dark:to-[#020617] transition-colors duration-300">
      {/* Mobile Toggle */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-lg text-slate-700 dark:text-slate-200 shadow-md"
        onClick={() => setSidebarOpen(!isSidebarOpen)}
      >
        {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 
        bg-white dark:bg-[#0f172a]/80 dark:backdrop-blur-xl 
        border-r border-slate-200 dark:border-[#334155]/50 
        transition-all duration-300 transform
        lg:translate-x-0 lg:static
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        shadow-2xl lg:shadow-none
      `}>
        <div className="p-6">
          <div className="flex items-center space-x-3 mb-10 px-2">
            <Logo className="w-10 h-10" />
            <h1 className="text-2xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-300 dark:to-violet-300">
              Fluxo
            </h1>
          </div>

          <nav className="space-y-2">
            {menuItems.map((item) => (
              <SidebarItem
                key={item.id}
                icon={item.icon}
                label={item.label}
                active={activeView === item.id}
                onClick={() => {
                  setActiveView(item.id);
                  setSidebarOpen(false);
                }}
              />
            ))}
          </nav>
        </div>

        <div className="absolute bottom-6 left-6 right-6 space-y-2">
          <button
            onClick={toggleTheme}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-300 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-slate-200"
          >
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
            <span className="font-medium">{isDark ? 'Modo Claro' : 'Modo Oscuro'}</span>
          </button>

          <SidebarItem
            icon={Settings}
            label="Configuración"
            onClick={() => setActiveView('settings')}
            active={activeView === 'settings'}
          />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 lg:p-8 pt-20 lg:pt-8 custom-scrollbar">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
