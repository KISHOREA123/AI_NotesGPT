import { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FileText, MessageSquare, Trash2, CreditCard, Settings, Menu, X, Plus, LogOut } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { ConnectionStatus } from '@/components/ConnectionStatus';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: FileText, label: 'Notes', path: '/notes' },
  { icon: MessageSquare, label: 'AI Chat', path: '/ai-chat' },
  { icon: Trash2, label: 'Recycle Bin', path: '/recycle-bin' },
  { icon: CreditCard, label: 'Subscription', path: '/subscription' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

const getPageTitle = (pathname: string) => {
  if (pathname.startsWith('/notes/') && pathname !== '/notes') {
    return pathname.includes('/new') ? 'New Note' : 'Edit Note';
  }
  
  const item = navItems.find(item => item.path === pathname);
  return item?.label || 'Dashboard';
};

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const pageTitle = getPageTitle(location.pathname);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="h-screen flex bg-background overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed lg:static inset-y-0 left-0 z-50 w-64 bg-sidebar border-r border-sidebar-border transform transition-transform duration-300 lg:transform-none flex flex-col h-full",
        sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        {/* Sidebar Header */}
        <div className="flex-shrink-0 p-4 border-b border-sidebar-border flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-1">
            <ThemeSwitcher />
            <Button variant="ghost" size="icon-sm" className="lg:hidden" onClick={() => setSidebarOpen(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Navigation - Fixed height, no scroll */}
        <nav className="flex-1 p-4 flex flex-col justify-center">
          <div className="space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors",
                  location.pathname === item.path
                    ? "bg-sidebar-accent text-primary"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            ))}
          </div>
        </nav>

        {/* Sidebar Footer */}
        <div className="flex-shrink-0 p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-medium">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name || 'User'}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.plan === 'pro' ? 'Pro Plan' : 'Free Plan'}</p>
            </div>
          </div>
          <Button variant="ghost" className="w-full justify-start gap-2 text-muted-foreground" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        {/* Top navbar */}
        <header className="flex-shrink-0 h-16 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-semibold">{pageTitle}</h1>
          </div>
          <div className="flex items-center gap-2">
            <ConnectionStatus />
          </div>
        </header>

        {/* Page content - Full height for editor, scrollable for others */}
        <main className={cn(
          "flex-1",
          location.pathname.includes('/notes/') && location.pathname !== '/notes' 
            ? "overflow-hidden" 
            : "overflow-auto"
        )}>
          <div className={cn(
            location.pathname.includes('/notes/') && location.pathname !== '/notes'
              ? "h-full"
              : "p-4 md:p-6 lg:p-8"
          )}>
            <Outlet />
          </div>
        </main>
      </div>

      {/* Floating Action Button */}
      <Button
        onClick={() => navigate('/notes/new')}
        className="fab-button"
        size="icon-lg"
      >
        <Plus className="h-6 w-6" />
      </Button>
    </div>
  );
}
