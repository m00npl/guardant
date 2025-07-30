"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PageErrorMessage = exports.ErrorMessage = void 0;
const react_1 = __importDefault(require("react"));
const lucide_react_1 = require("lucide-react");
const ErrorMessage = ({ error, onRetry, className = '' }) => {
    return (<div className={`bg-error-50 border border-error-200 rounded-lg p-6 ${className}`}>
      <div className="flex items-start">
        <lucide_react_1.AlertCircle className="h-5 w-5 text-error-600 mt-0.5 mr-3 flex-shrink-0"/>
        <div className="flex-1">
          <h3 className="text-sm font-medium text-error-900">
            Failed to load status data
          </h3>
          <p className="mt-2 text-sm text-error-700">
            {error}
          </p>
          {onRetry && (<button onClick={onRetry} className="mt-3 inline-flex items-center px-3 py-2 border border-error-300 rounded-md text-sm font-medium text-error-700 bg-white hover:bg-error-50 focus:outline-none focus:ring-2 focus:ring-error-500 focus:ring-offset-2 transition-colors">
              <lucide_react_1.RefreshCw className="h-4 w-4 mr-2"/>
              Try Again
            </button>)}
        </div>
      </div>
    </div>);
};
exports.ErrorMessage = ErrorMessage;
const PageErrorMessage = ({ error, onRetry }) => {
    return (<div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">😵</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Unable to load status page
          </h1>
          <p className="text-gray-600">
            Our WorkerAnts encountered an issue while fetching the latest status data.
          </p>
        </div>
        
        <exports.ErrorMessage error={error} onRetry={onRetry}/>
        
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>If this problem persists, please contact the site administrator.</p>
        </div>
      </div>
    </div>);
};
exports.PageErrorMessage = PageErrorMessage;
//# sourceMappingURL=ErrorMessage.js.map