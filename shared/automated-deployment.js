"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutomatedDeployment = exports.DeploymentConfigs = void 0;
exports.createAutomatedDeployment = createAutomatedDeployment;
/**
 * Automated deployment system for GuardAnt services
 * Provides blue-green deployments, rollback capabilities, and deployment monitoring
 */
const logger_1 = require("./logger");
exports.DeploymentConfigs = {
    LOCAL: {
        services: {
            adminApi: {
                port: 3001,
                healthCheck: "/health",
                dockerImage: "guardant/admin-api:latest",
            },
            publicApi: {
                port: 3002,
                healthCheck: "/health",
                dockerImage: "guardant/public-api:latest",
            },
            workersApi: {
                port: 3099,
                healthCheck: "/health",
                dockerImage: "guardant/workers-api:latest",
            },
            frontendAdmin: {
                port: 3000,
                healthCheck: "/",
                dockerImage: "guardant/frontend-admin:latest",
            },
            frontendStatus: {
                port: 3003,
                healthCheck: "/",
                dockerImage: "guardant/frontend-status:latest",
            },
        },
        blueGreen: {
            blueEnvironment: "blue",
            greenEnvironment: "green",
            activeEnvironment: "blue",
            switchoverTimeoutMs: 30000,
            healthCheckThreshold: 0.9,
        },
    },
    STAGING: {
        services: {
            adminApi: {
                port: 3001,
                healthCheck: "/health",
                dockerImage: "guardant/admin-api:staging",
            },
            publicApi: {
                port: 3002,
                healthCheck: "/health",
                dockerImage: "guardant/public-api:staging",
            },
            workersApi: {
                port: 3099,
                healthCheck: "/health",
                dockerImage: "guardant/workers-api:staging",
            },
            frontendAdmin: {
                port: 3000,
                healthCheck: "/",
                dockerImage: "guardant/frontend-admin:staging",
            },
            frontendStatus: {
                port: 3003,
                healthCheck: "/",
                dockerImage: "guardant/frontend-status:staging",
            },
        },
        blueGreen: {
            blueEnvironment: "blue-staging",
            greenEnvironment: "green-staging",
            activeEnvironment: "blue",
            switchoverTimeoutMs: 60000,
            healthCheckThreshold: 0.95,
        },
    },
    PRODUCTION: {
        services: {
            adminApi: {
                port: 3001,
                healthCheck: "/health",
                dockerImage: "guardant/admin-api:production",
            },
            publicApi: {
                port: 3002,
                healthCheck: "/health",
                dockerImage: "guardant/public-api:production",
            },
            workersApi: {
                port: 3099,
                healthCheck: "/health",
                dockerImage: "guardant/workers-api:production",
            },
            frontendAdmin: {
                port: 3000,
                healthCheck: "/",
                dockerImage: "guardant/frontend-admin:production",
            },
            frontendStatus: {
                port: 3003,
                healthCheck: "/",
                dockerImage: "guardant/frontend-status:production",
            },
        },
        blueGreen: {
            blueEnvironment: "blue-production",
            greenEnvironment: "green-production",
            activeEnvironment: "blue",
            switchoverTimeoutMs: 120000,
            healthCheckThreshold: 0.98,
        },
    },
};
class AutomatedDeployment {
    constructor(config, tracing) {
        this.logger = (0, logger_1.createLogger)("automated-deployment");
        this.deployments = [];
        this.config = config;
        this.tracing = tracing;
    }
    async deployService(service, version, environment) {
        const deploymentId = this.generateDeploymentId();
        const startTime = Date.now();
        this.logger.info("Starting deployment", {
            deploymentId,
            service,
            version,
            environment,
        });
        const deployment = {
            deploymentId,
            service,
            environment,
            version,
            strategy: "blue-green",
            status: "IN_PROGRESS",
            steps: [],
            startTime,
            healthCheckResults: [],
        };
        try {
            // Execute deployment steps
            const steps = this.createDeploymentSteps(service, version, environment);
            for (const step of steps) {
                const stepResult = await this.executeDeploymentStep(step);
                deployment.steps.push(stepResult);
                if (stepResult.status === "FAILED") {
                    deployment.status = "FAILED";
                    deployment.endTime = Date.now();
                    deployment.durationMs = deployment.endTime - deployment.startTime;
                    // Attempt rollback
                    if (this.shouldRollback(deployment)) {
                        await this.rollbackDeployment(deployment);
                    }
                    this.deployments.push(deployment);
                    return deployment;
                }
            }
            // Perform health checks
            const healthCheckResults = await this.performHealthChecks(service, environment);
            deployment.healthCheckResults = healthCheckResults;
            // Determine final status
            const healthyChecks = healthCheckResults.filter((h) => h.status === "HEALTHY").length;
            const healthRate = healthCheckResults.length > 0
                ? healthyChecks / healthCheckResults.length
                : 0;
            if (healthRate >= this.config[environment].blueGreen.healthCheckThreshold) {
                deployment.status = "SUCCESS";
            }
            else {
                deployment.status = "FAILED";
                deployment.rollbackReason = `Health check failure: ${healthRate * 100}% healthy`;
                // Rollback due to health check failure
                await this.rollbackDeployment(deployment);
            }
        }
        catch (error) {
            deployment.status = "FAILED";
            deployment.rollbackReason =
                error instanceof Error ? error.message : String(error);
            // Rollback on error
            await this.rollbackDeployment(deployment);
        }
        deployment.endTime = Date.now();
        deployment.durationMs = deployment.endTime - deployment.startTime;
        this.deployments.push(deployment);
        this.logger.info("Deployment completed", {
            deploymentId,
            status: deployment.status,
            durationMs: deployment.durationMs,
        });
        return deployment;
    }
    createDeploymentSteps(service, version, environment) {
        const serviceConfig = this.config[environment].services[service];
        return [
            {
                name: "Pre-deployment Health Check",
                description: "Check current environment health before deployment",
                action: () => this.preDeploymentHealthCheck(service, environment),
                timeoutMs: 30000,
            },
            {
                name: "Build Docker Image",
                description: "Build new Docker image for deployment",
                action: () => this.buildDockerImage(service, version),
                rollback: () => this.cleanupDockerImage(service, version),
                timeoutMs: 300000, // 5 minutes
            },
            {
                name: "Deploy to Inactive Environment",
                description: "Deploy to inactive blue/green environment",
                action: () => this.deployToInactiveEnvironment(service, version, environment),
                rollback: () => this.rollbackInactiveEnvironment(service, environment),
                timeoutMs: 180000, // 3 minutes
            },
            {
                name: "Health Check Inactive Environment",
                description: "Verify health of newly deployed environment",
                action: () => this.healthCheckInactiveEnvironment(service, environment),
                timeoutMs: 60000,
            },
            {
                name: "Switch Traffic",
                description: "Switch traffic to new environment",
                action: () => this.switchTraffic(service, environment),
                rollback: () => this.switchTrafficBack(service, environment),
                timeoutMs: 30000,
            },
            {
                name: "Post-deployment Health Check",
                description: "Verify system health after traffic switch",
                action: () => this.postDeploymentHealthCheck(service, environment),
                timeoutMs: 60000,
            },
            {
                name: "Cleanup Old Environment",
                description: "Clean up old environment after successful deployment",
                action: () => this.cleanupOldEnvironment(service, environment),
                timeoutMs: 120000, // 2 minutes
            },
        ];
    }
    async executeDeploymentStep(step) {
        const startTime = Date.now();
        this.logger.debug(`Executing deployment step: ${step.name}`, {
            description: step.description,
            timeoutMs: step.timeoutMs,
        });
        try {
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error(`Step timeout after ${step.timeoutMs}ms`)), step.timeoutMs);
            });
            await Promise.race([step.action(), timeoutPromise]);
            const duration = Date.now() - startTime;
            return {
                stepName: step.name,
                status: "SUCCESS",
                durationMs: duration,
            };
        }
        catch (error) {
            const duration = Date.now() - startTime;
            // Attempt rollback if available
            if (step.rollback) {
                try {
                    await step.rollback();
                }
                catch (rollbackError) {
                    this.logger.error("Step rollback failed", {
                        step: step.name,
                        error: rollbackError instanceof Error
                            ? rollbackError.message
                            : String(rollbackError),
                    });
                }
            }
            return {
                stepName: step.name,
                status: "FAILED",
                durationMs: duration,
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }
    async preDeploymentHealthCheck(service, environment) {
        // Simulate pre-deployment health check
        const response = await fetch(`http://localhost:${this.config[environment].services[service].port}/health`);
        if (!response.ok) {
            throw new Error(`Pre-deployment health check failed: ${response.status}`);
        }
    }
    async buildDockerImage(service, version) {
        // Simulate Docker image build
        this.logger.info("Building Docker image", { service, version });
        // In real implementation, this would execute:
        // docker build -t guardant/${service}:${version} .
        // docker push guardant/${service}:${version}
        await new Promise((resolve) => setTimeout(resolve, 5000)); // Simulate build time
    }
    async cleanupDockerImage(service, version) {
        // Simulate Docker image cleanup
        this.logger.info("Cleaning up Docker image", { service, version });
        // In real implementation, this would execute:
        // docker rmi guardant/${service}:${version}
    }
    async deployToInactiveEnvironment(service, version, environment) {
        // Simulate deployment to inactive environment
        this.logger.info("Deploying to inactive environment", {
            service,
            version,
            environment,
        });
        // In real implementation, this would:
        // 1. Deploy to inactive blue/green environment
        // 2. Update load balancer configuration
        // 3. Wait for deployment to complete
        await new Promise((resolve) => setTimeout(resolve, 10000)); // Simulate deployment time
    }
    async rollbackInactiveEnvironment(service, environment) {
        // Simulate rollback of inactive environment
        this.logger.info("Rolling back inactive environment", {
            service,
            environment,
        });
        // In real implementation, this would:
        // 1. Stop the deployment
        // 2. Revert load balancer configuration
        // 3. Clean up resources
    }
    async healthCheckInactiveEnvironment(service, environment) {
        // Simulate health check of inactive environment
        this.logger.info("Health checking inactive environment", {
            service,
            environment,
        });
        // In real implementation, this would:
        // 1. Check health endpoints
        // 2. Verify service functionality
        // 3. Run smoke tests
        await new Promise((resolve) => setTimeout(resolve, 5000)); // Simulate health check time
    }
    async switchTraffic(service, environment) {
        // Simulate traffic switch
        this.logger.info("Switching traffic", { service, environment });
        // In real implementation, this would:
        // 1. Update load balancer configuration
        // 2. Gradually shift traffic
        // 3. Monitor for issues
        await new Promise((resolve) => setTimeout(resolve, 15000)); // Simulate traffic switch time
    }
    async switchTrafficBack(service, environment) {
        // Simulate traffic switch back
        this.logger.info("Switching traffic back", { service, environment });
        // In real implementation, this would:
        // 1. Revert load balancer configuration
        // 2. Switch back to previous environment
    }
    async postDeploymentHealthCheck(service, environment) {
        // Simulate post-deployment health check
        this.logger.info("Post-deployment health check", { service, environment });
        // In real implementation, this would:
        // 1. Check all health endpoints
        // 2. Verify system functionality
        // 3. Run integration tests
        await new Promise((resolve) => setTimeout(resolve, 10000)); // Simulate health check time
    }
    async cleanupOldEnvironment(service, environment) {
        // Simulate cleanup of old environment
        this.logger.info("Cleaning up old environment", { service, environment });
        // In real implementation, this would:
        // 1. Stop old containers
        // 2. Remove old resources
        // 3. Update DNS/load balancer
        await new Promise((resolve) => setTimeout(resolve, 5000)); // Simulate cleanup time
    }
    async performHealthChecks(service, environment) {
        const results = [];
        const serviceConfig = this.config[environment].services[service];
        // Perform multiple health checks
        for (let i = 0; i < 5; i++) {
            const startTime = Date.now();
            try {
                const response = await fetch(`http://localhost:${serviceConfig.port}${serviceConfig.healthCheck}`);
                const responseTime = Date.now() - startTime;
                results.push({
                    timestamp: Date.now(),
                    status: response.ok ? "HEALTHY" : "UNHEALTHY",
                    responseTime,
                    statusCode: response.status,
                    error: response.ok ? undefined : `HTTP ${response.status}`,
                });
                await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait between checks
            }
            catch (error) {
                results.push({
                    timestamp: Date.now(),
                    status: "TIMEOUT",
                    responseTime: Date.now() - startTime,
                    statusCode: 0,
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        }
        return results;
    }
    shouldRollback(deployment) {
        // Check if deployment should be rolled back
        const failedSteps = deployment.steps.filter((s) => s.status === "FAILED").length;
        const totalSteps = deployment.steps.length;
        return failedSteps > 0 && failedSteps / totalSteps > 0.3; // Rollback if more than 30% failed
    }
    async rollbackDeployment(deployment) {
        this.logger.warn("Rolling back deployment", {
            deploymentId: deployment.deploymentId,
            reason: deployment.rollbackReason,
        });
        // In real implementation, this would:
        // 1. Switch traffic back to previous version
        // 2. Stop new deployment
        // 3. Clean up resources
        // 4. Notify stakeholders
        deployment.status = "ROLLED_BACK";
    }
    generateDeploymentId() {
        return `deploy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    async getDeploymentHistory(service, environment) {
        let filtered = this.deployments;
        if (service) {
            filtered = filtered.filter((d) => d.service === service);
        }
        if (environment) {
            filtered = filtered.filter((d) => d.environment === environment);
        }
        return filtered.sort((a, b) => b.startTime - a.startTime);
    }
    async generateDeploymentReport(service, environment) {
        const deployments = await this.getDeploymentHistory(service, environment);
        const totalDeployments = deployments.length;
        const successful = deployments.filter((d) => d.status === "SUCCESS").length;
        const failed = deployments.filter((d) => d.status === "FAILED").length;
        const rolledBack = deployments.filter((d) => d.status === "ROLLED_BACK").length;
        const averageDurationMs = deployments.length > 0
            ? deployments.reduce((sum, d) => sum + (d.durationMs || 0), 0) /
                deployments.length
            : 0;
        const successRate = totalDeployments > 0 ? (successful / totalDeployments) * 100 : 0;
        const recommendations = this.generateDeploymentRecommendations(deployments);
        return {
            summary: {
                totalDeployments,
                successful,
                failed,
                rolledBack,
                averageDurationMs,
                successRate,
            },
            deployments,
            recommendations,
            timestamp: Date.now(),
            environment: environment || "all",
        };
    }
    generateDeploymentRecommendations(deployments) {
        const recommendations = [];
        // Analyze deployment failures
        const failedDeployments = deployments.filter((d) => d.status === "FAILED");
        if (failedDeployments.length > 0) {
            recommendations.push({
                priority: "HIGH",
                title: "Deployment Failures Detected",
                description: `${failedDeployments.length} deployments have failed`,
                impact: "Service availability and deployment reliability",
                action: "Review failed deployments and fix underlying issues",
                effort: "MEDIUM",
                timeline: "Within 1 week",
            });
        }
        // Analyze rollbacks
        const rolledBackDeployments = deployments.filter((d) => d.status === "ROLLED_BACK");
        if (rolledBackDeployments.length > 0) {
            recommendations.push({
                priority: "MEDIUM",
                title: "Frequent Rollbacks",
                description: `${rolledBackDeployments.length} deployments were rolled back`,
                impact: "Deployment instability and potential service disruption",
                action: "Improve testing and health check procedures",
                effort: "HIGH",
                timeline: "Within 2 weeks",
            });
        }
        // Analyze deployment duration
        const longDeployments = deployments.filter((d) => (d.durationMs || 0) > 300000); // 5 minutes
        if (longDeployments.length > 0) {
            recommendations.push({
                priority: "LOW",
                title: "Long Deployment Times",
                description: `${longDeployments.length} deployments took longer than 5 minutes`,
                impact: "Reduced deployment frequency and longer recovery times",
                action: "Optimize deployment process and reduce build times",
                effort: "MEDIUM",
                timeline: "Within 1 month",
            });
        }
        return recommendations;
    }
}
exports.AutomatedDeployment = AutomatedDeployment;
// Factory function for creating automated deployment runners
function createAutomatedDeployment(config, tracing) {
    return new AutomatedDeployment(config, tracing);
}
//# sourceMappingURL=automated-deployment.js.map