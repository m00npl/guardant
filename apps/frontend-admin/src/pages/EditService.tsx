import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Edit3 } from 'lucide-react'

export const EditService: React.FC = () => {
  const { id } = useParams()
  const navigate = useNavigate()

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate('/services')}
          className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            ✏️ Edit Watcher
          </h1>
          <p className="text-gray-600">
            Modify watcher configuration and colony assignments
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="card p-12 text-center">
        <Edit3 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Edit Watcher: {id}
        </h3>
        <p className="text-gray-600 mb-6">
          This feature is under construction. The edit form will be similar to the create form
          but pre-populated with existing watcher data.
        </p>
        <button
          onClick={() => navigate('/services')}
          className="btn-primary"
        >
          Back to Watchers
        </button>
      </div>
    </div>
  )
}