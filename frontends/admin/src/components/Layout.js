"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Layout = void 0;
const react_1 = __importDefault(require("react"));
const react_router_dom_1 = require("react-router-dom");
const AuthContext_1 = require("../contexts/AuthContext");
const react_hot_toast_1 = require("react-hot-toast");
const Layout = () => {
    const location = (0, react_router_dom_1.useLocation)();
    const navigate = (0, react_router_dom_1.useNavigate)();
    const { user, logout } = (0, AuthContext_1.useAuth)();
    const navigation = [
        { name: 'Dashboard', href: '/dashboard', icon: '📊' },
        { name: 'Services', href: '/services', icon: '🔍' },
        { name: 'Subscription', href: '/subscription', icon: '💳' },
        { name: 'Settings', href: '/settings', icon: '⚙️' },
    ];
    // Add platform admin link if user has the role
    if (user?.role === 'platform_admin') {
        navigation.push({ name: 'Platform Admin', href: '/platform', icon: '🛡️' });
    }
    const handleLogout = async () => {
        try {
            await logout();
            navigate('/login');
        }
        catch (error) {
            react_hot_toast_1.toast.error('Logout failed');
        }
    };
    return (<div className="min-h-screen bg-gray-100">
      <react_hot_toast_1.Toaster position="top-right"/>
      
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-bold">🐜 GuardAnt</h1>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                {navigation.map((item) => (<react_router_dom_1.Link key={item.name} to={item.href} className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${location.pathname === item.href
                ? 'border-blue-500 text-gray-900'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'}`}>
                    <span className="mr-2">{item.icon}</span>
                    {item.name}
                  </react_router_dom_1.Link>))}
              </div>
            </div>
            <div className="flex items-center">
              {user && (<div className="flex-shrink-0">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {user.subscription?.tier?.toUpperCase() || 'FREE'}
                  </span>
                </div>)}
              <div className="ml-3 relative">
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-700">{user?.email}</span>
                  <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-gray-700">
                    Logout
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <react_router_dom_1.Outlet />
      </main>
    </div>);
};
exports.Layout = Layout;
//# sourceMappingURL=Layout.js.map