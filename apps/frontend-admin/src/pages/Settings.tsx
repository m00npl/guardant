import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  Crown, 
  Globe, 
  Shield, 
  Bell,
  Palette,
  CreditCard,
  Key,
  Download,
  Loader2,
  Save,
  AlertTriangle
} from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { apiFetch } from '../utils/api'
import toast from 'react-hot-toast'

interface NestProfile {
  id: string
  name: string
  subdomain: string
  email: string
  settings: {
    publicStatusPage: boolean
    customDomain?: string
    emailAlerts: boolean
    weeklyReports: boolean
    theme: 'light' | 'dark' | 'auto'
    language: string
  }
  subscription: {
    tier: string
    servicesLimit: number
    status: string
    currentUsage: number
    billingCycle?: string
    nextBillingDate?: string
  }
  walletAddress?: string
  createdAt: number
  lastModified: number
}

export const Settings: React.FC = () => {
  const { nest, token } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState<NestProfile | null>(null)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [changingPassword, setChangingPassword] = useState(false)
  const [formData, setFormData] = useState({
    publicStatusPage: true,
    customDomain: '',
    emailAlerts: true,
    weeklyReports: true,
    theme: 'light' as 'light' | 'dark' | 'auto',
    language: 'en'
  })
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const response = await apiFetch('/api/admin/nest/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch profile')
      }

      if (data.success && data.data) {
        setProfile(data.data)
        setFormData({
          publicStatusPage: data.data.settings?.publicStatusPage ?? true,
          customDomain: data.data.settings?.customDomain || '',
          emailAlerts: data.data.settings?.emailAlerts ?? true,
          weeklyReports: data.data.settings?.weeklyReports ?? true,
          theme: data.data.settings?.theme || 'light',
          language: data.data.settings?.language || 'en'
        })
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveSettings = async () => {
    setSaving(true)
    try {
      const response = await apiFetch('/api/admin/nest/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          settings: formData
        })
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save settings')
      }

      toast.success('Settings saved successfully!')
      fetchProfile() // Refresh profile
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteNest = async () => {
    if (deleteConfirmText !== profile?.name) {
      toast.error('Colony name does not match')
      return
    }

    try {
      const response = await apiFetch('/api/admin/nest/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete colony')
      }

      toast.success('Colony deleted successfully')
      // Logout user after deletion
      window.location.href = '/login'
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete colony')
    }
  }

  const handlePasswordChange = async () => {
    // Validate form
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast.error('Please fill in all password fields')
      return
    }

    if (passwordForm.newPassword.length < 8) {
      toast.error('New password must be at least 8 characters long')
      return
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New passwords do not match')
      return
    }

    // Show coming soon message for now
    toast('Password change functionality will be available soon!', {
      icon: '🚧',
      duration: 3000
    })
    setShowPasswordModal(false)
    setPasswordForm({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-12 w-12 animate-spin text-primary-600" />
      </div>
    )
  }

  const currentProfile = profile || nest

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          👑 Queen's Den
        </h1>
        <p className="mt-2 text-gray-600">
          Manage your colony settings and subscription
        </p>
      </div>

      {/* Colony Information */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">
            🏠 Colony Information
          </h3>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-success-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-success-600">Active</span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Colony Name
            </label>
            <input
              type="text"
              className="input w-full"
              value={currentProfile?.name || ''}
              readOnly
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subdomain
            </label>
            <div className="flex">
              <input
                type="text"
                className="input flex-1 rounded-r-none"
                value={currentProfile?.subdomain || ''}
                readOnly
              />
              <span className="px-3 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg text-sm text-gray-500">
                .guardant.me
              </span>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Queen's Email
            </label>
            <input
              type="email"
              className="input w-full"
              value={profile?.email || 'Loading...'}
              readOnly
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Wallet Address
            </label>
            <input
              type="text"
              className="input w-full font-mono text-sm"
              value={profile?.walletAddress || 'Not configured'}
              readOnly
            />
          </div>
        </div>
      </div>

      {/* Subscription */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">
            💳 Subscription Plan
          </h3>
          <Crown className="h-6 w-6 text-warning-500" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">
              {profile?.subscription.tier === 'free' ? 'Worker Ant' :
               profile?.subscription.tier === 'pro' ? 'Soldier Ant' : 
               profile?.subscription.tier === 'enterprise' ? 'Queen Ant' : 
               currentProfile?.subscription.tier || 'Free'}
            </div>
            <div className="text-sm text-gray-600 mt-1">Current Tier</div>
          </div>
          
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">
              {profile?.subscription.currentUsage || 0} / {profile?.subscription.servicesLimit === -1 ? '∞' : profile?.subscription.servicesLimit || currentProfile?.subscription.servicesLimit}
            </div>
            <div className="text-sm text-gray-600 mt-1">Watchers Used</div>
          </div>
          
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className={`text-2xl font-bold ${
              profile?.subscription.status === 'active' ? 'text-success-600' : 'text-warning-600'
            }`}>
              {profile?.subscription.status || 'Active'}
            </div>
            <div className="text-sm text-gray-600 mt-1">Status</div>
          </div>
        </div>

        {profile?.subscription.nextBillingDate && (
          <div className="mt-4 text-center text-sm text-gray-600">
            Next billing: {new Date(profile.subscription.nextBillingDate).toLocaleDateString()}
          </div>
        )}
        
        <div className="mt-6 flex justify-center">
          <Link to="/subscription" className="btn-primary inline-flex items-center">
            <CreditCard className="h-5 w-5 mr-2" />
            Upgrade Colony
          </Link>
        </div>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Security Settings */}
        <div className="card p-6">
          <div className="flex items-center mb-4">
            <Shield className="h-6 w-6 text-primary-600 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900">
              Security
            </h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                className="input w-full bg-gray-50"
                value={profile?.email || ''}
                disabled
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <button
                onClick={() => setShowPasswordModal(true)}
                className="btn-secondary w-full inline-flex items-center justify-center"
              >
                <Key className="h-4 w-4 mr-2" />
                Change Password
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                API Keys
              </label>
              <Link
                to="/api-keys"
                className="btn-secondary w-full inline-flex items-center justify-center"
              >
                <Key className="h-4 w-4 mr-2" />
                Manage API Keys
              </Link>
            </div>
          </div>
        </div>
        {/* Status Page Settings */}
        <div className="card p-6">
          <div className="flex items-center mb-4">
            <Globe className="h-6 w-6 text-primary-600 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900">
              Status Page
            </h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-gray-700">Public Access</span>
                <p className="text-xs text-gray-500">Allow anyone to view your status page</p>
              </div>
              <input
                type="checkbox"
                checked={formData.publicStatusPage}
                onChange={(e) => setFormData({ ...formData, publicStatusPage: e.target.checked })}
                className="toggle"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Custom Domain
              </label>
              <input
                type="text"
                className="input w-full"
                placeholder="status.yourcompany.com"
                value={formData.customDomain}
                onChange={(e) => setFormData({ ...formData, customDomain: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Security Settings */}
        <div className="card p-6">
          <div className="flex items-center mb-4">
            <Shield className="h-6 w-6 text-success-600 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900">
              Security
            </h3>
          </div>
          <div className="space-y-4">
            <button className="btn-secondary w-full justify-start">
              <Key className="h-5 w-5 mr-2" />
              Change Colony Secret
            </button>
            <button className="btn-secondary w-full justify-start">
              <Download className="h-5 w-5 mr-2" />
              Download Backup Keys
            </button>
          </div>
        </div>

        {/* Notifications */}
        <div className="card p-6">
          <div className="flex items-center mb-4">
            <Bell className="h-6 w-6 text-warning-600 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900">
              Notifications
            </h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-gray-700">Email Alerts</span>
                <p className="text-xs text-gray-500">Get notified when watchers go down</p>
              </div>
              <input 
                type="checkbox" 
                checked={formData.emailAlerts}
                onChange={(e) => setFormData({ ...formData, emailAlerts: e.target.checked })}
                className="toggle" 
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-gray-700">Weekly Reports</span>
                <p className="text-xs text-gray-500">Receive colony performance summaries</p>
              </div>
              <input 
                type="checkbox" 
                checked={formData.weeklyReports}
                onChange={(e) => setFormData({ ...formData, weeklyReports: e.target.checked })}
                className="toggle" 
              />
            </div>
          </div>
        </div>

        {/* Appearance */}
        <div className="card p-6">
          <div className="flex items-center mb-4">
            <Palette className="h-6 w-6 text-purple-600 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900">
              Appearance
            </h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Theme
              </label>
              <select 
                className="input w-full"
                value={formData.theme}
                onChange={(e) => setFormData({ ...formData, theme: e.target.value as 'light' | 'dark' | 'auto' })}
              >
                <option value="light">Default (Light)</option>
                <option value="dark">Dark Mode</option>
                <option value="auto">Auto (System)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Language
              </label>
              <select 
                className="input w-full"
                value={formData.language}
                onChange={(e) => setFormData({ ...formData, language: e.target.value })}
              >
                <option value="en">English</option>
                <option value="pl">Polish</option>
                <option value="de">German</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button 
          onClick={handleSaveSettings}
          disabled={saving}
          className="btn-primary inline-flex items-center"
        >
          {saving ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-5 w-5 mr-2" />
              Save Settings
            </>
          )}
        </button>
      </div>

      {/* Danger Zone */}
      <div className="card border-error-200 p-6">
        <div className="flex items-center mb-4">
          <div className="p-2 bg-error-100 rounded-lg mr-3">
            <Shield className="h-5 w-5 text-error-600" />
          </div>
          <h3 className="text-lg font-semibold text-error-900">
            Danger Zone
          </h3>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-error-50 rounded-lg">
            <div>
              <span className="text-sm font-medium text-error-900">Dissolve Colony</span>
              <p className="text-xs text-error-700">
                Permanently delete your colony and all associated data
              </p>
            </div>
            <button 
              onClick={() => setShowDeleteConfirm(true)}
              className="btn-error"
            >
              Dissolve
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center mb-4">
              <AlertTriangle className="h-6 w-6 text-error-600 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900">
                Confirm Colony Dissolution
              </h3>
            </div>
            <p className="text-gray-600 mb-4">
              This action cannot be undone. All your watchers, data, and settings will be permanently deleted.
            </p>
            <p className="text-sm text-gray-700 mb-2">
              Type <span className="font-mono font-bold">{profile?.name}</span> to confirm:
            </p>
            <input
              type="text"
              className="input w-full mb-4"
              placeholder="Enter colony name"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
            />
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false)
                  setDeleteConfirmText('')
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteNest}
                disabled={deleteConfirmText !== profile?.name}
                className="btn-error"
              >
                Delete Colony
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center mb-4">
              <Key className="h-6 w-6 text-primary-600 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900">
                Change Password
              </h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Password
                </label>
                <input
                  type="password"
                  className="input w-full"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({
                    ...passwordForm,
                    currentPassword: e.target.value
                  })}
                  placeholder="Enter current password"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  className="input w-full"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({
                    ...passwordForm,
                    newPassword: e.target.value
                  })}
                  placeholder="Enter new password (min 8 characters)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  className="input w-full"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({
                    ...passwordForm,
                    confirmPassword: e.target.value
                  })}
                  placeholder="Confirm new password"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowPasswordModal(false)
                  setPasswordForm({
                    currentPassword: '',
                    newPassword: '',
                    confirmPassword: ''
                  })
                }}
                className="btn-secondary"
                disabled={changingPassword}
              >
                Cancel
              </button>
              <button
                onClick={handlePasswordChange}
                disabled={changingPassword}
                className="btn-primary inline-flex items-center"
              >
                {changingPassword ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Changing...
                  </>
                ) : (
                  <>
                    <Key className="h-4 w-4 mr-2" />
                    Change Password
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