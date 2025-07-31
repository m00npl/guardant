import React, { useState, useEffect } from 'react'
import { 
  CreditCard, 
  Check, 
  TrendingUp,
  Crown,
  Shield,
  Users,
  Activity,
  Star,
  Loader2,
  ArrowRight,
  AlertCircle
} from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { apiFetch } from '../utils/api'
import toast from 'react-hot-toast'

interface SubscriptionPlan {
  id: string
  name: string
  tier: string
  price: number
  currency: string
  period: string
  features: string[]
  limits: {
    services: number
    regions: number
    teamMembers: number
    apiCalls: number
  }
  popular?: boolean
}

interface CurrentSubscription {
  tier: string
  status: string
  currentPeriodEnd: number
  servicesUsed: number
  servicesLimit: number
  billingEmail: string
  paymentMethod?: {
    type: string
    last4: string
    expiryMonth: number
    expiryYear: number
  }
}

export const Subscription: React.FC = () => {
  const { nest } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [currentSubscription, setCurrentSubscription] = useState<CurrentSubscription | null>(null)
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    fetchSubscriptionData()
  }, [])

  const fetchSubscriptionData = async () => {
    try {
      // Fetch subscription plans
      const plansResponse = await fetch('/api/admin/subscription/plans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (plansResponse.ok) {
        const plansData = await plansResponse.json()
        setPlans(plansData.data || [])
      }

      // Fetch current subscription
      const subResponse = await apiFetch('/api/admin/subscription/current', {
        method: 'GET'
      })

      if (subResponse.ok) {
        const subData = await subResponse.json()
        setCurrentSubscription(subData.data)
      } else if (subResponse.status === 404) {
        // Use data from nest if available
        if (nest) {
          setCurrentSubscription({
            tier: nest.subscription.tier,
            status: nest.subscription.status || 'active',
            currentPeriodEnd: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days from now
            servicesUsed: nest.subscription.currentUsage || 0,
            servicesLimit: nest.subscription.servicesLimit,
            billingEmail: nest.email
          })
        }
      }
    } catch (error) {
      console.log('Subscription data not available')
    } finally {
      setLoading(false)
    }
  }

  const handleUpgrade = async (planId: string) => {
    setSelectedPlan(planId)
    toast('Subscription upgrades will be available soon!', {
      icon: '🚧',
      duration: 3000
    })
  }

  const handleManageBilling = () => {
    toast('Billing management will be available soon!', {
      icon: '🚧',
      duration: 3000
    })
  }

  const getPlanIcon = (tier: string) => {
    switch (tier) {
      case 'free':
        return <Activity className="h-8 w-8" />
      case 'pro':
        return <Shield className="h-8 w-8" />
      case 'enterprise':
        return <Crown className="h-8 w-8" />
      default:
        return <Star className="h-8 w-8" />
    }
  }

  const formatPrice = (price: number, currency: string) => {
    if (price === 0) return 'Free'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0
    }).format(price)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-12 w-12 animate-spin text-primary-600" />
      </div>
    )
  }

  // Default plans if none loaded
  const defaultPlans: SubscriptionPlan[] = [
    {
      id: 'free',
      name: 'Worker Ant',
      tier: 'free',
      price: 0,
      currency: 'USD',
      period: 'forever',
      features: [
        'Up to 5 watchers',
        '1 monitoring region',
        '5 minute check intervals',
        'Email notifications',
        'Public status page',
        'Community support'
      ],
      limits: {
        services: 5,
        regions: 1,
        teamMembers: 1,
        apiCalls: 1000
      }
    },
    {
      id: 'pro',
      name: 'Soldier Ant',
      tier: 'pro',
      price: 29,
      currency: 'USD',
      period: 'month',
      popular: true,
      features: [
        'Up to 50 watchers',
        'All monitoring regions',
        '1 minute check intervals',
        'Email & SMS notifications',
        'Custom domain',
        'API access',
        'Priority support',
        'Team collaboration'
      ],
      limits: {
        services: 50,
        regions: -1,
        teamMembers: 5,
        apiCalls: 100000
      }
    },
    {
      id: 'enterprise',
      name: 'Queen Ant',
      tier: 'enterprise',
      price: 99,
      currency: 'USD',
      period: 'month',
      features: [
        'Unlimited watchers',
        'All monitoring regions',
        '30 second check intervals',
        'All notification channels',
        'Multiple custom domains',
        'Advanced API access',
        'Dedicated support',
        'Unlimited team members',
        'SLA guarantee',
        'Custom integrations'
      ],
      limits: {
        services: -1,
        regions: -1,
        teamMembers: -1,
        apiCalls: -1
      }
    }
  ]

  const displayPlans = plans.length > 0 ? plans : defaultPlans

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          💎 Colony Subscription
        </h1>
        <p className="mt-2 text-gray-600">
          Upgrade your colony to unlock more features and capacity
        </p>
      </div>

      {/* Current Subscription */}
      {currentSubscription && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Current Plan</h2>
            <button
              onClick={handleManageBilling}
              className="text-primary-600 hover:text-primary-700 text-sm font-medium"
            >
              Manage Billing
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-gray-600">Plan</p>
              <p className="text-xl font-semibold text-gray-900">
                {currentSubscription.tier === 'free' ? 'Worker Ant' :
                 currentSubscription.tier === 'pro' ? 'Soldier Ant' :
                 currentSubscription.tier === 'enterprise' ? 'Queen Ant' : 
                 currentSubscription.tier}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Status</p>
              <div className="flex items-center">
                <div className={`w-2 h-2 rounded-full mr-2 ${
                  currentSubscription.status === 'active' ? 'bg-success-500' : 'bg-warning-500'
                }`} />
                <p className="text-xl font-semibold text-gray-900 capitalize">
                  {currentSubscription.status}
                </p>
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-600">Watchers Used</p>
              <p className="text-xl font-semibold text-gray-900">
                {currentSubscription.servicesUsed} / {
                  currentSubscription.servicesLimit === -1 ? '∞' : currentSubscription.servicesLimit
                }
              </p>
            </div>
          </div>

          {currentSubscription.currentPeriodEnd && currentSubscription.tier !== 'free' && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                Next billing date: {new Date(currentSubscription.currentPeriodEnd).toLocaleDateString()}
              </p>
            </div>
          )}

          {currentSubscription.paymentMethod && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <CreditCard className="h-5 w-5 text-gray-400 mr-2" />
                  <span className="text-sm text-gray-600">
                    {currentSubscription.paymentMethod.type} ending in {currentSubscription.paymentMethod.last4}
                  </span>
                </div>
                <button className="text-sm text-primary-600 hover:text-primary-700">
                  Update
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Subscription Plans */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Available Plans</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {displayPlans.map((plan) => {
            const isCurrentPlan = currentSubscription?.tier === plan.tier
            
            return (
              <div
                key={plan.id}
                className={`card p-6 relative ${
                  plan.popular ? 'border-primary-500 border-2' : ''
                } ${isCurrentPlan ? 'bg-gray-50' : ''}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-primary-600 text-white px-3 py-1 rounded-full text-xs font-medium">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="text-center mb-6">
                  <div className={`inline-flex p-3 rounded-full mb-4 ${
                    plan.tier === 'free' ? 'bg-gray-100 text-gray-600' :
                    plan.tier === 'pro' ? 'bg-primary-100 text-primary-600' :
                    'bg-warning-100 text-warning-600'
                  }`}>
                    {getPlanIcon(plan.tier)}
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900">{plan.name}</h3>
                  <div className="mt-4">
                    <span className="text-3xl font-bold text-gray-900">
                      {formatPrice(plan.price, plan.currency)}
                    </span>
                    {plan.price > 0 && (
                      <span className="text-gray-600">/{plan.period}</span>
                    )}
                  </div>
                </div>

                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <Check className="h-5 w-5 text-success-500 mr-2 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                {isCurrentPlan ? (
                  <button
                    disabled
                    className="btn-secondary w-full opacity-50 cursor-not-allowed"
                  >
                    Current Plan
                  </button>
                ) : (
                  <button
                    onClick={() => handleUpgrade(plan.id)}
                    className={`w-full inline-flex items-center justify-center ${
                      plan.tier === 'enterprise' ? 'btn-primary' : 'btn-secondary'
                    }`}
                  >
                    {plan.price === 0 ? 'Downgrade' : 'Upgrade'}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Coming Soon Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <AlertCircle className="h-5 w-5 text-blue-400" />
          </div>
          <div className="ml-3">
            <p className="text-sm text-blue-800">
              Subscription management is coming soon! You'll be able to upgrade, downgrade, and manage your billing information directly from this page.
            </p>
          </div>
        </div>
      </div>

      {/* Features Comparison */}
      <div className="card p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Features Comparison</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4">Feature</th>
                <th className="text-center py-3 px-4">Worker Ant</th>
                <th className="text-center py-3 px-4">Soldier Ant</th>
                <th className="text-center py-3 px-4">Queen Ant</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="py-3 px-4">Watchers</td>
                <td className="text-center py-3 px-4">5</td>
                <td className="text-center py-3 px-4">50</td>
                <td className="text-center py-3 px-4">Unlimited</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3 px-4">Check Interval</td>
                <td className="text-center py-3 px-4">5 min</td>
                <td className="text-center py-3 px-4">1 min</td>
                <td className="text-center py-3 px-4">30 sec</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3 px-4">Team Members</td>
                <td className="text-center py-3 px-4">1</td>
                <td className="text-center py-3 px-4">5</td>
                <td className="text-center py-3 px-4">Unlimited</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3 px-4">API Access</td>
                <td className="text-center py-3 px-4">
                  <span className="text-gray-400">✗</span>
                </td>
                <td className="text-center py-3 px-4">
                  <Check className="h-5 w-5 text-success-500 inline" />
                </td>
                <td className="text-center py-3 px-4">
                  <Check className="h-5 w-5 text-success-500 inline" />
                </td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3 px-4">Custom Domain</td>
                <td className="text-center py-3 px-4">
                  <span className="text-gray-400">✗</span>
                </td>
                <td className="text-center py-3 px-4">1</td>
                <td className="text-center py-3 px-4">Unlimited</td>
              </tr>
              <tr>
                <td className="py-3 px-4">Support</td>
                <td className="text-center py-3 px-4">Community</td>
                <td className="text-center py-3 px-4">Priority</td>
                <td className="text-center py-3 px-4">Dedicated</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}