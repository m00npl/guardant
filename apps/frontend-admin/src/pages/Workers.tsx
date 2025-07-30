import React, { useState, useEffect } from 'react'
import { useAuthStore } from '../stores/authStore'
import { 
  Users, 
  UserCheck, 
  UserX, 
  MapPin, 
  Clock,
  Zap,
  RefreshCw
} from 'lucide-react'

interface WorkerRegistration {
  workerId: string
  ownerEmail: string
  ip: string
  hostname: string
  registeredAt: string
  approved: boolean
  approvedAt?: string
  region?: string
  version?: string
  lastHeartbeat?: string
  points?: number
}

export const Workers: React.FC = () => {
  const { token } = useAuthStore()
  const [pendingWorkers, setPendingWorkers] = useState<WorkerRegistration[]>([])
  const [approvedWorkers, setApprovedWorkers] = useState<WorkerRegistration[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchWorkers = async () => {
    try {
      setLoading(true)
      
      // Fetch pending registrations
      const pendingRes = await fetch('/api/admin/workers/registrations/pending', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (!pendingRes.ok) throw new Error('Failed to fetch pending workers')
      const pendingData = await pendingRes.json()
      setPendingWorkers(pendingData.pending || [])
      
      // Fetch approved workers
      const approvedRes = await fetch('/api/admin/workers/registrations/approved', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (!approvedRes.ok) throw new Error('Failed to fetch approved workers')
      const approvedData = await approvedRes.json()
      setApprovedWorkers(approvedData.approved || [])
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workers')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWorkers()
    // Refresh every 10 seconds
    const interval = setInterval(fetchWorkers, 10000)
    return () => clearInterval(interval)
  }, [token])

  const approveWorker = async (workerId: string, region: string = 'auto') => {
    try {
      const res = await fetch(`/api/admin/workers/registrations/${workerId}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ region })
      })
      
      if (!res.ok) throw new Error('Failed to approve worker')
      
      // Refresh the list
      await fetchWorkers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve worker')
    }
  }

  const rejectWorker = async (workerId: string) => {
    try {
      const res = await fetch(`/api/admin/workers/registrations/${workerId}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (!res.ok) throw new Error('Failed to reject worker')
      
      // Refresh the list
      await fetchWorkers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject worker')
    }
  }


  const getTimeSince = (dateString: string) => {
    const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000)
    if (seconds < 60) return `${seconds}s ago`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    return `${Math.floor(hours / 24)}d ago`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 text-primary-600 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          🐜 Worker Colony Management
        </h1>
        <p className="mt-2 text-gray-600">
          Manage worker ant registrations and monitor their activity
        </p>
      </div>

      {error && (
        <div className="bg-error-50 border border-error-200 text-error-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Pending Registrations */}
      <div className="card">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              Pending Registrations
            </h2>
            <span className="bg-warning-100 text-warning-800 text-sm font-medium px-3 py-1 rounded-full">
              {pendingWorkers.length} pending
            </span>
          </div>
        </div>
        
        {pendingWorkers.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No pending worker registrations</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {pendingWorkers.map(worker => (
              <div key={worker.workerId} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-lg font-medium text-gray-900">
                        {worker.workerId}
                      </h3>
                      <span className="text-sm text-gray-500">
                        {getTimeSince(worker.registeredAt)}
                      </span>
                    </div>
                    <div className="space-y-1 text-sm text-gray-600">
                      <p>Owner: {worker.ownerEmail}</p>
                      <p>IP: {worker.ip}</p>
                      <p>Hostname: {worker.hostname}</p>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={() => approveWorker(worker.workerId)}
                      className="btn-primary btn-sm flex items-center"
                    >
                      <UserCheck className="h-4 w-4 mr-1" />
                      Approve
                    </button>
                    <button
                      onClick={() => rejectWorker(worker.workerId)}
                      className="btn-secondary btn-sm flex items-center"
                    >
                      <UserX className="h-4 w-4 mr-1" />
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Active Workers */}
      <div className="card">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              Active Worker Ants
            </h2>
            <span className="bg-success-100 text-success-800 text-sm font-medium px-3 py-1 rounded-full">
              {approvedWorkers.length} active
            </span>
          </div>
        </div>
        
        {approvedWorkers.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No active workers yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Worker ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Owner
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Region
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Version
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Points
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Heartbeat
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {approvedWorkers.map(worker => {
                  const isOnline = worker.lastHeartbeat && 
                    (Date.now() - new Date(worker.lastHeartbeat).getTime()) < 60000
                  
                  return (
                    <tr key={worker.workerId}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {worker.workerId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {worker.ownerEmail}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 mr-1 text-gray-400" />
                          {worker.region || 'auto'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {worker.version || 'unknown'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center">
                          <Zap className="h-4 w-4 mr-1 text-yellow-500" />
                          {worker.points || 0}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {worker.lastHeartbeat ? (
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-1 text-gray-400" />
                            {getTimeSince(worker.lastHeartbeat)}
                          </div>
                        ) : (
                          'Never'
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          isOnline 
                            ? 'bg-success-100 text-success-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {isOnline ? 'Online' : 'Offline'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}