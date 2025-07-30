import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || '/api/admin';

interface Service {
  id?: string;
  name: string;
  type: 'web' | 'tcp' | 'ping' | 'github' | 'uptime-api' | 'keyword' | 'heartbeat' | 'port';
  target: string;
  interval: number;
  isActive: boolean;
  monitoring?: {
    regions: string[];
    strategy: 'closest' | 'all-selected' | 'round-robin' | 'failover';
  };
  notifications?: {
    webhooks: string[];
    emails: string[];
  };
  config?: {
    method?: string;
    expectedStatus?: number;
    keyword?: string;
    timeout?: number;
  };
}

interface ServiceModalProps {
  service: Service | null;
  onClose: () => void;
}

interface Region {
  id: string;
  name: string;
  available: boolean;
}

export const ServiceModal: React.FC<ServiceModalProps> = ({ service, onClose }) => {
  const [formData, setFormData] = useState<Service>({
    name: '',
    type: 'web',
    target: '',
    interval: 60,
    isActive: true,
    monitoring: {
      regions: ['eu-west-1'],
      strategy: 'all-selected'
    },
    notifications: {
      webhooks: [],
      emails: []
    },
    config: {}
  });
  const [loading, setLoading] = useState(false);
  const [regions, setRegions] = useState<Region[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (service) {
      setFormData(service);
    }
    fetchRegions();
  }, [service]);

  const fetchRegions = async () => {
    try {
      const response = await axios.post(`${API_URL}/regions/list`);
      setRegions(response.data.data);
    } catch (error) {
      console.error('Failed to fetch regions:', error);
      // Fallback to default regions if API fails
      setRegions([
        { id: 'eu-west-1', name: 'Europe West (Frankfurt)', available: true },
        { id: 'eu-central-1', name: 'Europe Central (Warsaw)', available: true },
        { id: 'eu-west-2', name: 'Europe West (London)', available: true },
        { id: 'us-east-1', name: 'US East (Virginia)', available: true },
        { id: 'us-west-1', name: 'US West (California)', available: true },
        { id: 'ca-central-1', name: 'Canada Central (Toronto)', available: true },
      ]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (service?.id) {
        await axios.post(`${API_URL}/services/update`, {
          id: service.id,
          ...formData
        });
        toast.success('Watcher updated successfully');
      } else {
        await axios.post(`${API_URL}/services/create`, formData);
        toast.success('Watcher deployed successfully');
      }
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed z-10 inset-0 overflow-y-auto">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <form onSubmit={handleSubmit}>
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                {service ? 'Edit Watcher' : 'Deploy New Watcher'}
              </h3>

              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Watcher Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    id="name"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="type" className="block text-sm font-medium text-gray-700">
                    Monitor Type
                  </label>
                  <select
                    id="type"
                    name="type"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as Service['type'] })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    <option value="web">HTTP/HTTPS</option>
                    <option value="tcp">TCP Port</option>
                    <option value="ping">Ping</option>
                    <option value="port">Port Check</option>
                    <option value="keyword">Keyword Check</option>
                    <option value="github">GitHub Repository</option>
                    <option value="heartbeat">Heartbeat</option>
                    <option value="uptime-api">Uptime API</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="target" className="block text-sm font-medium text-gray-700">
                    {formData.type === 'web' ? 'URL' :
                     formData.type === 'tcp' || formData.type === 'port' ? 'Host:Port' :
                     formData.type === 'ping' ? 'Hostname/IP' :
                     formData.type === 'github' ? 'owner/repo' :
                     'Target'}
                  </label>
                  <input
                    type="text"
                    name="target"
                    id="target"
                    required
                    value={formData.target}
                    onChange={(e) => setFormData({ ...formData, target: e.target.value })}
                    placeholder={
                      formData.type === 'web' ? 'https://example.com' :
                      formData.type === 'tcp' || formData.type === 'port' ? 'example.com:443' :
                      formData.type === 'ping' ? 'example.com' :
                      formData.type === 'github' ? 'octocat/hello-world' :
                      ''
                    }
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="interval" className="block text-sm font-medium text-gray-700">
                    Check Interval (seconds)
                  </label>
                  <select
                    id="interval"
                    name="interval"
                    value={formData.interval}
                    onChange={(e) => setFormData({ ...formData, interval: parseInt(e.target.value) })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    <option value="30">30 seconds</option>
                    <option value="60">1 minute</option>
                    <option value="300">5 minutes</option>
                    <option value="600">10 minutes</option>
                    <option value="1800">30 minutes</option>
                    <option value="3600">1 hour</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Monitoring Regions
                  </label>
                  <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 rounded-md p-3">
                    {regions.filter(r => r.available).map((region) => (
                      <label key={region.id} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.monitoring?.regions?.includes(region.id) || false}
                          onChange={(e) => {
                            const currentRegions = formData.monitoring?.regions || [];
                            const newRegions = e.target.checked
                              ? [...currentRegions, region.id]
                              : currentRegions.filter(r => r !== region.id);
                            setFormData({
                              ...formData,
                              monitoring: {
                                ...formData.monitoring,
                                regions: newRegions,
                                strategy: formData.monitoring?.strategy || 'all-selected'
                              }
                            });
                          }}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">{region.name}</span>
                      </label>
                    ))}
                  </div>
                  {regions.filter(r => !r.available).length > 0 && (
                    <p className="mt-2 text-sm text-gray-500">
                      More regions coming soon: {regions.filter(r => !r.available).map(r => r.name).join(', ')}
                    </p>
                  )}
                </div>

                <div>
                  <button
                    type="button"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="text-sm text-blue-600 hover:text-blue-500"
                  >
                    {showAdvanced ? 'Hide' : 'Show'} Advanced Options
                  </button>
                </div>

                {showAdvanced && (
                  <>
                    <div>
                      <label htmlFor="strategy" className="block text-sm font-medium text-gray-700">
                        Monitoring Strategy
                      </label>
                      <select
                        id="strategy"
                        value={formData.monitoring?.strategy || 'all-selected'}
                        onChange={(e) => setFormData({
                          ...formData,
                          monitoring: {
                            ...formData.monitoring,
                            regions: formData.monitoring?.regions || ['eu-west-1'],
                            strategy: e.target.value as any
                          }
                        })}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      >
                        <option value="all-selected">All Selected Regions</option>
                        <option value="closest">Closest Region Only</option>
                        <option value="round-robin">Round Robin</option>
                        <option value="failover">Failover</option>
                      </select>
                    </div>

                    {formData.type === 'web' && (
                      <>
                        <div>
                          <label htmlFor="method" className="block text-sm font-medium text-gray-700">
                            HTTP Method
                          </label>
                          <select
                            id="method"
                            value={formData.config?.method || 'GET'}
                            onChange={(e) => setFormData({
                              ...formData,
                              config: { ...formData.config, method: e.target.value }
                            })}
                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          >
                            <option value="GET">GET</option>
                            <option value="POST">POST</option>
                            <option value="HEAD">HEAD</option>
                          </select>
                        </div>

                        <div>
                          <label htmlFor="expectedStatus" className="block text-sm font-medium text-gray-700">
                            Expected Status Code
                          </label>
                          <input
                            type="number"
                            id="expectedStatus"
                            value={formData.config?.expectedStatus || 200}
                            onChange={(e) => setFormData({
                              ...formData,
                              config: { ...formData.config, expectedStatus: parseInt(e.target.value) }
                            })}
                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          />
                        </div>
                      </>
                    )}

                    {formData.type === 'keyword' && (
                      <div>
                        <label htmlFor="keyword" className="block text-sm font-medium text-gray-700">
                          Keyword to Search
                        </label>
                        <input
                          type="text"
                          id="keyword"
                          value={formData.config?.keyword || ''}
                          onChange={(e) => setFormData({
                            ...formData,
                            config: { ...formData.config, keyword: e.target.value }
                          })}
                          placeholder="Enter keyword to search for"
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                      </div>
                    )}

                    <div>
                      <label htmlFor="timeout" className="block text-sm font-medium text-gray-700">
                        Timeout (seconds)
                      </label>
                      <input
                        type="number"
                        id="timeout"
                        value={formData.config?.timeout || 30}
                        onChange={(e) => setFormData({
                          ...formData,
                          config: { ...formData.config, timeout: parseInt(e.target.value) }
                        })}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>
                  </>
                )}

                <div className="flex items-center">
                  <input
                    id="isActive"
                    name="isActive"
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                    Active monitoring
                  </label>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};