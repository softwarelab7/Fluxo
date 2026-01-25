
import React, { useState } from 'react';
import Layout from './components/Layout';
import Dashboard from './views/Dashboard';
import Inventory from './views/Inventory';
import Orders from './views/Orders';
import Audit from './views/Audit';
import Suppliers from './views/Suppliers';
import Settings from './views/Settings';
import { ToastProvider } from './components/Toast';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState('dashboard');

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return <Dashboard onNavigate={setActiveView} />;
      case 'inventory':
        return <Inventory />;
      case 'orders':
        return <Orders initialViewMode="CREATE" />;
      case 'pending-orders':
        return <Orders initialViewMode="LIST" />;
      case 'audit':
        return <Audit />;
      case 'suppliers':
        return <Suppliers />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard onNavigate={setActiveView} />;
    }
  };

  return (
    <ToastProvider>
      <Layout activeView={activeView} setActiveView={setActiveView}>
        {renderView()}
      </Layout>
    </ToastProvider>
  );
};

export default App;
