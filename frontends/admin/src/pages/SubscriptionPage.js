"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionPage = void 0;
const react_1 = __importStar(require("react"));
const axios_1 = __importDefault(require("axios"));
const react_hot_toast_1 = require("react-hot-toast");
const AuthContext_1 = require("../contexts/AuthContext");
const API_URL = import.meta.env.VITE_API_URL || '/api/admin';
const SubscriptionPage = () => {
    const { user } = (0, AuthContext_1.useAuth)();
    const [plans, setPlans] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [upgrading, setUpgrading] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        fetchPlans();
    }, []);
    const fetchPlans = async () => {
        try {
            const response = await axios_1.default.post(`${API_URL}/subscription/plans`);
            setPlans(response.data.data);
        }
        catch (error) {
            react_hot_toast_1.toast.error('Failed to fetch plans');
        }
        finally {
            setLoading(false);
        }
    };
    const handleUpgrade = async (planId) => {
        setUpgrading(true);
        try {
            const response = await axios_1.default.post(`${API_URL}/subscription/upgrade`, { planId });
            react_hot_toast_1.toast.success('Subscription upgraded successfully!');
            window.location.reload(); // Refresh to update user data
        }
        catch (error) {
            react_hot_toast_1.toast.error(error.response?.data?.error || 'Upgrade failed');
        }
        finally {
            setUpgrading(false);
        }
    };
    const handleCancel = async () => {
        if (!confirm('Are you sure you want to cancel your subscription?'))
            return;
        try {
            await axios_1.default.post(`${API_URL}/subscription/cancel`);
            react_hot_toast_1.toast.success('Subscription cancelled');
            window.location.reload();
        }
        catch (error) {
            react_hot_toast_1.toast.error('Failed to cancel subscription');
        }
    };
    if (loading) {
        return (<div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>);
    }
    const currentPlan = plans.find(p => p.tier === user?.subscription.tier);
    return (<div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Subscription</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your subscription and billing
        </p>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-8">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Current Plan
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Your current subscription details
          </p>
        </div>
        <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
          <dl className="sm:divide-y sm:divide-gray-200">
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Plan</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {currentPlan?.name} ({user?.subscription.tier})
              </dd>
            </div>
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Services Limit</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {user?.subscription.servicesLimit} services
              </dd>
            </div>
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Valid Until</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {new Date(user?.subscription.validUntil || 0).toLocaleDateString()}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="mb-8">
        <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
          Available Plans
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {plans.map((plan) => {
            const isCurrent = plan.tier === user?.subscription.tier;
            const isDowngrade = plans.findIndex(p => p.tier === plan.tier) <
                plans.findIndex(p => p.tier === user?.subscription.tier);
            return (<div key={plan.id} className={`relative rounded-lg border ${isCurrent ? 'border-blue-500 shadow-lg' : 'border-gray-200'} p-6`}>
                {isCurrent && (<span className="absolute top-0 right-0 bg-blue-500 text-white px-2 py-1 text-xs rounded-bl-lg rounded-tr-lg">
                    Current
                  </span>)}
                <div className="mb-4">
                  <h4 className="text-lg font-medium text-gray-900">{plan.name}</h4>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    ${plan.price}
                    <span className="text-base font-normal text-gray-500">/{plan.currency}</span>
                  </p>
                </div>
                <ul className="space-y-2 mb-6">
                  {plan.features.map((feature, idx) => (<li key={idx} className="flex items-start">
                      <svg className="h-5 w-5 text-green-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                      </svg>
                      <span className="ml-2 text-sm text-gray-700">{feature}</span>
                    </li>))}
                </ul>
                {!isCurrent && !isDowngrade && (<button onClick={() => handleUpgrade(plan.id)} disabled={upgrading} className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50">
                    {upgrading ? 'Processing...' : 'Upgrade'}
                  </button>)}
                {isCurrent && user?.subscription.tier !== 'free' && (<button onClick={handleCancel} className="w-full py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                    Cancel Subscription
                  </button>)}
              </div>);
        })}
        </div>
      </div>
    </div>);
};
exports.SubscriptionPage = SubscriptionPage;
//# sourceMappingURL=SubscriptionPage.js.map