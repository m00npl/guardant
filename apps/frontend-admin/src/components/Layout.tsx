import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { 
  BarChart3, 
  Globe, 
  Settings, 
  LogOut, 
  Shield,
  MapPin,
  Activity,
  Code, // Widget icon
  Bug, // Ant-like icon
  Users // Workers icon
} from 'lucide-react'
import { useAuthStore } from '../stores/authStore'

interface LayoutProps {
  children: React.ReactNode
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation()
  const { nest, logout } = useAuthStore()

  const navigation = [
    { name: 'Ant Hill', href: '/dashboard', icon: BarChart3 }, // Dashboard -> Ant Hill
    { name: 'Watchers', href: '/services', icon: Globe }, // Services -> Watchers (ants watching services)
    { name: 'Colonies', href: '/regions', icon: MapPin }, // Regions -> Colonies (ant colonies in different regions)
    { name: 'Worker Ants', href: '/workers', icon: Users }, // Worker management
    { name: 'Widget', href: '/widget', icon: Code }, // Embeddable Widget
    { name: 'Queen\'s Den', href: '/settings', icon: Settings }, // Settings -> Queen's Den
  ]

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg">
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center px-6 border-b border-gray-200">
            <div className="flex items-center">
              <Bug className="h-8 w-8 text-primary-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">guardant</span>
              <span className="ml-1 text-sm text-gray-500">.me</span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6">
            <ul className="space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon
                return (
                  <li key={item.name}>
                    <Link
                      to={item.href}
                      className={`group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                        isActive(item.href)
                          ? 'bg-primary-50 text-primary-700 border-r-2 border-primary-600'
                          : 'text-gray-700 hover:bg-gray-100 hover:text-primary-600'
                      }`}
                    >
                      <Icon
                        className={`mr-3 h-5 w-5 ${
                          isActive(item.href) 
                            ? 'text-primary-600' 
                            : 'text-gray-400 group-hover:text-primary-600'
                        }`}
                      />
                      {item.name}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>

          {/* Nest info */}
          <div className="border-t border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="h-8 w-8 rounded-full bg-primary-600 flex items-center justify-center">
                  <span className="text-sm font-medium text-white">
                    🐜
                  </span>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-700">{nest?.name} Colony</p>
                  <p className="text-xs text-gray-500">
                    {nest?.subdomain}.guardant.me
                  </p>
                </div>
              </div>
              <button
                onClick={logout}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                title="Leave Colony"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
            
            {/* Subscription info */}
            <div className="mt-3 p-2 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-600">
                  {nest?.subscription.tier === 'free' ? 'Worker Ant' : 
                   nest?.subscription.tier === 'pro' ? 'Soldier Ant' : 'Queen Ant'} Tier
                </span>
                <div className="flex items-center">
                  <Activity className="h-3 w-3 text-success-500 mr-1" />
                  <span className="text-xs text-success-600">Active</span>
                </div>
              </div>
              {nest?.subscription.tier !== 'unlimited' && (
                <div className="mt-1">
                  <div className="text-xs text-gray-500">
                    Watchers: 0/{nest?.subscription.servicesLimit}
                  </div>
                  <div className="mt-1 w-full bg-gray-200 rounded-full h-1.5">
                    <div 
                      className="bg-primary-600 h-1.5 rounded-full" 
                      style={{ width: '0%' }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="pl-64">
        <main className="py-8">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}