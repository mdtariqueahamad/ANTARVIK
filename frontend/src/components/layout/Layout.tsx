import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import FaultInjection from '../common/FaultInjection';

export default function Layout() {
  return (
    <div className="h-screen flex flex-col overflow-hidden bg-antarctic-navy">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-4 bg-grid">
          <Outlet />
        </main>
      </div>
      <FaultInjection />
    </div>
  );
}
