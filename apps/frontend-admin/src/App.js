"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const react_router_dom_1 = require("react-router-dom");
const react_hot_toast_1 = require("react-hot-toast");
const Layout_1 = require("./components/Layout");
const Dashboard_1 = require("./pages/Dashboard");
const Services_1 = require("./pages/Services");
const CreateService_1 = require("./pages/CreateService");
const EditService_1 = require("./pages/EditService");
const Regions_1 = require("./pages/Regions");
const Settings_1 = require("./pages/Settings");
const Widget_1 = require("./pages/Widget");
const Workers_1 = require("./pages/Workers");
const Login_1 = require("./pages/Login");
const authStore_1 = require("./stores/authStore");
function App() {
    const { isAuthenticated } = (0, authStore_1.useAuthStore)();
    if (!isAuthenticated) {
        return <Login_1.Login />;
    }
    return (<>
      <Layout_1.Layout>
        <react_router_dom_1.Routes>
          <react_router_dom_1.Route path="/" element={<react_router_dom_1.Navigate to="/dashboard" replace/>}/>
          <react_router_dom_1.Route path="/dashboard" element={<Dashboard_1.Dashboard />}/>
          <react_router_dom_1.Route path="/services" element={<Services_1.Services />}/>
          <react_router_dom_1.Route path="/services/create" element={<CreateService_1.CreateService />}/>
          <react_router_dom_1.Route path="/services/:id/edit" element={<EditService_1.EditService />}/>
          <react_router_dom_1.Route path="/regions" element={<Regions_1.Regions />}/>
          <react_router_dom_1.Route path="/workers" element={<Workers_1.Workers />}/>
          <react_router_dom_1.Route path="/widget" element={<Widget_1.Widget />}/>
          <react_router_dom_1.Route path="/settings" element={<Settings_1.Settings />}/>
        </react_router_dom_1.Routes>
      </Layout_1.Layout>
      <react_hot_toast_1.Toaster position="top-right" toastOptions={{
            duration: 4000,
            style: {
                background: '#363636',
                color: '#fff',
            },
        }}/>
    </>);
}
exports.default = App;
//# sourceMappingURL=App.js.map