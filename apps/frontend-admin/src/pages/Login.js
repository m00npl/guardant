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
exports.Login = void 0;
const react_1 = __importStar(require("react"));
const lucide_react_1 = require("lucide-react");
const react_hot_toast_1 = __importDefault(require("react-hot-toast"));
const authStore_1 = require("../stores/authStore");
const Login = () => {
    const [email, setEmail] = (0, react_1.useState)('');
    const [password, setPassword] = (0, react_1.useState)('');
    const [isLoading, setIsLoading] = (0, react_1.useState)(false);
    const { login } = (0, authStore_1.useAuthStore)();
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
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
                    tier: 'pro',
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
                status: 'active',
            };
            login(mockNest, 'mock-token');
            react_hot_toast_1.default.success('Welcome to your colony! 🐜');
        }
        catch (error) {
            react_hot_toast_1.default.error('Failed to enter colony');
        }
        finally {
            setIsLoading(false);
        }
    };
    return (<div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center">
            <div className="bg-white p-3 rounded-full shadow-lg">
              <lucide_react_1.Bug className="h-12 w-12 text-primary-600"/>
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
                  <lucide_react_1.Mail className="h-5 w-5 text-gray-400"/>
                </div>
                <input id="email" name="email" type="email" autoComplete="email" required className="input pl-10 w-full" placeholder="queen@yourcolony.com" value={email} onChange={(e) => setEmail(e.target.value)}/>
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Colony Secret
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <lucide_react_1.Lock className="h-5 w-5 text-gray-400"/>
                </div>
                <input id="password" name="password" type="password" autoComplete="current-password" required className="input pl-10 w-full" placeholder="Enter your colony secret" value={password} onChange={(e) => setPassword(e.target.value)}/>
              </div>
            </div>

            <button type="submit" disabled={isLoading} className="btn-primary w-full flex items-center justify-center">
              {isLoading ? (<div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"/>) : (<>
                  <lucide_react_1.LogIn className="h-5 w-5 mr-2"/>
                  Enter Colony
                </>)}
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
    </div>);
};
exports.Login = Login;
//# sourceMappingURL=Login.js.map