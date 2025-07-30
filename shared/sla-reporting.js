"use strict";
/**
 * GuardAnt SLA (Service Level Agreement) Reporting System
 * Comprehensive SLA tracking, compliance monitoring, and automated reporting
 * for multi-tenant monitoring platform
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SLAReportingManager = void 0;
exports.createSLAReportingManager = createSLAReportingManager;
const events_1 = require("events");
const logger_1 = require("./logger");
const golem_adapter_1 = require("./golem-adapter");
class SLAReportingManager extends events_1.EventEmitter {
    constructor(serviceName, config, golemAdapter, tracing) {
        super();
        this.serviceName = serviceName;
        this.config = config;
        this.slaTargets = new Map();
        this.measurements = new Map();
        this.logger = (0, logger_1.createLogger)(`${serviceName}-sla-reporting`);
        this.tracing = tracing;
        // Initialize Golem adapter
        this.golemAdapter = golemAdapter || (0, golem_adapter_1.createGolemAdapter)(serviceName, golem_adapter_1.GolemUtils.createDefaultConfig(), undefined, tracing);
        if (config.enabled) {
            this.startCalculationTimer();
            this.startReportingTimer();
            this.setupEventListeners();
        }
    }
    // Create or update SLA target
    async createSLATarget(target) {
        const span = this.tracing?.startSpan('sla.create_target');
        try {
            const slaTarget = {
                ...target,
                id: this.generateSLAId(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                version: '1.0.0'
            };
            // Validate SLA target
            this.validateSLATarget(slaTarget);
            // Store SLA target in Golem Base
            await this.golemAdapter.storeNestData(slaTarget.nestId, golem_adapter_1.DataType.SLA_DATA, slaTarget, {
                key: `sla-target:${slaTarget.id}`,
                type: 'sla-target',
                version: slaTarget.version
            });
            // Store in local cache
            this.slaTargets.set(slaTarget.id, slaTarget);
            // Initialize measurements storage
            this.measurements.set(slaTarget.id, []);
            this.logger.info('Created SLA target in Golem Base', {
                slaId: slaTarget.id,
                nestId: slaTarget.nestId,
                name: slaTarget.name
            });
            this.emit('sla-target-created', slaTarget);
            span?.setTag('sla.id', slaTarget.id);
            span?.setTag('sla.name', slaTarget.name);
            return slaTarget;
        }
        catch (error) {
            this.logger.error('Failed to create SLA target', { error, target });
            span?.setTag('error', true);
            throw error;
        }
        finally {
            span?.finish();
        }
    }
    // Calculate SLA measurements for a period
    async calculateSLAMeasurement(slaTargetId, startDate, endDate) {
        const span = this.tracing?.startSpan('sla.calculate_measurement');
        try {
            const slaTarget = this.slaTargets.get(slaTargetId);
            if (!slaTarget) {
                throw new Error(`SLA target not found: ${slaTargetId}`);
            }
            // Gather monitoring data for the period
            const monitoringData = await this.gatherMonitoringData(slaTarget.nestId, slaTarget.serviceId, startDate, endDate);
            // Calculate uptime
            const uptimeCalculation = this.calculateUptime(monitoringData, slaTarget, startDate, endDate);
            // Calculate response time
            const responseTimeCalculation = this.calculateResponseTime(monitoringData, slaTarget);
            // Calculate error rate
            const errorRateCalculation = this.calculateErrorRate(monitoringData, slaTarget);
            // Calculate availability
            const availabilityCalculation = this.calculateAvailability(monitoringData, slaTarget);
            // Determine overall compliance
            const overallCompliance = uptimeCalculation.compliant &&
                responseTimeCalculation.compliant &&
                errorRateCalculation.compliant &&
                availabilityCalculation.compliant;
            // Calculate compliance score
            const complianceScore = this.calculateComplianceScore([
                uptimeCalculation,
                responseTimeCalculation,
                errorRateCalculation,
                availabilityCalculation
            ]);
            // Calculate penalties and credits
            const penaltiesApplied = this.calculatePenalties(slaTarget, {
                uptime: uptimeCalculation,
                responseTime: responseTimeCalculation,
                errorRate: errorRateCalculation,
                availability: availabilityCalculation
            });
            const creditsEarned = this.calculateCredits(slaTarget, {
                uptime: uptimeCalculation,
                responseTime: responseTimeCalculation,
                errorRate: errorRateCalculation,
                availability: availabilityCalculation
            });
            // Create measurement record
            const measurement = {
                id: this.generateMeasurementId(),
                slaTargetId,
                nestId: slaTarget.nestId,
                serviceId: slaTarget.serviceId,
                period: {
                    start: startDate.toISOString(),
                    end: endDate.toISOString(),
                    type: this.determinePeriodType(startDate, endDate)
                },
                uptime: uptimeCalculation,
                responseTime: responseTimeCalculation,
                errorRate: errorRateCalculation,
                availability: availabilityCalculation,
                overallCompliance,
                complianceScore,
                penaltiesApplied,
                creditsEarned,
                calculatedAt: new Date().toISOString(),
                dataQuality: {
                    completeness: monitoringData.completeness,
                    gaps: monitoringData.gaps
                }
            };
            // Store measurement
            const measurements = this.measurements.get(slaTargetId) || [];
            measurements.push(measurement);
            this.measurements.set(slaTargetId, measurements);
            this.logger.info('Calculated SLA measurement', {
                slaId: slaTargetId,
                measurementId: measurement.id,
                compliant: overallCompliance,
                score: complianceScore
            });
            this.emit('sla-measurement-calculated', measurement);
            return measurement;
        }
        catch (error) {
            this.logger.error('Failed to calculate SLA measurement', { error, slaTargetId });
            span?.setTag('error', true);
            throw error;
        }
        finally {
            span?.finish();
        }
    }
    // Generate SLA report
    async generateSLAReport(nestId, reportType, startDate, endDate, formats = ['json']) {
        const span = this.tracing?.startSpan('sla.generate_report');
        try {
            // Get all SLA targets for nest
            const nestSLATargets = Array.from(this.slaTargets.values())
                .filter(target => target.nestId === nestId && target.active);
            if (nestSLATargets.length === 0) {
                throw new Error(`No active SLA targets found for nest: ${nestId}`);
            }
            // Gather measurements for the period
            const allMeasurements = [];
            for (const target of nestSLATargets) {
                const measurements = this.measurements.get(target.id) || [];
                const periodMeasurements = measurements.filter(m => new Date(m.period.start) >= startDate &&
                    new Date(m.period.end) <= endDate);
                allMeasurements.push(...periodMeasurements);
            }
            // Calculate summary metrics
            const summary = this.calculateReportSummary(allMeasurements);
            // Calculate SLA performance
            const slaPerformance = this.calculateSLAPerformance(nestSLATargets, allMeasurements);
            // Calculate trends
            const trends = this.calculateTrends(allMeasurements, startDate, endDate);
            // Get incidents for the period
            const incidents = await this.getIncidentsForPeriod(nestId, startDate, endDate);
            // Calculate service breakdown
            const serviceBreakdown = this.calculateServiceBreakdown(allMeasurements);
            // Generate report
            const report = {
                id: this.generateReportId(),
                nestId,
                reportType,
                period: {
                    start: startDate.toISOString(),
                    end: endDate.toISOString(),
                    type: this.determinePeriodType(startDate, endDate)
                },
                summary,
                slaPerformance,
                trends,
                incidents,
                serviceBreakdown,
                files: [],
                generatedAt: new Date().toISOString(),
                generatedBy: this.serviceName
            };
            // Generate report files
            for (const format of formats) {
                const fileUrl = await this.generateReportFile(report, format);
                report.files.push({
                    type: format,
                    url: fileUrl,
                    generatedAt: new Date().toISOString()
                });
            }
            this.logger.info('Generated SLA report', {
                reportId: report.id,
                nestId,
                type: reportType,
                formats: formats.join(',')
            });
            this.emit('sla-report-generated', report);
            // Send notifications if configured
            if (this.config.emailNotifications) {
                await this.sendReportNotifications(report);
            }
            return report;
        }
        catch (error) {
            this.logger.error('Failed to generate SLA report', { error, nestId, reportType });
            span?.setTag('error', true);
            throw error;
        }
        finally {
            span?.finish();
        }
    }
    // Get SLA compliance status
    async getSLAComplianceStatus(nestId) {
        const nestSLATargets = Array.from(this.slaTargets.values())
            .filter(target => target.nestId === nestId && target.active);
        const status = {
            overall: true,
            targets: [],
            summary: {
                total: nestSLATargets.length,
                compliant: 0,
                atRisk: 0,
                breached: 0
            }
        };
        for (const target of nestSLATargets) {
            const latestMeasurement = this.getLatestMeasurement(target.id);
            if (latestMeasurement) {
                const targetStatus = {
                    id: target.id,
                    name: target.name,
                    compliant: latestMeasurement.overallCompliance,
                    score: latestMeasurement.complianceScore,
                    uptime: latestMeasurement.uptime,
                    responseTime: latestMeasurement.responseTime,
                    errorRate: latestMeasurement.errorRate,
                    availability: latestMeasurement.availability
                };
                status.targets.push(targetStatus);
                if (latestMeasurement.overallCompliance) {
                    status.summary.compliant++;
                }
                else {
                    status.summary.breached++;
                    status.overall = false;
                }
            }
        }
        return status;
    }
    // Private helper methods
    validateSLATarget(target) {
        if (!target.nestId)
            throw new Error('nestId is required');
        if (!target.name)
            throw new Error('name is required');
        if (target.uptime.target < 0 || target.uptime.target > 100) {
            throw new Error('uptime target must be between 0 and 100');
        }
        if (target.responseTime.target < 0) {
            throw new Error('responseTime target must be positive');
        }
        if (target.errorRate.target < 0 || target.errorRate.target > 100) {
            throw new Error('errorRate target must be between 0 and 100');
        }
    }
    async gatherMonitoringData(nestId, serviceId, startDate, endDate) {
        // This would gather actual monitoring data from your monitoring system
        // For now, return mock data structure
        return {
            uptime: [],
            responseTime: [],
            errors: [],
            availability: [],
            completeness: 95.5,
            gaps: []
        };
    }
    calculateUptime(data, target, startDate, endDate) {
        // Mock calculation - implement based on your monitoring data
        const actual = 99.95;
        return {
            actual,
            target: target.uptime.target,
            compliant: actual >= target.uptime.target,
            totalDowntime: 0,
            scheduledDowntime: 0,
            unplannedDowntime: 0
        };
    }
    calculateResponseTime(data, target) {
        // Mock calculation
        const actual = 125;
        return {
            actual,
            target: target.responseTime.target,
            compliant: actual <= target.responseTime.target,
            percentile: target.responseTime.percentile,
            distribution: {
                p50: 85,
                p90: 150,
                p95: 200,
                p99: 350,
                p99_9: 500
            }
        };
    }
    calculateErrorRate(data, target) {
        // Mock calculation
        const actual = 0.05;
        return {
            actual,
            target: target.errorRate.target,
            compliant: actual <= target.errorRate.target,
            totalRequests: 10000,
            errorRequests: 5
        };
    }
    calculateAvailability(data, target) {
        // Mock calculation
        const actual = 99.98;
        return {
            actual,
            target: target.availability.target,
            compliant: actual >= target.availability.target,
            totalChecks: 1440,
            successfulChecks: 1439
        };
    }
    calculateComplianceScore(metrics) {
        const scores = metrics.map(metric => metric.compliant ? 100 : 0);
        return scores.reduce((sum, score) => sum + score, 0) / scores.length;
    }
    calculatePenalties(target, metrics) {
        // Implementation would check target.penalties against actual metrics
        return [];
    }
    calculateCredits(target, metrics) {
        // Implementation would check target.credits against actual metrics
        return [];
    }
    calculateReportSummary(measurements) {
        if (measurements.length === 0) {
            return {
                overallCompliance: true,
                complianceScore: 100,
                totalPenalties: 0,
                totalCredits: 0,
                keyInsights: [],
                recommendations: []
            };
        }
        const compliantCount = measurements.filter(m => m.overallCompliance).length;
        const avgScore = measurements.reduce((sum, m) => sum + m.complianceScore, 0) / measurements.length;
        return {
            overallCompliance: compliantCount === measurements.length,
            complianceScore: avgScore,
            totalPenalties: 0,
            totalCredits: 0,
            keyInsights: ['All SLA targets met during the reporting period'],
            recommendations: ['Continue current monitoring practices']
        };
    }
    calculateSLAPerformance(targets, measurements) {
        return targets.map(target => {
            const targetMeasurements = measurements.filter(m => m.slaTargetId === target.id);
            const latestMeasurement = targetMeasurements[targetMeasurements.length - 1];
            if (latestMeasurement) {
                return {
                    slaTargetId: target.id,
                    slaName: target.name,
                    compliant: latestMeasurement.overallCompliance,
                    metrics: {
                        uptime: {
                            actual: latestMeasurement.uptime.actual,
                            target: latestMeasurement.uptime.target,
                            status: latestMeasurement.uptime.compliant ? 'met' : 'missed'
                        },
                        responseTime: {
                            actual: latestMeasurement.responseTime.actual,
                            target: latestMeasurement.responseTime.target,
                            status: latestMeasurement.responseTime.compliant ? 'met' : 'missed'
                        },
                        errorRate: {
                            actual: latestMeasurement.errorRate.actual,
                            target: latestMeasurement.errorRate.target,
                            status: latestMeasurement.errorRate.compliant ? 'met' : 'missed'
                        },
                        availability: {
                            actual: latestMeasurement.availability.actual,
                            target: latestMeasurement.availability.target,
                            status: latestMeasurement.availability.compliant ? 'met' : 'missed'
                        }
                    }
                };
            }
            return {
                slaTargetId: target.id,
                slaName: target.name,
                compliant: false,
                metrics: {}
            };
        });
    }
    calculateTrends(measurements, startDate, endDate) {
        // Implementation would analyze trends over time
        return [
            {
                metric: 'uptime',
                direction: 'stable',
                changePercent: 0.1,
                significance: 'low'
            }
        ];
    }
    async getIncidentsForPeriod(nestId, startDate, endDate) {
        // Implementation would fetch incidents from incident management system
        return [];
    }
    calculateServiceBreakdown(measurements) {
        // Implementation would break down performance by service
        return [];
    }
    async generateReportFile(report, format) {
        // Implementation would generate actual report files
        return `/reports/${report.id}.${format}`;
    }
    async sendReportNotifications(report) {
        // Implementation would send email notifications
        this.logger.info('Sending report notifications', { reportId: report.id });
    }
    getLatestMeasurement(slaTargetId) {
        const measurements = this.measurements.get(slaTargetId) || [];
        return measurements.length > 0 ? measurements[measurements.length - 1] : null;
    }
    determinePeriodType(startDate, endDate) {
        const diffMs = endDate.getTime() - startDate.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        if (diffDays <= 1)
            return 'daily';
        if (diffDays <= 7)
            return 'weekly';
        if (diffDays <= 31)
            return 'monthly';
        if (diffDays <= 93)
            return 'quarterly';
        return 'yearly';
    }
    generateSLAId() {
        return `sla_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    generateMeasurementId() {
        return `meas_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    generateReportId() {
        return `rpt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    startCalculationTimer() {
        this.calculationTimer = setInterval(() => {
            this.performScheduledCalculations().catch(error => {
                this.logger.error('Scheduled calculation failed', { error });
            });
        }, this.config.calculationFrequency * 60000);
    }
    startReportingTimer() {
        if (!this.config.automaticReporting)
            return;
        // Run daily at midnight
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        const msUntilMidnight = tomorrow.getTime() - now.getTime();
        setTimeout(() => {
            this.reportingTimer = setInterval(() => {
                this.performScheduledReporting().catch(error => {
                    this.logger.error('Scheduled reporting failed', { error });
                });
            }, 24 * 60 * 60 * 1000); // Daily
            // Run the first scheduled reporting
            this.performScheduledReporting();
        }, msUntilMidnight);
    }
    async performScheduledCalculations() {
        this.logger.debug('Performing scheduled SLA calculations');
        // Implementation would calculate SLAs for all active targets
    }
    async performScheduledReporting() {
        this.logger.debug('Performing scheduled SLA reporting');
        // Implementation would generate scheduled reports
    }
    setupEventListeners() {
        process.on('SIGTERM', () => this.shutdown());
        process.on('SIGINT', () => this.shutdown());
    }
    // Shutdown cleanup
    async shutdown() {
        this.logger.info('Shutting down SLA reporting manager');
        if (this.calculationTimer) {
            clearInterval(this.calculationTimer);
        }
        if (this.reportingTimer) {
            clearInterval(this.reportingTimer);
        }
        this.emit('shutdown');
    }
    // Health check
    getHealthStatus() {
        return {
            healthy: true,
            details: {
                activeSLATargets: this.slaTargets.size,
                measurementsStored: Array.from(this.measurements.values()).reduce((sum, arr) => sum + arr.length, 0),
                configEnabled: this.config.enabled
            }
        };
    }
}
exports.SLAReportingManager = SLAReportingManager;
// Factory function
function createSLAReportingManager(serviceName, config, golemAdapter, tracing) {
    return new SLAReportingManager(serviceName, config, golemAdapter, tracing);
}
//# sourceMappingURL=sla-reporting.js.map