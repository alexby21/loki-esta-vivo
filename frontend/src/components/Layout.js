import { Link, useLocation } from 'react-router-dom';
import { Home, Users, CreditCard, DollarSign, FileText, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Layout = ({ children, user, onLogout }) => {
  const location = useLocation();

  const navItems = [
    { name: 'Dashboard', path: '/', icon: Home },
    { name: 'Ventas', path: '/debts', icon: CreditCard },
    { name: 'Pagos', path: '/payments', icon: DollarSign },
    { name: 'Reportes', path: '/reports', icon: FileText },
  ];

  return (
    <div className="flex h-screen" style={{ background: 'transparent' }}>
      {/* Sidebar */}
      <aside className="w-64 shadow-lg border-r border-gray-200" style={{ background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(10px)' }}>
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-800" style={{ fontFamily: 'Playfair Display, serif' }}>
            SEMI DEUS ART
          </h1>
          <p className="text-xs text-gray-500 mt-1">Gestión de Deudas</p>
        </div>

        <nav className="p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                data-testid={`nav-${item.name.toLowerCase()}`}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  isActive
                    ? 'bg-gray-800 text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon size={20} />
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 w-64 p-4 border-t border-gray-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center text-white font-bold">
              {user?.username?.[0]?.toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-800" data-testid="user-name">{user?.username}</p>
              <p className="text-xs text-gray-500" data-testid="user-email">{user?.email}</p>
            </div>
          </div>
          <Button
            data-testid="logout-button"
            onClick={onLogout}
            variant="outline"
            className="w-full flex items-center gap-2"
          >
            <LogOut size={16} />
            Cerrar Sesión
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto" style={{ background: 'rgba(248, 249, 250, 0.85)', backdropFilter: 'blur(5px)' }}>
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
};

export default Layout;