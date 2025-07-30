"use strict";
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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ThemeProvider = exports.useTheme = void 0;
const react_1 = __importStar(require("react"));
const ThemeContext = (0, react_1.createContext)(undefined);
const useTheme = () => {
    const context = (0, react_1.useContext)(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
exports.useTheme = useTheme;
const ThemeProvider = ({ children }) => {
    const [theme, setThemeState] = (0, react_1.useState)(() => {
        const stored = localStorage.getItem('theme');
        return stored || 'system';
    });
    const [resolvedTheme, setResolvedTheme] = (0, react_1.useState)('light');
    // Resolve system theme
    const getSystemTheme = () => {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    };
    // Update resolved theme
    (0, react_1.useEffect)(() => {
        const updateResolvedTheme = () => {
            if (theme === 'system') {
                setResolvedTheme(getSystemTheme());
            }
            else {
                setResolvedTheme(theme);
            }
        };
        updateResolvedTheme();
        // Listen for system theme changes
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = () => {
            if (theme === 'system') {
                setResolvedTheme(getSystemTheme());
            }
        };
        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, [theme]);
    // Apply theme to document
    (0, react_1.useEffect)(() => {
        const root = document.documentElement;
        // Remove existing theme classes
        root.classList.remove('light', 'dark');
        // Add new theme class
        root.classList.add(resolvedTheme);
        // Update meta theme-color for mobile browsers
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
            metaThemeColor.setAttribute('content', resolvedTheme === 'dark' ? '#1f2937' : '#ffffff');
        }
    }, [resolvedTheme]);
    const setTheme = (newTheme) => {
        setThemeState(newTheme);
        localStorage.setItem('theme', newTheme);
    };
    const toggleTheme = () => {
        if (theme === 'light') {
            setTheme('dark');
        }
        else if (theme === 'dark') {
            setTheme('system');
        }
        else {
            setTheme('light');
        }
    };
    // Keyboard shortcut for theme toggle
    (0, react_1.useEffect)(() => {
        const handleKeyboard = (event) => {
            // Ctrl/Cmd + Shift + T = Toggle theme
            if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'T') {
                event.preventDefault();
                toggleTheme();
            }
        };
        window.addEventListener('keydown', handleKeyboard);
        return () => {
            window.removeEventListener('keydown', handleKeyboard);
        };
    }, [theme]);
    const value = {
        theme,
        resolvedTheme,
        setTheme,
        toggleTheme
    };
    return (<ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>);
};
exports.ThemeProvider = ThemeProvider;
//# sourceMappingURL=ThemeContext.js.map