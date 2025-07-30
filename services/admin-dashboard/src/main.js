"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const client_1 = __importDefault(require("react-dom/client"));
const react_router_dom_1 = require("react-router-dom");
const react_query_1 = require("@tanstack/react-query");
const react_query_devtools_1 = require("@tanstack/react-query-devtools");
const sonner_1 = require("sonner");
const App_1 = __importDefault(require("./App"));
const AuthContext_1 = require("./contexts/AuthContext");
const ThemeContext_1 = require("./contexts/ThemeContext");
const NotificationContext_1 = require("./contexts/NotificationContext");
require("./index.css");
// Configure React Query
const queryClient = new react_query_1.QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes
            cacheTime: 10 * 60 * 1000, // 10 minutes
            retry: (failureCount, error) => {
                // Don't retry on 4xx errors
                if (error?.status >= 400 && error?.status < 500) {
                    return false;
                }
                return failureCount < 3;
            },
            refetchOnWindowFocus: false,
            refetchOnMount: 'always'
        },
        mutations: {
            retry: 1
        }
    }
});
// Error boundary for the entire app
class ErrorBoundary extends react_1.default.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    componentDidCatch(error, errorInfo) {
        console.error('Dashboard Error:', error, errorInfo);
        // In production, send error to monitoring service
        if (import.meta.env.PROD) {
            // Send to error monitoring service
            fetch('/api/admin/errors', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    error: error.message,
                    stack: error.stack,
                    errorInfo,
                    url: window.location.href,
                    userAgent: navigator.userAgent,
                    timestamp: new Date().toISOString()
                })
            }).catch(() => {
                // Ignore errors in error reporting
            });
        }
    }
    render() {
        if (this.state.hasError) {
            return (<div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833-.192 2.5 1.732 2.5z"/>
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">
              Something went wrong
            </h1>
            <p className="text-gray-600 mb-6">
              The dashboard encountered an unexpected error. Please refresh the page or contact support if the problem persists.
            </p>
            <div className="space-y-3">
              <button onClick={() => window.location.reload()} className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors">
                Refresh Page
              </button>
              <button onClick={() => this.setState({ hasError: false })} className="w-full bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 transition-colors">
                Try Again
              </button>
            </div>
            {import.meta.env.DEV && this.state.error && (<details className="mt-4 text-left">
                <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                  Error Details (Development)
                </summary>
                <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
                  {this.state.error.stack}
                </pre>
              </details>)}
          </div>
        </div>);
        }
        return this.props.children;
    }
}
// Performance monitoring
if (import.meta.env.PROD && 'performance' in window) {
    // Monitor Core Web Vitals
    const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
            if (entry.entryType === 'largest-contentful-paint') {
                console.log('LCP:', entry.startTime);
            }
            if (entry.entryType === 'first-input') {
                console.log('FID:', entry.processingStart - entry.startTime);
            }
            if (entry.entryType === 'layout-shift' && !entry.hadRecentInput) {
                console.log('CLS:', entry.value);
            }
        }
    });
    observer.observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] });
}
client_1.default.createRoot(document.getElementById('root')).render(<react_1.default.StrictMode>
    <ErrorBoundary>
      <react_router_dom_1.BrowserRouter>
        <react_query_1.QueryClientProvider client={queryClient}>
          <ThemeContext_1.ThemeProvider>
            <AuthContext_1.AuthProvider>
              <NotificationContext_1.NotificationProvider>
                <App_1.default />
                <sonner_1.Toaster position="top-right" toastOptions={{
        duration: 4000,
        style: {
            background: 'hsl(var(--background))',
            color: 'hsl(var(--foreground))',
            border: '1px solid hsl(var(--border))'
        }
    }}/>
                {import.meta.env.DEV && <react_query_devtools_1.ReactQueryDevtools initialIsOpen={false}/>}
              </NotificationContext_1.NotificationProvider>
            </AuthContext_1.AuthProvider>
          </ThemeContext_1.ThemeProvider>
        </react_query_1.QueryClientProvider>
      </react_router_dom_1.BrowserRouter>
    </ErrorBoundary>
  </react_1.default.StrictMode>);
//# sourceMappingURL=main.js.map