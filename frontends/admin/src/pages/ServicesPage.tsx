import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { ServiceModal } from '../components/ServiceModal';
import { useAuth } from '../contexts/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || '/api/admin';

interface Service {
  id: string;
  name: string;
  type: 'web' | 'tcp' | 'ping' | 'github' | 'uptime-api' | 'keyword' | 'heartbeat' | 'port';
  target: string;
  interval: number;
  isActive: boolean;
  status?: 'up' | 'down' | 'unknown' | 'degraded' | 'maintenance';
  responseTime?: number;
  lastChecked?: string;
  monitoring?: {
    regions: string[];
    strategy: 'closest' | 'all-selected' | 'round-robin' | 'failover';
  };
  notifications?: {
    webhooks: string[];
    emails: string[];
  };
}

export const ServicesPage: React.FC = () => {
  const { user } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  
  // Check if user is platform admin
  const isPlatformAdmin = user?.role === 'platform_admin';

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const response = await axios.post(`${API_URL}/services/list`);
      setServices(response.data.data);
    } catch (error) {
      toast.error('Failed to fetch services');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (serviceId: string) => {
    if (!confirm('Are you sure you want to delete this watcher?')) return;

    try {
      await axios.post(`${API_URL}/services/delete`, { id: serviceId });
      toast.success('Watcher deleted successfully');
      fetchServices();
    } catch (error) {
      toast.error('Failed to delete watcher');
    }
  };

  const handleEdit = (service: Service) => {
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
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Watchers</h1>
          <p className="mt-1 text-sm text-gray-500">
            Monitor your services and endpoints with GuardAnt watchers
          </p>
        </div>
        {!isPlatformAdmin && (
          <button
            onClick={handleAdd}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Deploy New Watcher
          </button>
        )}
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {services.length === 0 ? (
            <li className="px-6 py-12 text-center text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No watchers deployed</h3>
              <p className="mt-1 text-sm text-gray-500">
                {isPlatformAdmin 
                  ? "Platform administrators cannot deploy watchers. Please use a regular user account."
                  : "Get started by deploying your first watcher."}
              </p>
              {!isPlatformAdmin && (
                <div className="mt-6">
                  <button
                    onClick={handleAdd}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                    Deploy New Watcher
                  </button>
                </div>
              )}
            </li>
          ) : (
            services.map((service) => (
              <li key={service.id}>
                <div className="px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        service.status === 'up' ? 'bg-green-100 text-green-800' :
                        service.status === 'down' ? 'bg-red-100 text-red-800' :
                        service.status === 'degraded' ? 'bg-yellow-100 text-yellow-800' :
                        service.status === 'maintenance' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {service.status || 'unknown'}
                      </span>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {service.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        <span className="capitalize">{service.type}</span> • {service.target} • Every {service.interval}s
                        {service.monitoring?.regions && (
                          <span className="ml-2">• {service.monitoring.regions.length} regions</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {service.responseTime && (
                      <span className="text-sm text-gray-500">
                        {service.responseTime}ms
                      </span>
                    )}
                    <button
                      onClick={() => handleEdit(service)}
                      className="text-blue-600 hover:text-blue-900 text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(service.id)}
                      className="text-red-600 hover:text-red-900 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>

      {modalOpen && (
        <ServiceModal
          service={selectedService}
          onClose={handleModalClose}
        />
      )}
    </div>
  );
};