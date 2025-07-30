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
exports.ServicesPage = void 0;
const react_1 = __importStar(require("react"));
const axios_1 = __importDefault(require("axios"));
const react_hot_toast_1 = require("react-hot-toast");
const ServiceModal_1 = require("../components/ServiceModal");
const API_URL = import.meta.env.VITE_API_URL || '/api/admin';
const ServicesPage = () => {
    const [services, setServices] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [modalOpen, setModalOpen] = (0, react_1.useState)(false);
    const [selectedService, setSelectedService] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
        fetchServices();
    }, []);
    const fetchServices = async () => {
        try {
            const response = await axios_1.default.post(`${API_URL}/services/list`);
            setServices(response.data.data);
        }
        catch (error) {
            react_hot_toast_1.toast.error('Failed to fetch services');
        }
        finally {
            setLoading(false);
        }
    };
    const handleDelete = async (serviceId) => {
        if (!confirm('Are you sure you want to delete this service?'))
            return;
        try {
            await axios_1.default.post(`${API_URL}/services/delete`, { serviceId });
            react_hot_toast_1.toast.success('Service deleted successfully');
            fetchServices();
        }
        catch (error) {
            react_hot_toast_1.toast.error('Failed to delete service');
        }
    };
    const handleEdit = (service) => {
        setSelectedService(service);
        setModalOpen(true);
    };
    const handleAdd = () => {
        setSelectedService(null);
        setModalOpen(true);
    };
    const handleModalClose = () => {
        setModalOpen(false);
        setSelectedService(null);
        fetchServices();
    };
    if (loading) {
        return (<div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>);
    }
    return (<div>
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Services</h1>
          <p className="mt-1 text-sm text-gray-500">
            Monitor your services and endpoints
          </p>
        </div>
        <button onClick={handleAdd} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
          Add Service
        </button>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {services.length === 0 ? (<li className="px-6 py-12 text-center text-gray-500">
              No services configured yet. Add your first service to start monitoring.
            </li>) : (services.map((service) => (<li key={service.id}>
                <div className="px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${service.status === 'up' ? 'bg-green-100 text-green-800' :
                service.status === 'down' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'}`}>
                        {service.status || 'unknown'}
                      </span>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {service.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {service.type} • {service.target} • Every {service.interval}s
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {service.responseTime && (<span className="text-sm text-gray-500">
                        {service.responseTime}ms
                      </span>)}
                    <button onClick={() => handleEdit(service)} className="text-blue-600 hover:text-blue-900 text-sm">
                      Edit
                    </button>
                    <button onClick={() => handleDelete(service.id)} className="text-red-600 hover:text-red-900 text-sm">
                      Delete
                    </button>
                  </div>
                </div>
              </li>)))}
        </ul>
      </div>

      {modalOpen && (<ServiceModal_1.ServiceModal service={selectedService} onClose={handleModalClose}/>)}
    </div>);
};
exports.ServicesPage = ServicesPage;
//# sourceMappingURL=ServicesPage.js.map