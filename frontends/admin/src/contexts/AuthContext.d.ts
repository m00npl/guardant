import React, { ReactNode } from 'react';
interface User {
    id: string;
    email: string;
    subdomain: string;
    name: string;
    role?: 'platform_admin' | 'owner' | 'admin' | 'editor' | 'viewer';
    subscription: {
        tier: 'free' | 'pro' | 'unlimited';
        servicesLimit: number;
        validUntil: number;
    };
}
interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string, name: string, subdomain: string) => Promise<void>;
    logout: () => Promise<void>;
    refreshToken: () => Promise<void>;
}
export declare const AuthProvider: React.FC<{
    children: ReactNode;
}>;
export declare const useAuth: () => AuthContextType;
export {};
//# sourceMappingURL=AuthContext.d.ts.map