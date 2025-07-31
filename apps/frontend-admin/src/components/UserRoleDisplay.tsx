import React from 'react'
import { Shield, Crown, UserCog, Edit, Eye } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'

export const UserRoleDisplay: React.FC = () => {
  const { user } = useAuthStore()
  
  if (!user) return null

  const getRoleIcon = () => {
    switch (user.role) {
      case 'platform_admin':
        return <Crown className="h-5 w-5 text-purple-600" />
      case 'owner':
        return <Shield className="h-5 w-5 text-yellow-600" />
      case 'admin':
        return <UserCog className="h-5 w-5 text-blue-600" />
      case 'editor':
        return <Edit className="h-5 w-5 text-green-600" />
      case 'viewer':
        return <Eye className="h-5 w-5 text-gray-600" />
    }
  }

  const getRoleColor = () => {
    switch (user.role) {
      case 'platform_admin':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'owner':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'admin':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'editor':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'viewer':
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getRoleDescription = () => {
    switch (user.role) {
      case 'platform_admin':
        return 'Full platform access'
      case 'owner':
        return 'Nest owner with full permissions'
      case 'admin':
        return 'Administrative access'
      case 'editor':
        return 'Can edit services and settings'
      case 'viewer':
        return 'Read-only access'
    }
  }

  return (
    <div className="flex items-center space-x-2">
      <div className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium border ${getRoleColor()}`}>
        {getRoleIcon()}
        <span className="ml-2">{user.role.charAt(0).toUpperCase() + user.role.slice(1).replace('_', ' ')}</span>
      </div>
      <span className="text-sm text-gray-500">
        {getRoleDescription()}
      </span>
    </div>
  )
}