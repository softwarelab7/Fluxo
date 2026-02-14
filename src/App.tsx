
import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './views/Dashboard';
import Inventory from './views/Inventory';
import Orders from './views/Orders';
import Audit from './views/Audit';
import Suppliers from './views/Suppliers';
import Settings from './views/Settings';
import Classification from './views/Classification';
import { ToastProvider } from './components/Toast';

import { supabase } from './services/supabase';
import { Login } from './views/Login';
import { Users } from './views/Users';
import MissingItems from './views/MissingItems';
import OutOfStock from './views/OutOfStock';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState('dashboard');
  const [viewParams, setViewParams] = useState<any>(null); // State for passing params between views
  const [session, setSession] = useState(null);
  const [userRole, setUserRole] = useState<'admin' | 'employee' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session as any);
      if (session) fetchUserRole(session.user.id);
      else setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session as any);
      if (session) fetchUserRole(session.user.id);
      else {
        setUserRole(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      if (!error && data) {
        setUserRole(data.role as any);
      }
    } catch (error) {
      console.error('Error fetching role:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNavigate = (view: string, params?: any) => {
    setActiveView(view);
    if (params) {
      setViewParams(params);
    } else {
      setViewParams(null); // Reset if no params passed (or keep? usually reset)
    }
  };

  const renderView = () => {
    console.log("Current Active View:", activeView);
    switch (activeView) {
      case 'dashboard':
        return <Dashboard onNavigate={handleNavigate} />;
      case 'inventory':
        return <Inventory initialFilters={viewParams} />;
      case 'orders':
        return <Orders initialViewMode="CREATE" />;
      case 'pending-orders':
        return <Orders initialViewMode="LIST" />;
      case 'audit':
        return <Audit />;
      case 'missing-items':
        return <MissingItems />;
      case 'out-of-stock':
        return <OutOfStock />;
      case 'suppliers':
        return <Suppliers />;
      case 'classification':
        return <Classification />;
      case 'settings':
        return <Settings userRole={userRole} />;
      case 'users':
        return <Users />;
      default:
        return <Dashboard onNavigate={handleNavigate} />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-[#020617]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!session) {
    return <Login />;
  }

  return (
    <ToastProvider>
      <Layout activeView={activeView} setActiveView={setActiveView} userRole={userRole}>
        {renderView()}
      </Layout>
    </ToastProvider>
  );
};

export default App;
