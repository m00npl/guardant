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

interface AuthState {
  isAuthenticated: boolean
  nest: Nest | null
  token: string | null
  login: (nest: Nest, token: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      nest: null,
      token: null,
      login: (nest, token) => set({ 
        isAuthenticated: true, 
        nest, 
        token 
      }),
      logout: () => set({ 
        isAuthenticated: false, 
        nest: null, 
        token: null 
      }),
    }),
    {
      name: 'guardant-auth',
    }
  )
)