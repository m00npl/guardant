"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PageLoadingSpinner = exports.LoadingSpinner = void 0;
const react_1 = __importDefault(require("react"));
const LoadingSpinner = ({ size = 'md', className = '' }) => {
    const sizeClasses = {
        sm: 'h-4 w-4',
        md: 'h-8 w-8',
        lg: 'h-12 w-12'
    };
    return (<div className={`flex items-center justify-center ${className}`}>
      <div className={`${sizeClasses[size]} animate-spin rounded-full border-2 border-gray-300 border-t-primary-600`}/>
    </div>);
};
exports.LoadingSpinner = LoadingSpinner;
const PageLoadingSpinner = () => {
    return (<div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="mb-4">
          <div className="text-6xl animate-bounce">🐜</div>
        </div>
        <exports.LoadingSpinner size="lg"/>
        <p className="mt-4 text-gray-600">
          WorkerAnts are gathering status data...
        </p>
      </div>
    </div>);
};
exports.PageLoadingSpinner = PageLoadingSpinner;
//# sourceMappingURL=LoadingSpinner.js.map