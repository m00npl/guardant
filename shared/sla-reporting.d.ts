/**
 * GuardAnt SLA (Service Level Agreement) Reporting System
 * Comprehensive SLA tracking, compliance monitoring, and automated reporting
 * for multi-tenant monitoring platform
 */
import { EventEmitter } from 'events';
import { GuardAntTracing } from './tracing';
import { GolemAdapter } from './golem-adapter';
export interface SLATarget {
    id: string;
    nestId: string;
    serviceId?: string;
    name: string;
    description: string;
    uptime: {
        target: number;
        measurement: 'monthly' | 'quarterly' | 'yearly';
        excludeScheduledMaintenance: boolean;
    };
    responseTime: {
        target: number;
        percentile: number;
        measurement: 'monthly' | 'quarterly' | 'yearly';
    };
    errorRate: {
        target: number;
        measurement: 'monthly' | 'quarterly' | 'yearly';
    };
    availability: {
        target: number;
        measurement: 'monthly' | 'quarterly' | 'yearly';
    };
    penalties: Array<{
        metric: 'uptime' | 'responseTime' | 'errorRate' | 'availability';
        threshold: number;
        penalty: {
            type: 'percentage' | 'fixed' | 'credit';
            value: number;
            description: string;
        };
    }>;
    credits: Array<{
        condition: string;
        creditAmount: number;
        maxCreditsPerPeriod: number;
    }>;
    reportingFrequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
    stakeholders: string[];
    createdAt: string;
    updatedAt: string;
    active: boolean;
    version: string;
}
export interface SLAMeasurement {
    id: string;
    slaTargetId: string;
    nestId: string;
    serviceId?: string;
    period: {
        start: string;
        end: string;
        type: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
    };
    uptime: {
        actual: number;
        target: number;
        compliant: boolean;
        totalDowntime: number;
        scheduledDowntime: number;
        unplannedDowntime: number;
    };
    responseTime: {
        actual: number;
        target: number;
        compliant: boolean;
        percentile: number;
        distribution: {
            p50: number;
            p90: number;
            p95: number;
            p99: number;
            p99_9: number;
        };
    };
    errorRate: {
        actual: number;
        target: number;
        compliant: boolean;
        totalRequests: number;
        errorRequests: number;
    };
    availability: {
        actual: number;
        target: number;
        compliant: boolean;
        totalChecks: number;
        successfulChecks: number;
    };
    overallCompliance: boolean;
    complianceScore: number;
    penaltiesApplied: Array<{
        metric: string;
        penaltyType: string;
        amount: number;
        description: string;
    }>;
    creditsEarned: Array<{
        condition: string;
        amount: number;
        description: string;
    }>;
    calculatedAt: string;
    dataQuality: {
        completeness: number;
        gaps: Array<{
            start: string;
            end: string;
            reason: string;
        }>;
    };
}
export interface SLAReport {
    id: string;
    nestId: string;
    reportType: 'summary' | 'detailed' | 'compliance' | 'trend';
    period: {
        start: string;
        end: string;
        type: string;
    };
    summary: {
        overallCompliance: boolean;
        complianceScore: number;
        totalPenalties: number;
        totalCredits: number;
        keyInsights: string[];
        recommendations: string[];
    };
    slaPerformance: Array<{
        slaTargetId: string;
        slaName: string;
        compliant: boolean;
        metrics: {
            uptime: {
                actual: number;
                target: number;
                status: 'met' | 'missed' | 'at-risk';
            };
            responseTime: {
                actual: number;
                target: number;
                status: 'met' | 'missed' | 'at-risk';
            };
            errorRate: {
                actual: number;
                target: number;
                status: 'met' | 'missed' | 'at-risk';
            };
            availability: {
                actual: number;
                target: number;
                status: 'met' | 'missed' | 'at-risk';
            };
        };
    }>;
    trends: Array<{
        metric: string;
        direction: 'improving' | 'stable' | 'degrading';
        changePercent: number;
        significance: 'high' | 'medium' | 'low';
    }>;
    incidents: Array<{
        id: string;
        startTime: string;
        duration: number;
        impact: string;
        slaImpact: {
            uptimeImpact: number;
            responseTimeImpact: number;
            servicesAffected: string[];
        };
    }>;
    serviceBreakdown: Array<{
        serviceId: string;
        serviceName: string;
        uptime: number;
        avgResponseTime: number;
        errorRate: number;
        slaCompliance: boolean;
    }>;
    files: Array<{
        type: 'pdf' | 'csv' | 'json' | 'excel';
        url: string;
        generatedAt: string;
    }>;
    generatedAt: string;
    generatedBy: string;
}
export interface SLAConfiguration {
    enabled: boolean;
    defaultTargets: {
        uptime: number;
        responseTime: number;
        errorRate: number;
        availability: number;
    };
    calculationFrequency: number;
    dataRetentionDays: number;
    excludeMaintenanceWindows: boolean;
    automaticReporting: boolean;
    reportFormats: Array<'pdf' | 'csv' | 'json' | 'excel'>;
    emailNotifications: boolean;
    slackIntegration: boolean;
    currency: string;
    timezone: string;
    businessHours: {
        start: string;
        end: string;
        days: number[];
    };
    alertThresholds: {
        atRisk: number;
        breachWarning: number;
    };
}
export declare class SLAReportingManager extends EventEmitter {
    private serviceName;
    private config;
    private logger;
    private tracing?;
    private calculationTimer?;
    private reportingTimer?;
    private slaTargets;
    private measurements;
    private golemAdapter;
    constructor(serviceName: string, config: SLAConfiguration, golemAdapter?: GolemAdapter, tracing?: GuardAntTracing);
    createSLATarget(target: Omit<SLATarget, 'id' | 'createdAt' | 'updatedAt' | 'version'>): Promise<SLATarget>;
    calculateSLAMeasurement(slaTargetId: string, startDate: Date, endDate: Date): Promise<SLAMeasurement>;
    generateSLAReport(nestId: string, reportType: SLAReport['reportType'], startDate: Date, endDate: Date, formats?: Array<'pdf' | 'csv' | 'json' | 'excel'>): Promise<SLAReport>;
    getSLAComplianceStatus(nestId: string): Promise<any>;
    private validateSLATarget;
    private gatherMonitoringData;
    private calculateUptime;
    private calculateResponseTime;
    private calculateErrorRate;
    private calculateAvailability;
    private calculateComplianceScore;
    private calculatePenalties;
    private calculateCredits;
    private calculateReportSummary;
    private calculateSLAPerformance;
    private calculateTrends;
    private getIncidentsForPeriod;
    private calculateServiceBreakdown;
    private generateReportFile;
    private sendReportNotifications;
    private getLatestMeasurement;
    private determinePeriodType;
    private generateSLAId;
    private generateMeasurementId;
    private generateReportId;
    private startCalculationTimer;
    private startReportingTimer;
    private performScheduledCalculations;
    private performScheduledReporting;
    private setupEventListeners;
    shutdown(): Promise<void>;
    getHealthStatus(): {
        healthy: boolean;
        details: any;
    };
}
export declare function createSLAReportingManager(serviceName: string, config: SLAConfiguration, golemAdapter?: GolemAdapter, tracing?: GuardAntTracing): SLAReportingManager;
//# sourceMappingURL=sla-reporting.d.ts.map