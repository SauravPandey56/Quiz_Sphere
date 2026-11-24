import React, { useContext } from 'react';
import { DashboardContext } from './DashboardLayout';
import QuizSphereLogo from '../logo/QuizSphereLogo';
import { LogOut } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Sidebar = ({ menuItems, activeTab, setActiveTab, userRole, customHeader, customTopSpace }) => {
  const { isSidebarOpen, setIsSidebarOpen } = useContext(DashboardContext);
  const { logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleTabClick = (id) => {
    setActiveTab(id);
    // Close sidebar on mobile after selecting an item
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  return (
    <aside 
      className={`fixed inset-y-0 left-0 z-50 bg-[var(--surface)] border-r border-[var(--border)] text-[var(--muted)] h-full flex flex-col transform transition-all duration-300 ease-in-out md:relative md:translate-x-0 ${
        isSidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0 md:w-20'
      }`}
      role="navigation"
      aria-label="Main navigation"
    >
      {/* Logo Header */}
      <div className={`h-16 flex border-b border-[var(--border)] items-center shrink-0 ${isSidebarOpen ? 'px-5' : 'px-0 justify-center'}`}>
         <QuizSphereLogo size="sm" showText={isSidebarOpen} />
      </div>
      
      {/* Custom Header (e.g. Candidate avatar block) */}
      {customHeader && (
        <div className={`transition-all duration-300 overflow-hidden ${!isSidebarOpen ? 'max-h-0 opacity-0 md:hidden' : 'opacity-100'}`}>
           {customHeader}
        </div>
      )}

      {/* Navigation Items */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 custom-scrollbar" aria-label="Sidebar navigation">
        {customTopSpace && isSidebarOpen && (
          <p className="px-3 text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-3 mt-1">{customTopSpace}</p>
        )}
        {!customTopSpace && isSidebarOpen && (
          <p className="px-3 text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-3 mt-1">{userRole || 'Menu'}</p>
        )}
        
        {menuItems.map(item => (
          <button
            key={item.id}
            onClick={() => handleTabClick(item.id)}
            className={`w-full flex items-center py-2.5 rounded-[var(--radius-btn)] transition-all duration-200 group ${
              activeTab === item.id 
                ? 'bg-[var(--primary)] text-white font-medium shadow-lg shadow-[var(--primary)]/20' 
                : 'text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]'
            } ${isSidebarOpen ? 'px-3 gap-3' : 'justify-center px-0'}`}
            title={!isSidebarOpen ? item.label : ''}
            aria-current={activeTab === item.id ? 'page' : undefined}
          >
            <div className="relative shrink-0">
              <item.icon size={20} className={activeTab === item.id ? 'text-white/90' : 'text-[var(--muted)] group-hover:text-[var(--text)]'} />
              {!isSidebarOpen && item.badge && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-[var(--wrong)] rounded-full" aria-hidden="true"></span>
              )}
            </div>
            {isSidebarOpen && (
               <>
                 <span className="whitespace-nowrap flex-1 text-left text-sm">{item.label}</span>
                 {item.badge && (
                   <span className="ml-auto bg-[var(--wrong)] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                     {item.badge}
                   </span>
                 )}
               </>
            )}
          </button>
        ))}
      </nav>

      {/* Sign Out */}
      <div className="p-3 border-t border-[var(--border)] shrink-0">
        <button 
          onClick={handleLogout} 
          className={`flex items-center text-[var(--muted)] hover:text-[var(--wrong)] transition-colors w-full py-2.5 rounded-[var(--radius-btn)] hover:bg-[var(--wrong)]/10 ${isSidebarOpen ? 'px-3 gap-3' : 'justify-center px-0'}`} 
          title="Sign out"
        >
          <LogOut size={20} className="shrink-0" />
          {isSidebarOpen && <span className="whitespace-nowrap text-sm">Sign Out</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
