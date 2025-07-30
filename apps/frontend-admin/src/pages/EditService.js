"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EditService = void 0;
const react_1 = __importDefault(require("react"));
const react_router_dom_1 = require("react-router-dom");
const lucide_react_1 = require("lucide-react");
const EditService = () => {
    const { id } = (0, react_router_dom_1.useParams)();
    const navigate = (0, react_router_dom_1.useNavigate)();
    return (<div className="space-y-8">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <button onClick={() => navigate('/services')} className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
          <lucide_react_1.ArrowLeft className="h-5 w-5"/>
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
        <lucide_react_1.Edit3 className="h-16 w-16 text-gray-300 mx-auto mb-4"/>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Edit Watcher: {id}
        </h3>
        <p className="text-gray-600 mb-6">
          This feature is under construction. The edit form will be similar to the create form
          but pre-populated with existing watcher data.
        </p>
        <button onClick={() => navigate('/services')} className="btn-primary">
          Back to Watchers
        </button>
      </div>
    </div>);
};
exports.EditService = EditService;
//# sourceMappingURL=EditService.js.map