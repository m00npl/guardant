"use strict";
// GuardAnt UI Components
// Shared React components for the GuardAnt platform
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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AntCard = exports.AntButton = void 0;
const AntButton = ({ children, ...props }) => {
    return { ...props } > { children } < /button>;
};
exports.AntButton = AntButton;
const AntCard = ({ children, ...props }) => {
    return className;
    "ant-card";
    {
        props;
    }
     > { children } < /div>;
};
exports.AntCard = AntCard;
// Export all components
__exportStar(require("./components/AntButton"), exports);
__exportStar(require("./components/AntCard"), exports);
//# sourceMappingURL=index.js.map