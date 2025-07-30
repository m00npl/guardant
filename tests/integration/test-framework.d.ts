/**
 * Integration Test Framework for GuardAnt
 * Provides utilities for testing service interactions
 */
import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from 'bun:test';
import type { Server } from 'bun';
export interface TestContext {
    servers: Map<string, Server>;
    databases: TestDatabase;
    redis: TestRedis;
    rabbitmq: TestRabbitMQ;
    apiClients: TestApiClients;
    testNest: TestNest;
    cleanup: () => Promise<void>;
}
export interface TestDatabase {
    client: any;
    migrate: () => Promise<void>;
    seed: (data: any) => Promise<void>;
    clean: () => Promise<void>;
    close: () => Promise<void>;
}
export interface TestRedis {
    client: any;
    flushAll: () => Promise<void>;
    close: () => Promise<void>;
}
export interface TestRabbitMQ {
    connection: any;
    channel: any;
    purgeQueues: () => Promise<void>;
    close: () => Promise<void>;
}
export interface TestApiClients {
    admin: TestApiClient;
    public: TestApiClient;
}
export interface TestApiClient {
    baseUrl: string;
    authToken?: string;
    get: (path: string, options?: RequestInit) => Promise<Response>;
    post: (path: string, body: any, options?: RequestInit) => Promise<Response>;
    put: (path: string, body: any, options?: RequestInit) => Promise<Response>;
    delete: (path: string, options?: RequestInit) => Promise<Response>;
    setAuth: (token: string) => void;
}
export interface TestNest {
    id: string;
    subdomain: string;
    email: string;
    authToken: string;
    services: TestService[];
}
export interface TestService {
    id: string;
    name: string;
    url: string;
    type: string;
}
export declare const TestDataGenerator: {
    nest: (overrides?: Partial<TestNest>) => {
        id?: string | undefined;
        subdomain: string;
        email: string;
        authToken?: string | undefined;
        services?: TestService[] | undefined;
        password: string;
        subscriptionTier: string;
    };
    service: (nestId: string, overrides?: Partial<TestService>) => {
        id?: string | undefined;
        name: string;
        url: string;
        type: string;
        nestId: string;
        checkInterval: number;
        timeout: number;
        enabled: boolean;
    };
    user: (nestId: string, overrides?: any) => any;
};
export declare class TestApiClient implements TestApiClient {
    baseUrl: string;
    authToken?: string | undefined;
    constructor(baseUrl: string, authToken?: string | undefined);
    private request;
    get(path: string, options?: RequestInit): Promise<Response>;
    post(path: string, body: any, options?: RequestInit): Promise<Response>;
    put(path: string, body: any, options?: RequestInit): Promise<Response>;
    delete(path: string, options?: RequestInit): Promise<Response>;
    setAuth(token: string): void;
}
export declare function setupTestContext(): Promise<TestContext>;
export declare const TestAssertions: {
    assertStatusOk(response: Response): Promise<void>;
    assertJsonResponse(response: Response): Promise<any>;
    assertNestIsolation(data1: any, data2: any, nestId1: string, nestId2: string): void;
    assertEventuallyTrue(condition: () => Promise<boolean>, timeout?: number, interval?: number): Promise<void>;
};
export declare function integrationTest(name: string, fn: (context: TestContext) => Promise<void>): void;
export { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach };
//# sourceMappingURL=test-framework.d.ts.map