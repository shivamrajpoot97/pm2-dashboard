'use client';

import { useAuth } from '@/lib/useAuth';
import LoginForm from '@/components/LoginForm';
import Header from '@/components/Header';
import StatsOverview from '@/components/StatsOverviewDefault';
import ProcessTable from '@/components/ProcessTable';
import SystemMetrics from '@/components/SystemMetrics';
import LinkedServers from '@/components/LinkedServersDefault';
import RealTimeMetrics from '@/components/RealTimeMetrics';

export default function Dashboard() {
  const { isAuthenticated, user } = useAuth();

  // Show login form if not authenticated
  if (!isAuthenticated) {
    return <LoginForm />;
  }

  // Show dashboard if authenticated
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-8 space-y-6">
        <div className="text-right text-sm text-gray-600">
          Welcome back, <span className="font-semibold">{user?.username}</span>
          {user?.role === 'admin' && (
            <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
              Admin
            </span>
          )}
        </div>
        
        <StatsOverview />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SystemMetrics />
          <RealTimeMetrics />
        </div>
        <ProcessTable />
        <LinkedServers />
      </main>
    </div>
  );
}
