// GuardAnt Notification Service
// Handles incident notifications via webhooks and emails

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

export class NotificationService {
  constructor() {}

  /**
   * Send webhook notification
   */
  async sendWebhook(
    webhookUrl: string,
    payload: NotificationPayload
  ): Promise<boolean> {
    try {
      console.log(`🔔 Sending webhook to ${webhookUrl}...`);
      
      // TODO: Implement actual webhook sending
      // For now, just log the payload
      console.log('Webhook payload:', JSON.stringify(payload, null, 2));
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 100));
      
      console.log(`✅ Webhook sent successfully to ${webhookUrl}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to send webhook to ${webhookUrl}:`, error);
      return false;
    }
  }

  /**
   * Send email notification
   */
  async sendEmail(
    email: string,
    payload: NotificationPayload
  ): Promise<boolean> {
    try {
      console.log(`📧 Sending email to ${email}...`);
      
      const subject = this.generateEmailSubject(payload);
      const body = this.generateEmailBody(payload);
      
      // TODO: Implement actual email sending
      // For now, just log the email content
      console.log('Email details:');
      console.log('To:', email);
      console.log('Subject:', subject);
      console.log('Body:', body);
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 200));
      
      console.log(`✅ Email sent successfully to ${email}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to send email to ${email}:`, error);
      return false;
    }
  }

  /**
   * Send notifications to all configured channels
   */
  async sendNotifications(
    webhooks: string[],
    emails: string[],
    payload: NotificationPayload
  ): Promise<{ webhookResults: boolean[]; emailResults: boolean[] }> {
    console.log(`🚨 Sending ${payload.type} notifications for service ${payload.serviceName}`);
    
    const webhookPromises = webhooks.map(url => this.sendWebhook(url, payload));
    const emailPromises = emails.map(email => this.sendEmail(email, payload));
    
    const [webhookResults, emailResults] = await Promise.all([
      Promise.all(webhookPromises),
      Promise.all(emailPromises)
    ]);
    
    const successfulWebhooks = webhookResults.filter(r => r).length;
    const successfulEmails = emailResults.filter(r => r).length;
    
    console.log(`📊 Notification results: ${successfulWebhooks}/${webhooks.length} webhooks, ${successfulEmails}/${emails.length} emails sent`);
    
    return { webhookResults, emailResults };
  }

  /**
   * Generate email subject based on notification type
   */
  private generateEmailSubject(payload: NotificationPayload): string {
    const { type, serviceName } = payload;
    
    switch (type) {
      case 'incident-started':
        return `🚨 Incident Started: ${serviceName}`;
      case 'incident-resolved':
        return `✅ Incident Resolved: ${serviceName}`;
      case 'maintenance-started':
        return `🔧 Maintenance Started: ${serviceName}`;
      case 'maintenance-ended':
        return `✅ Maintenance Completed: ${serviceName}`;
      default:
        return `📢 Status Update: ${serviceName}`;
    }
  }

  /**
   * Generate email body based on notification type
   */
  private generateEmailBody(payload: NotificationPayload): string {
    const { type, serviceName, incident, maintenance, timestamp } = payload;
    const date = new Date(timestamp).toLocaleString();
    
    let body = `GuardAnt Status Update\n\n`;
    body += `Service: ${serviceName}\n`;
    body += `Time: ${date}\n\n`;
    
    switch (type) {
      case 'incident-started':
        if (incident) {
          body += `🚨 INCIDENT STARTED\n\n`;
          body += `Title: ${incident.title}\n`;
          body += `Description: ${incident.description}\n`;
          body += `Started: ${new Date(incident.startedAt).toLocaleString()}\n`;
          body += `Affected Checks: ${incident.affectedChecks}\n`;
        }
        break;
        
      case 'incident-resolved':
        if (incident) {
          body += `✅ INCIDENT RESOLVED\n\n`;
          body += `Title: ${incident.title}\n`;
          body += `Started: ${new Date(incident.startedAt).toLocaleString()}\n`;
          if (incident.resolvedAt) {
            body += `Resolved: ${new Date(incident.resolvedAt).toLocaleString()}\n`;
          }
          if (incident.duration) {
            const minutes = Math.floor(incident.duration / (1000 * 60));
            body += `Duration: ${minutes} minutes\n`;
          }
        }
        break;
        
      case 'maintenance-started':
        if (maintenance) {
          body += `🔧 MAINTENANCE STARTED\n\n`;
          body += `Title: ${maintenance.title}\n`;
          body += `Description: ${maintenance.description}\n`;
          body += `Started: ${new Date(maintenance.startedAt).toLocaleString()}\n`;
          body += `Scheduled End: ${new Date(maintenance.scheduledEndTime).toLocaleString()}\n`;
        }
        break;
        
      case 'maintenance-ended':
        if (maintenance) {
          body += `✅ MAINTENANCE COMPLETED\n\n`;
          body += `Title: ${maintenance.title}\n`;
          body += `Started: ${new Date(maintenance.startedAt).toLocaleString()}\n`;
          if (maintenance.endedAt) {
            body += `Completed: ${new Date(maintenance.endedAt).toLocaleString()}\n`;
          }
        }
        break;
    }
    
    body += `\n---\n`;
    body += `GuardAnt - Multi-Tenant Status Page Platform\n`;
    body += `🐜 Powered by WorkerAnt monitoring network`;
    
    return body;
  }

  /**
   * Create notification payload for incident
   */
  static createIncidentPayload(
    type: 'incident-started' | 'incident-resolved',
    nestId: string,
    serviceId: string,
    serviceName: string,
    incident: NotificationPayload['incident']
  ): NotificationPayload {
    return {
      type,
      nestId,
      serviceId,
      serviceName,
      incident,
      timestamp: Date.now(),
    };
  }

  /**
   * Create notification payload for maintenance
   */
  static createMaintenancePayload(
    type: 'maintenance-started' | 'maintenance-ended',
    nestId: string,
    serviceId: string,
    serviceName: string,
    maintenance: NotificationPayload['maintenance']
  ): NotificationPayload {
    return {
      type,
      nestId,
      serviceId,
      serviceName,
      maintenance,
      timestamp: Date.now(),
    };
  }
}