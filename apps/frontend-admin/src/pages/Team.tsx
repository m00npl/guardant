import React, { useState, useEffect } from 'react'
import { 
  Users, 
  UserPlus, 
  Shield, 
  Mail, 
  Calendar,
  Trash2,
  Edit3,
  Crown,
  Key,
  Loader2,
  X
} from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { apiFetch } from '../utils/api'
import toast from 'react-hot-toast'

interface TeamMember {
  id: string
  email: string
  role: 'owner' | 'admin' | 'member' | 'viewer'
  status: 'active' | 'invited' | 'disabled'
  createdAt: string
  lastLogin?: string
  invitedBy?: string
}

interface InviteFormData {
  email: string
  role: 'admin' | 'member' | 'viewer'
}

const roleInfo = {
  owner: {
    name: 'Owner',
    icon: Crown,
    color: 'text-warning-600',
    bgColor: 'bg-warning-100',
    description: 'Full access to everything'
  },
  admin: {
    name: 'Admin',
    icon: Shield,
    color: 'text-primary-600',
    bgColor: 'bg-primary-100',
    description: 'Can manage services and team'
  },
  member: {
    name: 'Member',
    icon: Users,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    description: 'Can create and manage services'
  },
  viewer: {
    name: 'Viewer',
    icon: Key,
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    description: 'Read-only access'
  }
}

export const Team: React.FC = () => {
  const { token } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviting, setInviting] = useState(false)
  const [inviteForm, setInviteForm] = useState<InviteFormData>({
    email: '',
    role: 'member'
  })

  useEffect(() => {
    fetchTeamMembers()
  }, [])

  const fetchTeamMembers = async () => {
    try {
      const response = await apiFetch('/api/admin/team/list', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        if (response.status === 404) {
          console.log('Team API endpoints not implemented yet')
          setTeamMembers([])
          return
        }
        throw new Error('Failed to fetch team members')
      }

      const data = await response.json()
      setTeamMembers(data.data || [])
    } catch (error) {
      if (error instanceof SyntaxError) {
        console.log('Team API endpoints not implemented yet')
        setTeamMembers([])
      } else {
        toast.error(error instanceof Error ? error.message : 'Failed to load team members')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleInvite = async () => {
    if (!inviteForm.email || !inviteForm.role) {
      toast.error('Please fill in all fields')
      return
    }

    toast('Team invitations will be available soon!', {
      icon: '🚧',
      duration: 3000
    })
    setShowInviteModal(false)
    setInviteForm({ email: '', role: 'member' })
  }

  const handleRemoveMember = async (memberId: string, memberEmail: string) => {
    if (!confirm(`Are you sure you want to remove ${memberEmail} from the team?`)) {
      return
    }

    toast('Team member management will be available soon!', {
      icon: '🚧',
      duration: 3000
    })
  }

  const handleUpdateRole = async (memberId: string, newRole: string) => {
    toast('Role updates will be available soon!', {
      icon: '🚧',
      duration: 3000
    })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-12 w-12 animate-spin text-primary-600" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            👥 Team Management
          </h1>
          <p className="mt-2 text-gray-600">
            Manage your colony members and their permissions
          </p>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="btn-primary inline-flex items-center"
        >
          <UserPlus className="h-5 w-5 mr-2" />
          Invite Member
        </button>
      </div>

      {/* Coming Soon Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-blue-800">
              Team management features are coming soon! You'll be able to invite team members, manage roles, and collaborate on monitoring your services.
            </p>
          </div>
        </div>
      </div>

      {/* Team Members List */}
      <div className="card">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Team Members ({teamMembers.length})
          </h3>
        </div>

        {teamMembers.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No team members yet</p>
            <p className="text-sm text-gray-400 mt-1">
              Invite your first team member to get started
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {teamMembers.map((member) => {
              const roleData = roleInfo[member.role]
              const RoleIcon = roleData.icon

              return (
                <div key={member.id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`p-2 rounded-lg ${roleData.bgColor}`}>
                        <RoleIcon className={`h-5 w-5 ${roleData.color}`} />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium text-gray-900">{member.email}</h4>
                          {member.status === 'invited' && (
                            <span className="text-xs bg-warning-100 text-warning-700 px-2 py-1 rounded">
                              Invitation Pending
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                          <span className="flex items-center">
                            <Shield className="h-3 w-3 mr-1" />
                            {roleData.name}
                          </span>
                          <span className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            Joined {formatDate(member.createdAt)}
                          </span>
                          {member.lastLogin && (
                            <span className="flex items-center">
                              <Mail className="h-3 w-3 mr-1" />
                              Last active {formatDate(member.lastLogin)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {member.role !== 'owner' && (
                        <>
                          <select
                            value={member.role}
                            onChange={(e) => handleUpdateRole(member.id, e.target.value)}
                            className="input input-sm"
                            disabled={member.status === 'invited'}
                          >
                            <option value="admin">Admin</option>
                            <option value="member">Member</option>
                            <option value="viewer">Viewer</option>
                          </select>
                          <button
                            onClick={() => handleRemoveMember(member.id, member.email)}
                            className="p-2 text-gray-400 hover:text-error-600 transition-colors"
                            title="Remove member"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Role Descriptions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Object.entries(roleInfo).map(([role, info]) => {
          const Icon = info.icon
          return (
            <div key={role} className="card p-4">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${info.bgColor}`}>
                  <Icon className={`h-5 w-5 ${info.color}`} />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">{info.name}</h4>
                  <p className="text-xs text-gray-500">{info.description}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Invite Team Member
              </h3>
              <button
                onClick={() => setShowInviteModal(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  className="input w-full"
                  placeholder="colleague@company.com"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role
                </label>
                <select
                  className="input w-full"
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value as any })}
                >
                  <option value="admin">Admin - Can manage services and team</option>
                  <option value="member">Member - Can create and manage services</option>
                  <option value="viewer">Viewer - Read-only access</option>
                </select>
              </div>

              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-blue-800">
                  An invitation email will be sent to the provided address. 
                  The invitee will need to create an account to join your team.
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowInviteModal(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleInvite}
                disabled={inviting}
                className="btn-primary inline-flex items-center"
              >
                {inviting ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="h-5 w-5 mr-2" />
                    Send Invitation
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