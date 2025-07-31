import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Activity, 
  TrendingUp, 
  Clock, 
  AlertTriangle,
  Eye,
  MapPin,
  Zap,
  Loader2
} from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import toast from 'react-hot-toast'

interface DashboardStats {
  totalWatchers: number
  activeWatchers: number
  incidents: number
  avgResponseTime: number
  uptime: number
  activeColonies: number
  busyWorkerAnts: number
  coloniesStatus: Array<{
    id: string
    name: string
    region: string
    activeWorkers: number
    status: 'active' | 'inactive'
  }>
  recentActivity: Array<{
    id: string
    type: string
    message: string
    timestamp: number
    status: 'success' | 'warning' | 'error'
  }>
}

export const Dashboard: React.FC = () => {
  const navigate = useNavigate()
  const { token } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats>({
    totalWatchers: 0,
    activeWatchers: 0,
    incidents: 0,
    avgResponseTime: 0,
    uptime: 100,
    activeColonies: 0,
    busyWorkerAnts: 0,
    coloniesStatus: [],
    recentActivity: []
  })

  useEffect(() => {
    fetchDashboardStats()
    // Refresh stats every 30 seconds
    const interval = setInterval(fetchDashboardStats, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchDashboardStats = async () => {
    try {
      const response = await fetch('/api/admin/dashboard/stats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch dashboard stats')
      }

      // Ensure all arrays are initialized properly
      const statsData = data.data || {}
      setStats({
        totalWatchers: statsData.totalWatchers || 0,
        activeWatchers: statsData.activeWatchers || 0,
        incidents: statsData.incidents || 0,
        avgResponseTime: statsData.avgResponseTime || 0,
        uptime: statsData.uptime !== undefined ? statsData.uptime : 100,
        activeColonies: statsData.activeColonies || 0,
        busyWorkerAnts: statsData.busyWorkerAnts || 0,
        coloniesStatus: Array.isArray(statsData.coloniesStatus) ? statsData.coloniesStatus : [],
        recentActivity: Array.isArray(statsData.recentActivity) ? statsData.recentActivity : []
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / 60000)
    
    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
    return date.toLocaleDateString()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          🐜 Ant Hill Overview
        </h1>
        <p className="mt-2 text-gray-600">
          Monitor your colony's health and watcher activities
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-2 bg-primary-100 rounded-lg">
              <Eye className="h-6 w-6 text-primary-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Watchers</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.activeWatchers}
              </p>
            </div>
          </div>
          <div className="mt-4">
            <span className="text-sm text-gray-500">
              of {stats.totalWatchers} total watchers
            </span>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-2 bg-success-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-success-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Colony Uptime</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.uptime.toFixed(1)}%
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div 
                className="bg-success-500 h-2 rounded-full"
                style={{ width: `${stats.uptime}%` }}
              />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-2 bg-warning-100 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-warning-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Incidents</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.incidents}
              </p>
            </div>
          </div>
          <div className="mt-4">
            <span className={`text-sm ${stats.incidents > 0 ? 'text-warning-600' : 'text-success-600'}`}>
              {stats.incidents > 0 ? `${stats.incidents} watchers need attention` : 'All watchers operational'}
            </span>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Clock className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg Response</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.avgResponseTime > 0 ? `${Math.round(stats.avgResponseTime)}ms` : '--'}
              </p>
            </div>
          </div>
          <div className="mt-4">
            <span className="text-sm text-gray-500">
              Last 24 hours
            </span>
          </div>
        </div>
      </div>

      {/* Colony Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* WorkerAnt Activity */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              🐜 WorkerAnt Activity
            </h3>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-success-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-success-600">Live</span>
            </div>
          </div>
          
          <div className="space-y-4">
            {stats.coloniesStatus && stats.coloniesStatus.length > 0 ? (
              stats.coloniesStatus.map((colony) => (
                <div key={colony.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 text-gray-400 mr-2" />
                    <span className="text-sm font-medium">{colony.name}</span>
                  </div>
                  <div className="flex items-center">
                    <Zap className={`h-4 w-4 ${colony.status === 'active' ? 'text-success-500' : 'text-gray-400'} mr-1`} />
                    <span className="text-sm text-gray-600">{colony.activeWorkers} ants busy</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">No active colonies</p>
              </div>
            )}
          </div>
          
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-500">
              {stats.activeColonies} active colonies monitoring your watchers
            </p>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              📡 Recent Activity
            </h3>
          </div>
          
          <div className="space-y-4">
            {stats.recentActivity && stats.recentActivity.length > 0 ? (
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {stats.recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className={`w-2 h-2 rounded-full mt-1.5 ${
                      activity.status === 'success' ? 'bg-success-500' :
                      activity.status === 'warning' ? 'bg-warning-500' :
                      'bg-error-500'
                    }`} />
                    <div className="flex-1">
                      <p className="text-sm text-gray-900">{activity.message}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatTimestamp(activity.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Activity className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No recent activity</p>
                <p className="text-sm text-gray-400 mt-1">
                  {stats.totalWatchers > 0 ? 'Monitoring data will appear here' : 'Create your first watcher to start monitoring'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          🚀 Quick Actions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button 
            onClick={() => navigate('/services/create')}
            className="btn-primary text-left p-4 h-auto"
          >
            <div className="flex items-center">
              <Eye className="h-5 w-5 mr-3" />
              <div>
                <div className="font-medium">
                  {stats.totalWatchers === 0 ? 'Deploy First Watcher' : 'Deploy New Watcher'}
                </div>
                <div className="text-sm opacity-90">Start monitoring a service</div>
              </div>
            </div>
          </button>
          
          <button 
            onClick={() => navigate('/regions')}
            className="btn-secondary text-left p-4 h-auto"
          >
            <div className="flex items-center">
              <MapPin className="h-5 w-5 mr-3" />
              <div>
                <div className="font-medium">Explore Colonies</div>
                <div className="text-sm opacity-90">See WorkerAnt locations</div>
              </div>
            </div>
          </button>
          
          <button 
            onClick={() => navigate('/services')}
            className="btn-secondary text-left p-4 h-auto"
          >
            <div className="flex items-center">
              <TrendingUp className="h-5 w-5 mr-3" />
              <div>
                <div className="font-medium">View All Watchers</div>
                <div className="text-sm opacity-90">Manage your monitoring services</div>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}