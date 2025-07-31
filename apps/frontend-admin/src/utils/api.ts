import { useAuthStore } from '../stores/authStore'
import toast from 'react-hot-toast'

// Create a wrapper for fetch that handles authentication errors
export const apiFetch = async (url: string, options: RequestInit = {}) => {
  const { token, logout } = useAuthStore.getState()
  
  const headers = {
    ...options.headers,
    'Authorization': token ? `Bearer ${token}` : '',
  }
  
  const response = await fetch(url, {
    ...options,
    headers,
  })
  
  // Handle authentication errors
  if (response.status === 401) {
    toast.error('Your session has expired. Please log in again.')
    logout()
    window.location.href = '/login'
    throw new Error('Session expired')
  }
  
  return response
}