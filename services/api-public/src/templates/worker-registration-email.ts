export function getWorkerRegistrationEmail(registration: {
  workerId: string;
  ownerEmail: string;
  hostname: string;
  platform: string;
  ip: string;
  registeredAt: number;
}) {
  const approvalUrl = `${process.env.ADMIN_URL || 'https://guardant.me'}/admin/workers/pending`;
  
  return {
    subject: `[GuardAnt] New Worker Registration - ${registration.ownerEmail}`,
    html: `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4a90e2; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
        .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
        .info-box { background: white; padding: 15px; margin: 10px 0; border-radius: 5px; }
        .label { font-weight: bold; color: #666; }
        .value { color: #333; }
        .button { display: inline-block; padding: 10px 20px; background: #4a90e2; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { margin-top: 20px; padding: 10px; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🤖 New Worker Registration</h1>
        </div>
        
        <div class="content">
            <p>A new GuardAnt worker has been registered and is waiting for approval.</p>
            
            <div class="info-box">
                <h3>Owner Information</h3>
                <p><span class="label">Email:</span> <span class="value">${registration.ownerEmail}</span></p>
            </div>
            
            <div class="info-box">
                <h3>Worker Details</h3>
                <p><span class="label">Worker ID:</span> <span class="value">${registration.workerId}</span></p>
                <p><span class="label">Hostname:</span> <span class="value">${registration.hostname}</span></p>
                <p><span class="label">Platform:</span> <span class="value">${registration.platform}</span></p>
                <p><span class="label">IP Address:</span> <span class="value">${registration.ip}</span></p>
                <p><span class="label">Registered:</span> <span class="value">${new Date(registration.registeredAt).toLocaleString()}</span></p>
            </div>
            
            <center>
                <a href="${approvalUrl}" class="button">Review in Dashboard</a>
            </center>
            
            <div class="info-box" style="background: #fff3cd; border: 1px solid #ffeaa7;">
                <h4>⚠️ Action Required</h4>
                <p>This worker will remain inactive until approved. Please review and approve in the admin dashboard.</p>
            </div>
        </div>
        
        <div class="footer">
            <p>This is an automated notification from GuardAnt monitoring platform.</p>
            <p>Worker registrations require manual approval for security reasons.</p>
        </div>
    </div>
</body>
</html>
    `,
    text: `
New GuardAnt Worker Registration

Owner: ${registration.ownerEmail}
Worker ID: ${registration.workerId}
Hostname: ${registration.hostname}
Platform: ${registration.platform}
IP: ${registration.ip}
Registered: ${new Date(registration.registeredAt).toLocaleString()}

Review and approve at: ${approvalUrl}

This worker will remain inactive until approved.
    `
  };
}