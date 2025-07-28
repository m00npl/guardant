# 🐜 guardant.me Design System

**The Ant-Themed Status Page Platform**

## Brand Identity

### 🖼️ Logo Usage
- **Primary Logo**: Use the provided guardant.me logo
- **Minimum Size**: 24px height for digital, 16mm for print
- **Clear Space**: Minimum 1x logo height on all sides
- **Color Variations**: Full color, white, black (for different backgrounds)
- **Usage**: Replace Bug icon with actual logo in navigation and branding

### 🎨 Brand Colors

```css
/* Primary Palette */
--primary-50: #eff6ff;
--primary-100: #dbeafe;
--primary-200: #bfdbfe;
--primary-300: #93c5fd;
--primary-400: #60a5fa;
--primary-500: #3b82f6;    /* Main brand color */
--primary-600: #2563eb;
--primary-700: #1d4ed8;
--primary-800: #1e40af;
--primary-900: #1e3a8a;
--primary-950: #172554;

/* Status Colors */
--success-50: #f0fdf4;
--success-500: #22c55e;   /* Operational/Up */
--success-600: #16a34a;

--warning-50: #fffbeb;
--warning-500: #f59e0b;   /* Degraded/Warning */
--warning-600: #d97706;

--error-50: #fef2f2;
--error-500: #ef4444;     /* Down/Error */
--error-600: #dc2626;

/* Neutral Palette */
--gray-50: #f9fafb;
--gray-100: #f3f4f6;
--gray-200: #e5e7eb;
--gray-300: #d1d5db;
--gray-400: #9ca3af;
--gray-500: #6b7280;
--gray-600: #4b5563;
--gray-700: #374151;
--gray-800: #1f2937;
--gray-900: #111827;
```

### 🐜 Ant-Themed Terminology

| Standard Term | Ant Theme | Usage Context |
|---------------|-----------|---------------|
| **Tenant** | **Nest** | Customer account/organization |
| **Services** | **Watchers** | Monitoring configurations |
| **Regions** | **Colonies** | Geographic monitoring locations |
| **Workers** | **WorkerAnts** | Background monitoring processes |
| **Dashboard** | **Ant Hill** | Main overview page |
| **Settings** | **Queen's Den** | Configuration area |
| **Admin** | **Queen** | Administrator user |

### 📱 Subscription Tiers (Ant Hierarchy)

```typescript
type SubscriptionTier = {
  name: string;
  antType: string;
  emoji: string;
  limits: {
    watchers: number;
    regions: number;
    features: string[];
  };
};

const tiers = {
  free: {
    name: "Worker Ant",
    emoji: "🐜",
    limits: { watchers: 3, regions: 1, features: ["basic"] }
  },
  pro: {
    name: "Soldier Ant", 
    emoji: "⚡",
    limits: { watchers: 50, regions: 3, features: ["advanced"] }
  },
  unlimited: {
    name: "Queen Ant",
    emoji: "👑", 
    limits: { watchers: -1, regions: -1, features: ["all"] }
  }
};
```

## 🎯 Typography

### Font Families
```css
/* Primary Font */
font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;

/* Monospace (for code, IDs, addresses) */
font-family: 'JetBrains Mono', 'Fira Code', Consolas, monospace;
```

### Font Scale
```css
/* Headings */
.text-3xl { font-size: 1.875rem; font-weight: 700; } /* Page titles */
.text-2xl { font-size: 1.5rem; font-weight: 600; }   /* Section titles */
.text-xl { font-size: 1.25rem; font-weight: 600; }   /* Card titles */
.text-lg { font-size: 1.125rem; font-weight: 500; }  /* Subsections */

/* Body Text */
.text-base { font-size: 1rem; font-weight: 400; }    /* Default body */
.text-sm { font-size: 0.875rem; font-weight: 400; }  /* Secondary text */
.text-xs { font-size: 0.75rem; font-weight: 400; }   /* Captions, labels */
```

## 🧩 Component Library

### 🔘 Buttons
```css
/* Base Button */
.btn {
  @apply px-4 py-2 rounded-lg font-medium transition-colors;
  @apply focus:outline-none focus:ring-2 focus:ring-offset-2;
}

/* Primary Button */
.btn-primary {
  @apply btn bg-primary-600 text-white;
  @apply hover:bg-primary-700 focus:ring-primary-500;
}

/* Secondary Button */
.btn-secondary {
  @apply btn bg-gray-200 text-gray-900;
  @apply hover:bg-gray-300 focus:ring-gray-500;
}

/* Success Button */
.btn-success {
  @apply btn bg-success-600 text-white;
  @apply hover:bg-success-700 focus:ring-success-500;
}

/* Error Button */
.btn-error {
  @apply btn bg-error-600 text-white;
  @apply hover:bg-error-700 focus:ring-error-500;
}
```

### 📝 Inputs
```css
.input {
  @apply px-3 py-2 border border-gray-300 rounded-lg;
  @apply focus:outline-none focus:ring-2 focus:ring-primary-500;
  @apply focus:border-transparent;
}

.input:disabled {
  @apply bg-gray-100 cursor-not-allowed opacity-50;
}
```

### 📋 Cards
```css
.card {
  @apply bg-white rounded-xl border border-gray-200 shadow-sm;
}

.card:hover {
  @apply shadow-md transition-shadow;
}
```

### 🚦 Status Indicators
```css
.status-up {
  @apply bg-success-50 text-success-600 border-success-200;
}

.status-down {
  @apply bg-error-50 text-error-600 border-error-200;
}

.status-degraded {
  @apply bg-warning-50 text-warning-600 border-warning-200;
}

/* Status Dots */
.status-dot {
  @apply w-3 h-3 rounded-full;
}

.status-dot.up { @apply bg-success-500; }
.status-dot.down { @apply bg-error-500; }
.status-dot.degraded { @apply bg-warning-500; }
.status-dot.live { @apply animate-pulse; }
```

## 🎭 Icons & Emojis

### 🎨 Lucide Icons Mapping
```typescript
const iconMap = {
  // Navigation
  antHill: BarChart3,        // Dashboard
  watchers: Globe,           // Services
  colonies: MapPin,          // Regions
  queensDen: Settings,       // Settings
  
  // Service Types
  web: Globe,
  github: Github,
  ping: Wifi,
  port: Network,
  tcp: Server,
  keyword: Search,
  heartbeat: Heart,
  uptimeApi: Activity,
  
  // Actions
  deploy: Plus,
  edit: Edit3,
  delete: Trash2,
  leave: LogOut,
  
  // Status
  healthy: Activity,
  warning: AlertTriangle,
  error: AlertCircle,
  loading: Loader2,
};
```

### 🐜 Emoji Usage
```typescript
const emojiMap = {
  // Main Navigation
  antHill: "🐜",
  watchers: "👁️", 
  colonies: "🗺️",
  queensDen: "👑",
  
  // Actions
  deploy: "🚀",
  edit: "✏️",
  delete: "🗑️",
  settings: "⚙️",
  
  // Status
  online: "✅",
  offline: "❌",
  warning: "⚠️",
  loading: "⏳",
  
  // Countries (for regions)
  germany: "🇩🇪",
  poland: "🇵🇱",
  uk: "🇬🇧",
  usa: "🇺🇸",
  canada: "🇨🇦",
  singapore: "🇸🇬",
  japan: "🇯🇵",
  india: "🇮🇳",
  brazil: "🇧🇷",
  australia: "🇦🇺",
};
```

## 📐 Layout System

### 🏗️ Grid System
```css
/* Standard Layout */
.container {
  @apply mx-auto max-w-7xl px-6 lg:px-8;
}

/* Sidebar Layout */
.sidebar-layout {
  display: grid;
  grid-template-columns: 256px 1fr;
  min-height: 100vh;
}

/* Responsive Grids */
.grid-responsive {
  @apply grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6;
}

.grid-stats {
  @apply grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6;
}
```

### 📏 Spacing Scale
```css
/* Consistent spacing using Tailwind scale */
.space-xs { @apply space-y-2; }     /* 8px */
.space-sm { @apply space-y-4; }     /* 16px */
.space-md { @apply space-y-6; }     /* 24px */
.space-lg { @apply space-y-8; }     /* 32px */
.space-xl { @apply space-y-12; }    /* 48px */
```

## 🎪 Animation & Transitions

### ⚡ Standard Transitions
```css
.transition-standard {
  @apply transition-colors duration-200 ease-in-out;
}

.transition-transform {
  @apply transition-transform duration-200 ease-in-out;
}

.transition-shadow {
  @apply transition-shadow duration-200 ease-in-out;
}
```

### 🌊 Loading Animations
```css
/* Spinner */
.spinner {
  @apply animate-spin rounded-full border-2 border-gray-300;
  @apply border-t-primary-600;
}

/* Pulse for live indicators */
.pulse-live {
  @apply animate-pulse;
}

/* Bounce for notifications */
.bounce-notification {
  @apply animate-bounce;
}
```

## 📱 Responsive Design

### 📐 Breakpoints
```css
/* Mobile First Approach */
sm: '640px',   /* Tablet */
md: '768px',   /* Small laptop */
lg: '1024px',  /* Desktop */
xl: '1280px',  /* Large desktop */
2xl: '1536px'  /* Ultra wide */
```

### 📱 Mobile Considerations
- Sidebar collapses to hamburger menu
- Cards stack vertically
- Touch-friendly button sizes (min 44px)
- Reduced padding on mobile
- Simplified navigation

## 🎨 Dark Mode (Future)

### 🌙 Dark Theme Colors
```css
/* Dark mode variants */
.dark {
  --bg-primary: #111827;      /* gray-900 */
  --bg-secondary: #1f2937;    /* gray-800 */
  --bg-card: #374151;         /* gray-700 */
  --text-primary: #f9fafb;    /* gray-50 */
  --text-secondary: #d1d5db;  /* gray-300 */
  --border: #4b5563;          /* gray-600 */
}
```

## 🎯 Accessibility

### ♿ Standards
- WCAG 2.1 AA compliance
- Minimum contrast ratio 4.5:1
- Keyboard navigation support
- Screen reader friendly
- Focus indicators on all interactive elements

### 🔍 Focus States
```css
.focus-visible {
  @apply focus:outline-none focus:ring-2 focus:ring-primary-500;
  @apply focus:ring-offset-2;
}
```

## 📝 Voice & Tone

### 🐜 Ant-Themed Messaging
- **Friendly & Approachable**: "Welcome to your colony! 🐜"
- **Action-Oriented**: "Deploy your first watcher"
- **Community Feel**: "Your ant network is growing"
- **Playful but Professional**: Mix of ant metaphors with serious monitoring

### 💬 Error Messages
```typescript
const messages = {
  success: "🐜 Watcher deployed successfully!",
  error: "❌ Failed to deploy watcher",
  warning: "⚠️ Some colonies are offline",
  info: "📡 WorkerAnts are busy monitoring...",
  
  empty: {
    watchers: "No watchers deployed yet - your colony is ready!",
    regions: "No colonies active in this region",
    incidents: "All watchers operational! 🎉"
  }
};
```

## 🔧 Implementation Guidelines

### 📦 CSS Structure
```
styles/
├── base.css           # Reset, typography, base elements
├── components.css     # Reusable component classes
├── utilities.css      # Custom utility classes
└── themes.css         # Theme variations
```

### 🎨 Tailwind Configuration
```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: { /* custom primary palette */ },
        success: { /* success states */ },
        warning: { /* warning states */ },
        error: { /* error states */ }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', /* ... */],
        mono: ['JetBrains Mono', /* ... */]
      }
    }
  }
}
```

### 🧩 Component Structure
```typescript
// Standard component structure
interface ComponentProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'success' | 'error';
  disabled?: boolean;
  loading?: boolean;
}
```

---

**🐜 Remember**: This design system should feel cohesive, playful, and professional. The ant theme adds personality while maintaining usability and accessibility standards.