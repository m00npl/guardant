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
exports.useAuth = exports.AuthProvider = void 0;
const react_1 = __importStar(require("react"));
const axios_1 = __importDefault(require("axios"));
const react_hot_toast_1 = require("react-hot-toast");
const AuthContext = (0, react_1.createContext)(null);
const API_URL = import.meta.env.VITE_API_URL || '/api/admin';
// Don't set baseURL, use relative paths
// axios.defaults.baseURL = API_URL;
// Add request interceptor to add auth token
axios_1.default.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});
// Add response interceptor for debugging
axios_1.default.interceptors.response.use((response) => response, (error) => {
    if (error.response?.status === 401) {
        // Token expired or invalid
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        delete axios_1.default.defaults.headers.common['Authorization'];
        window.location.href = '/admin/login';
    }
    return Promise.reject(error);
});
const AuthProvider = ({ children }) => {
    const [user, setUser] = (0, react_1.useState)(null);
    const [loading, setLoading] = (0, react_1.useState)(true);
    (0, react_1.useEffect)(() => {
        const token = localStorage.getItem('token');
        if (token) {
            fetchProfile();
        }
        else {
            setLoading(false);
        }
    }, []);
    const fetchProfile = async () => {
        try {
            const response = await axios_1.default.post(`${API_URL}/nest/profile`);
            // The response contains the nest data, but we need to get user data
            // The user data should be already available from login
            const userData = JSON.parse(localStorage.getItem('userData') || '{}');
            if (userData && userData.id) {
                setUser(userData);
            }
        }
        catch (error) {
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('userData');
        }
        finally {
            setLoading(false);
        }
    };
    const login = async (email, password) => {
        try {
            const response = await axios_1.default.post(`${API_URL}/auth/login`, { email, password });
            const { tokens, user, nest } = response.data.data;
            localStorage.setItem('token', tokens.accessToken);
            localStorage.setItem('refreshToken', tokens.refreshToken);
            // Store user data with nest information
            const userData = {
                ...user,
                subdomain: nest.subdomain,
                name: nest.name,
                subscription: nest.subscription
            };
            localStorage.setItem('userData', JSON.stringify(userData));
            setUser(userData);
            react_hot_toast_1.toast.success('Welcome back!');
        }
        catch (error) {
            react_hot_toast_1.toast.error(error.response?.data?.error || 'Login failed');
            throw error;
        }
    };
    const register = async (email, password, name, subdomain) => {
        try {
            const response = await axios_1.default.post(`${API_URL}/auth/register`, {
                email,
                password,
                name,
                subdomain
            });
            const { tokens, user, nest } = response.data.data;
            localStorage.setItem('token', tokens.accessToken);
            localStorage.setItem('refreshToken', tokens.refreshToken);
            // Store user data with nest information
            const userData = {
                ...user,
                subdomain: nest.subdomain,
                name: nest.name,
                subscription: nest.subscription
            };
            localStorage.setItem('userData', JSON.stringify(userData));
            setUser(userData);
            react_hot_toast_1.toast.success('Account created successfully!');
        }
        catch (error) {
            react_hot_toast_1.toast.error(error.response?.data?.error || 'Registration failed');
            throw error;
        }
    };
    const logout = async () => {
        try {
            await axios_1.default.post(`${API_URL}/auth/logout`);
        }
        catch (error) {
            console.error('Logout error:', error);
        }
        finally {
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('userData');
            setUser(null);
            react_hot_toast_1.toast.success('Logged out successfully');
        }
    };
    const refreshToken = async () => {
        try {
            const refreshToken = localStorage.getItem('refreshToken');
            if (!refreshToken)
                throw new Error('No refresh token');
            const response = await axios_1.default.post(`${API_URL}/auth/refresh`, { refreshToken });
            const { token } = response.data.data;
            localStorage.setItem('token', token);
        }
        catch (error) {
            await logout();
            throw error;
        }
    };
    return (<AuthContext.Provider value={{ user, loading, login, register, logout, refreshToken }}>
      {children}
    </AuthContext.Provider>);
};
exports.AuthProvider = AuthProvider;
const useAuth = () => {
    const context = (0, react_1.useContext)(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
exports.useAuth = useAuth;
//# sourceMappingURL=AuthContext.js.map