import React, { useState, useEffect } from 'react'
import { Globe, Check, X, AlertCircle, Loader2, ExternalLink } from 'lucide-react'
import { apiFetch } from '../utils/api'
import toast from 'react-hot-toast'

interface SubdomainManagerProps {
  currentSubdomain: string
  nestId: string
  onUpdate?: () => void
}

export const SubdomainManager: React.FC<SubdomainManagerProps> = ({ 
  currentSubdomain, 
  nestId,
  onUpdate 
}) => {
  const [subdomain, setSubdomain] = useState(currentSubdomain)
  const [customDomain, setCustomDomain] = useState('')
  const [checking, setChecking] = useState(false)
  const [saving, setSaving] = useState(false)
  const [available, setAvailable] = useState<boolean | null>(null)
  const [customDomainVerified, setCustomDomainVerified] = useState(false)
  const [dnsInstructions, setDnsInstructions] = useState<any>(null)

  useEffect(() => {
    setSubdomain(currentSubdomain)
  }, [currentSubdomain])

  const checkSubdomainAvailability = async () => {
    if (subdomain === currentSubdomain) {
      setAvailable(true)
      return
    }

    if (!subdomain || subdomain.length < 3) {
      toast.error('Subdomain must be at least 3 characters')
      return
    }

    if (!/^[a-z0-9-]+$/.test(subdomain)) {
      toast.error('Subdomain can only contain lowercase letters, numbers, and hyphens')
      return
    }

    setChecking(true)
    try {
      const response = await apiFetch('/api/admin/subdomain/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subdomain })
      })

      const data = await response.json()
      if (data.success) {
        setAvailable(data.data.available)
        if (!data.data.available) {
          toast.error('This subdomain is already taken')
        }
      }
    } catch (error) {
      toast.error('Failed to check subdomain availability')
    } finally {
      setChecking(false)
    }
  }

  const updateSubdomain = async () => {
    if (!available || subdomain === currentSubdomain) return

    setSaving(true)
    try {
      const response = await apiFetch('/api/admin/subdomain/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          nestId,
          newSubdomain: subdomain 
        })
      })

      const data = await response.json()
      if (data.success) {
        toast.success('Subdomain updated successfully!')
        if (onUpdate) onUpdate()
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update subdomain')
    } finally {
      setSaving(false)
    }
  }

  const verifyCustomDomain = async () => {
    if (!customDomain) return

    setSaving(true)
    try {
      const response = await apiFetch('/api/admin/custom-domain/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          nestId,
          domain: customDomain 
        })
      })

      const data = await response.json()
      if (data.success) {
        setCustomDomainVerified(data.data.verified)
        setDnsInstructions(data.data.dnsRecords)
        
        if (data.data.verified) {
          toast.success('Custom domain verified successfully!')
        } else {
          toast.info('Please configure your DNS records as shown below')
        }
      }
    } catch (error) {
      toast.error('Failed to verify custom domain')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Subdomain Configuration */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Subdomain Configuration
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Subdomain
            </label>
            <div className="flex items-center space-x-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={subdomain}
                  onChange={(e) => {
                    setSubdomain(e.target.value.toLowerCase())
                    setAvailable(null)
                  }}
                  onBlur={checkSubdomainAvailability}
                  className="input pl-10 pr-24"
                  placeholder="your-subdomain"
                />
                <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
                  .guardant.me
                </span>
              </div>
              
              {checking && (
                <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
              )}
              
              {!checking && available === true && subdomain !== currentSubdomain && (
                <Check className="h-5 w-5 text-success-500" />
              )}
              
              {!checking && available === false && (
                <X className="h-5 w-5 text-error-500" />
              )}
            </div>
            
            <div className="mt-2 flex items-center justify-between">
              <a
                href={`https://${subdomain}.guardant.me`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary-600 hover:text-primary-700 flex items-center"
              >
                Preview status page
                <ExternalLink className="ml-1 h-3 w-3" />
              </a>
              
              {subdomain !== currentSubdomain && available && (
                <button
                  onClick={updateSubdomain}
                  disabled={saving}
                  className="btn-primary btn-sm"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Update Subdomain'
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Warning for subdomain change */}
          {subdomain !== currentSubdomain && (
            <div className="bg-warning-50 border border-warning-200 rounded-lg p-4">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-warning-600 mt-0.5" />
                <div className="ml-3">
                  <p className="text-sm text-warning-800">
                    <strong>Important:</strong> Changing your subdomain will:
                  </p>
                  <ul className="mt-2 text-sm text-warning-700 list-disc list-inside">
                    <li>Update all status page URLs</li>
                    <li>Invalidate existing embed codes and widgets</li>
                    <li>Require updating any external integrations</li>
                    <li>The old subdomain will become available to others</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Custom Domain Configuration */}
      <div className="border-t pt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Custom Domain (Pro/Unlimited)
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Custom Domain
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={customDomain}
                onChange={(e) => setCustomDomain(e.target.value.toLowerCase())}
                className="input flex-1"
                placeholder="status.yourdomain.com"
              />
              <button
                onClick={verifyCustomDomain}
                disabled={!customDomain || saving}
                className="btn-secondary"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify Domain'
                )}
              </button>
            </div>
            
            {customDomainVerified && (
              <div className="mt-2 flex items-center text-sm text-success-600">
                <Check className="h-4 w-4 mr-1" />
                Domain verified and active
              </div>
            )}
          </div>

          {/* DNS Instructions */}
          {dnsInstructions && !customDomainVerified && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">
                DNS Configuration Required
              </h4>
              <p className="text-sm text-blue-800 mb-3">
                Add these DNS records to your domain:
              </p>
              
              <div className="space-y-2">
                {dnsInstructions.map((record: any, index: number) => (
                  <div key={index} className="bg-white rounded p-3 font-mono text-xs">
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <span className="text-gray-500">Type:</span> {record.type}
                      </div>
                      <div>
                        <span className="text-gray-500">Name:</span> {record.name}
                      </div>
                      <div>
                        <span className="text-gray-500">Value:</span> {record.value}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <p className="text-xs text-blue-700 mt-3">
                DNS changes may take up to 48 hours to propagate. You can verify again once the records are added.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}