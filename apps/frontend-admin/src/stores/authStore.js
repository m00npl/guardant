"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useAuthStore = void 0;
const zustand_1 = require("zustand");
const middleware_1 = require("zustand/middleware");
exports.useAuthStore = (0, zustand_1.create)()((0, middleware_1.persist)((set) => ({
    isAuthenticated: false,
    nest: null,
    token: null,
    login: (nest, token) => set({
        isAuthenticated: true,
        nest,
        token
    }),
    logout: () => set({
        isAuthenticated: false,
        nest: null,
        token: null
    }),
}), {
    name: 'guardant-auth',
}));
//# sourceMappingURL=authStore.js.map