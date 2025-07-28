import React, { useState } from 'react'
import { Bug, Mail, Lock, LogIn } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '../stores/authStore'

export const Login: React.FC = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { login } = useAuthStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // TODO: Replace with actual API call
      // Temporary mock login
      const mockNest = {
        id: 'nest-1',
        subdomain: 'demo',
        name: 'Demo Company',
        email: email,
        walletAddress: '0x1234...',
        subscription: {
          tier: 'pro' as const,
          servicesLimit: 50,
          validUntil: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
        },
        settings: {
          isPublic: true,
          timezone: 'UTC',
          language: 'en',
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
        status: 'active' as const,
      }

      login(mockNest, 'mock-token')
      toast.success('Welcome to your colony! 🐜')
    } catch (error) {
      toast.error('Failed to enter colony')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center">
            <div className="bg-white p-3 rounded-full shadow-lg">
              <Bug className="h-12 w-12 text-primary-600" />
            </div>
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Enter Your Colony
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Sign in to manage your ant watchers
          </p>
        </div>

        <div className="card p-8">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Queen's Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="input pl-10 w-full"
                  placeholder="queen@yourcolony.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Colony Secret
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="input pl-10 w-full"
                  placeholder="Enter your colony secret"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full flex items-center justify-center"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <LogIn className="h-5 w-5 mr-2" />
                  Enter Colony
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Need a new colony?{' '}
              <a href="#" className="font-medium text-primary-600 hover:text-primary-500">
                Start building your nest
              </a>
            </p>
          </div>
        </div>

        <div className="text-center">
          <p className="text-xs text-gray-500">
            Powered by WorkerAnts • Monitoring made simple
          </p>
        </div>
      </div>
    </div>
  )
}