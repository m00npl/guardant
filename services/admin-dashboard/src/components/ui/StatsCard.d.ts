import React from 'react';
import { LucideIcon } from 'lucide-react';
interface StatsCardProps {
    title: string;
    value: string;
    change?: string;
    trend?: 'up' | 'down' | 'neutral';
    icon: LucideIcon;
    color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'gray';
    description?: string;
    onClick?: () => void;
    className?: string;
}
declare const StatsCard: React.FC<StatsCardProps>;
export default StatsCard;
//# sourceMappingURL=StatsCard.d.ts.map