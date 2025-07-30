import React from 'react'
import { 
  Crown, 
  Globe, 
  Shield, 
  Bell,
  Palette,
  CreditCard,
  Key,
  Download
} from 'lucide-react'
import { useAuthStore } from '../stores/authStore'

export const Settings: React.FC = () => {
  const { nest } = useAuthStore()

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
              value={nest?.name || ''}
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
                value={nest?.subdomain || ''}
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
              value={'admin@' + nest?.subdomain + '.guardant.me' || ''}
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
              value='Not configured'
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
              {nest?.subscription.tier === 'free' ? 'Worker Ant' :
               nest?.subscription.tier === 'pro' ? 'Soldier Ant' : 'Queen Ant'}
            </div>
            <div className="text-sm text-gray-600 mt-1">Current Tier</div>
          </div>
          
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">
              {nest?.subscription.servicesLimit === -1 ? '∞' : nest?.subscription.servicesLimit}
            </div>
            <div className="text-sm text-gray-600 mt-1">Watcher Limit</div>
          </div>
          
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-success-600">
              Active
            </div>
            <div className="text-sm text-gray-600 mt-1">Status</div>
          </div>
        </div>
        
        <div className="mt-6 flex justify-center">
          <button className="btn-primary">
            <CreditCard className="h-5 w-5 mr-2" />
            Upgrade Colony
          </button>
        </div>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                checked={true}
                readOnly
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
                value={''}
                readOnly
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
              <input type="checkbox" defaultChecked className="toggle" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-gray-700">Weekly Reports</span>
                <p className="text-xs text-gray-500">Receive colony performance summaries</p>
              </div>
              <input type="checkbox" defaultChecked className="toggle" />
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
              <select className="input w-full">
                <option>Default (Light)</option>
                <option>Dark Mode</option>
                <option>Auto (System)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Language
              </label>
              <select className="input w-full">
                <option>English</option>
                <option>Polish</option>
                <option>German</option>
              </select>
            </div>
          </div>
        </div>
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
            <button className="btn-error">
              Dissolve
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}