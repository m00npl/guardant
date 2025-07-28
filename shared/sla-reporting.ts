/**
 * GuardAnt SLA (Service Level Agreement) Reporting System
 * Comprehensive SLA tracking, compliance monitoring, and automated reporting
 * for multi-tenant monitoring platform
 */

import { EventEmitter } from 'events';
import { createLogger } from './logger';
import { GuardAntTracing } from './tracing';
import { AlertError, ErrorCategory, ErrorSeverity } from './error-handling';
import { createGolemAdapter, DataType, GolemAdapter, GolemUtils } from './golem-adapter';

export interface SLATarget {
  id: string;
  nestId: string;
  serviceId?: string; // If null, applies to all nest services
  name: string;
  description: string;
  
  // SLA parameters
  uptime: {
    target: number; // percentage (e.g., 99.9)
    measurement: 'monthly' | 'quarterly' | 'yearly';
    excludeScheduledMaintenance: boolean;
  };
  
  responseTime: {
    target: number; // milliseconds
    percentile: number; // e.g., 95 for p95
    measurement: 'monthly' | 'quarterly' | 'yearly';
  };
  
  errorRate: {
    target: number; // percentage (e.g., 0.1)
    measurement: 'monthly' | 'quarterly' | 'yearly';
  };
  
  availability: {
    target: number; // percentage
    measurement: 'monthly' | 'quarterly' | 'yearly';
  };
  
  // Business parameters
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
  
  // Reporting
  reportingFrequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  stakeholders: string[]; // email addresses
  
  // Metadata
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
  
  // Actual measurements
  uptime: {
    actual: number;
    target: number;
    compliant: boolean;
    totalDowntime: number; // minutes
    scheduledDowntime: number; // minutes
    unplannedDowntime: number; // minutes
  };
  
  responseTime: {
    actual: number; // at specified percentile
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
  
  // Overall compliance
  overallCompliance: boolean;
  complianceScore: number; // 0-100
  
  // Business impact
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
  
  // Metadata
  calculatedAt: string;
  dataQuality: {
    completeness: number; // percentage
    gaps: Array<{ start: string; end: string; reason: string }>;
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
  
  // Executive summary
  summary: {
    overallCompliance: boolean;
    complianceScore: number;
    totalPenalties: number;
    totalCredits: number;
    keyInsights: string[];
    recommendations: string[];
  };
  
  // SLA performance
  slaPerformance: Array<{
    slaTargetId: string;
    slaName: string;
    compliant: boolean;
    metrics: {
      uptime: { actual: number; target: number; status: 'met' | 'missed' | 'at-risk' };
      responseTime: { actual: number; target: number; status: 'met' | 'missed' | 'at-risk' };
      errorRate: { actual: number; target: number; status: 'met' | 'missed' | 'at-risk' };
      availability: { actual: number; target: number; status: 'met' | 'missed' | 'at-risk' };
    };
  }>;
  
  // Trend analysis
  trends: Array<{
    metric: string;
    direction: 'improving' | 'stable' | 'degrading';
    changePercent: number;
    significance: 'high' | 'medium' | 'low';
  }>;
  
  // Incidents impact
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
  
  // Service breakdown
  serviceBreakdown: Array<{
    serviceId: string;
    serviceName: string;
    uptime: number;
    avgResponseTime: number;
    errorRate: number;
    slaCompliance: boolean;
  }>;
  
  // Generated report files
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
  
  // Calculation settings
  calculationFrequency: number; // minutes
  dataRetentionDays: number;
  excludeMaintenanceWindows: boolean;
  
  // Reporting settings
  automaticReporting: boolean;
  reportFormats: Array<'pdf' | 'csv' | 'json' | 'excel'>;
  emailNotifications: boolean;
  slackIntegration: boolean;
  
  // Business settings
  currency: string;
  timezone: string;
  businessHours: {
    start: string; // HH:MM
    end: string; // HH:MM
    days: number[]; // 0-6, Sunday = 0
  };
  
  // Alerting
  alertThresholds: {
    atRisk: number; // percentage below target to trigger at-risk alert
    breachWarning: number; // minutes before breach to warn
  };
}

export class SLAReportingManager extends EventEmitter {
  private logger;
  private tracing?: GuardAntTracing;
  private calculationTimer?: NodeJS.Timer;
  private reportingTimer?: NodeJS.Timer;
  private slaTargets = new Map<string, SLATarget>();
  private measurements = new Map<string, SLAMeasurement[]>();
  private golemAdapter: GolemAdapter;
  
  constructor(
    private serviceName: string,
    private config: SLAConfiguration,
    golemAdapter?: GolemAdapter,
    tracing?: GuardAntTracing
  ) {
    super();
    this.logger = createLogger(`${serviceName}-sla-reporting`);
    this.tracing = tracing;
    
    // Initialize Golem adapter
    this.golemAdapter = golemAdapter || createGolemAdapter(
      serviceName,
      GolemUtils.createDefaultConfig(),
      undefined,
      tracing
    );
    
    if (config.enabled) {
      this.startCalculationTimer();
      this.startReportingTimer();
      this.setupEventListeners();
    }
  }

  // Create or update SLA target
  async createSLATarget(target: Omit<SLATarget, 'id' | 'createdAt' | 'updatedAt' | 'version'>): Promise<SLATarget> {
    const span = this.tracing?.startSpan('sla.create_target');
    
    try {
      const slaTarget: SLATarget = {
        ...target,
        id: this.generateSLAId(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: '1.0.0'
      };
      
      // Validate SLA target
      this.validateSLATarget(slaTarget);
      
      // Store SLA target in Golem Base
      await this.golemAdapter.storeNestData(
        slaTarget.nestId,
        DataType.SLA_DATA,
        slaTarget,
        { 
          key: `sla-target:${slaTarget.id}`,
          type: 'sla-target',
          version: slaTarget.version
        }
      );
      
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
      
    } catch (error) {
      this.logger.error('Failed to create SLA target', { error, target });
      span?.setTag('error', true);
      throw error;
    } finally {
      span?.finish();
    }
  }

  // Calculate SLA measurements for a period
  async calculateSLAMeasurement(
    slaTargetId: string,
    startDate: Date,
    endDate: Date
  ): Promise<SLAMeasurement> {
    const span = this.tracing?.startSpan('sla.calculate_measurement');
    
    try {
      const slaTarget = this.slaTargets.get(slaTargetId);
      if (!slaTarget) {
        throw new Error(`SLA target not found: ${slaTargetId}`);
      }
      
      // Gather monitoring data for the period
      const monitoringData = await this.gatherMonitoringData(
        slaTarget.nestId,
        slaTarget.serviceId,
        startDate,
        endDate
      );
      
      // Calculate uptime
      const uptimeCalculation = this.calculateUptime(monitoringData, slaTarget, startDate, endDate);
      
      // Calculate response time
      const responseTimeCalculation = this.calculateResponseTime(monitoringData, slaTarget);
      
      // Calculate error rate
      const errorRateCalculation = this.calculateErrorRate(monitoringData, slaTarget);
      
      // Calculate availability
      const availabilityCalculation = this.calculateAvailability(monitoringData, slaTarget);
      
      // Determine overall compliance
      const overallCompliance = 
        uptimeCalculation.compliant &&
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
      const measurement: SLAMeasurement = {
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
      
    } catch (error) {
      this.logger.error('Failed to calculate SLA measurement', { error, slaTargetId });
      span?.setTag('error', true);
      throw error;
    } finally {
      span?.finish();
    }
  }

  // Generate SLA report
  async generateSLAReport(
    nestId: string,
    reportType: SLAReport['reportType'],
    startDate: Date,
    endDate: Date,
    formats: Array<'pdf' | 'csv' | 'json' | 'excel'> = ['json']
  ): Promise<SLAReport> {
    const span = this.tracing?.startSpan('sla.generate_report');
    
    try {
      // Get all SLA targets for nest
      const nestSLATargets = Array.from(this.slaTargets.values())
        .filter(target => target.nestId === nestId && target.active);
      
      if (nestSLATargets.length === 0) {
        throw new Error(`No active SLA targets found for nest: ${nestId}`);
      }
      
      // Gather measurements for the period
      const allMeasurements: SLAMeasurement[] = [];
      for (const target of nestSLATargets) {
        const measurements = this.measurements.get(target.id) || [];
        const periodMeasurements = measurements.filter(m => 
          new Date(m.period.start) >= startDate && 
          new Date(m.period.end) <= endDate
        );
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
      const report: SLAReport = {
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
      
    } catch (error) {
      this.logger.error('Failed to generate SLA report', { error, nestId, reportType });
      span?.setTag('error', true);
      throw error;
    } finally {
      span?.finish();
    }
  }

  // Get SLA compliance status
  async getSLAComplianceStatus(nestId: string): Promise<any> {
    const nestSLATargets = Array.from(this.slaTargets.values())
      .filter(target => target.nestId === nestId && target.active);
    
    const status = {
      overall: true,
      targets: [] as any[],
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
        } else {
          status.summary.breached++;
          status.overall = false;
        }
      }
    }
    
    return status;
  }

  // Private helper methods
  private validateSLATarget(target: SLATarget): void {
    if (!target.nestId) throw new Error('nestId is required');
    if (!target.name) throw new Error('name is required');
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

  private async gatherMonitoringData(
    nestId: string,
    serviceId: string | undefined,
    startDate: Date,
    endDate: Date
  ): Promise<any> {
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

  private calculateUptime(data: any, target: SLATarget, startDate: Date, endDate: Date): any {
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

  private calculateResponseTime(data: any, target: SLATarget): any {
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

  private calculateErrorRate(data: any, target: SLATarget): any {
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

  private calculateAvailability(data: any, target: SLATarget): any {
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

  private calculateComplianceScore(metrics: any[]): number {
    const scores = metrics.map(metric => metric.compliant ? 100 : 0);
    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
  }

  private calculatePenalties(target: SLATarget, metrics: any): any[] {
    // Implementation would check target.penalties against actual metrics
    return [];
  }

  private calculateCredits(target: SLATarget, metrics: any): any[] {
    // Implementation would check target.credits against actual metrics
    return [];
  }

  private calculateReportSummary(measurements: SLAMeasurement[]): any {
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

  private calculateSLAPerformance(targets: SLATarget[], measurements: SLAMeasurement[]): any[] {
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

  private calculateTrends(measurements: SLAMeasurement[], startDate: Date, endDate: Date): any[] {
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

  private async getIncidentsForPeriod(nestId: string, startDate: Date, endDate: Date): Promise<any[]> {
    // Implementation would fetch incidents from incident management system
    return [];
  }

  private calculateServiceBreakdown(measurements: SLAMeasurement[]): any[] {
    // Implementation would break down performance by service
    return [];
  }

  private async generateReportFile(report: SLAReport, format: string): Promise<string> {
    // Implementation would generate actual report files
    return `/reports/${report.id}.${format}`;
  }

  private async sendReportNotifications(report: SLAReport): Promise<void> {
    // Implementation would send email notifications
    this.logger.info('Sending report notifications', { reportId: report.id });
  }

  private getLatestMeasurement(slaTargetId: string): SLAMeasurement | null {
    const measurements = this.measurements.get(slaTargetId) || [];
    return measurements.length > 0 ? measurements[measurements.length - 1] : null;
  }

  private determinePeriodType(startDate: Date, endDate: Date): string {
    const diffMs = endDate.getTime() - startDate.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    
    if (diffDays <= 1) return 'daily';
    if (diffDays <= 7) return 'weekly';
    if (diffDays <= 31) return 'monthly';
    if (diffDays <= 93) return 'quarterly';
    return 'yearly';
  }

  private generateSLAId(): string {
    return `sla_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateMeasurementId(): string {
    return `meas_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateReportId(): string {
    return `rpt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private startCalculationTimer(): void {
    this.calculationTimer = setInterval(() => {
      this.performScheduledCalculations().catch(error => {
        this.logger.error('Scheduled calculation failed', { error });
      });
    }, this.config.calculationFrequency * 60000);
  }

  private startReportingTimer(): void {
    if (!this.config.automaticReporting) return;
    
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

  private async performScheduledCalculations(): Promise<void> {
    this.logger.debug('Performing scheduled SLA calculations');
    // Implementation would calculate SLAs for all active targets
  }

  private async performScheduledReporting(): Promise<void> {
    this.logger.debug('Performing scheduled SLA reporting');
    // Implementation would generate scheduled reports
  }

  private setupEventListeners(): void {
    process.on('SIGTERM', () => this.shutdown());
    process.on('SIGINT', () => this.shutdown());
  }

  // Shutdown cleanup
  async shutdown(): Promise<void> {
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
  getHealthStatus(): { healthy: boolean; details: any } {
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

// Factory function
export function createSLAReportingManager(
  serviceName: string,
  config: SLAConfiguration,
  golemAdapter?: GolemAdapter,
  tracing?: GuardAntTracing
): SLAReportingManager {
  return new SLAReportingManager(serviceName, config, golemAdapter, tracing);
}