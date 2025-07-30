"use strict";
/**
 * Advanced monitoring alerts system for GuardAnt
 * Provides intelligent alerting with escalation, suppression, and notification routing
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MonitoringAlertsManager = exports.NotificationType = exports.AggregationType = exports.ConditionOperator = exports.AlertSeverity = exports.AlertType = void 0;
exports.createMonitoringAlertsManager = createMonitoringAlertsManager;
const logger_1 = require("./logger");
var AlertType;
(function (AlertType) {
    AlertType["METRIC"] = "metric";
    AlertType["AVAILABILITY"] = "availability";
    AlertType["PERFORMANCE"] = "performance";
    AlertType["SECURITY"] = "security";
    AlertType["INFRASTRUCTURE"] = "infrastructure";
})(AlertType || (exports.AlertType = AlertType = {}));
var AlertSeverity;
(function (AlertSeverity) {
    AlertSeverity["CRITICAL"] = "critical";
    AlertSeverity["HIGH"] = "high";
    AlertSeverity["MEDIUM"] = "medium";
    AlertSeverity["LOW"] = "low";
    AlertSeverity["INFO"] = "info";
})(AlertSeverity || (exports.AlertSeverity = AlertSeverity = {}));
var ConditionOperator;
(function (ConditionOperator) {
    ConditionOperator["GREATER_THAN"] = "gt";
    ConditionOperator["LESS_THAN"] = "lt";
    ConditionOperator["EQUALS"] = "eq";
    ConditionOperator["NOT_EQUALS"] = "ne";
})(ConditionOperator || (exports.ConditionOperator = ConditionOperator = {}));
var AggregationType;
(function (AggregationType) {
    AggregationType["AVERAGE"] = "avg";
    AggregationType["SUM"] = "sum";
    AggregationType["MAXIMUM"] = "max";
    AggregationType["COUNT"] = "count";
})(AggregationType || (exports.AggregationType = AggregationType = {}));
var NotificationType;
(function (NotificationType) {
    NotificationType["EMAIL"] = "email";
    NotificationType["SLACK"] = "slack";
    NotificationType["WEBHOOK"] = "webhook";
})(NotificationType || (exports.NotificationType = NotificationType = {}));
class MonitoringAlertsManager {
    constructor(serviceName, tracing) {
        this.serviceName = serviceName;
        this.rules = new Map();
        this.logger = (0, logger_1.createLogger)(`${serviceName}-alerts-manager`);
        this.tracing = tracing;
    }
    getHealthStatus() {
        return {
            healthy: true,
            details: {
                rulesCount: this.rules.size
            }
        };
    }
}
exports.MonitoringAlertsManager = MonitoringAlertsManager;
function createMonitoringAlertsManager(serviceName, tracing) {
    return new MonitoringAlertsManager(serviceName, tracing);
}
//# sourceMappingURL=monitoring-alerts.js.map