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
const AuthContext_1 = require("./contexts/AuthContext");
const ThemeContext_1 = require("./contexts/ThemeContext");
// Layout components
const DashboardLayout_1 = __importDefault(require("./components/layout/DashboardLayout"));
const LoadingSpinner_1 = __importDefault(require("./components/ui/LoadingSpinner"));
// Auth pages
const LoginPage_1 = __importDefault(require("./pages/auth/LoginPage"));
// Dashboard pages (lazy loaded for better performance)
const OverviewPage = react_1.default.lazy(() => Promise.resolve().then(() => __importStar(require('./pages/dashboard/OverviewPage'))));
const SystemHealthPage = react_1.default.lazy(() => Promise.resolve().then(() => __importStar(require('./pages/dashboard/SystemHealthPage'))));
const ServicesPage = react_1.default.lazy(() => Promise.resolve().then(() => __importStar(require('./pages/dashboard/ServicesPage'))));
const NestsPage = react_1.default.lazy(() => Promise.resolve().then(() => __importStar(require('./pages/dashboard/NestsPage'))));
const UsersPage = react_1.default.lazy(() => Promise.resolve().then(() => __importStar(require('./pages/dashboard/UsersPage'))));
const MonitoringPage = react_1.default.lazy(() => Promise.resolve().then(() => __importStar(require('./pages/dashboard/MonitoringPage'))));
const AlertsPage = react_1.default.lazy(() => Promise.resolve().then(() => __importStar(require('./pages/dashboard/AlertsPage'))));
const AnalyticsPage = react_1.default.lazy(() => Promise.resolve().then(() => __importStar(require('./pages/dashboard/AnalyticsPage'))));
const LogsPage = react_1.default.lazy(() => Promise.resolve().then(() => __importStar(require('./pages/dashboard/LogsPage'))));
const SettingsPage = react_1.default.lazy(() => Promise.resolve().then(() => __importStar(require('./pages/dashboard/SettingsPage'))));
const DeploymentsPage = react_1.default.lazy(() => Promise.resolve().then(() => __importStar(require('./pages/dashboard/DeploymentsPage'))));
const SecurityPage = react_1.default.lazy(() => Promise.resolve().then(() => __importStar(require('./pages/dashboard/SecurityPage'))));
// Fallback component for lazy loading
const PageFallback = () => (<div className="flex items-center justify-center h-64">
    <LoadingSpinner_1.default size="lg"/>
  </div>);
// Protected route wrapper
const ProtectedRoute = ({ children }) => {
    const { user, loading } = (0, AuthContext_1.useAuth)();
    if (loading) {
        return <LoadingSpinner_1.default size="lg"/>;
    }
    if (!user) {
        return <react_router_dom_1.Navigate to="/login" replace/>;
    }
    // Check if user has admin permissions
    if (user.role !== 'admin' && user.role !== 'super_admin') {
        return (<div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Access Denied
          </h1>
          <p className="text-gray-600 mb-6">
            You don't have permission to access the system dashboard. This area is restricted to administrators only.
          </p>
          <button onClick={() => window.location.href = '/'} className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors">
            Return to Main Site
          </button>
        </div>
      </div>);
    }
    return <>{children}</>;
};
function App() {
    const { user, loading } = (0, AuthContext_1.useAuth)();
    const { theme } = (0, ThemeContext_1.useTheme)();
    // Apply theme class to document
    react_1.default.useEffect(() => {
        document.documentElement.classList.toggle('dark', theme === 'dark');
    }, [theme]);
    if (loading) {
        return (<div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner_1.default size="lg"/>
      </div>);
    }
    return (<div className="min-h-screen bg-background">
      <react_router_dom_1.Routes>
        {/* Auth routes */}
        <react_router_dom_1.Route path="/login" element={user ? <react_router_dom_1.Navigate to="/dashboard" replace/> : <LoginPage_1.default />}/>
        
        {/* Dashboard routes */}
        <react_router_dom_1.Route path="/dashboard/*" element={<ProtectedRoute>
              <DashboardLayout_1.default>
                <react_1.Suspense fallback={<PageFallback />}>
                  <react_router_dom_1.Routes>
                    <react_router_dom_1.Route index element={<OverviewPage />}/>
                    <react_router_dom_1.Route path="system-health" element={<SystemHealthPage />}/>
                    <react_router_dom_1.Route path="services" element={<ServicesPage />}/>
                    <react_router_dom_1.Route path="nests" element={<NestsPage />}/>
                    <react_router_dom_1.Route path="users" element={<UsersPage />}/>
                    <react_router_dom_1.Route path="monitoring" element={<MonitoringPage />}/>
                    <react_router_dom_1.Route path="alerts" element={<AlertsPage />}/>
                    <react_router_dom_1.Route path="analytics" element={<AnalyticsPage />}/>
                    <react_router_dom_1.Route path="logs" element={<LogsPage />}/>
                    <react_router_dom_1.Route path="deployments" element={<DeploymentsPage />}/>
                    <react_router_dom_1.Route path="security" element={<SecurityPage />}/>
                    <react_router_dom_1.Route path="settings" element={<SettingsPage />}/>
                    <react_router_dom_1.Route path="*" element={<react_router_dom_1.Navigate to="/dashboard" replace/>}/>
                  </react_router_dom_1.Routes>
                </react_1.Suspense>
              </DashboardLayout_1.default>
            </ProtectedRoute>}/>

        {/* Default redirect */}
        <react_router_dom_1.Route path="/" element={<react_router_dom_1.Navigate to={user ? "/dashboard" : "/login"} replace/>}/>
        
        {/* 404 page */}
        <react_router_dom_1.Route path="*" element={<div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
              <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                  </svg>
                </div>
                <h1 className="text-xl font-semibold text-gray-900 mb-2">
                  Page Not Found
                </h1>
                <p className="text-gray-600 mb-6">
                  The page you're looking for doesn't exist or has been moved.
                </p>
                <button onClick={() => window.history.back()} className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors">
                  Go Back
                </button>
              </div>
            </div>}/>
      </react_router_dom_1.Routes>
    </div>);
}
exports.default = App;
//# sourceMappingURL=App.js.map