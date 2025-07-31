import React, { useState, useEffect } from 'react'
import { 
  Key, 
  Plus, 
  Copy, 
  Trash2, 
  Eye,
  EyeOff,
  Calendar,
  Clock,
  Shield,
  AlertTriangle,
  Loader2
} from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { apiFetch } from '../utils/api'
import toast from 'react-hot-toast'

interface ApiKey {
  id: string
  name: string
  key: string
  keyPreview: string
  createdAt: number
  lastUsed: number | null
  permissions: string[]
  isActive: boolean
}

interface CreateKeyForm {
  name: string
  permissions: {
    readServices: boolean
    writeServices: boolean
    readMetrics: boolean
    manageTeam: boolean
  }
}

export const ApiKeys: React.FC = () => {
  const { token } = useAuthStore()
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showKey, setShowKey] = useState<string | null>(null)
  const [newKeyData, setNewKeyData] = useState<{ key: string; name: string } | null>(null)
  const [creating, setCreating] = useState(false)
  const [formData, setFormData] = useState<CreateKeyForm>({
    name: '',
    permissions: {
      readServices: true,
      writeServices: false,
      readMetrics: true,
      manageTeam: false
    }
  })

  useEffect(() => {
    fetchApiKeys()
  }, [])

  const fetchApiKeys = async () => {
    try {
      const response = await apiFetch('/api/admin/api-keys/list', {
        method: 'GET'
      })

      if (!response.ok) {
        if (response.status === 404) {
          console.log('API keys endpoint not implemented yet')
          setApiKeys([])
          return
        }
        throw new Error('Failed to fetch API keys')
      }

      const data = await response.json()
      setApiKeys(data.data || [])
    } catch (error) {
      console.log('API keys feature not available yet')
      setApiKeys([])
    } finally {
      setLoading(false)
    }
  }

  const handleCreateKey = async () => {
    if (!formData.name.trim()) {
      toast.error('Please enter a name for the API key')
      return
    }

    // Show coming soon message for now
    toast('API key management will be available soon!', {
      icon: '🚧',
      duration: 3000
    })
    setShowCreateModal(false)
    setFormData({
      name: '',
      permissions: {
        readServices: true,
        writeServices: false,
        readMetrics: true,
        manageTeam: false
      }
    })
  }

  const handleDeleteKey = async (keyId: string, keyName: string) => {
    if (!confirm(`Are you sure you want to delete the API key "${keyName}"? This action cannot be undone.`)) {
      return
    }

    toast('API key deletion will be available soon!', {
      icon: '🚧',
      duration: 3000
    })
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success('Copied to clipboard!')
    } catch (err) {
      toast.error('Failed to copy to clipboard')
    }
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getPermissionLabel = (permission: string) => {
    const labels: Record<string, string> = {
      'services:read': 'Read Services',
      'services:write': 'Manage Services',
      'metrics:read': 'Read Metrics',
      'team:manage': 'Manage Team'
    }
    return labels[permission] || permission
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-12 w-12 animate-spin text-primary-600" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            🔑 API Keys
          </h1>
          <p className="mt-2 text-gray-600">
            Manage API keys for programmatic access to your colony
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary inline-flex items-center"
        >
          <Plus className="h-5 w-5 mr-2" />
          Create API Key
        </button>
      </div>

      {/* Coming Soon Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-blue-800">
              API key management is coming soon! You'll be able to create and manage API keys for integrating GuardAnt with your applications.
            </p>
          </div>
        </div>
      </div>

      {/* New Key Display */}
      {newKeyData && (
        <div className="card border-success-200 p-6">
          <div className="flex items-center mb-4">
            <Key className="h-6 w-6 text-success-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">
              New API Key Created
            </h3>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <p className="text-sm text-gray-600 mb-2">
              <strong>Name:</strong> {newKeyData.name}
            </p>
            <div className="flex items-center justify-between">
              <code className="text-sm font-mono text-gray-900">
                {newKeyData.key}
              </code>
              <button
                onClick={() => copyToClipboard(newKeyData.key)}
                className="text-primary-600 hover:text-primary-700"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="flex items-center text-warning-600 text-sm">
            <AlertTriangle className="h-4 w-4 mr-1" />
            Save this key securely. You won't be able to see it again.
          </div>
          <button
            onClick={() => setNewKeyData(null)}
            className="btn-secondary mt-4"
          >
            Done
          </button>
        </div>
      )}

      {/* API Keys List */}
      <div className="card">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Active API Keys</h2>
        </div>
        
        {apiKeys.length === 0 ? (
          <div className="p-12 text-center">
            <Key className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No API Keys Yet
            </h3>
            <p className="text-gray-600 mb-6">
              Create your first API key to start integrating with GuardAnt
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary inline-flex items-center"
            >
              <Plus className="h-5 w-5 mr-2" />
              Create Your First Key
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {apiKeys.map((apiKey) => (
              <div key={apiKey.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <h3 className="text-base font-medium text-gray-900">
                        {apiKey.name}
                      </h3>
                      {apiKey.isActive ? (
                        <span className="ml-2 px-2 py-1 text-xs font-medium text-success-700 bg-success-100 rounded-full">
                          Active
                        </span>
                      ) : (
                        <span className="ml-2 px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded-full">
                          Inactive
                        </span>
                      )}
                    </div>
                    
                    <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                      <div className="flex items-center">
                        <Key className="h-4 w-4 mr-1" />
                        <code className="font-mono">
                          {showKey === apiKey.id ? apiKey.key : apiKey.keyPreview}
                        </code>
                        <button
                          onClick={() => setShowKey(showKey === apiKey.id ? null : apiKey.id)}
                          className="ml-2 text-gray-400 hover:text-gray-600"
                        >
                          {showKey === apiKey.id ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        Created {formatDate(apiKey.createdAt)}
                      </div>
                      {apiKey.lastUsed && (
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          Last used {formatDate(apiKey.lastUsed)}
                        </div>
                      )}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {apiKey.permissions.map((permission) => (
                        <span
                          key={permission}
                          className="px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded"
                        >
                          {getPermissionLabel(permission)}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => copyToClipboard(apiKey.key)}
                      className="text-gray-400 hover:text-gray-600"
                      title="Copy API key"
                    >
                      <Copy className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDeleteKey(apiKey.id, apiKey.name)}
                      className="text-gray-400 hover:text-error-600"
                      title="Delete API key"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create API Key Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center mb-4">
              <Key className="h-6 w-6 text-primary-600 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900">
                Create API Key
              </h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Key Name
                </label>
                <input
                  type="text"
                  className="input w-full"
                  placeholder="e.g., Production App"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Permissions
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.permissions.readServices}
                      onChange={(e) => setFormData({
                        ...formData,
                        permissions: {
                          ...formData.permissions,
                          readServices: e.target.checked
                        }
                      })}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Read Services</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.permissions.writeServices}
                      onChange={(e) => setFormData({
                        ...formData,
                        permissions: {
                          ...formData.permissions,
                          writeServices: e.target.checked
                        }
                      })}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Manage Services</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.permissions.readMetrics}
                      onChange={(e) => setFormData({
                        ...formData,
                        permissions: {
                          ...formData.permissions,
                          readMetrics: e.target.checked
                        }
                      })}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Read Metrics</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.permissions.manageTeam}
                      onChange={(e) => setFormData({
                        ...formData,
                        permissions: {
                          ...formData.permissions,
                          manageTeam: e.target.checked
                        }
                      })}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Manage Team</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false)
                  setFormData({
                    name: '',
                    permissions: {
                      readServices: true,
                      writeServices: false,
                      readMetrics: true,
                      manageTeam: false
                    }
                  })
                }}
                className="btn-secondary"
                disabled={creating}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateKey}
                disabled={creating}
                className="btn-primary inline-flex items-center"
              >
                {creating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4 mr-2" />
                    Create Key
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}