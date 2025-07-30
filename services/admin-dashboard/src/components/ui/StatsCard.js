"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const framer_motion_1 = require("framer-motion");
const lucide_react_1 = require("lucide-react");
const utils_1 = require("../../lib/utils");
const StatsCard = ({ title, value, change, trend = 'neutral', icon: Icon, color = 'blue', description, onClick, className }) => {
    const colorClasses = {
        blue: {
            bg: 'bg-blue-50 dark:bg-blue-900/20',
            icon: 'text-blue-600 dark:text-blue-400',
            border: 'border-blue-200 dark:border-blue-800'
        },
        green: {
            bg: 'bg-green-50 dark:bg-green-900/20',
            icon: 'text-green-600 dark:text-green-400',
            border: 'border-green-200 dark:border-green-800'
        },
        yellow: {
            bg: 'bg-yellow-50 dark:bg-yellow-900/20',
            icon: 'text-yellow-600 dark:text-yellow-400',
            border: 'border-yellow-200 dark:border-yellow-800'
        },
        red: {
            bg: 'bg-red-50 dark:bg-red-900/20',
            icon: 'text-red-600 dark:text-red-400',
            border: 'border-red-200 dark:border-red-800'
        },
        purple: {
            bg: 'bg-purple-50 dark:bg-purple-900/20',
            icon: 'text-purple-600 dark:text-purple-400',
            border: 'border-purple-200 dark:border-purple-800'
        },
        gray: {
            bg: 'bg-gray-50 dark:bg-gray-700/20',
            icon: 'text-gray-600 dark:text-gray-400',
            border: 'border-gray-200 dark:border-gray-600'
        }
    };
    const trendClasses = {
        up: 'text-green-600 dark:text-green-400',
        down: 'text-red-600 dark:text-red-400',
        neutral: 'text-gray-600 dark:text-gray-400'
    };
    const TrendIcon = trend === 'up' ? lucide_react_1.TrendingUp : trend === 'down' ? lucide_react_1.TrendingDown : lucide_react_1.Minus;
    return (<framer_motion_1.motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -2 }} transition={{ duration: 0.2 }} className={(0, utils_1.cn)('bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-6 transition-all duration-200', onClick && 'cursor-pointer hover:shadow-md', className)} onClick={onClick}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {title}
            </h3>
          </div>
          
          <div className="flex items-baseline space-x-2">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {value}
            </p>
            
            {change && (<div className={(0, utils_1.cn)('flex items-center space-x-1 text-sm font-medium', trendClasses[trend])}>
                <TrendIcon className="w-4 h-4"/>
                <span>{change}</span>
              </div>)}
          </div>

          {description && (<p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              {description}
            </p>)}
        </div>

        <div className={(0, utils_1.cn)('p-3 rounded-lg border', colorClasses[color].bg, colorClasses[color].border)}>
          <Icon className={(0, utils_1.cn)('w-6 h-6', colorClasses[color].icon)}/>
        </div>
      </div>
    </framer_motion_1.motion.div>);
};
exports.default = StatsCard;
//# sourceMappingURL=StatsCard.js.map