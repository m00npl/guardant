"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.App = void 0;
const react_1 = __importDefault(require("react"));
const react_router_dom_1 = require("react-router-dom");
const AuthContext_1 = require("./contexts/AuthContext");
const ProtectedRoute_1 = require("./components/ProtectedRoute");
const LoginPage_1 = require("./pages/LoginPage");
const RegisterPage_1 = require("./pages/RegisterPage");
const DashboardPage_1 = require("./pages/DashboardPage");
const ServicesPage_1 = require("./pages/ServicesPage");
const SubscriptionPage_1 = require("./pages/SubscriptionPage");
const SettingsPage_1 = require("./pages/SettingsPage");
const PlatformAdminPage_1 = require("./pages/PlatformAdminPage");
const Layout_1 = require("./components/Layout");
const App = () => {
    return (<react_router_dom_1.BrowserRouter basename="/admin">
      <AuthContext_1.AuthProvider>
        <react_router_dom_1.Routes>
          <react_router_dom_1.Route path="/login" element={<LoginPage_1.LoginPage />}/>
          <react_router_dom_1.Route path="/register" element={<RegisterPage_1.RegisterPage />}/>
          <react_router_dom_1.Route element={<ProtectedRoute_1.ProtectedRoute />}>
            <react_router_dom_1.Route element={<Layout_1.Layout />}>
              <react_router_dom_1.Route path="/" element={<react_router_dom_1.Navigate to="/dashboard"/>}/>
              <react_router_dom_1.Route path="/dashboard" element={<DashboardPage_1.DashboardPage />}/>
              <react_router_dom_1.Route path="/services" element={<ServicesPage_1.ServicesPage />}/>
              <react_router_dom_1.Route path="/subscription" element={<SubscriptionPage_1.SubscriptionPage />}/>
              <react_router_dom_1.Route path="/settings" element={<SettingsPage_1.SettingsPage />}/>
              <react_router_dom_1.Route path="/platform" element={<PlatformAdminPage_1.PlatformAdminPage />}/>
            </react_router_dom_1.Route>
          </react_router_dom_1.Route>
        </react_router_dom_1.Routes>
      </AuthContext_1.AuthProvider>
    </react_router_dom_1.BrowserRouter>);
};
exports.App = App;
//# sourceMappingURL=App.js.map