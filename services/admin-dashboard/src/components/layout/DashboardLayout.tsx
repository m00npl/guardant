import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useHotkeys } from 'react-hotkeys-hook';

// Components
import Sidebar from './Sidebar';
import Header from './Header';
import CommandPalette from '../ui/CommandPalette';
import NotificationPanel from '../ui/NotificationPanel';

// Hooks
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [notificationPanelOpen, setNotificationPanelOpen] = useState(false);
  
  const { user } = useAuth();
  const { resolvedTheme } = useTheme();
  const location = useLocation();

  // Keyboard shortcuts
  useHotkeys('ctrl+k,cmd+k', (e) => {
    e.preventDefault();
    setCommandPaletteOpen(true);
  });

  useHotkeys('ctrl+b,cmd+b', (e) => {
    e.preventDefault();
    setSidebarOpen(!sidebarOpen);
  });

  useHotkeys('ctrl+n,cmd+n', (e) => {
    e.preventDefault();
    setNotificationPanelOpen(!notificationPanelOpen);
  });

  useHotkeys('escape', () => {
    setCommandPaletteOpen(false);
    setNotificationPanelOpen(false);
  });

  // Get page title from location
  const getPageTitle = () => {
    const path = location.pathname.split('/').pop() || 'dashboard';
    return path.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    <div className={`min-h-screen bg-background ${resolvedTheme}`}>
      {/* Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed inset-y-0 left-0 z-50 w-64 lg:w-72"
          >
            <Sidebar onClose={() => setSidebarOpen(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className={`flex flex-col min-h-screen transition-all duration-300 ${
        sidebarOpen ? 'lg:pl-72' : ''
      }`}>
        {/* Header */}
        <Header
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onOpenCommandPalette={() => setCommandPaletteOpen(true)}
          onOpenNotifications={() => setNotificationPanelOpen(true)}
        />

        {/* Page content */}
        <main className="flex-1 bg-gray-50 dark:bg-gray-900">
          {/* Page header */}
          <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <div className="px-4 sm:px-6 lg:px-8 py-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {getPageTitle()}
                  </h1>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {user?.role === 'super_admin' ? 'Super Administrator' : 'Administrator'} • {user?.email}
                  </p>
                </div>
                
                {/* Page actions - can be customized per page */}
                <div className="flex items-center space-x-3">
                  {/* Keyboard shortcuts hint */}
                  <div className="hidden lg:flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                    <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">⌘K</kbd>
                    <span>Search</span>
                    <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">⌘B</kbd>
                    <span>Toggle sidebar</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Content with animation */}
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="px-4 sm:px-6 lg:px-8 py-8"
          >
            {children}
          </motion.div>
        </main>
      </div>

      {/* Command Palette */}
      <CommandPalette
        open={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />

      {/* Notification Panel */}
      <NotificationPanel
        open={notificationPanelOpen}
        onClose={() => setNotificationPanelOpen(false)}
      />

      {/* Global loading indicator */}
      <div id="loading-indicator" className="fixed top-0 left-0 right-0 z-50">
        {/* This will be populated by loading states */}
      </div>

      {/* Breadcrumb navigation */}
      {location.pathname !== '/dashboard' && (
        <div className="fixed bottom-4 right-4 z-40">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 px-3 py-2"
          >
            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
              <span>Dashboard</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span className="text-gray-900 dark:text-white font-medium">
                {getPageTitle()}
              </span>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default DashboardLayout;