"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vite_1 = require("vite");
const plugin_react_1 = __importDefault(require("@vitejs/plugin-react"));
exports.default = (0, vite_1.defineConfig)({
    plugins: [(0, plugin_react_1.default)()],
    base: process.env.NODE_ENV === 'production' ? '/admin/' : '/',
    server: {
        port: 5173,
        host: true,
        proxy: {
            '/api/admin': {
                target: 'http://localhost:45678',
                changeOrigin: true
            }
        }
    }
});
//# sourceMappingURL=vite.config.js.map