"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importStar(require("react"));
const react_router_dom_1 = require("react-router-dom");
const framer_motion_1 = require("framer-motion");
const react_hotkeys_hook_1 = require("react-hotkeys-hook");
// Components
const Sidebar_1 = __importDefault(require("./Sidebar"));
const Header_1 = __importDefault(require("./Header"));
const CommandPalette_1 = __importDefault(require("../ui/CommandPalette"));
const NotificationPanel_1 = __importDefault(require("../ui/NotificationPanel"));
// Hooks
const AuthContext_1 = require("../../contexts/AuthContext");
const ThemeContext_1 = require("../../contexts/ThemeContext");
const DashboardLayout = ({ children }) => {
    const [sidebarOpen, setSidebarOpen] = (0, react_1.useState)(true);
    const [commandPaletteOpen, setCommandPaletteOpen] = (0, react_1.useState)(false);
    const [notificationPanelOpen, setNotificationPanelOpen] = (0, react_1.useState)(false);
    const { user } = (0, AuthContext_1.useAuth)();
    const { resolvedTheme } = (0, ThemeContext_1.useTheme)();
    const location = (0, react_router_dom_1.useLocation)();
    // Keyboard shortcuts
    (0, react_hotkeys_hook_1.useHotkeys)('ctrl+k,cmd+k', (e) => {
        e.preventDefault();
        setCommandPaletteOpen(true);
    });
    (0, react_hotkeys_hook_1.useHotkeys)('ctrl+b,cmd+b', (e) => {
        e.preventDefault();
        setSidebarOpen(!sidebarOpen);
    });
    (0, react_hotkeys_hook_1.useHotkeys)('ctrl+n,cmd+n', (e) => {
        e.preventDefault();
        setNotificationPanelOpen(!notificationPanelOpen);
    });
    (0, react_hotkeys_hook_1.useHotkeys)('escape', () => {
        setCommandPaletteOpen(false);
        setNotificationPanelOpen(false);
    });
    // Get page title from location
    const getPageTitle = () => {
        const path = location.pathname.split('/').pop() || 'dashboard';
        return path.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };
    return (<div className={`min-h-screen bg-background ${resolvedTheme}`}>
      {/* Sidebar */}
      <framer_motion_1.AnimatePresence>
        {sidebarOpen && (<framer_motion_1.motion.div initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }} transition={{ type: "spring", stiffness: 300, damping: 30 }} className="fixed inset-y-0 left-0 z-50 w-64 lg:w-72">
            <Sidebar_1.default onClose={() => setSidebarOpen(false)}/>
          </framer_motion_1.motion.div>)}
      </framer_motion_1.AnimatePresence>

      {/* Mobile sidebar overlay */}
      <framer_motion_1.AnimatePresence>
        {sidebarOpen && (<framer_motion_1.motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)}/>)}
      </framer_motion_1.AnimatePresence>

      {/* Main content */}
      <div className={`flex flex-col min-h-screen transition-all duration-300 ${sidebarOpen ? 'lg:pl-72' : ''}`}>
        {/* Header */}
        <Header_1.default sidebarOpen={sidebarOpen} onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} onOpenCommandPalette={() => setCommandPaletteOpen(true)} onOpenNotifications={() => setNotificationPanelOpen(true)}/>

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
          <framer_motion_1.motion.div key={location.pathname} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.2 }} className="px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </framer_motion_1.motion.div>
        </main>
      </div>

      {/* Command Palette */}
      <CommandPalette_1.default open={commandPaletteOpen} onClose={() => setCommandPaletteOpen(false)}/>

      {/* Notification Panel */}
      <NotificationPanel_1.default open={notificationPanelOpen} onClose={() => setNotificationPanelOpen(false)}/>

      {/* Global loading indicator */}
      <div id="loading-indicator" className="fixed top-0 left-0 right-0 z-50">
        {/* This will be populated by loading states */}
      </div>

      {/* Breadcrumb navigation */}
      {location.pathname !== '/dashboard' && (<div className="fixed bottom-4 right-4 z-40">
          <framer_motion_1.motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 px-3 py-2">
            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
              <span>Dashboard</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
              </svg>
              <span className="text-gray-900 dark:text-white font-medium">
                {getPageTitle()}
              </span>
            </div>
          </framer_motion_1.motion.div>
        </div>)}
    </div>);
};
exports.default = DashboardLayout;
//# sourceMappingURL=DashboardLayout.js.map