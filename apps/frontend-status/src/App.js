"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const react_router_dom_1 = require("react-router-dom");
const StatusPage_1 = require("./pages/StatusPage");
const HistoryPage_1 = require("./pages/HistoryPage");
const EmbedPage_1 = require("./pages/EmbedPage");
function App() {
    return (<react_router_dom_1.BrowserRouter>
      <react_router_dom_1.Routes>
        <react_router_dom_1.Route path="/" element={<StatusPage_1.StatusPage />}/>
        <react_router_dom_1.Route path="/history" element={<HistoryPage_1.HistoryPage />}/>
        <react_router_dom_1.Route path="/history/:serviceId" element={<HistoryPage_1.HistoryPage />}/>
        <react_router_dom_1.Route path="/embed" element={<EmbedPage_1.EmbedPage />}/>
      </react_router_dom_1.Routes>
    </react_router_dom_1.BrowserRouter>);
}
exports.default = App;
//# sourceMappingURL=App.js.map