"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatusFooter = void 0;
const react_1 = __importDefault(require("react"));
const StatusFooter = () => {
    return (<footer className="bg-white border-t border-gray-200 mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between">
          {/* Powered by GuardAnt */}
          <div className="powered-by">
            <span>Powered by</span>
            <div className="flex items-center space-x-1 font-medium">
              <span className="text-lg">🐜</span>
              <span>GuardAnt</span>
            </div>
            <span>distributed monitoring</span>
          </div>

          {/* Links */}
          <div className="flex items-center space-x-6 text-sm">
            <a href="https://guardant.me" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-gray-700 transition-colors">
              About GuardAnt
            </a>
            <a href="https://status.guardant.me" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-gray-700 transition-colors">
              GuardAnt Status
            </a>
            <a href="/rss" className="text-gray-500 hover:text-gray-700 transition-colors">
              RSS Feed
            </a>
          </div>
        </div>

        {/* Additional info */}
        <div className="mt-6 pt-6 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-400">
            Real-time monitoring powered by WorkerAnts distributed across global colonies
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Updates every 30 seconds • Data refreshed via Server-Sent Events
          </p>
        </div>
      </div>
    </footer>);
};
exports.StatusFooter = StatusFooter;
//# sourceMappingURL=StatusFooter.js.map