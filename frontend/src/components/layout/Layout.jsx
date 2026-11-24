import React, { useContext } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import Chatbot from '../Chatbot';
import Footer from './Footer';

const Layout = () => {
  const { user } = useContext(AuthContext);
  const location = useLocation();

  if (!user) return <Navigate to="/login" />;
  
  const isAttemptScreen = location.pathname.includes('/attempt/');

  // Admin, Examiner, Candidate — all use their own DashboardLayout via <Outlet />
  if (user.role === 'admin' || user.role === 'examiner' || user.role === 'candidate') {
    return (
      <div className="min-h-screen bg-[var(--bg)] font-sans text-[var(--text)] flex overflow-hidden relative">
        <Outlet />
      </div>
    );
  }

  // Fallback layout for any other authenticated role (currently none)
  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)] font-sans text-[var(--text)]">
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
      {!isAttemptScreen && <Footer />}
      {!isAttemptScreen && <Chatbot />}
    </div>
  );
};

export default Layout;
