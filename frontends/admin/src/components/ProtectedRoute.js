"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProtectedRoute = void 0;
const react_1 = __importDefault(require("react"));
const react_router_dom_1 = require("react-router-dom");
const AuthContext_1 = require("../contexts/AuthContext");
const ProtectedRoute = () => {
    const { user, loading } = (0, AuthContext_1.useAuth)();
    if (loading) {
        return (<div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>);
    }
    return user ? <react_router_dom_1.Outlet /> : <react_router_dom_1.Navigate to="/login"/>;
};
exports.ProtectedRoute = ProtectedRoute;
//# sourceMappingURL=ProtectedRoute.js.map