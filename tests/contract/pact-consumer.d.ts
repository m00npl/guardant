/**
 * Contract testing setup using Pact for service-to-service communication
 * This ensures API compatibility between services in GuardAnt
 */
import { Pact, Interaction } from '@pact-foundation/pact';
export declare class GuardAntPactSetup {
    private testOutputDir;
    private pacts;
    constructor(testOutputDir?: string);
    private setupServicePairs;
    getPact(servicePair: string): Pact;
    setupAll(): Promise<void>;
    teardownAll(): Promise<void>;
}
export declare class GuardAntInteractions {
    static statusDataSync(): Interaction;
    static serviceConfigUpdate(): Interaction;
    static statusReport(): Interaction;
    static realtimeStatusRequest(): Interaction;
    static externalHealthCheck(): Interaction;
    static incidentSync(): Interaction;
}
//# sourceMappingURL=pact-consumer.d.ts.map