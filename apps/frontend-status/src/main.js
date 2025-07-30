"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const client_1 = __importDefault(require("react-dom/client"));
const App_tsx_1 = __importDefault(require("./App.tsx"));
require("./index.css");
// Set document title based on subdomain
const setDocumentTitle = () => {
    const hostname = window.location.hostname;
    // Get subdomain or nest name
    let nestName = 'Status';
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        const urlParams = new URLSearchParams(window.location.search);
        nestName = urlParams.get('nest') || 'Demo';
    }
    else {
        const parts = hostname.split('.');
        if (parts.length >= 3 && parts[1] === 'guardant' && parts[2] === 'me') {
            nestName = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
        }
    }
    document.title = `${nestName} Status - GuardAnt`;
};
setDocumentTitle();
client_1.default.createRoot(document.getElementById('root')).render(<react_1.default.StrictMode>
    <App_tsx_1.default />
  </react_1.default.StrictMode>);
//# sourceMappingURL=main.js.map