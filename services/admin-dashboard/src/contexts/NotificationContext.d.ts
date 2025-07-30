import React from 'react';
export interface SystemNotification {
    id: string;
    type: 'info' | 'warning' | 'error' | 'success';
    title: string;
    message: string;
    timestamp: string;
    read: boolean;
    persistent?: boolean;
    actions?: Array<{
        label: string;
        action: () => void;
        variant?: 'primary' | 'secondary';
    }>;
    metadata?: Record<string, any>;
}
interface NotificationContextType {
    notifications: SystemNotification[];
    unreadCount: number;
    addNotification: (notification: Omit<SystemNotification, 'id' | 'timestamp' | 'read'>) => void;
    markAsRead: (id: string) => void;
    markAllAsRead: () => void;
    removeNotification: (id: string) => void;
    clearAll: () => void;
    isConnected: boolean;
}
export declare const useNotifications: () => NotificationContextType;
interface NotificationProviderProps {
    children: React.ReactNode;
}
export declare const NotificationProvider: React.FC<NotificationProviderProps>;
export {};
//# sourceMappingURL=NotificationContext.d.ts.map