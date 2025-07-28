import React, { createContext, useContext, useEffect, useState } from 'react';
import { toast } from 'sonner';

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

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: React.ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [ws, setWs] = useState<WebSocket | null>(null);

  // Calculate unread count
  const unreadCount = notifications.filter(n => !n.read).length;

  // Add notification
  const addNotification = (notification: Omit<SystemNotification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: SystemNotification = {
      ...notification,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      read: false
    };

    setNotifications(prev => [newNotification, ...prev]);

    // Show toast for real-time notifications
    const toastOptions = {
      duration: notification.persistent ? Infinity : 5000,
      action: notification.actions?.[0] ? {
        label: notification.actions[0].label,
        onClick: notification.actions[0].action
      } : undefined
    };

    switch (notification.type) {
      case 'success':
        toast.success(notification.title, toastOptions);
        break;
      case 'error':
        toast.error(notification.title, toastOptions);
        break;
      case 'warning':
        toast.warning(notification.title, toastOptions);
        break;
      default:
        toast.info(notification.title, toastOptions);
    }

    // Play notification sound for important alerts
    if (notification.type === 'error' || notification.type === 'warning') {
      playNotificationSound();
    }
  };

  // Mark notification as read
  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === id
          ? { ...notification, read: true }
          : notification
      )
    );
  };

  // Mark all notifications as read
  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(notification => ({
        ...notification,
        read: true
      }))
    );
  };

  // Remove notification
  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  // Clear all notifications
  const clearAll = () => {
    setNotifications([]);
  };

  // Play notification sound
  const playNotificationSound = () => {
    try {
      // Create a simple beep sound
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch (error) {
      // Ignore audio errors
      console.warn('Failed to play notification sound:', error);
    }
  };

  // WebSocket connection for real-time notifications
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) return;

    const connectWebSocket = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/admin/notifications/stream`;
      
      const websocket = new WebSocket(wsUrl, ['authorization', token]);

      websocket.onopen = () => {
        console.log('Notification WebSocket connected');
        setIsConnected(true);
      };

      websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          switch (data.type) {
            case 'notification':
              addNotification(data.payload);
              break;
            case 'system_alert':
              addNotification({
                type: 'warning',
                title: 'System Alert',
                message: data.payload.message,
                persistent: true,
                metadata: data.payload
              });
              break;
            case 'deployment_update':
              addNotification({
                type: 'info',
                title: 'Deployment Update',
                message: data.payload.message,
                metadata: data.payload
              });
              break;
            case 'security_event':
              addNotification({
                type: 'error',
                title: 'Security Event',
                message: data.payload.message,
                persistent: true,
                metadata: data.payload
              });
              break;
            default:
              console.log('Unknown notification type:', data.type);
          }
        } catch (error) {
          console.error('Failed to parse notification message:', error);
        }
      };

      websocket.onclose = (event) => {
        console.log('Notification WebSocket disconnected:', event.code, event.reason);
        setIsConnected(false);
        
        // Reconnect after delay unless it was a clean close
        if (event.code !== 1000) {
          setTimeout(connectWebSocket, 5000);
        }
      };

      websocket.onerror = (error) => {
        console.error('Notification WebSocket error:', error);
        setIsConnected(false);
      };

      setWs(websocket);
    };

    connectWebSocket();

    return () => {
      if (ws) {
        ws.close(1000, 'Component unmounting');
      }
    };
  }, []);

  // Load historical notifications on mount
  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        if (!token) return;

        const response = await fetch('/api/admin/notifications', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setNotifications(data.notifications || []);
        }
      } catch (error) {
        console.error('Failed to load notifications:', error);
      }
    };

    loadNotifications();
  }, []);

  // Auto-cleanup old notifications
  useEffect(() => {
    const cleanup = setInterval(() => {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      setNotifications(prev =>
        prev.filter(notification => {
          const notificationDate = new Date(notification.timestamp);
          return notificationDate > oneWeekAgo || notification.persistent;
        })
      );
    }, 60 * 60 * 1000); // Clean up every hour

    return () => clearInterval(cleanup);
  }, []);

  // Handle page visibility change to manage connection
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page is hidden, potentially close connection to save resources
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.close(1000, 'Page hidden');
        }
      } else {
        // Page is visible, ensure connection is active
        if (!ws || ws.readyState !== WebSocket.OPEN) {
          // Reconnect logic is handled in the main effect
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [ws]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyboard = (event: KeyboardEvent) => {
      // Ctrl/Cmd + Shift + N = Mark all as read
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'N') {
        event.preventDefault();
        markAllAsRead();
        toast.success('All notifications marked as read');
      }

      // Ctrl/Cmd + Shift + X = Clear all notifications
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'X') {
        event.preventDefault();
        clearAll();
        toast.success('All notifications cleared');
      }
    };

    window.addEventListener('keydown', handleKeyboard);
    return () => {
      window.removeEventListener('keydown', handleKeyboard);
    };
  }, []);

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
    isConnected
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};