import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';

export default function Layout() {
  return (
    <div className="min-h-screen bg-dark-950 flex">
      <Sidebar />
      <main className="flex-1 ml-64 p-8 overflow-auto min-h-screen">
        <div className="max-w-[1400px] mx-auto animate-fade-in">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
