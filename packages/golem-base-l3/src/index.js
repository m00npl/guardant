"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.GolemL3StorageClient = exports.golemStorage = void 0;
const fs = __importStar(require("fs"));
const tslog_1 = require("tslog");
const golem_base_sdk_1 = require("golem-base-sdk");
// Golem Base L3 Storage Adapter
class GolemL3StorageClient {
    constructor(config) {
        this.isConnected = false;
        this.memoryStore = new Map(); // Fallback storage
        const xdg = require("xdg-portable");
        this.config = {
            chainId: parseInt(process.env.GOLEM_CHAIN_ID || "600606", 10), // Kaolin Network ID
            httpUrl: process.env.GOLEM_HTTP_URL || "https://kaolin.holesky.golem-base.io/rpc",
            wsUrl: process.env.GOLEM_WS_URL || "wss://kaolin.holesky.golem-base.io/rpc/ws",
            privateKeyPath: xdg.config() + "/golembase/private.key",
            ...config,
        };
        this.logger = new tslog_1.Logger({
            type: "pretty",
            minLevel: 3,
        });
    }
    async initialize() {
        try {
            console.log("🔄 Initializing Golem Base L3 storage...");
            // Setup private key
            this.setupPrivateKey();
            // Check if private key exists for full functionality
            if (fs.existsSync(this.config.privateKeyPath)) {
                const keyBytes = fs.readFileSync(this.config.privateKeyPath);
                const key = new golem_base_sdk_1.Tagged("privatekey", new Uint8Array(keyBytes));
                this.client = await (0, golem_base_sdk_1.createClient)(this.config.chainId, key, this.config.httpUrl, this.config.wsUrl, this.logger);
                this.isConnected = true;
                console.log("✅ Golem Base L3 storage initialized successfully");
            }
            else {
                console.warn("⚠️ Private key not found. Using memory fallback.");
                this.isConnected = false;
            }
        }
        catch (error) {
            console.warn("⚠️ Failed to initialize Golem L3, using memory fallback:", error);
            this.isConnected = false;
        }
    }
    setupPrivateKey() {
        try {
            const keyPath = this.config.privateKeyPath;
            const path = require("path");
            const keyDir = path.dirname(keyPath);
            // Create directory if it doesn't exist
            if (!fs.existsSync(keyDir)) {
                fs.mkdirSync(keyDir, { recursive: true });
                console.log(`📁 Created Golem Base config directory: ${keyDir}`);
            }
            // Create private key file if it doesn't exist
            if (!fs.existsSync(keyPath)) {
                // Use private key from environment variable
                const privateKey = process.env.GOLEM_PRIVATE_KEY;
                if (!privateKey) {
                    console.warn("⚠️ GOLEM_PRIVATE_KEY environment variable not set");
                    return;
                }
                const keyBuffer = Buffer.from(privateKey, "hex");
                fs.writeFileSync(keyPath, keyBuffer);
                console.log(`🔑 Created private key file: ${keyPath}`);
                const walletAddress = process.env.GOLEM_WALLET_ADDRESS || "0x897c8acf91a4aa5f3a323da58b34f0f71508248d";
                console.log(`💰 Wallet address: ${walletAddress}`);
            }
        }
        catch (error) {
            console.error("❌ Failed to setup private key:", error);
        }
    }
    async store(key, value) {
        if (!this.isConnected || !this.client) {
            // Fallback to memory storage
            this.memoryStore.set(key, JSON.stringify(value));
            return;
        }
        // Store to Golem L3
        try {
            const data = {
                timestamp: Date.now(),
                data: value,
                entityKey: key,
            };
            // Use Golem Base SDK to store data
            await this.client.putData(key, JSON.stringify(data));
            console.log(`📦 Stored ${key} on Golem L3`);
        }
        catch (error) {
            console.warn(`⚠️ Failed to store ${key} on Golem L3:`, error);
            // Fallback to memory
            this.memoryStore.set(key, JSON.stringify(value));
        }
    }
    async retrieve(key) {
        if (!this.isConnected || !this.client) {
            // Fallback to memory storage
            const data = this.memoryStore.get(key);
            return data ? JSON.parse(data) : null;
        }
        try {
            // Retrieve from Golem L3
            const rawData = await this.client.getData(key);
            if (!rawData) {
                // Try memory fallback
                const memData = this.memoryStore.get(key);
                return memData ? JSON.parse(memData) : null;
            }
            const storedData = JSON.parse(rawData);
            return storedData.data;
        }
        catch (error) {
            console.warn(`⚠️ Failed to retrieve ${key} from Golem L3:`, error);
            // Fallback to memory
            const data = this.memoryStore.get(key);
            return data ? JSON.parse(data) : null;
        }
    }
    async delete(key) {
        if (!this.isConnected || !this.client) {
            this.memoryStore.delete(key);
            return;
        }
        try {
            await this.client.deleteData(key);
            console.log(`🗑️ Deleted ${key} from Golem L3`);
        }
        catch (error) {
            console.warn(`⚠️ Failed to delete ${key} from Golem L3:`, error);
        }
        // Also remove from memory fallback
        this.memoryStore.delete(key);
    }
    async list(prefix = '') {
        if (!this.isConnected || !this.client) {
            const keys = Array.from(this.memoryStore.keys());
            return prefix ? keys.filter(key => key.startsWith(prefix)) : keys;
        }
        try {
            // List from Golem L3
            const keys = await this.client.listKeys(prefix);
            return keys || [];
        }
        catch (error) {
            console.warn(`⚠️ Failed to list keys from Golem L3:`, error);
            // Fallback to memory
            const keys = Array.from(this.memoryStore.keys());
            return prefix ? keys.filter(key => key.startsWith(prefix)) : keys;
        }
    }
    async disconnect() {
        if (this.client) {
            try {
                await this.client.disconnect();
            }
            catch (error) {
                console.warn("⚠️ Error disconnecting from Golem L3:", error);
            }
        }
        this.memoryStore.clear();
        this.isConnected = false;
        console.log('📦 Golem L3 storage disconnected');
    }
    // Nest operations
    async createNest(nest) {
        await this.store(`nest:${nest.id}`, nest);
        console.log(`📦 Nest ${nest.id} stored`);
    }
    async getNest(nestId) {
        return await this.retrieve(`nest:${nestId}`);
    }
    async updateNest(nest) {
        await this.store(`nest:${nest.id}`, nest);
    }
    async deleteNest(nestId) {
        await this.delete(`nest:${nestId}`);
    }
    // Service operations
    async createService(service) {
        await this.store(`service:${service.id}`, service);
        console.log(`📦 Service ${service.id} stored`);
    }
    async getService(serviceId) {
        return await this.retrieve(`service:${serviceId}`);
    }
    async updateService(service) {
        await this.store(`service:${service.id}`, service);
    }
    async deleteService(serviceId) {
        await this.delete(`service:${serviceId}`);
    }
    async getServicesByNest(nestId) {
        const keys = await this.list('service:');
        const services = [];
        for (const key of keys) {
            const service = await this.retrieve(key);
            if (service && service.nestId === nestId) {
                services.push(service);
            }
        }
        return services;
    }
    // Metrics operations
    async storeMetrics(serviceId, metrics) {
        await this.store(`metrics:${serviceId}:${Date.now()}`, metrics);
    }
    async getMetrics(serviceId, from, to) {
        const keys = await this.list(`metrics:${serviceId}:`);
        const metrics = [];
        for (const key of keys) {
            const timestamp = parseInt(key.split(':')[2]);
            if (timestamp >= from && timestamp <= to) {
                const metric = await this.retrieve(key);
                if (metric)
                    metrics.push(metric);
            }
        }
        return metrics.sort((a, b) => a.timestamp - b.timestamp);
    }
    // Incident operations
    async createIncident(incident) {
        await this.store(`incident:${incident.id}`, incident);
    }
    async getIncident(incidentId) {
        return await this.retrieve(`incident:${incidentId}`);
    }
    async updateIncident(incident) {
        await this.store(`incident:${incident.id}`, incident);
    }
    async getIncidentsByService(serviceId) {
        const keys = await this.list('incident:');
        const incidents = [];
        for (const key of keys) {
            const incident = await this.retrieve(key);
            if (incident && incident.serviceId === serviceId) {
                incidents.push(incident);
            }
        }
        return incidents.sort((a, b) => b.startedAt - a.startedAt);
    }
    // Billing operations
    async createBillingRecord(record) {
        await this.store(`billing:${record.id}`, record);
    }
    async getBillingRecords(nestId, from, to) {
        const keys = await this.list('billing:');
        const records = [];
        for (const key of keys) {
            const record = await this.retrieve(key);
            if (record && record.nestId === nestId && record.createdAt >= from && record.createdAt <= to) {
                records.push(record);
            }
        }
        return records.sort((a, b) => b.createdAt - a.createdAt);
    }
    // Audit log operations
    async createAuditLog(log) {
        await this.store(`audit:${log.id}`, log);
    }
    async getAuditLogs(nestId, from, to) {
        const keys = await this.list('audit:');
        const logs = [];
        for (const key of keys) {
            const log = await this.retrieve(key);
            if (log && log.nestId === nestId && log.timestamp >= from && log.timestamp <= to) {
                logs.push(log);
            }
        }
        return logs.sort((a, b) => b.timestamp - a.timestamp);
    }
}
exports.GolemL3StorageClient = GolemL3StorageClient;
// Create and export singleton instance
const golemL3Storage = new GolemL3StorageClient();
exports.golemStorage = golemL3Storage;
//# sourceMappingURL=index.js.map