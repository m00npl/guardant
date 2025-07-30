import React from 'react';
export interface User {
    id: string;
    email: string;
    name: string;
    role: 'admin' | 'super_admin';
    avatar?: string;
    permissions: string[];
    lastLogin: string;
    createdAt: string;
}
export interface AuthState {
    user: User | null;
    loading: boolean;
    error: string | null;
}
export interface AuthContextType extends AuthState {
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
    refreshUser: () => Promise<void>;
}
export declare const useAuth: () => AuthContextType;
interface AuthProviderProps {
    children: React.ReactNode;
}
export declare const AuthProvider: React.FC<AuthProviderProps>;
export {};
//# sourceMappingURL=AuthContext.d.ts.map