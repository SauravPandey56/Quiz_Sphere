import React, { useContext } from 'react';
import { Menu, Bell, Sun, Moon } from 'lucide-react';
import { DashboardContext } from './DashboardLayout';
import { ThemeContext } from '../../context/ThemeContext';

const Navbar = ({ activeTabLabel, rightContent, unreadCount = 0, onBellClick }) => {
  const { isSidebarOpen, setIsSidebarOpen } = useContext(DashboardContext);
  const { theme, toggleTheme } = useContext(ThemeContext);

  return (
    <header className="h-16 bg-[var(--surface)]/70 backdrop-blur-xl border-b border-[var(--border)] flex items-center justify-between px-4 sm:px-6 shrink-0 z-10 w-full transition-all duration-300">
      <div className="flex items-center gap-3">
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
          className="p-2 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors"
          aria-label="Toggle sidebar"
        >
          <Menu size={20} />
        </button>
        <h1 className="text-base font-semibold text-[var(--text)] tracking-tight hidden sm:block capitalize font-heading">
          {activeTabLabel}
        </h1>
      </div>
      
      <div className="flex items-center gap-2 sm:gap-4">
        {onBellClick && (
          <button 
            onClick={onBellClick} 
            className="relative p-2 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors"
            aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[18px] h-[18px] bg-[var(--wrong)] rounded-full text-[10px] font-bold text-white flex items-center justify-center px-1 ring-2 ring-[var(--surface)]">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
        )}
        <button 
          onClick={toggleTheme} 
          className="p-2 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors"
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>
        <div className="h-6 w-px bg-[var(--border)] hidden sm:block"></div>
        {rightContent}
      </div>
    </header>
  );
};

export default Navbar;
