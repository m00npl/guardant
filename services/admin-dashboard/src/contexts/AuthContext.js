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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthProvider = exports.useAuth = void 0;
const react_1 = __importStar(require("react"));
const react_router_dom_1 = require("react-router-dom");
const sonner_1 = require("sonner");
const AuthContext = (0, react_1.createContext)(undefined);
const useAuth = () => {
    const context = (0, react_1.useContext)(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
exports.useAuth = useAuth;
const AuthProvider = ({ children }) => {
    const [state, setState] = (0, react_1.useState)({
        user: null,
        loading: true,
        error: null
    });
    const navigate = (0, react_router_dom_1.useNavigate)();
    // API client with auth
    const apiCall = async (endpoint, options = {}) => {
        const token = localStorage.getItem('auth_token');
        const config = {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...(token && { Authorization: `Bearer ${token}` }),
                ...options.headers
            }
        };
        const response = await fetch(`/api/admin${endpoint}`, config);
        if (!response.ok) {
            if (response.status === 401) {
                // Token expired or invalid, clear auth state
                localStorage.removeItem('auth_token');
                setState(prev => ({ ...prev, user: null }));
                navigate('/login');
                throw new Error('Authentication expired');
            }
            const error = await response.json().catch(() => ({ message: response.statusText }));
            throw new Error(error.message || 'Request failed');
        }
        return response.json();
    };
    // Login function
    const login = async (email, password) => {
        setState(prev => ({ ...prev, loading: true, error: null }));
        try {
            const response = await fetch('/api/admin/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });
            if (!response.ok) {
                const error = await response.json().catch(() => ({ message: response.statusText }));
                throw new Error(error.message || 'Login failed');
            }
            const { user, token } = await response.json();
            // Verify user has admin permissions
            if (user.role !== 'admin' && user.role !== 'super_admin') {
                throw new Error('Access denied. Administrator privileges required.');
            }
            // Store token
            localStorage.setItem('auth_token', token);
            setState({
                user,
                loading: false,
                error: null
            });
            sonner_1.toast.success(`Welcome back, ${user.name}!`);
            navigate('/dashboard');
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Login failed';
            setState(prev => ({
                ...prev,
                loading: false,
                error: message
            }));
            sonner_1.toast.error(message);
            throw error;
        }
    };
    // Logout function
    const logout = async () => {
        try {
            // Call logout endpoint to invalidate token on server
            await apiCall('/auth/logout', { method: 'POST' });
        }
        catch (error) {
            // Continue with logout even if server call fails
            console.warn('Logout API call failed:', error);
        }
        // Clear local state
        localStorage.removeItem('auth_token');
        setState({
            user: null,
            loading: false,
            error: null
        });
        sonner_1.toast.success('Logged out successfully');
        navigate('/login');
    };
    // Refresh user data
    const refreshUser = async () => {
        const token = localStorage.getItem('auth_token');
        if (!token) {
            setState(prev => ({ ...prev, loading: false }));
            return;
        }
        try {
            const user = await apiCall('/auth/me');
            setState(prev => ({
                ...prev,
                user,
                loading: false,
                error: null
            }));
        }
        catch (error) {
            console.error('Failed to refresh user:', error);
            setState(prev => ({
                ...prev,
                user: null,
                loading: false,
                error: null
            }));
        }
    };
    // Initialize auth state on mount
    (0, react_1.useEffect)(() => {
        refreshUser();
    }, []);
    // Auto-refresh user data periodically
    (0, react_1.useEffect)(() => {
        if (!state.user)
            return;
        const interval = setInterval(() => {
            refreshUser();
        }, 5 * 60 * 1000); // Refresh every 5 minutes
        return () => clearInterval(interval);
    }, [state.user]);
    // Handle auth errors globally
    (0, react_1.useEffect)(() => {
        const handleUnauthorized = (event) => {
            if (state.user) {
                sonner_1.toast.error('Session expired. Please log in again.');
                logout();
            }
        };
        window.addEventListener('auth:unauthorized', handleUnauthorized);
        return () => {
            window.removeEventListener('auth:unauthorized', handleUnauthorized);
        };
    }, [state.user]);
    // Handle browser storage changes (multi-tab logout)
    (0, react_1.useEffect)(() => {
        const handleStorageChange = (event) => {
            if (event.key === 'auth_token' && event.newValue === null && state.user) {
                // Token was removed in another tab
                setState(prev => ({
                    ...prev,
                    user: null
                }));
                navigate('/login');
            }
        };
        window.addEventListener('storage', handleStorageChange);
        return () => {
            window.removeEventListener('storage', handleStorageChange);
        };
    }, [state.user, navigate]);
    // Keyboard shortcuts
    (0, react_1.useEffect)(() => {
        const handleKeyboard = (event) => {
            // Ctrl/Cmd + Shift + L = Logout
            if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'L') {
                event.preventDefault();
                if (state.user) {
                    logout();
                }
            }
            // Ctrl/Cmd + Shift + R = Refresh user
            if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'R') {
                event.preventDefault();
                if (state.user) {
                    refreshUser();
                    sonner_1.toast.success('User data refreshed');
                }
            }
        };
        window.addEventListener('keydown', handleKeyboard);
        return () => {
            window.removeEventListener('keydown', handleKeyboard);
        };
    }, [state.user]);
    const value = {
        ...state,
        login,
        logout,
        refreshUser
    };
    return (<AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>);
};
exports.AuthProvider = AuthProvider;
//# sourceMappingURL=AuthContext.js.map