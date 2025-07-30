import type { Nest, Service, AggregatedMetrics, Incident, BillingRecord, AuditLog } from '/app/packages/shared-types/src/index';
interface StoredData {
    timestamp: number;
    data: any;
    entityKey?: string;
}
interface GolemConfig {
    chainId: number;
    httpUrl: string;
    wsUrl: string;
    privateKeyPath?: string;
}
declare class GolemL3StorageClient {
    private client;
    private logger;
    private isConnected;
    private config;
    private memoryStore;
    constructor(config?: Partial<GolemConfig>);
    initialize(): Promise<void>;
    private setupPrivateKey;
    store(key: string, value: any): Promise<void>;
    retrieve(key: string): Promise<any | null>;
    delete(key: string): Promise<void>;
    list(prefix?: string): Promise<string[]>;
    disconnect(): Promise<void>;
    createNest(nest: Nest): Promise<void>;
    getNest(nestId: string): Promise<Nest | null>;
    updateNest(nest: Nest): Promise<void>;
    deleteNest(nestId: string): Promise<void>;
    createService(service: Service): Promise<void>;
    getService(serviceId: string): Promise<Service | null>;
    updateService(service: Service): Promise<void>;
    deleteService(serviceId: string): Promise<void>;
    getServicesByNest(nestId: string): Promise<Service[]>;
    storeMetrics(serviceId: string, metrics: AggregatedMetrics): Promise<void>;
    getMetrics(serviceId: string, from: number, to: number): Promise<AggregatedMetrics[]>;
    createIncident(incident: Incident): Promise<void>;
    getIncident(incidentId: string): Promise<Incident | null>;
    updateIncident(incident: Incident): Promise<void>;
    getIncidentsByService(serviceId: string): Promise<Incident[]>;
    createBillingRecord(record: BillingRecord): Promise<void>;
    getBillingRecords(nestId: string, from: number, to: number): Promise<BillingRecord[]>;
    createAuditLog(log: AuditLog): Promise<void>;
    getAuditLogs(nestId: string, from: number, to: number): Promise<AuditLog[]>;
}
declare const golemL3Storage: GolemL3StorageClient;
export { golemL3Storage as golemStorage, GolemL3StorageClient };
export type { GolemConfig };
export type { StoredData };
//# sourceMappingURL=index.d.ts.map