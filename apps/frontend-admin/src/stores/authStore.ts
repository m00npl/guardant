import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Local type definition instead of importing from workspace
interface Nest {
  id: string
  name: string
  subdomain: string
  subscription: {
    tier: string
    servicesLimit: number
  }
}

interface User {
  id: string
  email: string
  name: string
  role: 'platform_admin' | 'owner' | 'admin' | 'editor' | 'viewer'
  nestId: string
  permissions?: {
    canManageNest: boolean
    canViewNest: boolean
    canManageServices: boolean
    canViewServices: boolean
    canManageUsers: boolean
    canViewUsers: boolean
    canManageApiKeys: boolean
    canViewApiKeys: boolean
    canManageBilling: boolean
    canViewBilling: boolean
    canManageWorkers: boolean
    canViewWorkers: boolean
    canAccessPlatformAdmin: boolean
  }
}

interface AuthState {
  isAuthenticated: boolean
  nest: Nest | null
  user: User | null
  token: string | null
  login: (nest: Nest, user: User, token: string) => void
  logout: () => void
  hasPermission: (permission: keyof NonNullable<User['permissions']>) => boolean
  isPlatformAdmin: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      nest: null,
      user: null,
      token: null,
      login: (nest, user, token) => set({ 
        isAuthenticated: true, 
        nest,
        user,
        token 
      }),
      logout: () => set({ 
        isAuthenticated: false, 
        nest: null,
        user: null,
        token: null 
      }),
      hasPermission: (permission) => {
        const { user } = get()
        if (!user) return false
        if (user.role === 'platform_admin') return true
        return user.permissions?.[permission] ?? false
      },
      isPlatformAdmin: () => {
        const { user } = get()
        return user?.role === 'platform_admin'
      }
    }),
    {
      name: 'guardant-auth',
    }
  )
)