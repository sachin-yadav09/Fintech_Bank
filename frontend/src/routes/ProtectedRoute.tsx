import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { Sidebars } from '@/layout/Sidebar';
import DashboardHeader from '@/layout/DashboardHeader';

const ProtectedRoute: React.FC = () => {
  // TODO: Implement actual authentication check here
  const isAuthenticated = true;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex min-h-screen bg-[var(--color-bg)] text-[var(--color-text-main)]">
      {/* Sidebar Navigation */}
      <Sidebars />
      
      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0">
        <DashboardHeader />
        
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default ProtectedRoute;