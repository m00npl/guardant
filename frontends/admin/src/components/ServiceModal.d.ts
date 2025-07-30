import React from 'react';
interface Service {
    id?: string;
    name: string;
    type: 'web' | 'tcp' | 'ping' | 'github' | 'uptime-api' | 'keyword' | 'heartbeat' | 'port';
    target: string;
    interval: number;
    isActive: boolean;
}
interface ServiceModalProps {
    service: Service | null;
    onClose: () => void;
}
export declare const ServiceModal: React.FC<ServiceModalProps>;
export {};
//# sourceMappingURL=ServiceModal.d.ts.map