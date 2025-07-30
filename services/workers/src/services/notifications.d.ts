export interface NotificationPayload {
    type: 'incident-started' | 'incident-resolved' | 'maintenance-started' | 'maintenance-ended';
    nestId: string;
    serviceId: string;
    serviceName: string;
    incident?: {
        id: string;
        title: string;
        description: string;
        startedAt: number;
        resolvedAt?: number;
        duration?: number;
        affectedChecks: number;
    };
    maintenance?: {
        id: string;
        title: string;
        description: string;
        startedAt: number;
        endedAt?: number;
        scheduledEndTime: number;
    };
    timestamp: number;
}
export declare class NotificationService {
    constructor();
    /**
     * Send webhook notification
     */
    sendWebhook(webhookUrl: string, payload: NotificationPayload): Promise<boolean>;
    /**
     * Send email notification
     */
    sendEmail(email: string, payload: NotificationPayload): Promise<boolean>;
    /**
     * Send notifications to all configured channels
     */
    sendNotifications(webhooks: string[], emails: string[], payload: NotificationPayload): Promise<{
        webhookResults: boolean[];
        emailResults: boolean[];
    }>;
    /**
     * Generate email subject based on notification type
     */
    private generateEmailSubject;
    /**
     * Generate email body based on notification type
     */
    private generateEmailBody;
    /**
     * Create notification payload for incident
     */
    static createIncidentPayload(type: 'incident-started' | 'incident-resolved', nestId: string, serviceId: string, serviceName: string, incident: NotificationPayload['incident']): NotificationPayload;
    /**
     * Create notification payload for maintenance
     */
    static createMaintenancePayload(type: 'maintenance-started' | 'maintenance-ended', nestId: string, serviceId: string, serviceName: string, maintenance: NotificationPayload['maintenance']): NotificationPayload;
}
//# sourceMappingURL=notifications.d.ts.map